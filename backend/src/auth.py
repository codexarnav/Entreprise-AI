import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.database import get_db
from src.utils import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


class RegisterReq(BaseModel):
    username: str
    email: str
    password: str
    role: str = "oem"
    email_config: Optional[Dict[str, Any]] = None   # {gmail_id, app_password}


class LoginReq(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(req: RegisterReq):
    db = get_db()
    if await db["users"].find_one({"email": req.email}):
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    await db["users"].insert_one({
        "_id": user_id,
        "username": req.username,
        "email": req.email,
        "hashed_password": hash_password(req.password),
        "role": req.role,
        "email_config": req.email_config,
        "created_at": datetime.utcnow(),
    })
    return {"user_id": user_id, "message": "Registered successfully"}


@router.post("/login")
async def login(req: LoginReq):
    db = get_db()
    user = await db["users"].find_one({"email": req.email})
    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid credentials")

    session_id = str(uuid.uuid4())
    now = datetime.utcnow()
    await db["sessions"].insert_one({
        "_id": session_id,
        "user_id": user["_id"],
        "context": [],
        "last_workflow_id": None,
        "created_at": now,
        "updated_at": now,
    })

    token = create_access_token({
        "sub": user["_id"],
        "session_id": session_id,
        "role": user.get("role", "oem"),
    })
    return {"user_id": user["_id"], "token": token, "session_id": session_id}
