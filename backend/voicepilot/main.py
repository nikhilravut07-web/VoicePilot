"""FastAPI application factory and database initialization."""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from voicepilot.api import router
from voicepilot.config import get_settings
from voicepilot.database import engine
from voicepilot.models import Base

logger = logging.getLogger("voicepilot.api")


def create_app(*, database_engine=None) -> FastAPI:
    settings = get_settings()
    app_engine = database_engine or engine

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        Base.metadata.create_all(bind=app_engine)
        yield

    app = FastAPI(
        title=settings.app_name,
        description="Tenant-scoped backend API for the VoicePilot AI Voice Receptionist dashboard.",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )
    app.state.database_engine = app_engine
    if database_engine is not None:
        # Keep the dependency injection boundary explicit for tests and alternate DB engines.
        from sqlalchemy.orm import sessionmaker
        from voicepilot.database import get_db
        factory = sessionmaker(bind=database_engine, autoflush=False, expire_on_commit=False)

        def test_database_session():
            db = factory()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = test_database_session

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.include_router(router)

    @app.get("/healthz", tags=["System"])
    def health() -> dict[str, str]:
        """Lightweight process health check."""
        return {"status": "ok"}

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(_request: Request, exc: IntegrityError) -> JSONResponse:
        logger.info("Database integrity constraint rejected a request: %s", type(exc).__name__)
        return JSONResponse(status_code=409, content={"detail": "The requested change conflicts with existing data"})

    return app


app = create_app()
