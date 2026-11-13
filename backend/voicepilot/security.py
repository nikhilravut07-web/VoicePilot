"""Password hashing and short-lived signed access tokens."""

from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from voicepilot.config import get_settings

password_hash = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hash.hash("not-a-real-account-password")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(*, user_id: str, expires_minutes: int | None = None) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes or settings.access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expires, "iat": datetime.now(timezone.utc)}, settings.secret_key, algorithm="HS256")
