from fastapi import FastAPI, APIRouter, HTTPException, Header, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta, date as date_type

# Import models and utilities
from models import (
    User, UserSession, SessionData, CycleSettings, CycleDay, 
    JournalEntry, WaterTracker, WaterUpdate, Habit, HabitLog, 
    HabitCreate, HabitLogUpdate, OnboardingData, JournalEntryCreate,
    Summary, PeriodType
)
from auth import get_session_data, verify_session
from cycle_utils import (
    calculate_ovulation_date, calculate_fertile_window,
    calculate_next_period_date, get_cycle_day, get_days_past_ovulation,
    generate_calendar_data, get_ovulation_reminder_dates
)
from ai_service import generate_health_tip, generate_journal_summary


def serialize_for_mongo(obj):
    """Convert Pydantic model to MongoDB-compatible dict"""
    if hasattr(obj, 'dict'):
        data = obj.dict()
    else:
        data = obj
    
    # Convert date objects to ISO strings
    for key, value in data.items():
        if isinstance(value, date_type):
            data[key] = value.isoformat()
        elif isinstance(value, datetime):
            data[key] = value
    
    return data


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/session")
async def process_session(
    request: Request,
    x_session_id: Optional[str] = Header(None)
):
    """Обработать session_id и создать сессию пользователя"""
    
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID header")
    
    # Получить данные от Emergent Auth
    session_data = await get_session_data(x_session_id)
    
    # Проверить существует ли пользователь
    user = await db.users.find_one({"email": session_data["email"]})
    
    if not user:
        # Создать нового пользователя
        user_obj = User(
            id=session_data["id"],
            email=session_data["email"],
            name=session_data.get("name"),
            picture=session_data.get("picture")
        )
        await db.users.insert_one(serialize_for_mongo(user_obj))
        user_id = user_obj.id
    else:
        user_id = user["id"]
    
    # Создать сессию
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = UserSession(
        user_id=user_id,
        session_token=session_data["session_token"],
        expires_at=expires_at
    )
    
    await db.user_sessions.insert_one(serialize_for_mongo(session))
    
    # Вернуть данные и установить cookie
    response = JSONResponse(content={
        "id": user_id,
        "email": session_data["email"],
        "name": session_data.get("name"),
        "picture": session_data.get("picture"),
        "session_token": session_data["session_token"]
    })
    
    response.set_cookie(
        key="session_token",
        value=session_data["session_token"],
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/"
    )
    
    return response


@api_router.get("/auth/me")
async def get_current_user(request: Request, authorization: Optional[str] = Header(None)):
    """Получить текущего пользователя"""
    user_id = await verify_session(db, request, authorization)
    user = await db.users.find_one({"id": user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user)


@api_router.post("/auth/logout")
async def logout(request: Request, authorization: Optional[str] = Header(None)):
    """Выйти из системы"""
    session_token = request.cookies.get("session_token")
    
    if not session_token and authorization:
        if authorization.startswith("Bearer "):
            session_token = authorization[7:]
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(key="session_token", path="/")
    return response


# ============= ONBOARDING & CYCLE ENDPOINTS =============

@api_router.post("/onboarding")
async def save_onboarding(
    data: OnboardingData,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Сохранить данные онбординга"""
    user_id = await verify_session(db, request, authorization)
    
    last_period_date = date_type.fromisoformat(data.last_period_start)
    
    settings = CycleSettings(
        user_id=user_id,
        avg_cycle_length=data.avg_cycle_length,
        period_length=data.period_length,
        luteal_length=data.luteal_length,
        last_period_start=last_period_date
    )
    
    # Upsert settings
    await db.cycle_settings.update_one(
        {"user_id": user_id},
        {"$set": serialize_for_mongo(settings)},
        upsert=True
    )
    
    return {"message": "Onboarding completed", "settings": serialize_for_mongo(settings)}


@api_router.get("/cycle/settings")
async def get_cycle_settings(request: Request, authorization: Optional[str] = Header(None)):
    """Получить настройки цикла"""
    user_id = await verify_session(db, request, authorization)
    
    settings = await db.cycle_settings.find_one({"user_id": user_id})
    if not settings:
        raise HTTPException(status_code=404, detail="Cycle settings not found. Complete onboarding first.")
    
    return CycleSettings(**settings)


@api_router.put("/cycle/settings")
async def update_cycle_settings(
    data: OnboardingData,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Обновить настройки цикла"""
    user_id = await verify_session(db, request, authorization)
    
    last_period_date = date_type.fromisoformat(data.last_period_start)
    
    settings = CycleSettings(
        user_id=user_id,
        avg_cycle_length=data.avg_cycle_length,
        period_length=data.period_length,
        luteal_length=data.luteal_length,
        last_period_start=last_period_date
    )
    
    await db.cycle_settings.update_one(
        {"user_id": user_id},
        {"$set": serialize_for_mongo(settings)},
        upsert=True
    )
    
    return {"message": "Settings updated", "settings": serialize_for_mongo(settings)}


@api_router.get("/cycle/calendar")
async def get_calendar(
    start_date: str,
    end_date: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Получить данные календаря"""
    user_id = await verify_session(db, request, authorization)
    
    settings_doc = await db.cycle_settings.find_one({"user_id": user_id})
    if not settings_doc:
        raise HTTPException(status_code=404, detail="Cycle settings not found")
    
    settings = CycleSettings(**settings_doc)
    
    start = date_type.fromisoformat(start_date)
    end = date_type.fromisoformat(end_date)
    
    calendar_data = generate_calendar_data(settings, start, end)
    
    return {"calendar": calendar_data}


@api_router.get("/cycle/today")
async def get_today_info(request: Request, authorization: Optional[str] = Header(None)):
    """Получить информацию о сегодняшнем дне цикла"""
    user_id = await verify_session(db, request, authorization)
    
    settings_doc = await db.cycle_settings.find_one({"user_id": user_id})
    if not settings_doc:
        return {"has_settings": False}
    
    settings = CycleSettings(**settings_doc)
    today = date_type.today()
    
    ovulation_date = calculate_ovulation_date(
        settings.last_period_start,
        settings.avg_cycle_length,
        settings.luteal_length
    )
    
    fertile_start, fertile_end = calculate_fertile_window(ovulation_date)
    next_period = calculate_next_period_date(settings.last_period_start, settings.avg_cycle_length)
    
    cycle_day = get_cycle_day(today, settings.last_period_start)
    dpo = get_days_past_ovulation(today, ovulation_date)
    
    is_period = settings.last_period_start <= today < settings.last_period_start + timedelta(days=settings.period_length)
    is_fertile = fertile_start <= today <= fertile_end
    is_ovulation = today == ovulation_date
    
    days_until_ovulation = (ovulation_date - today).days if ovulation_date > today else None
    
    return {
        "has_settings": True,
        "cycle_day": cycle_day,
        "dpo": dpo,
        "is_period": is_period,
        "is_fertile_window": is_fertile,
        "is_ovulation": is_ovulation,
        "days_until_ovulation": days_until_ovulation,
        "next_period_date": next_period.isoformat(),
        "ovulation_date": ovulation_date.isoformat()
    }


@api_router.get("/cycle/reminders")
async def get_cycle_reminders(request: Request, authorization: Optional[str] = Header(None)):
    """Получить даты напоминаний об овуляции"""
    user_id = await verify_session(db, request, authorization)
    
    settings_doc = await db.cycle_settings.find_one({"user_id": user_id})
    if not settings_doc:
        raise HTTPException(status_code=404, detail="Cycle settings not found")
    
    settings = CycleSettings(**settings_doc)
    
    ovulation_date = calculate_ovulation_date(
        settings.last_period_start,
        settings.avg_cycle_length,
        settings.luteal_length
    )
    
    reminders = get_ovulation_reminder_dates(ovulation_date)
    
    return {"reminders": reminders}


# ============= JOURNAL ENDPOINTS =============

@api_router.post("/journal")
async def create_journal_entry(
    data: JournalEntryCreate,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Создать дневниковую запись"""
    user_id = await verify_session(db, request, authorization)
    
    entry_date = date_type.fromisoformat(data.date)
    
    # Get cycle info
    settings_doc = await db.cycle_settings.find_one({"user_id": user_id})
    cycle_day = None
    pred_ovulation = None
    
    if settings_doc:
        settings = CycleSettings(**settings_doc)
        cycle_day = get_cycle_day(entry_date, settings.last_period_start)
        pred_ovulation = calculate_ovulation_date(
            settings.last_period_start,
            settings.avg_cycle_length,
            settings.luteal_length
        )
    
    # Get water data
    water_doc = await db.water_tracker.find_one({"user_id": user_id, "date": entry_date.isoformat()})
    water_total = water_doc["consumed_ml"] if water_doc else 0
    water_goal = water_doc["goal_ml"] if water_doc else 2000
    
    # Get habits data
    habits_today = await db.habit_logs.find({"user_id": user_id, "date": entry_date.isoformat()}).to_list(100)
    habits_json = {log["habit_id"]: {"completed": log["completed"], "value": log.get("value")} for log in habits_today}
    
    entry = JournalEntry(
        user_id=user_id,
        date=entry_date,
        cycle_day=cycle_day,
        predicted_ovulation_date=pred_ovulation,
        good_1=data.good_1,
        good_2=data.good_2,
        good_3=data.good_3,
        self_praise=data.self_praise,
        mood=data.mood,
        energy=data.energy,
        notes=data.notes,
        water_ml_total=water_total,
        water_target_ml=water_goal,
        habits_json=habits_json
    )
    
    # Upsert
    await db.journal_entries.update_one(
        {"user_id": user_id, "date": entry_date.isoformat()},
        {"$set": serialize_for_mongo(entry)},
        upsert=True
    )
    
    return {"message": "Journal entry saved", "entry": serialize_for_mongo(entry)}


@api_router.get("/journal")
async def get_journal_entries(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    request: Request = None,
    authorization: Optional[str] = Header(None)
):
    """Получить дневниковые записи"""
    user_id = await verify_session(db, request, authorization)
    
    query = {"user_id": user_id}
    
    if start_date and end_date:
        query["date"] = {
            "$gte": start_date,
            "$lte": end_date
        }
    
    entries = await db.journal_entries.find(query).sort("date", -1).to_list(1000)
    
    # Remove MongoDB _id field to avoid serialization issues
    for entry in entries:
        entry.pop('_id', None)
    
    return {"entries": entries}


@api_router.get("/journal/{date}")
async def get_journal_entry(
    date: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Получить запись за конкретную дату"""
    user_id = await verify_session(db, request, authorization)
    
    entry = await db.journal_entries.find_one({"user_id": user_id, "date": date})
    
    if not entry:
        return {"entry": None}
    
    return {"entry": entry}


# ============= WATER TRACKER ENDPOINTS =============

@api_router.get("/water/today")
async def get_water_today(request: Request, authorization: Optional[str] = Header(None)):
    """Получить данные о воде за сегодня"""
    user_id = await verify_session(db, request, authorization)
    today = date_type.today().isoformat()
    
    water = await db.water_tracker.find_one({"user_id": user_id, "date": today})
    
    if not water:
        water = WaterTracker(
            user_id=user_id,
            date=date_type.today(),
            consumed_ml=0,
            goal_ml=2000,
            glass_ml=250
        )
        await db.water_tracker.insert_one(serialize_for_mongo(water))
    
    return WaterTracker(**water) if isinstance(water, dict) else water


@api_router.post("/water/add")
async def add_water(
    data: WaterUpdate,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Добавить воду"""
    user_id = await verify_session(db, request, authorization)
    today = date_type.today().isoformat()
    
    water = await db.water_tracker.find_one({"user_id": user_id, "date": today})
    
    if not water:
        water = {
            "user_id": user_id,
            "date": today,
            "consumed_ml": 0,
            "goal_ml": 2000,
            "glass_ml": 250,
            "log": []
        }
    
    new_consumed = water["consumed_ml"] + data.ml
    log_entry = {"time": datetime.now(timezone.utc).isoformat(), "ml": data.ml}
    
    await db.water_tracker.update_one(
        {"user_id": user_id, "date": today},
        {
            "$set": {"consumed_ml": new_consumed, "updated_at": datetime.now(timezone.utc)},
            "$push": {"log": log_entry}
        },
        upsert=True
    )
    
    return {"consumed_ml": new_consumed, "goal_ml": water["goal_ml"]}


@api_router.put("/water/settings")
async def update_water_settings(
    goal_ml: int,
    glass_ml: int,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Обновить настройки воды"""
    user_id = await verify_session(db, request, authorization)
    today = date_type.today().isoformat()
    
    await db.water_tracker.update_one(
        {"user_id": user_id, "date": today},
        {"$set": {"goal_ml": goal_ml, "glass_ml": glass_ml}},
        upsert=True
    )
    
    return {"message": "Water settings updated"}


# ============= HABITS ENDPOINTS =============

@api_router.post("/habits")
async def create_habit(
    data: HabitCreate,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Создать привычку"""
    user_id = await verify_session(db, request, authorization)
    
    habit = Habit(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=data.title,
        type=data.type,
        target=data.target,
        days_of_week=data.days_of_week,
        reminders=data.reminders
    )
    
    await db.habits.insert_one(serialize_for_mongo(habit))
    
    return {"message": "Habit created", "habit": serialize_for_mongo(habit)}


@api_router.get("/habits")
async def get_habits(request: Request, authorization: Optional[str] = Header(None)):
    """Получить все привычки"""
    user_id = await verify_session(db, request, authorization)
    
    habits = await db.habits.find({"user_id": user_id, "is_active": True}).to_list(100)
    
    return {"habits": habits}


@api_router.put("/habits/{habit_id}")
async def update_habit(
    habit_id: str,
    data: HabitCreate,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Обновить привычку"""
    user_id = await verify_session(db, request, authorization)
    
    await db.habits.update_one(
        {"id": habit_id, "user_id": user_id},
        {"$set": serialize_for_mongo(data)}
    )
    
    return {"message": "Habit updated"}


@api_router.delete("/habits/{habit_id}")
async def delete_habit(
    habit_id: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Удалить привычку"""
    user_id = await verify_session(db, request, authorization)
    
    await db.habits.update_one(
        {"id": habit_id, "user_id": user_id},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Habit deleted"}


@api_router.post("/habits/{habit_id}/log")
async def log_habit(
    habit_id: str,
    data: HabitLogUpdate,
    date: Optional[str] = None,
    request: Request = None,
    authorization: Optional[str] = Header(None)
):
    """Отметить выполнение привычки"""
    user_id = await verify_session(db, request, authorization)
    
    log_date = date if date else date_type.today().isoformat()
    
    habit_log = HabitLog(
        habit_id=habit_id,
        user_id=user_id,
        date=date_type.fromisoformat(log_date),
        completed=data.completed,
        value=data.value
    )
    
    await db.habit_logs.update_one(
        {"habit_id": habit_id, "user_id": user_id, "date": log_date},
        {"$set": serialize_for_mongo(habit_log)},
        upsert=True
    )
    
    return {"message": "Habit logged"}


@api_router.get("/habits/{habit_id}/logs")
async def get_habit_logs(
    habit_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    request: Request = None,
    authorization: Optional[str] = Header(None)
):
    """Получить логи привычки"""
    user_id = await verify_session(db, request, authorization)
    
    query = {"habit_id": habit_id, "user_id": user_id}
    
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    logs = await db.habit_logs.find(query).sort("date", -1).to_list(1000)
    
    return {"logs": logs}


# ============= AI TIPS ENDPOINT =============

@api_router.get("/tips/daily")
async def get_daily_tip(request: Request, authorization: Optional[str] = Header(None)):
    """Получить ежедневный совет"""
    user_id = await verify_session(db, request, authorization)
    
    # Get context
    today_info = await get_today_info(request, authorization)
    
    context = {}
    if today_info.get("has_settings"):
        context = {
            "cycle_day": today_info.get("cycle_day"),
            "is_period": today_info.get("is_period"),
            "is_fertile_window": today_info.get("is_fertile_window")
        }
        
        # Get recent mood
        recent_entries = await db.journal_entries.find(
            {"user_id": user_id}
        ).sort("date", -1).limit(3).to_list(3)
        
        if recent_entries:
            moods = [e.get("mood") for e in recent_entries if e.get("mood")]
            if moods:
                context["recent_mood"] = sum(moods) / len(moods)
    
    tip = await generate_health_tip(context)
    
    return {"tip": tip, "timestamp": datetime.now(timezone.utc).isoformat()}


# ============= SUMMARIES ENDPOINT =============

@api_router.get("/summaries/generate")
async def generate_summary(
    period_type: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Генерировать сводку"""
    user_id = await verify_session(db, request, authorization)
    
    today = date_type.today()
    
    if period_type == "monthly":
        start_date = today.replace(day=1)
        end_date = today
    elif period_type == "quarterly":
        start_date = today - timedelta(days=90)
        end_date = today
    elif period_type == "half_year":
        start_date = today - timedelta(days=180)
        end_date = today
    elif period_type == "yearly":
        start_date = today - timedelta(days=365)
        end_date = today
    else:
        raise HTTPException(status_code=400, detail="Invalid period type")
    
    # Get journal entries
    entries = await db.journal_entries.find({
        "user_id": user_id,
        "date": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}
    }).to_list(1000)
    
    if not entries:
        return {"message": "No entries found for this period"}
    
    # Calculate stats
    positive_count = len([e for e in entries if e.get("good_1") or e.get("good_2") or e.get("good_3")])
    moods = [e["mood"] for e in entries if e.get("mood")]
    energies = [e["energy"] for e in entries if e.get("energy")]
    
    avg_mood = sum(moods) / len(moods) if moods else None
    avg_energy = sum(energies) / len(energies) if energies else None
    
    water_goal_days = len([e for e in entries if e.get("water_ml_total", 0) >= e.get("water_target_ml", 2000)])
    
    # Generate AI summary
    ai_summary = await generate_journal_summary(entries)
    
    summary = Summary(
        user_id=user_id,
        period_type=PeriodType(period_type),
        start_date=start_date,
        end_date=end_date,
        positive_entries_count=positive_count,
        avg_mood=avg_mood,
        avg_energy=avg_energy,
        water_goal_days=water_goal_days,
        top_themes=[],
        best_entries=[ai_summary],
        habits_stats={}
    )
    
    await db.summaries.insert_one(serialize_for_mongo(summary))
    
    return {"summary": serialize_for_mongo(summary)}


@api_router.get("/summaries")
async def get_summaries(
    period_type: Optional[str] = None,
    request: Request = None,
    authorization: Optional[str] = Header(None)
):
    """Получить сводки"""
    user_id = await verify_session(db, request, authorization)
    
    query = {"user_id": user_id}
    if period_type:
        query["period_type"] = period_type
    
    summaries = await db.summaries.find(query).sort("created_at", -1).to_list(100)
    
    return {"summaries": summaries}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
