"""Core SQLAlchemy models. Every tenant-owned table carries a business_id."""

from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def new_id() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(254))
    phone: Mapped[str | None] = mapped_column(String(40))
    address: Mapped[str | None] = mapped_column(String(300))
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC")
    operating_hours: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    services: Mapped[list["Service"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    receptionist_config: Mapped["ReceptionistConfig | None"] = relationship(back_populates="business", cascade="all, delete-orphan", uselist=False)
    calls: Mapped[list["CallSession"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="business", cascade="all, delete-orphan")
    integrations: Mapped[list["Integration"]] = relationship(back_populates="business", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("business_id", "id", name="uq_users_business_id_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="owner")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    business: Mapped[Business] = relationship(back_populates="users")


class Service(Base):
    __tablename__ = "services"
    __table_args__ = (
        UniqueConstraint("business_id", "id", name="uq_services_business_id_id"),
        CheckConstraint("duration_minutes > 0", name="ck_services_duration_positive"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    price_minor: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    business: Mapped[Business] = relationship(back_populates="services")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="service", foreign_keys="Appointment.service_id")


class ReceptionistConfig(Base):
    __tablename__ = "receptionist_configs"

    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), primary_key=True)
    receptionist_name: Mapped[str | None] = mapped_column(String(100))
    greeting: Mapped[str | None] = mapped_column(Text)
    instructions: Mapped[str] = mapped_column(Text, nullable=False, default="")
    faqs: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    tone: Mapped[str | None] = mapped_column(String(40))
    handoff_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    handoff_destination: Mapped[str | None] = mapped_column(String(80))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    business: Mapped[Business] = relationship(back_populates="receptionist_config")


class CallSession(Base):
    __tablename__ = "call_sessions"
    __table_args__ = (
        UniqueConstraint("business_id", "id", name="uq_calls_business_id_id"),
        CheckConstraint("duration_seconds IS NULL OR duration_seconds >= 0", name="ck_calls_duration_nonnegative"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    caller_number: Mapped[str | None] = mapped_column(String(40))
    caller_name: Mapped[str | None] = mapped_column(String(160))
    extension: Mapped[str | None] = mapped_column(String(32))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="in_progress")
    transcript: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    outcome: Mapped[str | None] = mapped_column(String(80))

    business: Mapped[Business] = relationship(back_populates="calls")
    appointments: Mapped[list["Appointment"]] = relationship(back_populates="call", foreign_keys="Appointment.call_id")


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (
        ForeignKeyConstraint(["business_id", "service_id"], ["services.business_id", "services.id"], ondelete="RESTRICT", name="fk_appointments_tenant_service"),
        ForeignKeyConstraint(["business_id", "call_id"], ["call_sessions.business_id", "call_sessions.id"], ondelete="RESTRICT", name="fk_appointments_tenant_call"),
        CheckConstraint("ends_at > starts_at", name="ck_appointments_time_order"),
        UniqueConstraint("business_id", "id", name="uq_appointments_business_id_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id: Mapped[str | None] = mapped_column(String(36))
    call_id: Mapped[str | None] = mapped_column(String(36))
    customer_name: Mapped[str] = mapped_column(String(160), nullable=False)
    customer_contact: Mapped[str | None] = mapped_column(String(254))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending")
    source: Mapped[str] = mapped_column(String(24), nullable=False, default="dashboard")
    calendar_event_id: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    business: Mapped[Business] = relationship(back_populates="appointments")
    service: Mapped[Service | None] = relationship(back_populates="appointments", foreign_keys=[service_id])
    call: Mapped[CallSession | None] = relationship(back_populates="appointments", foreign_keys=[call_id])


class Integration(Base):
    __tablename__ = "integrations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="disconnected")
    external_account: Mapped[str | None] = mapped_column(String(254))
    external_resource_id: Mapped[str | None] = mapped_column(String(255))
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(Text)
    settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (UniqueConstraint("business_id", "provider", name="uq_integrations_business_provider"),)
    business: Mapped[Business] = relationship(back_populates="integrations")
