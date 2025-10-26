from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


# User and Auth Models
class User(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class SessionData(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    session_token: str


# Cycle Models
class CycleSettings(BaseModel):
    user_id: str
    avg_cycle_length: int = 28  # дней
    period_length: int = 5  # дней
    luteal_length: int = 14  # дней
    last_period_start: date
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class CycleDay(BaseModel):
    user_id: str
    date: date
    is_period: bool = False
    is_ovulation_predicted: bool = False
    is_fertile_window: bool = False
    notes: Optional[str] = None
    symptoms: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


# Journal Models
class JournalEntry(BaseModel):
    user_id: str
    date: date
    cycle_day: Optional[int] = None
    predicted_ovulation_date: Optional[date] = None
    good_1: Optional[str] = None
    good_2: Optional[str] = None
    good_3: Optional[str] = None
    self_praise: Optional[str] = None
    mood: Optional[int] = None  # 1-10
    energy: Optional[int] = None  # 1-10
    notes: Optional[str] = None
    water_ml_total: int = 0
    water_target_ml: int = 2000
    habits_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


# Water Tracker Models
class WaterTracker(BaseModel):
    user_id: str
    date: date
    consumed_ml: int = 0
    goal_ml: int = 2000
    glass_ml: int = 250
    log: List[Dict[str, Any]] = Field(default_factory=list)  # [{"time": "10:00", "ml": 250}]
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class WaterUpdate(BaseModel):
    ml: int


# Habit Models
class HabitType(str, Enum):
    BOOLEAN = "boolean"
    QUANTITATIVE = "quantitative"


class Habit(BaseModel):
    id: str
    user_id: str
    title: str
    type: HabitType
    target: Optional[float] = None  # для quantitative
    days_of_week: List[int] = Field(default_factory=lambda: list(range(7)))  # 0=Monday
    reminders: List[str] = Field(default_factory=list)  # ["09:00", "21:00"]
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    is_active: bool = True


class HabitLog(BaseModel):
    habit_id: str
    user_id: str
    date: date
    completed: bool = False
    value: Optional[float] = None  # для quantitative
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class HabitCreate(BaseModel):
    title: str
    type: HabitType
    target: Optional[float] = None
    days_of_week: List[int] = Field(default_factory=lambda: list(range(7)))
    reminders: List[str] = Field(default_factory=list)


# Summary Models
class PeriodType(str, Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    HALF_YEAR = "half_year"
    YEARLY = "yearly"


class Summary(BaseModel):
    user_id: str
    period_type: PeriodType
    start_date: date
    end_date: date
    positive_entries_count: int = 0
    avg_mood: Optional[float] = None
    avg_energy: Optional[float] = None
    water_goal_days: int = 0
    top_themes: List[str] = Field(default_factory=list)
    best_entries: List[str] = Field(default_factory=list)
    habits_stats: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


# Request/Response Models
class OnboardingData(BaseModel):
    last_period_start: str  # YYYY-MM-DD
    avg_cycle_length: int = 28
    period_length: int = 5
    luteal_length: int = 14


class JournalEntryCreate(BaseModel):
    date: str  # YYYY-MM-DD
    good_1: Optional[str] = None
    good_2: Optional[str] = None
    good_3: Optional[str] = None
    self_praise: Optional[str] = None
    mood: Optional[int] = None
    energy: Optional[int] = None
    notes: Optional[str] = None


class HabitLogUpdate(BaseModel):
    completed: bool
    value: Optional[float] = None


class CalendarSyncRequest(BaseModel):
    enabled: bool


class GoogleSheetsConfig(BaseModel):
    user_id: str
    spreadsheet_id: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expiry: Optional[datetime] = None
    enabled: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
