from pymongo import MongoClient
import random

# ---------------------------
# MongoDB connection
# ---------------------------
MONGO_URI = "mongodb+srv://dhruvr101:dhruvreddy27@leetcodepvp.9mer5kv.mongodb.net/auth_db?retryWrites=true&w=majority"
client = MongoClient(MONGO_URI)
db = client["auth_db"]
problems = db["problems"]

# ---------------------------
# Test Case Generators
# ---------------------------

def generate_two_sum_cases(n_cases=100):
    cases = []
    for _ in range(n_cases):
        size = random.randint(2, 10)
        nums = random.sample(range(1, 50), size)
        i, j = random.sample(range(size), 2)
        target = nums[i] + nums[j]
        solution = [i, j] if i < j else [j, i]
        cases.append({"input": {"nums": nums, "target": target}, "output": solution})
    return cases

def generate_reverse_string_cases(n_cases=100):
    cases = []
    for _ in range(n_cases):
        s = ''.join(random.choices("abcdefghijklmnopqrstuvwxyz", k=random.randint(3, 12)))
        cases.append({"input": {"s": s}, "output": s[::-1]})
    return cases

def generate_valid_parentheses_cases(n_cases=100):
    cases = []
    for _ in range(n_cases):
        length = random.randint(2, 12)
        s = ''.join(random.choices("(){}[]", k=length))
        stack, valid = [], True
        mapping = {')':'(', ']':'[', '}':'{'}
        for ch in s:
            if ch in mapping.values():
                stack.append(ch)
            elif ch in mapping:
                if not stack or stack[-1] != mapping[ch]:
                    valid = False
                    break
                stack.pop()
        if stack:
            valid = False
        cases.append({"input": {"s": s}, "output": valid})
    return cases

def generate_merge_sorted_lists_cases(n_cases=100):
    cases = []
    for _ in range(n_cases):
        list1 = sorted([random.randint(1, 20) for _ in range(random.randint(0, 5))])
        list2 = sorted([random.randint(1, 20) for _ in range(random.randint(0, 5))])
        merged = sorted(list1 + list2)
        cases.append({"input": {"list1": list1, "list2": list2}, "output": merged})
    return cases

def generate_max_subarray_cases(n_cases=100):
    cases = []
    for _ in range(n_cases):
        nums = [random.randint(-20, 20) for _ in range(random.randint(5, 12))]
        max_sum, curr = nums[0], nums[0]
        for n in nums[1:]:
            curr = max(n, curr + n)
            max_sum = max(max_sum, curr)
        cases.append({"input": {"nums": nums}, "output": max_sum})
    return cases

def generate_climbing_stairs_cases(n_cases=100):
    cases = []
    memo = {0:1, 1:1}
    def climb(n):
        if n not in memo:
            memo[n] = climb(n-1) + climb(n-2)
        return memo[n]
    for _ in range(n_cases):
        n = random.randint(1, 20)
        cases.append({"input": {"n": n}, "output": climb(n)})
    return cases

def generate_rotated_array_cases(n_cases=100):
    cases = []
    for _ in range(n_cases):
        size = random.randint(5, 15)
        arr = sorted(random.sample(range(1, 100), size))
        pivot = random.randint(0, size - 1)
        rotated = arr[pivot:] + arr[:pivot]
        if random.random() < 0.7:
            target = random.choice(arr)
            output = rotated.index(target)
        else:
            target = random.choice([x for x in range(1, 100) if x not in arr])
            output = None
        cases.append({"input": {"nums": rotated, "target": target}, "output": output})
    return cases

def generate_longest_substring_cases(n_cases=100):
    cases = []
    for _ in range(n_cases):
        s = ''.join(random.choices("abcdef", k=random.randint(5, 12)))
        seen, left, max_len = {}, 0, 0
        for right, ch in enumerate(s):
            if ch in seen and seen[ch] >= left:
                left = seen[ch] + 1
            seen[ch] = right
            max_len = max(max_len, right - left + 1)
        cases.append({"input": {"s": s}, "output": max_len})
    return cases

def generate_container_water_cases(n_cases=100):
    cases = []
    for _ in range(n_cases):
        height = [random.randint(1, 20) for _ in range(random.randint(5, 12))]
        l, r, max_area = 0, len(height) - 1, 0
        while l < r:
            max_area = max(max_area, (r - l) * min(height[l], height[r]))
            if height[l] < height[r]:
                l += 1
            else:
                r -= 1
        cases.append({"input": {"height": height}, "output": max_area})
    return cases

def generate_median_sorted_arrays_cases(n_cases=100):
    cases = []
    for _ in range(n_cases):
        size1 = random.randint(0, 8)
        size2 = random.randint(1, 8) if size1 == 0 else random.randint(0, 8)
        if size1 == 0 and size2 == 0:
            size2 = 1
        nums1 = sorted([random.randint(1, 100) for _ in range(size1)])
        nums2 = sorted([random.randint(1, 100) for _ in range(size2)])
        combined = sorted(nums1 + nums2)
        n = len(combined)
        median = combined[n // 2] if n % 2 == 1 else (combined[n // 2 - 1] + combined[n // 2]) / 2.0
        cases.append({"input": {"nums1": nums1, "nums2": nums2}, "output": median})
    return cases

# ---------------------------
# Function Templates
# ---------------------------
function_templates = {
    "Two Sum": '''def twoSum(nums, target):
    num_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return None''',

    "Reverse String": '''def reverseString(s):
    return s[::-1]''',

    "Valid Parentheses": '''def isValid(s):
    stack = []
    mapping = {')':'(', ']':'[', '}':'{'}
    for ch in s:
        if ch in mapping.values():
            stack.append(ch)
        elif ch in mapping:
            if not stack or stack[-1] != mapping[ch]:
                return False
            stack.pop()
    return not stack''',

    "Merge Two Sorted Lists": '''def mergeTwoLists(list1, list2):
    return sorted(list1 + list2)''',

    "Maximum Subarray": '''def maxSubArray(nums):
    max_sum = curr = nums[0]
    for n in nums[1:]:
        curr = max(n, curr + n)
        max_sum = max(max_sum, curr)
    return max_sum''',

    "Climbing Stairs": '''def climbStairs(n):
    a, b = 1, 1
    for _ in range(n):
        a, b = b, a + b
    return a''',

    "Search in Rotated Sorted Array": '''def search(nums, target):
    try:
        return nums.index(target)
    except ValueError:
        return None''',

    "Longest Substring Without Repeating Characters": '''def lengthOfLongestSubstring(s):
    seen, left, max_len = {}, 0, 0
    for right, ch in enumerate(s):
        if ch in seen and seen[ch] >= left:
            left = seen[ch] + 1
        seen[ch] = right
        max_len = max(max_len, right - left + 1)
    return max_len''',

    "Container With Most Water": '''def maxArea(height):
    l, r, max_area = 0, len(height) - 1, 0
    while l < r:
        max_area = max(max_area, (r - l) * min(height[l], height[r]))
        if height[l] < height[r]:
            l += 1
        else:
            r -= 1
    return max_area''',

    "Median of Two Sorted Arrays": '''def findMedianSortedArrays(nums1, nums2):
    combined = sorted(nums1 + nums2)
    n = len(combined)
    return combined[n // 2] if n % 2 == 1 else (combined[n // 2 - 1] + combined[n // 2]) / 2.0'''
}

# ---------------------------
# Generators mapping
# ---------------------------
generators = {
    "Two Sum": generate_two_sum_cases,
    "Reverse String": generate_reverse_string_cases,
    "Valid Parentheses": generate_valid_parentheses_cases,
    "Merge Two Sorted Lists": generate_merge_sorted_lists_cases,
    "Maximum Subarray": generate_max_subarray_cases,
    "Climbing Stairs": generate_climbing_stairs_cases,
    "Search in Rotated Sorted Array": generate_rotated_array_cases,
    "Longest Substring Without Repeating Characters": generate_longest_substring_cases,
    "Container With Most Water": generate_container_water_cases,
    "Median of Two Sorted Arrays": generate_median_sorted_arrays_cases
}

# ---------------------------
# Update DB
# ---------------------------
for problem in problems.find():
    title = problem["title"]
    update_data = {}

    if title in generators:
        cases = generators[title]()
        update_data["test_cases"] = cases
        print(f"✅ Updated {title} with {len(cases)} test cases")
    else:
        print(f"⚠️ No generator for {title}, skipped test cases")

    if title in function_templates:
        update_data["function_template"] = function_templates[title]
        print(f"✅ Added function template for {title}")
    else:
        print(f"⚠️ No function template for {title}, skipped template")

    if update_data:
        problems.update_one({"_id": problem["_id"]}, {"$set": update_data})
