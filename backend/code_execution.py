from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import subprocess
import tempfile
import os
import json
import time
from datetime import datetime
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import db
from auth import get_current_user

router = APIRouter(prefix="/api/code", tags=["code"])

class CodeExecutionRequest(BaseModel):
    code: str
    problem_title: str
    user_id: str
    room_code: Optional[str] = None
    is_submit: bool = False

# Check if Docker container is running
def check_docker_container():
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=leet-code-runner", "--format", "{{.Status}}"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0 and "Up" in result.stdout:
            print("✅ Docker container 'leet-code-runner' is running")
            return True
        else:
            print("❌ Docker container 'leet-code-runner' is not running")
            return False
    except Exception as e:
        print(f"❌ Failed to check Docker container: {e}")
        return False

# Check container on startup
docker_available = check_docker_container()


@router.post("/run")
async def run_code(
    request: CodeExecutionRequest,
    current_user=Depends(get_current_user)
):
    """Execute user code in Docker container and test against problem test cases"""

    code = request.code
    problem_title = request.problem_title
    user_id = request.user_id
    room_code = request.room_code
    is_submit = request.is_submit

    print(f"🔍 Code execution request: {problem_title}, user: {user_id}, is_submit: {is_submit}")

    # Get problem and test cases first
    problem = db.problems.find_one({"title": problem_title})
    if not problem:
        print(f"❌ Problem '{problem_title}' not found in database")
        raise HTTPException(status_code=404, detail="Problem not found")

    print(f"✅ Found problem with {len(problem.get('test_cases', []))} test cases")

    # Determine how many test cases to run
    test_cases = problem["test_cases"]
    if is_submit:
        # Run all test cases
        cases_to_run = test_cases
    else:
        # Run only first 3 test cases
        cases_to_run = test_cases[:3]

    if not docker_available:
        raise HTTPException(
            status_code=500,
            detail="Docker container is not available. Please run: docker-compose up -d"
        )

    try:
        print(f"💾 Creating test runner script")

        # Create test runner script
        test_script = create_test_runner(code, cases_to_run, problem_title)

        # Create a unique filename to avoid conflicts
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        script_name = f"test_runner_{unique_id}.py"

        # Write script to the temp-execution directory (mapped to container)
        script_path = f"temp-execution/{script_name}"
        with open(script_path, "w") as f:
            f.write(test_script)

        print(f"✅ Created test runner: {script_name}")

        # Verify file was created and is accessible to container
        container_path = f"/app/temp-execution/{script_name}"
        check_result = subprocess.run([
            "docker", "exec", "leet-code-runner",
            "ls", "-la", container_path
        ], capture_output=True, text=True)

        if check_result.returncode != 0:
            print(f"❌ File not accessible in container: {container_path}")
            print(f"❌ Container ls output: {check_result.stderr}")
            return {"error": f"File not accessible in container: {script_name}"}

        print(f"✅ File verified in container: {container_path}")

        # Execute code in the running Docker container
        print(f"🐳 Executing code in Docker container for {len(cases_to_run)} test cases")

        result = subprocess.run([
            "docker", "exec", "leet-code-runner",
            "python", container_path
        ], capture_output=True, text=True, timeout=10)

        # Clean up the script file
        try:
            os.remove(script_path)
            print(f"🧹 Cleaned up: {script_path}")
        except Exception as cleanup_error:
            print(f"⚠️ Cleanup warning: {cleanup_error}")  # Don't fail on cleanup errors

        print(f"🐳 Docker execution finished")

        if result.returncode != 0:
            return {"error": f"Runtime error: {result.stderr[:500]}"}

        output = result.stdout.strip()
        if not output:
            return {"error": "No output from code execution"}

        print(f"📤 Docker output: {output[:200]}...")

        try:
            results = json.loads(output)
        except json.JSONDecodeError:
            return {"error": f"Invalid JSON output: {output[:200]}"}

        # Handle both old format (list) and new format (single dict)
        if isinstance(results, dict):
            # New format: single result object
            # Check if it's a submit and user passed all tests, update room
            if is_submit and results.get("all_passed") and room_code:
                await update_room_completion(room_code, user_id)
            return results
        else:
            # Old format: list of results (shouldn't happen with new runner, but keeping for safety)
            passed_count = sum(1 for r in results if r["passed"])
            total_count = len(results)
            all_passed = passed_count == total_count

            result_data = {
                "passed": passed_count,
                "total": total_count,
                "all_passed": all_passed,
                "details": results
            }

            # If it's a submit and user passed all tests, update room
            if is_submit and all_passed and room_code:
                await update_room_completion(room_code, user_id)

            return result_data

    except subprocess.TimeoutExpired:
        return {"error": "Code execution timed out (10 seconds)"}
    except Exception as e:
        print(f"❌ System error in code execution: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        return {"error": f"System error: {str(e)}"}


def create_test_runner(user_code: str, test_cases: list, problem_title: str) -> str:
    """Create a Python script that runs the user's code against test cases"""

    # Extract function name from user code
    func_name = extract_function_name(user_code, problem_title)

    # Convert test cases to proper Python representation
    import json

    # Convert JSON null to Python None in test cases
    def convert_nulls(obj):
        if isinstance(obj, dict):
            return {k: convert_nulls(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_nulls(item) for item in obj]
        elif obj is None:
            return None
        else:
            return obj

    cleaned_test_cases = convert_nulls(test_cases)

    runner_template = '''
import json
import sys
import traceback
import math
import heapq
import bisect
import itertools
import functools
import operator
from collections import defaultdict, deque, Counter, OrderedDict
from typing import List, Dict, Set, Optional, Tuple

def validate_solution(actual_output, expected_output, input_data, problem_title):
    """Custom validation for problems that may have multiple valid solutions"""

    if problem_title == "Two Sum":
        # For Two Sum, check if the returned indices sum to the target
        if not isinstance(actual_output, list) or len(actual_output) != 2:
            return False
        try:
            nums = input_data.get("nums") if isinstance(input_data, dict) else input_data
            target = input_data.get("target") if isinstance(input_data, dict) else None
            if target is None:
                return actual_output == expected_output

            i, j = actual_output[0], actual_output[1]
            if i < 0 or j < 0 or i >= len(nums) or j >= len(nums) or i == j:
                return False
            return nums[i] + nums[j] == target
        except (IndexError, KeyError, TypeError):
            return False

    elif problem_title == "Reverse String":
        # For string reversal, both should be strings and one should be reverse of input
        if not isinstance(actual_output, str):
            return False
        try:
            s = input_data.get("s") if isinstance(input_data, dict) else input_data
            return actual_output == s[::-1]
        except:
            return actual_output == expected_output

    elif problem_title == "Merge Two Sorted Lists":
        # For merged lists, check if result is properly sorted and contains all elements
        if not isinstance(actual_output, list):
            return False
        try:
            list1 = input_data.get("list1", []) if isinstance(input_data, dict) else []
            list2 = input_data.get("list2", []) if isinstance(input_data, dict) else []
            all_elements = sorted(list1 + list2)
            return sorted(actual_output) == all_elements and actual_output == sorted(actual_output)
        except:
            return actual_output == expected_output

    # For other problems, use exact match
    return actual_output == expected_output

# User's code
''' + user_code + '''

# Test cases (with proper None handling)
test_cases = ''' + repr(cleaned_test_cases) + '''
problem_title = ''' + repr(problem_title) + '''

results = []
total_cases = len(test_cases)

for i, test_case in enumerate(test_cases):
    try:
        # Get input parameters
        input_data = test_case["input"]
        expected_output = test_case["output"]

        # Call user's function
        if isinstance(input_data, dict):
            # Multiple parameters
            actual_output = ''' + func_name + '''(**input_data)
        else:
            # Single parameter
            actual_output = ''' + func_name + '''(input_data)

        # Check if output matches expected (with custom validation for certain problems)
        passed = validate_solution(actual_output, expected_output, input_data, problem_title)

        if passed:
            # Test passed, continue to next test
            results.append({
                "passed": True,
                "test_number": i + 1,
                "input": input_data,
                "expected": expected_output,
                "output": actual_output
            })
        else:
            # Test failed, stop here and return failure details
            result = {
                "passed": False,
                "failed_at": i + 1,
                "total_tests": total_cases,
                "input": input_data,
                "expected": expected_output,
                "output": actual_output,
                "passed_tests": len(results)
            }
            print(json.dumps(result, default=str))
            sys.exit(0)

    except Exception as e:
        # Exception occurred, stop here and return error details
        result = {
            "passed": False,
            "failed_at": i + 1,
            "total_tests": total_cases,
            "input": input_data if 'input_data' in locals() else None,
            "expected": expected_output if 'expected_output' in locals() else None,
            "output": None,
            "error": str(e),
            "passed_tests": len(results)
        }
        print(json.dumps(result, default=str))
        sys.exit(0)

# If we get here, all tests passed
result = {
    "passed": True,
    "passed_tests": len(results),
    "total_tests": total_cases,
    "all_passed": True
}
print(json.dumps(result, default=str))
'''

    return runner_template


def extract_function_name(code: str, problem_title: str) -> str:
    """Extract the main function name from user's code"""
    # Common function name mappings
    function_mappings = {
        "Two Sum": "twoSum",
        "Reverse String": "reverseString",
        "Valid Parentheses": "isValid",
        "Merge Two Sorted Lists": "mergeTwoLists",
        "Maximum Subarray": "maxSubArray",
        "Climbing Stairs": "climbStairs",
        "Search in Rotated Sorted Array": "search",
        "Longest Substring Without Repeating Characters": "lengthOfLongestSubstring",
        "Container With Most Water": "maxArea",
        "Median of Two Sorted Arrays": "findMedianSortedArrays"
    }

    if problem_title in function_mappings:
        return function_mappings[problem_title]

    # Fallback: try to extract from code
    lines = code.split('\n')
    for line in lines:
        if line.strip().startswith('def '):
            func_name = line.split('def ')[1].split('(')[0].strip()
            return func_name

    return "solve"  # Default fallback


async def update_room_completion(room_code: str, user_id: str):
    """Update room with user completion"""
    room = db.rooms.find_one({"code": room_code})
    if not room or not room.get("started"):
        return

    # Update player completion status
    for player in room["players"]:
        if player["id"] == user_id and not player.get("completed"):
            player["completed"] = True
            player["completedAt"] = datetime.utcnow().isoformat()
            break

    # Check if everyone has completed now
    all_completed = all(player.get("completed", False) for player in room["players"])

    update_data = {"players": room["players"]}

    # If everyone completed for the first time, mark room as finished
    if all_completed and not room.get("gameCompleted"):
        print(f"🏁 Game completed for room {room_code}! Marking as finished.")
        update_data["gameCompleted"] = True
        update_data["active"] = False  # Close the room
        room["gameCompleted"] = True
        room["active"] = False

    # Update database
    db.rooms.update_one(
        {"_id": room["_id"]},
        {"$set": update_data}
    )

    # Broadcast update
    room["_id"] = str(room["_id"])
    if "created_at" in room:
        room["created_at"] = room["created_at"].isoformat()

    # Import here to avoid circular imports
    from socket_server import broadcast_room_update
    await broadcast_room_update(room)