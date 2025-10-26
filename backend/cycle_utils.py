from datetime import date, timedelta
from typing import List, Dict, Optional
from models import CycleSettings


def calculate_ovulation_date(
    last_period_start: date,
    avg_cycle_length: int,
    luteal_length: int
) -> date:
    """Рассчитать предполагаемую дату овуляции"""
    days_before_period = avg_cycle_length - luteal_length
    return last_period_start + timedelta(days=days_before_period)


def calculate_fertile_window(ovulation_date: date) -> tuple[date, date]:
    """Рассчитать фертильное окно (-5 до +1 день от овуляции)"""
    return (
        ovulation_date - timedelta(days=5),
        ovulation_date + timedelta(days=1)
    )


def calculate_next_period_date(
    last_period_start: date,
    avg_cycle_length: int
) -> date:
    """Рассчитать предполагаемую дату следующей менструации"""
    return last_period_start + timedelta(days=avg_cycle_length)


def get_cycle_day(
    current_date: date,
    last_period_start: date
) -> int:
    """Получить день цикла"""
    delta = (current_date - last_period_start).days
    return delta + 1 if delta >= 0 else 0


def get_days_past_ovulation(
    current_date: date,
    ovulation_date: date
) -> Optional[int]:
    """Получить количество дней после овуляции (DPO)"""
    delta = (current_date - ovulation_date).days
    return delta if delta >= 0 else None


def generate_calendar_data(
    settings: CycleSettings,
    start_date: date,
    end_date: date
) -> List[Dict]:
    """Генерировать данные календаря с метками"""
    
    calendar_data = []
    
    # Рассчитываем ключевые даты
    ovulation_date = calculate_ovulation_date(
        settings.last_period_start,
        settings.avg_cycle_length,
        settings.luteal_length
    )
    fertile_start, fertile_end = calculate_fertile_window(ovulation_date)
    next_period_date = calculate_next_period_date(
        settings.last_period_start,
        settings.avg_cycle_length
    )
    
    current = start_date
    while current <= end_date:
        day_data = {
            "date": current.isoformat(),
            "is_period": False,
            "is_ovulation": False,
            "is_fertile_window": False,
            "is_pms": False,
            "cycle_day": get_cycle_day(current, settings.last_period_start),
            "dpo": get_days_past_ovulation(current, ovulation_date)
        }
        
        # Период
        if settings.last_period_start <= current < settings.last_period_start + timedelta(days=settings.period_length):
            day_data["is_period"] = True
        
        # Следующий период (прогноз)
        if next_period_date <= current < next_period_date + timedelta(days=settings.period_length):
            day_data["is_period"] = True
        
        # Овуляция
        if current == ovulation_date:
            day_data["is_ovulation"] = True
        
        # Фертильное окно
        if fertile_start <= current <= fertile_end:
            day_data["is_fertile_window"] = True
        
        # ПМС (примерно за 3-5 дней до менструации)
        pms_start = next_period_date - timedelta(days=5)
        pms_end = next_period_date - timedelta(days=1)
        if pms_start <= current <= pms_end:
            day_data["is_pms"] = True
        
        calendar_data.append(day_data)
        current += timedelta(days=1)
    
    return calendar_data


def get_ovulation_reminder_dates(ovulation_date: date) -> List[Dict[str, any]]:
    """Получить даты напоминаний об овуляции"""
    reminders = []
    
    for days_before in [3, 2, 1, 0]:
        reminder_date = ovulation_date - timedelta(days=days_before)
        
        if days_before == 3:
            message = "Через 3 дня возможна овуляция. Проверь календарь и самочувствие."
        elif days_before == 2:
            message = "Через 2 дня возможна овуляция. Проверь календарь и самочувствие."
        elif days_before == 1:
            message = "Завтра возможна овуляция. Проверь календарь и самочувствие."
        else:
            message = "Сегодня возможна овуляция (ориентировочно)."
        
        reminders.append({
            "date": reminder_date.isoformat(),
            "message": message,
            "days_before": days_before
        })
    
    return reminders
