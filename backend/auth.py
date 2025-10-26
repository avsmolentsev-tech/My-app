from fastapi import HTTPException, Header, Request
from typing import Optional
from datetime import datetime, timezone
from models import User, UserSession
import httpx
import os


EMERGENT_AUTH_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


async def get_session_data(session_id: str) -> dict:
    """Получить данные сессии от Emergent Auth"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                EMERGENT_AUTH_SESSION_URL,
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=401, detail="Invalid session ID")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auth service error: {str(e)}")


async def verify_session(
    db,
    request: Request,
    authorization: Optional[str] = Header(None)
) -> str:
    """Проверить сессию пользователя и вернуть user_id"""
    
    # Проверяем cookie
    session_token = request.cookies.get("session_token")
    
    # Если cookie нет, проверяем Authorization header
    if not session_token and authorization:
        if authorization.startswith("Bearer "):
            session_token = authorization[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Проверяем сессию в БД
    session = await db.user_sessions.find_one({"session_token": session_token})
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Проверяем срок действия
    expires_at = session.get("expires_at")
    if expires_at and expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": session_token})
        raise HTTPException(status_code=401, detail="Session expired")
    
    return session["user_id"]
