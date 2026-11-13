"""Versioned REST routes. Tenant IDs are derived only from the authenticated user."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from voicepilot.config import get_settings
from voicepilot.dependencies import CurrentBusiness, CurrentUser, DbSession
from voicepilot.models import Appointment, Business, CallSession, Integration, ReceptionistConfig, Service, User
from voicepilot.schemas import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
    BusinessResponse,
    BusinessUpdate,
    CallResponse,
    IntegrationResponse,
    LoginRequest,
    ReceptionistConfigResponse,
    ReceptionistConfigUpdate,
    RegisterRequest,
    ServiceCreate,
    ServiceResponse,
    ServiceUpdate,
    TokenResponse,
    UserResponse,
)
from voicepilot.security import DUMMY_PASSWORD_HASH, create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/v1")


def _token_response(user: User, business: Business) -> TokenResponse:
    settings = get_settings()
    return TokenResponse(
        access_token=create_access_token(user_id=user.id),
        expires_in=settings.access_token_expire_minutes * 60,
        user=UserResponse.model_validate(user),
        business=BusinessResponse.model_validate(business),
    )


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, tags=["Authentication"])
def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    """Register a business owner and create the initial business settings."""
    email = str(payload.email).strip().lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    business = Business(name=payload.business_name.strip())
    db.add(business)
    db.flush()
    user = User(business_id=business.id, email=email, full_name=payload.full_name.strip(), password_hash=hash_password(payload.password), role="owner")
    db.add_all([
        user,
        ReceptionistConfig(business_id=business.id),
        Integration(business_id=business.id, provider="google_calendar", status="disconnected"),
    ])
    db.commit()
    db.refresh(user)
    db.refresh(business)
    return _token_response(user, business)


@router.post("/auth/login", response_model=TokenResponse, tags=["Authentication"])
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    """Exchange an email and password for a short-lived bearer token."""
    email = str(payload.email).strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    # Verify a fixed dummy hash when the email is unknown to reduce timing differences.
    checked_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    password_valid = verify_password(payload.password, checked_hash)
    if user is None or not user.is_active or not password_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password", headers={"WWW-Authenticate": "Bearer"})
    business = db.get(Business, user.business_id)
    if business is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _token_response(user, business)


@router.get("/auth/me", response_model=UserResponse, tags=["Authentication"])
def current_user(user: CurrentUser) -> User:
    return user


@router.get("/business", response_model=BusinessResponse, tags=["Business"])
def get_business(business: CurrentBusiness) -> Business:
    return business


@router.patch("/business", response_model=BusinessResponse, tags=["Business"])
def update_business(payload: BusinessUpdate, business: CurrentBusiness, db: DbSession) -> Business:
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is None and key in {"name", "timezone", "operating_hours"}:
            raise HTTPException(status_code=422, detail=f"{key} cannot be null")
        setattr(business, key, value)
    db.commit()
    db.refresh(business)
    return business


@router.get("/services", response_model=list[ServiceResponse], tags=["Services"])
def list_services(business: CurrentBusiness, db: DbSession) -> list[Service]:
    return list(db.scalars(select(Service).where(Service.business_id == business.id).order_by(Service.name)))


@router.post("/services", response_model=ServiceResponse, status_code=201, tags=["Services"])
def create_service(payload: ServiceCreate, business: CurrentBusiness, db: DbSession) -> Service:
    service = Service(business_id=business.id, **payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.patch("/services/{service_id}", response_model=ServiceResponse, tags=["Services"])
def update_service(service_id: str, payload: ServiceUpdate, business: CurrentBusiness, db: DbSession) -> Service:
    service = db.scalar(select(Service).where(Service.id == service_id, Service.business_id == business.id))
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is None and key in {"name", "duration_minutes", "is_active"}:
            raise HTTPException(status_code=422, detail=f"{key} cannot be null")
        setattr(service, key, value)
    db.commit()
    db.refresh(service)
    return service


@router.delete("/services/{service_id}", status_code=204, tags=["Services"])
def delete_service(service_id: str, business: CurrentBusiness, db: DbSession) -> None:
    service = db.scalar(select(Service).where(Service.id == service_id, Service.business_id == business.id))
    if service is None:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(service)
    db.commit()


@router.get("/receptionist-config", response_model=ReceptionistConfigResponse, tags=["Receptionist"])
def get_receptionist_config(business: CurrentBusiness, db: DbSession) -> ReceptionistConfig:
    config = db.get(ReceptionistConfig, business.id)
    if config is None:
        config = ReceptionistConfig(business_id=business.id)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.patch("/receptionist-config", response_model=ReceptionistConfigResponse, tags=["Receptionist"])
def update_receptionist_config(payload: ReceptionistConfigUpdate, business: CurrentBusiness, db: DbSession) -> ReceptionistConfig:
    config = db.get(ReceptionistConfig, business.id)
    if config is None:
        config = ReceptionistConfig(business_id=business.id)
        db.add(config)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config


@router.get("/calls", response_model=list[CallResponse], tags=["Calls"])
def list_calls(
    business: CurrentBusiness,
    db: DbSession,
    call_status: Annotated[str | None, Query(alias="status", max_length=24)] = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[CallSession]:
    query = select(CallSession).where(CallSession.business_id == business.id)
    if call_status:
        query = query.where(CallSession.status == call_status)
    query = query.order_by(CallSession.started_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(query))


@router.get("/calls/{call_id}", response_model=CallResponse, tags=["Calls"])
def get_call(call_id: str, business: CurrentBusiness, db: DbSession) -> CallSession:
    call = db.scalar(select(CallSession).where(CallSession.id == call_id, CallSession.business_id == business.id))
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found")
    return call


@router.get("/appointments", response_model=list[AppointmentResponse], tags=["Appointments"])
def list_appointments(
    business: CurrentBusiness,
    db: DbSession,
    appointment_status: Annotated[str | None, Query(alias="status", max_length=24)] = None,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[Appointment]:
    query = select(Appointment).where(Appointment.business_id == business.id)
    if appointment_status:
        query = query.where(Appointment.status == appointment_status)
    return list(db.scalars(query.order_by(Appointment.starts_at).limit(limit).offset(offset)))


@router.post("/appointments", response_model=AppointmentResponse, status_code=201, tags=["Appointments"])
def create_appointment(payload: AppointmentCreate, business: CurrentBusiness, db: DbSession) -> Appointment:
    if payload.service_id and db.scalar(select(Service.id).where(Service.id == payload.service_id, Service.business_id == business.id)) is None:
        raise HTTPException(status_code=404, detail="Service not found")
    if payload.call_id and db.scalar(select(CallSession.id).where(CallSession.id == payload.call_id, CallSession.business_id == business.id)) is None:
        raise HTTPException(status_code=404, detail="Call not found")
    appointment = Appointment(
        business_id=business.id,
        source="dashboard",
        status="pending",
        **{
            **payload.model_dump(exclude={"starts_at", "ends_at"}),
            "starts_at": _as_utc(payload.starts_at),
            "ends_at": _as_utc(payload.ends_at),
        },
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.patch("/appointments/{appointment_id}", response_model=AppointmentResponse, tags=["Appointments"])
def update_appointment(appointment_id: str, payload: AppointmentUpdate, business: CurrentBusiness, db: DbSession) -> Appointment:
    appointment = db.scalar(select(Appointment).where(Appointment.id == appointment_id, Appointment.business_id == business.id))
    if appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    fields = payload.model_dump(exclude_unset=True)
    if fields.get("service_id") and db.scalar(select(Service.id).where(Service.id == fields["service_id"], Service.business_id == business.id)) is None:
        raise HTTPException(status_code=404, detail="Service not found")
    start = _as_utc(fields.get("starts_at", appointment.starts_at))
    end = _as_utc(fields.get("ends_at", appointment.ends_at))
    if end <= start:
        raise HTTPException(status_code=422, detail="ends_at must be later than starts_at")
    for key, value in fields.items():
        setattr(appointment, key, _as_utc(value) if key in {"starts_at", "ends_at"} else value)
    db.commit()
    db.refresh(appointment)
    return appointment


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@router.get("/integrations", response_model=list[IntegrationResponse], tags=["Integrations"])
def list_integrations(business: CurrentBusiness, db: DbSession) -> list[Integration]:
    return list(db.scalars(select(Integration).where(Integration.business_id == business.id).order_by(Integration.provider)))


@router.get("/integrations/google-calendar", response_model=IntegrationResponse, tags=["Integrations"])
def google_calendar_status(business: CurrentBusiness, db: DbSession) -> Integration:
    integration = db.scalar(select(Integration).where(Integration.business_id == business.id, Integration.provider == "google_calendar"))
    if integration is None:
        integration = Integration(business_id=business.id, provider="google_calendar", status="disconnected")
        db.add(integration)
        db.commit()
        db.refresh(integration)
    return integration
