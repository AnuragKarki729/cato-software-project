# Responsibility 7 — Aye Myo Myat (6837919)
import re
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: Literal['applicant', 'recruiter']
    company_name: str | None = None
    onboarding_step: Literal['profile', 'video', 'complete'] = 'complete'


class LogInIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator('email')
    @classmethod
    def valid_email(cls, value):
        value = value.strip().lower()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Enter a valid email address')
        return value


class SignUpIn(LogInIn):
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)
    role: Literal['applicant', 'recruiter']
    company_name: str | None = Field(default=None, max_length=150)
    sharing_consent: bool = False

    @field_validator('name')
    @classmethod
    def valid_name(cls, value):
        value = value.strip()
        if not value:
            raise ValueError('Name is required')
        return value

    @field_validator('password')
    @classmethod
    def valid_signup_password(cls, value):
        if not any(c.isdigit() for c in value):
            raise ValueError('Password must include a number')
        return value

    @model_validator(mode='after')
    def valid_company(self):
        self.company_name = (self.company_name or '').strip() or None
        if self.role == 'recruiter' and not self.company_name:
            raise ValueError('Company name is required for recruiters')
        if self.role == 'applicant':
            if not self.sharing_consent:
                raise ValueError('Please agree to share your profile and videos before creating an applicant account')
            self.company_name = None
        return self


class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserOut
