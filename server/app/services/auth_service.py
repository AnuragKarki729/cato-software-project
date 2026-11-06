# Responsibility 7: Sign up, log in and roles
# Owner: Aye Myo Myat (6837919)
"""Password hashing and revocable, expiring bearer sessions.

Only a SHA-256 digest of each random token is stored in the database. Routers
keep the existing get_current_user / get_current_* dependency interface.
"""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.database import get_session
from app.models import AuthSession, User

bearer = HTTPBearer(auto_error=False)
SESSION_HOURS = 24


def utcnow():
    # Naive UTC is deliberate: MySQL DATETIME and SQLite return naive values.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1)
    return f"scrypt${salt}${key.hex()}"


def verify_password(password: str, encoded: str | None) -> bool:
    try:
        algorithm, salt, expected = (encoded or "").split("$")
        if algorithm != "scrypt":
            return False
        actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1)
        return hmac.compare_digest(actual.hex(), expected)
    except (ValueError, TypeError):
        return False


# Run the same expensive check for unknown emails as for registered accounts.
DUMMY_HASH = hash_password(secrets.token_urlsafe(24))


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue_session(user: User, session: Session) -> str:
    token = secrets.token_urlsafe(32)
    session.add(AuthSession(user_id=user.id, token_hash=token_digest(token),
                            expires_at=utcnow() + timedelta(hours=SESSION_HOURS)))
    session.commit()
    return token


def get_current_session(credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
                        session: Session = Depends(get_session)) -> AuthSession:
    invalid = HTTPException(status_code=401, detail="Please log in again", headers={"WWW-Authenticate": "Bearer"})
    if credentials is None:
        raise invalid
    login = session.exec(select(AuthSession).where(
        AuthSession.token_hash == token_digest(credentials.credentials))).first()
    if login is None or login.expires_at <= utcnow():
        raise invalid
    return login


def get_current_user(login: AuthSession = Depends(get_current_session),
                     session: Session = Depends(get_session)) -> User:
    user = session.get(User, login.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Please log in again")
    return user


def get_current_applicant(user: User = Depends(get_current_user)) -> User:
    """Get the current applicant user."""
    if user.role != "applicant":
        raise HTTPException(status_code=403, detail="Only applicants can do this")
    return user


def get_current_recruiter(user: User = Depends(get_current_user)) -> User:
    """Get the current recruiter user."""
    if user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can do this")
    return user