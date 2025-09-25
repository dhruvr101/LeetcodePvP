from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client.auth_db
problems = db.problems

sample_problems = [
    {
        "title": "Two Sum",
        "description": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        "difficulty": "Easy",
        "test_cases": [
            {"input": {"nums": [2, 7, 11, 15], "target": 9}, "output": [0, 1]},
            {"input": {"nums": [3, 2, 4], "target": 6}, "output": [1, 2]},
        ],
    },
    {
        "title": "Reverse String",
        "description": "Write a function that reverses a string. The input string is given as an array of characters s.",
        "difficulty": "Easy",
        "test_cases": [
            {"input": {"s": ["h", "e", "l", "l", "o"]}, "output": ["o", "l", "l", "e", "h"]},
            {"input": {"s": ["H", "a", "n", "n", "a", "h"]}, "output": ["h", "a", "n", "n", "a", "H"]},
        ],
    },
    {
        "title": "Valid Parentheses",
        "description": "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
        "difficulty": "Easy",
        "test_cases": [
            {"input": {"s": "()"}, "output": True},
            {"input": {"s": "([)]"}, "output": False},
        ],
    },
    {
        "title": "Merge Two Sorted Lists",
        "description": "Merge two sorted linked lists and return it as a sorted list.",
        "difficulty": "Easy",
        "test_cases": [
            {"input": {"list1": [1, 2, 4], "list2": [1, 3, 4]}, "output": [1, 1, 2, 3, 4, 4]},
            {"input": {"list1": [], "list2": [0]}, "output": [0]},
        ],
    },
    {
        "title": "Maximum Subarray",
        "description": "Given an integer array nums, find the contiguous subarray with the largest sum.",
        "difficulty": "Medium",
        "test_cases": [
            {"input": {"nums": [-2,1,-3,4,-1,2,1,-5,4]}, "output": 6},
            {"input": {"nums": [1]}, "output": 1},
        ],
    },
    {
        "title": "Climbing Stairs",
        "description": "You are climbing a staircase. It takes n steps to reach the top. Each time you can climb 1 or 2 steps.",
        "difficulty": "Easy",
        "test_cases": [
            {"input": {"n": 2}, "output": 2},
            {"input": {"n": 3}, "output": 3},
        ],
    },
    {
        "title": "Search in Rotated Sorted Array",
        "description": "Given the array nums which is sorted in ascending order and rotated at some pivot, search for target.",
        "difficulty": "Medium",
        "test_cases": [
            {"input": {"nums": [4,5,6,7,0,1,2], "target": 0}, "output": 4},
            {"input": {"nums": [4,5,6,7,0,1,2], "target": 3}, "output": -1},
        ],
    },
    {
        "title": "Longest Substring Without Repeating Characters",
        "description": "Given a string s, find the length of the longest substring without repeating characters.",
        "difficulty": "Medium",
        "test_cases": [
            {"input": {"s": "abcabcbb"}, "output": 3},
            {"input": {"s": "bbbbb"}, "output": 1},
        ],
    },
    {
        "title": "Container With Most Water",
        "description": "Given n non-negative integers a1, a2, ..., an , where each represents a point at coordinate (i, ai). Find two lines which together form a container that holds the most water.",
        "difficulty": "Medium",
        "test_cases": [
            {"input": {"height": [1,8,6,2,5,4,8,3,7]}, "output": 49},
            {"input": {"height": [1,1]}, "output": 1},
        ],
    },
    {
        "title": "Median of Two Sorted Arrays",
        "description": "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
        "difficulty": "Hard",
        "test_cases": [
            {"input": {"nums1": [1,3], "nums2": [2]}, "output": 2.0},
            {"input": {"nums1": [1,2], "nums2": [3,4]}, "output": 2.5},
        ],
    },
]

# Insert problems
problems.insert_many(sample_problems)
print("✅ Inserted 10 sample problems into 'auth_db.problems'")
