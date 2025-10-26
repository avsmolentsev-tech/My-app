#!/usr/bin/env python3

# Script to fix remaining .dict() calls in server.py

import re

# Read the file
with open('/app/backend/server.py', 'r') as f:
    content = f.read()

# Replace remaining .dict() calls
replacements = [
    (r'await db\.habits\.insert_one\(habit\.dict\(\)\)', 'await db.habits.insert_one(serialize_for_mongo(habit))'),
    (r'return \{"message": "Habit created", "habit": habit\.dict\(\)\}', 'return {"message": "Habit created", "habit": serialize_for_mongo(habit)}'),
    (r'\{"\$set": data\.dict\(\)\}', '{"$set": serialize_for_mongo(data)}'),
    (r'\{"\$set": habit_log\.dict\(\)\}', '{"$set": serialize_for_mongo(habit_log)}'),
    (r'await db\.summaries\.insert_one\(summary\.dict\(\)\)', 'await db.summaries.insert_one(serialize_for_mongo(summary))'),
    (r'return \{"summary": summary\.dict\(\)\}', 'return {"summary": serialize_for_mongo(summary)}')
]

for pattern, replacement in replacements:
    content = re.sub(pattern, replacement, content)

# Write back
with open('/app/backend/server.py', 'w') as f:
    f.write(content)

print("Fixed remaining .dict() calls")
