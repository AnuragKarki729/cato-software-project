# Responsibility 7 — Aye Myo Myat (6837919)
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, DateTime


class AuthSession(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(unique=True, index=True, max_length=64)
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=False), nullable=False))
