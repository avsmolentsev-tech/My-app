#!/usr/bin/env python3
"""
Detailed Backend API Testing to investigate 500 errors
"""

import asyncio
import httpx
import json
from datetime import datetime, date

BACKEND_URL = "https://cyclewise-14.preview.emergentagent.com/api"

async def test_with_real_auth():
    """Test with a real authentication attempt"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("🔍 Testing Authentication Flow in Detail")
        print("=" * 50)
        
        # Test 1: Try to create a session with mock Emergent Auth
        print("\n1. Testing session creation with mock session ID...")
        try:
            response = await client.post(
                f"{BACKEND_URL}/auth/session",
                headers={"X-Session-ID": "mock-session-123"}
            )
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 2: Try to access protected endpoint without auth
        print("\n2. Testing protected endpoint without auth...")
        try:
            response = await client.get(f"{BACKEND_URL}/cycle/today")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text}")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 3: Try to access with fake Bearer token
        print("\n3. Testing with fake Bearer token...")
        try:
            headers = {"Authorization": "Bearer fake-token-123"}
            response = await client.get(f"{BACKEND_URL}/cycle/today", headers=headers)
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 4: Try to access /auth/me with fake token
        print("\n4. Testing /auth/me with fake token...")
        try:
            headers = {"Authorization": "Bearer fake-token-123"}
            response = await client.get(f"{BACKEND_URL}/auth/me", headers=headers)
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 5: Check if we can connect to MongoDB directly
        print("\n5. Testing MongoDB connection...")
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            client_mongo = AsyncIOMotorClient("mongodb://localhost:27017")
            db = client_mongo["test_database"]
            # Try to list collections
            collections = await db.list_collection_names()
            print(f"   MongoDB connected successfully. Collections: {collections}")
            await client_mongo.close()
        except Exception as e:
            print(f"   MongoDB connection error: {e}")
        
        # Test 6: Test onboarding with fake auth
        print("\n6. Testing onboarding with fake auth...")
        try:
            headers = {"Authorization": "Bearer fake-token-123"}
            data = {
                "last_period_start": "2025-01-15",
                "avg_cycle_length": 28,
                "period_length": 5,
                "luteal_length": 14
            }
            response = await client.post(f"{BACKEND_URL}/onboarding", json=data, headers=headers)
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:300]}...")
        except Exception as e:
            print(f"   Error: {e}")

async def test_database_operations():
    """Test direct database operations"""
    print("\n🗄️ Testing Database Operations")
    print("=" * 50)
    
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import uuid
        from datetime import datetime, timezone
        
        client = AsyncIOMotorClient("mongodb://localhost:27017")
        db = client["test_database"]
        
        # Test 1: Create a test user
        print("\n1. Creating test user...")
        test_user = {
            "id": str(uuid.uuid4()),
            "email": "test@example.com",
            "name": "Test User",
            "created_at": datetime.now(timezone.utc)
        }
        result = await db.users.insert_one(test_user)
        print(f"   User created with ID: {result.inserted_id}")
        
        # Test 2: Create a test session
        print("\n2. Creating test session...")
        test_session = {
            "user_id": test_user["id"],
            "session_token": "test-session-token-123",
            "expires_at": datetime.now(timezone.utc).replace(hour=23, minute=59),
            "created_at": datetime.now(timezone.utc)
        }
        result = await db.user_sessions.insert_one(test_session)
        print(f"   Session created with ID: {result.inserted_id}")
        
        # Test 3: Test API with real session token
        print("\n3. Testing API with real session token...")
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            headers = {"Authorization": "Bearer test-session-token-123"}
            response = await http_client.get(f"{BACKEND_URL}/auth/me", headers=headers)
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            
            # Test onboarding with real token
            print("\n4. Testing onboarding with real session...")
            data = {
                "last_period_start": "2025-01-15",
                "avg_cycle_length": 28,
                "period_length": 5,
                "luteal_length": 14
            }
            response = await http_client.post(f"{BACKEND_URL}/onboarding", json=data, headers=headers)
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:300]}...")
            
            # Test cycle/today with real token
            print("\n5. Testing cycle/today with real session...")
            response = await http_client.get(f"{BACKEND_URL}/cycle/today", headers=headers)
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:300]}...")
        
        # Cleanup
        print("\n6. Cleaning up test data...")
        await db.users.delete_one({"id": test_user["id"]})
        await db.user_sessions.delete_one({"session_token": "test-session-token-123"})
        print("   Cleanup completed")
        
        await client.close()
        
    except Exception as e:
        print(f"   Database operation error: {e}")

async def main():
    """Run detailed tests"""
    await test_with_real_auth()
    await test_database_operations()

if __name__ == "__main__":
    asyncio.run(main())