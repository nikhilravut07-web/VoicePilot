"""Validated API request and response schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer, field_validator, model_validator


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @field_serializer("*", when_used="json")
    def serialize_utc_datetimes(self, value):
        if isinstance(value, datetime) and value.tzinfo is None:
            from datetime import timezone
            return value.replace(tzinfo=timezone.utc)
        return value


class RegisterRequest(BaseModel):
    business_name: str = Field(min_length=1, max_length=160)
    full_name: str = Field(min_length=1, max_length=160)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    @field_validator("business_name", "full_name")
    @classmethod
    def non_blank_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Must not be blank")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(ORMModel):
    id: str
    business_id: str
    email: EmailStr
    full_name: str
    role: str


class BusinessResponse(ORMModel):
    id: str
    name: str
    category: str | None
    email: EmailStr | None
    phone: str | None
    address: str | None
    timezone: str
    operating_hours: dict


class BusinessUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    category: str | None = Field(default=None, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    address: str | None = Field(default=None, max_length=300)
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    operating_hours: dict | None = None

    @field_validator("name")
    @classmethod
    def non_blank_name(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Must not be blank")
        return value.strip() if value else value


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    duration_minutes: int = Field(default=30, gt=0, le=1440)
    price_minor: int | None = Field(default=None, ge=0)
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def non_blank_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Must not be blank")
        return value


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    duration_minutes: int | None = Field(default=None, gt=0, le=1440)
    price_minor: int | None = Field(default=None, ge=0)
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def non_blank_name(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Must not be blank")
        return value.strip() if value else value


class ServiceResponse(ORMModel):
    id: str
    business_id: str
    name: str
    description: str | None
    duration_minutes: int
    price_minor: int | None
    is_active: bool


class ReceptionistConfigUpdate(BaseModel):
    receptionist_name: str | None = Field(default=None, max_length=100)
    greeting: str | None = None
    instructions: str | None = None
    faqs: list[dict] | None = None
    tone: str | None = Field(default=None, max_length=40)
    handoff_enabled: bool | None = None
    handoff_destination: str | None = Field(default=None, max_length=80)


class ReceptionistConfigResponse(ORMModel):
    business_id: str
    receptionist_name: str | None
    greeting: str | None
    instructions: str
    faqs: list[dict]
    tone: str | None
    handoff_enabled: bool
    handoff_destination: str | None


class CallResponse(ORMModel):
    id: str
    business_id: str
    caller_number: str | None
    caller_name: str | None
    extension: str | None
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int | None
    status: str
    transcript: str | None
    summary: str | None
    outcome: str | None


class AppointmentCreate(BaseModel):
    service_id: str | None = None
    call_id: str | None = None
    customer_name: str = Field(min_length=1, max_length=160)
    customer_contact: str | None = Field(default=None, max_length=254)
    starts_at: datetime
    ends_at: datetime
    notes: str | None = None

    @field_validator("customer_name")
    @classmethod
    def non_blank_customer(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Must not be blank")
        return value

    @model_validator(mode="after")
    def validate_range(self) -> "AppointmentCreate":
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be later than starts_at")
        if self.starts_at.tzinfo is None or self.ends_at.tzinfo is None:
            raise ValueError("Appointment timestamps must include a timezone offset")
        return self


class AppointmentUpdate(BaseModel):
    service_id: str | None = None
    customer_name: str | None = Field(default=None, min_length=1, max_length=160)
    customer_contact: str | None = Field(default=None, max_length=254)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: Literal["pending", "cancelled", "failed"] | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_range(self) -> "AppointmentUpdate":
        if self.starts_at and self.starts_at.tzinfo is None:
            raise ValueError("starts_at must include a timezone offset")
        if self.ends_at and self.ends_at.tzinfo is None:
            raise ValueError("ends_at must include a timezone offset")
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be later than starts_at")
        return self


class AppointmentResponse(ORMModel):
    id: str
    business_id: str
    service_id: str | None
    call_id: str | None
    customer_name: str
    customer_contact: str | None
    starts_at: datetime
    ends_at: datetime
    status: str
    source: str
    calendar_event_id: str | None
    notes: str | None


class IntegrationResponse(ORMModel):
    id: str
    business_id: str
    provider: str
    status: str
    external_account: str | None
    external_resource_id: str | None
    last_checked_at: datetime | None
    error_message: str | None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    business: BusinessResponse
