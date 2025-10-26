#!/usr/bin/env python3
"""
Comprehensive Backend API Testing with Real Authentication
Tests all endpoints with actual database session
"""

import asyncio
import httpx
import json
import uuid
from datetime import datetime, date, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

BACKEND_URL = "https://cyclewise-14.preview.emergentagent.com/api"

class ComprehensiveAPITester:
    def __init__(self):
        self.user_id = None
        self.session_token = None
        self.test_results = []
        self.mongo_client = None
        self.db = None
        
    async def setup_real_auth(self):
        """Create a real user and session in the database"""
        try:
            self.mongo_client = AsyncIOMotorClient("mongodb://localhost:27017")
            self.db = self.mongo_client["test_database"]
            
            # Create test user
            self.user_id = str(uuid.uuid4())
            test_user = {
                "id": self.user_id,
                "email": "testuser@cyclewise.com",
                "name": "Test User",
                "picture": "https://example.com/avatar.jpg",
                "created_at": datetime.now(timezone.utc)
            }
            await self.db.users.insert_one(test_user)
            
            # Create test session
            self.session_token = f"test-session-{uuid.uuid4()}"
            test_session = {
                "user_id": self.user_id,
                "session_token": self.session_token,
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
                "created_at": datetime.now(timezone.utc)
            }
            await self.db.user_sessions.insert_one(test_session)
            
            print(f"✅ Created test user: {self.user_id}")
            print(f"✅ Created test session: {self.session_token}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to setup auth: {e}")
            return False
    
    async def cleanup_auth(self):
        """Clean up test data"""
        try:
            if self.db and self.user_id:
                await self.db.users.delete_one({"id": self.user_id})
                await self.db.user_sessions.delete_one({"session_token": self.session_token})
                await self.db.cycle_settings.delete_many({"user_id": self.user_id})
                await self.db.water_tracker.delete_many({"user_id": self.user_id})
                await self.db.journal_entries.delete_many({"user_id": self.user_id})
                await self.db.habits.delete_many({"user_id": self.user_id})
                await self.db.habit_logs.delete_many({"user_id": self.user_id})
                await self.db.summaries.delete_many({"user_id": self.user_id})
                print("✅ Cleaned up test data")
            
            if self.mongo_client:
                self.mongo_client.close()
                
        except Exception as e:
            print(f"⚠️ Cleanup error: {e}")
    
    def log_result(self, test_name: str, success: bool, details: str = "", response_data=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data:
            result["response"] = response_data
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
    
    async def test_all_endpoints(self):
        """Test all backend endpoints with real authentication"""
        headers = {
            "Authorization": f"Bearer {self.session_token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            
            # 1. Test Auth Endpoints
            print("\n🔐 Testing Authentication Endpoints")
            print("-" * 40)
            
            # Test /auth/me
            try:
                response = await client.get(f"{BACKEND_URL}/auth/me", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("id") == self.user_id:
                        self.log_result("GET /auth/me", True, f"User retrieved: {data['email']}")
                    else:
                        self.log_result("GET /auth/me", False, f"Wrong user returned: {data}")
                else:
                    self.log_result("GET /auth/me", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("GET /auth/me", False, f"Error: {e}")
            
            # 2. Test Onboarding
            print("\n📝 Testing Onboarding")
            print("-" * 40)
            
            onboarding_data = {
                "last_period_start": "2025-01-15",
                "avg_cycle_length": 28,
                "period_length": 5,
                "luteal_length": 14
            }
            
            try:
                response = await client.post(f"{BACKEND_URL}/onboarding", json=onboarding_data, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "settings" in data:
                        self.log_result("POST /onboarding", True, "Onboarding completed successfully")
                    else:
                        self.log_result("POST /onboarding", False, f"Missing settings: {data}")
                else:
                    self.log_result("POST /onboarding", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result("POST /onboarding", False, f"Error: {e}")
            
            # 3. Test Cycle Endpoints
            print("\n🔄 Testing Cycle Endpoints")
            print("-" * 40)
            
            # GET cycle settings
            try:
                response = await client.get(f"{BACKEND_URL}/cycle/settings", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("user_id") == self.user_id:
                        self.log_result("GET /cycle/settings", True, f"Settings retrieved: cycle_length={data.get('avg_cycle_length')}")
                    else:
                        self.log_result("GET /cycle/settings", False, f"Invalid settings: {data}")
                else:
                    self.log_result("GET /cycle/settings", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("GET /cycle/settings", False, f"Error: {e}")
            
            # GET cycle today
            try:
                response = await client.get(f"{BACKEND_URL}/cycle/today", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "has_settings" in data and "cycle_day" in data:
                        self.log_result("GET /cycle/today", True, f"Today info: cycle_day={data.get('cycle_day')}, has_settings={data.get('has_settings')}")
                    else:
                        self.log_result("GET /cycle/today", False, f"Invalid format: {data}")
                else:
                    self.log_result("GET /cycle/today", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("GET /cycle/today", False, f"Error: {e}")
            
            # GET cycle calendar
            start_date = "2025-01-01"
            end_date = "2025-01-31"
            try:
                response = await client.get(f"{BACKEND_URL}/cycle/calendar?start_date={start_date}&end_date={end_date}", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "calendar" in data:
                        calendar_days = len(data["calendar"])
                        self.log_result("GET /cycle/calendar", True, f"Calendar retrieved: {calendar_days} days")
                    else:
                        self.log_result("GET /cycle/calendar", False, f"Missing calendar: {data}")
                else:
                    self.log_result("GET /cycle/calendar", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("GET /cycle/calendar", False, f"Error: {e}")
            
            # GET cycle reminders
            try:
                response = await client.get(f"{BACKEND_URL}/cycle/reminders", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "reminders" in data:
                        self.log_result("GET /cycle/reminders", True, f"Reminders retrieved: {len(data['reminders'])} items")
                    else:
                        self.log_result("GET /cycle/reminders", False, f"Missing reminders: {data}")
                else:
                    self.log_result("GET /cycle/reminders", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("GET /cycle/reminders", False, f"Error: {e}")
            
            # 4. Test Water Tracker
            print("\n💧 Testing Water Tracker")
            print("-" * 40)
            
            # GET water today
            try:
                response = await client.get(f"{BACKEND_URL}/water/today", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "consumed_ml" in data and "goal_ml" in data:
                        self.log_result("GET /water/today", True, f"Water data: {data['consumed_ml']}/{data['goal_ml']} ml")
                    else:
                        self.log_result("GET /water/today", False, f"Invalid format: {data}")
                else:
                    self.log_result("GET /water/today", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("GET /water/today", False, f"Error: {e}")
            
            # POST add water
            try:
                water_data = {"ml": 250}
                response = await client.post(f"{BACKEND_URL}/water/add", json=water_data, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "consumed_ml" in data:
                        self.log_result("POST /water/add", True, f"Water added: {data['consumed_ml']} ml total")
                    else:
                        self.log_result("POST /water/add", False, f"Invalid response: {data}")
                else:
                    self.log_result("POST /water/add", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("POST /water/add", False, f"Error: {e}")
            
            # 5. Test Journal
            print("\n📔 Testing Journal")
            print("-" * 40)
            
            # POST journal entry
            journal_data = {
                "date": date.today().isoformat(),
                "good_1": "Had a wonderful morning meditation session",
                "good_2": "Enjoyed a nutritious breakfast with fresh fruits",
                "good_3": "Completed my daily exercise routine",
                "self_praise": "I'm proud of maintaining my healthy habits consistently",
                "mood": 8,
                "energy": 7,
                "notes": "Feeling balanced and grateful today. The weather is perfect for outdoor activities."
            }
            
            try:
                response = await client.post(f"{BACKEND_URL}/journal", json=journal_data, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "entry" in data:
                        self.log_result("POST /journal", True, f"Journal entry created for {journal_data['date']}")
                    else:
                        self.log_result("POST /journal", False, f"Invalid response: {data}")
                else:
                    self.log_result("POST /journal", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("POST /journal", False, f"Error: {e}")
            
            # GET journal entries
            try:
                response = await client.get(f"{BACKEND_URL}/journal", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "entries" in data:
                        entries_count = len(data["entries"])
                        self.log_result("GET /journal", True, f"Retrieved {entries_count} journal entries")
                    else:
                        self.log_result("GET /journal", False, f"Invalid format: {data}")
                else:
                    self.log_result("GET /journal", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("GET /journal", False, f"Error: {e}")
            
            # 6. Test Habits
            print("\n🎯 Testing Habits")
            print("-" * 40)
            
            # POST create habit
            habit_data = {
                "title": "Daily Mindfulness Practice",
                "type": "boolean",
                "target": None,
                "days_of_week": [0, 1, 2, 3, 4, 5, 6],
                "reminders": ["08:00", "20:00"]
            }
            
            habit_id = None
            try:
                response = await client.post(f"{BACKEND_URL}/habits", json=habit_data, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "habit" in data and "id" in data["habit"]:
                        habit_id = data["habit"]["id"]
                        self.log_result("POST /habits", True, f"Habit created: {data['habit']['title']}")
                    else:
                        self.log_result("POST /habits", False, f"Invalid response: {data}")
                else:
                    self.log_result("POST /habits", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("POST /habits", False, f"Error: {e}")
            
            # GET habits
            try:
                response = await client.get(f"{BACKEND_URL}/habits", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "habits" in data:
                        habits_count = len(data["habits"])
                        self.log_result("GET /habits", True, f"Retrieved {habits_count} habits")
                        if not habit_id and data["habits"]:
                            habit_id = data["habits"][0]["id"]
                    else:
                        self.log_result("GET /habits", False, f"Invalid format: {data}")
                else:
                    self.log_result("GET /habits", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("GET /habits", False, f"Error: {e}")
            
            # POST habit log (if we have a habit)
            if habit_id:
                try:
                    log_data = {"completed": True, "value": None}
                    response = await client.post(f"{BACKEND_URL}/habits/{habit_id}/log", json=log_data, headers=headers)
                    if response.status_code == 200:
                        self.log_result("POST /habits/{id}/log", True, f"Habit logged successfully")
                    else:
                        self.log_result("POST /habits/{id}/log", False, f"Status: {response.status_code}")
                except Exception as e:
                    self.log_result("POST /habits/{id}/log", False, f"Error: {e}")
            
            # 7. Test AI Tips
            print("\n🤖 Testing AI Tips")
            print("-" * 40)
            
            try:
                response = await client.get(f"{BACKEND_URL}/tips/daily", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "tip" in data and "timestamp" in data:
                        tip_preview = data["tip"][:60] + "..." if len(data["tip"]) > 60 else data["tip"]
                        self.log_result("GET /tips/daily", True, f"AI tip generated: '{tip_preview}'")
                    else:
                        self.log_result("GET /tips/daily", False, f"Invalid format: {data}")
                else:
                    self.log_result("GET /tips/daily", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("GET /tips/daily", False, f"Error: {e}")
            
            # 8. Test Summaries
            print("\n📊 Testing Summaries")
            print("-" * 40)
            
            # Generate monthly summary
            try:
                response = await client.get(f"{BACKEND_URL}/summaries/generate?period_type=monthly", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if "summary" in data:
                        summary = data["summary"]
                        self.log_result("GET /summaries/generate", True, f"Monthly summary generated: {summary.get('positive_entries_count', 0)} positive entries")
                    elif "message" in data and "No entries found" in data["message"]:
                        self.log_result("GET /summaries/generate", True, "No entries found for summary (expected for new user)")
                    else:
                        self.log_result("GET /summaries/generate", False, f"Invalid response: {data}")
                else:
                    self.log_result("GET /summaries/generate", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result("GET /summaries/generate", False, f"Error: {e}")
    
    async def run_comprehensive_test(self):
        """Run the complete test suite"""
        print("🧪 Comprehensive Cycle Tracking Backend API Test")
        print("=" * 60)
        
        # Setup authentication
        if not await self.setup_real_auth():
            print("❌ Failed to setup authentication. Aborting tests.")
            return
        
        try:
            # Run all tests
            await self.test_all_endpoints()
            
            # Print summary
            print("\n" + "=" * 60)
            print("📊 COMPREHENSIVE TEST SUMMARY")
            print("=" * 60)
            
            total_tests = len(self.test_results)
            passed_tests = len([r for r in self.test_results if r["success"]])
            failed_tests = total_tests - passed_tests
            
            print(f"Total Tests: {total_tests}")
            print(f"✅ Passed: {passed_tests}")
            print(f"❌ Failed: {failed_tests}")
            print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
            
            if failed_tests > 0:
                print("\n🔍 FAILED TESTS:")
                for result in self.test_results:
                    if not result["success"]:
                        print(f"  ❌ {result['test']}: {result['details']}")
            
            print("\n📋 ALL TEST RESULTS:")
            for result in self.test_results:
                status = "✅" if result["success"] else "❌"
                print(f"  {status} {result['test']}")
            
            # Save detailed results
            with open("/app/comprehensive_test_results.json", "w") as f:
                json.dump(self.test_results, f, indent=2, default=str)
            
            print(f"\n💾 Detailed results saved to: /app/comprehensive_test_results.json")
            
        finally:
            # Always cleanup
            await self.cleanup_auth()

async def main():
    """Main test runner"""
    tester = ComprehensiveAPITester()
    await tester.run_comprehensive_test()

if __name__ == "__main__":
    asyncio.run(main())