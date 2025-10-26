from emergentintegrations import llm
import os
from typing import Optional


EMERGENT_LLM_KEY = "sk-emergent-bB07f4e36EcAb5e918"


async def generate_health_tip(
    user_context: Optional[dict] = None
) -> str:
    """Генерировать персонализированный совет о здоровье с помощью AI"""
    
    try:
        # Базовый промпт
        prompt = """Ты заботливый помощник в женском здоровье. 
Создай один короткий (1-2 предложения) полезный совет на русском языке.

Темы для советов:
- Питьевой режим и гидратация
- Лёгкая физическая активность
- Отдых и сон
- Питание и витамины
- Ментальное здоровье и стресс
- Забота о себе

Совет должен быть:
- Коротким и конкретным
- Мотивирующим, но не давящим
- Практичным и легко выполнимым
- На русском языке

"""
        
        # Добавляем контекст если есть
        if user_context:
            cycle_day = user_context.get("cycle_day")
            is_period = user_context.get("is_period", False)
            is_fertile = user_context.get("is_fertile_window", False)
            mood = user_context.get("recent_mood")
            
            if is_period:
                prompt += "\nСейчас у пользователя менструация. Совет должен учитывать это (отдых, тепло, лёгкость).\n"
            elif is_fertile:
                prompt += "\nСейчас фертильное окно. Можно напомнить о наблюдении за телом.\n"
            
            if mood and mood < 5:
                prompt += "\nНедавнее настроение было низким. Добавь мягкости и поддержки.\n"
        
        prompt += "\nСовет (1-2 предложения):"
        
        # Вызываем AI
        client = llm.LLM(api_key=EMERGENT_LLM_KEY)
        response = await client.achat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Ты помощник по женскому здоровью, даёшь короткие полезные советы."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=100,
            temperature=0.8
        )
        
        tip = response.choices[0].message.content.strip()
        return tip
        
    except Exception as e:
        # Fallback на статичные советы если AI не работает
        static_tips = [
            "Следи за водой: цель на сегодня — 2 л.",
            "Лёгкая растяжка 5–7 минут улучшит самочувствие.",
            "Запланируй 10 минут тишины без экрана.",
            "Наблюдай за сном: цель — лечь до 23:00.",
            "Добавь к рациону белок и клетчатку.",
            "Сделай 3 глубоких вдоха прямо сейчас.",
            "Прогулка 15 минут на свежем воздухе творит чудеса.",
            "Запиши 3 вещи, за которые благодарна сегодня."
        ]
        import random
        return random.choice(static_tips)


async def generate_journal_summary(entries: list) -> str:
    """Генерировать сводку по дневниковым записям"""
    
    try:
        # Собираем данные
        good_things = []
        praises = []
        moods = []
        
        for entry in entries:
            if entry.get("good_1"):
                good_things.append(entry["good_1"])
            if entry.get("good_2"):
                good_things.append(entry["good_2"])
            if entry.get("good_3"):
                good_things.append(entry["good_3"])
            if entry.get("self_praise"):
                praises.append(entry["self_praise"])
            if entry.get("mood"):
                moods.append(entry["mood"])
        
        prompt = f"""Проанализируй дневниковые записи пользователя и создай короткую сводку на русском языке.

Хорошие вещи, которые произошли ({len(good_things)} записей):
{chr(10).join(f"- {item}" for item in good_things[:20])}

Самопохвалы ({len(praises)} записей):
{chr(10).join(f"- {item}" for item in praises[:10])}

Средняя оценка настроения: {sum(moods) / len(moods) if moods else 'нет данных'} из 10

Создай вдохновляющую сводку (3-4 предложения), которая:
1. Отметит главные позитивные темы
2. Похвалит за достижения
3. Мотивирует продолжать

Ответ на русском языке:"""
        
        client = llm.LLM(api_key=EMERGENT_LLM_KEY)
        response = await client.achat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Ты создаёшь вдохновляющие сводки по дневниковым записям."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        summary = response.choices[0].message.content.strip()
        return summary
        
    except Exception as e:
        return f"Сводка по {len(entries)} записям. Средняя оценка настроения: {sum(moods) / len(moods) if moods else 0:.1f} из 10."
