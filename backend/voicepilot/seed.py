"""Optional, explicitly enabled development-only seed dataset.

Run with SEED_DEMO_DATA=true and provide SEED_EMAIL / SEED_PASSWORD in the environment.
No sample business or default password is created unless those safeguards are enabled.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from voicepilot.config import get_settings
from voicepilot.database import SessionLocal, engine
from voicepilot.models import Appointment, Base, Business, CallSession, Integration, ReceptionistConfig, Service, User
from voicepilot.security import hash_password


def seed_development_data() -> None:
    settings = get_settings()
    if settings.app_env.lower() != "development" or not settings.seed_demo_data:
        raise SystemExit("Seeding is disabled. Set APP_ENV=development and SEED_DEMO_DATA=true.")
    if not settings.seed_email or not settings.seed_password or len(settings.seed_password) < 12:
        raise SystemExit("Set SEED_EMAIL and a SEED_PASSWORD of at least 12 characters.")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        email = settings.seed_email.strip().lower()
        if db.scalar(select(User.id).where(User.email == email)):
            print(f"Development seed already exists for {email}; no changes made.")
            return
        business = Business(
            name="Sample Studio (development)",
            category="Wellness",
            email=email,
            timezone="Asia/Kolkata",
            operating_hours={"monday": {"open": "09:00", "close": "17:00"}, "sunday": {"closed": True}},
        )
        db.add(business)
        db.flush()
        user = User(business_id=business.id, email=email, full_name="Development Owner", password_hash=hash_password(settings.seed_password), role="owner")
        service = Service(business_id=business.id, name="Introductory consultation", description="Development-only sample service", duration_minutes=30)
        db.add_all([user, service, ReceptionistConfig(business_id=business.id, greeting="Thanks for calling the sample studio."), Integration(business_id=business.id, provider="google_calendar", status="disconnected")])
        db.flush()
        now = datetime.now(timezone.utc)
        call = CallSession(business_id=business.id, caller_name="Sample Caller", caller_number="+10000000000", started_at=now - timedelta(minutes=12), ended_at=now - timedelta(minutes=10), duration_seconds=120, status="completed", transcript="[Development sample transcript]", summary="[Development sample summary]", outcome="enquiry_resolved")
        db.add(call)
        db.flush()
        db.add(Appointment(business_id=business.id, service_id=service.id, call_id=call.id, customer_name="Sample Customer", starts_at=now + timedelta(days=1), ends_at=now + timedelta(days=1, minutes=30), status="pending", source="dashboard", notes="Development-only sample appointment"))
        db.commit()
        print(f"Development seed created for {email}. Use the provided SEED_PASSWORD to sign in.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_development_data()
