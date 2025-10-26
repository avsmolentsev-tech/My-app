#!/usr/bin/env python3
"""
Debug the failing endpoints to understand the ObjectId serialization issue
"""

import asyncio
import httpx
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

BACKEND_URL = "https://cyclewise-14.preview.emergentagent.com/api"

async def debug_failing_endpoints():
    """Debug the specific failing endpoints"""
    
    # Setup auth
    mongo_client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = mongo_client["test_database"]
    
    user_id = str(uuid.uuid4())
    session_token = f"debug-session-{uuid.uuid4()}"
    
    # Create test user and session
    test_user = {
        "id": user_id,
        "email": "debug@test.com",
        "name": "Debug User",
        "created_at": datetime.now(timezone.utc)
    }
    await db.users.insert_one(test_user)
    
    test_session = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(test_session)
    
    headers = {"Authorization": f"Bearer {session_token}"}
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            
            print("🔍 Debugging Journal GET endpoint")
            print("-" * 40)
            
            # First create a journal entry
            journal_data = {
                "date": "2025-10-26",
                "good_1": "Test entry",
                "mood": 5,
                "energy": 5
            }
            
            response = await client.post(f"{BACKEND_URL}/journal", json=journal_data, headers=headers)
            print(f"POST /journal status: {response.status_code}")
            
            # Now try to get journal entries
            response = await client.get(f"{BACKEND_URL}/journal", headers=headers)
            print(f"GET /journal status: {response.status_code}")
            if response.status_code != 200:
                print(f"Error response: {response.text}")
            
            # Check what's in the database
            print("\n📊 Checking database content:")
            journal_entries = await db.journal_entries.find({"user_id": user_id}).to_list(10)
            print(f"Journal entries in DB: {len(journal_entries)}")
            for entry in journal_entries:
                print(f"  Entry keys: {list(entry.keys())}")
                print(f"  Entry _id type: {type(entry.get('_id'))}")
                print(f"  Entry sample: {str(entry)[:200]}...")
            
            print("\n🔍 Debugging Habits GET endpoint")
            print("-" * 40)
            
            # First create a habit
            habit_data = {
                "title": "Debug Habit",
                "type": "boolean",
                "days_of_week": [0, 1, 2, 3, 4, 5, 6],
                "reminders": []
            }
            
            response = await client.post(f"{BACKEND_URL}/habits", json=habit_data, headers=headers)
            print(f"POST /habits status: {response.status_code}")
            
            # Now try to get habits
            response = await client.get(f"{BACKEND_URL}/habits", headers=headers)
            print(f"GET /habits status: {response.status_code}")
            if response.status_code != 200:
                print(f"Error response: {response.text}")
            
            # Check what's in the database
            print("\n📊 Checking habits in database:")
            habits = await db.habits.find({"user_id": user_id}).to_list(10)
            print(f"Habits in DB: {len(habits)}")
            for habit in habits:
                print(f"  Habit keys: {list(habit.keys())}")
                print(f"  Habit _id type: {type(habit.get('_id'))}")
                print(f"  Habit sample: {str(habit)[:200]}...")
    
    finally:
        # Cleanup
        await db.users.delete_one({"id": user_id})
        await db.user_sessions.delete_one({"session_token": session_token})
        await db.journal_entries.delete_many({"user_id": user_id})
        await db.habits.delete_many({"user_id": user_id})
        mongo_client.close()

if __name__ == "__main__":
    asyncio.run(debug_failing_endpoints())