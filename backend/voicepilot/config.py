"""Environment-based application settings."""

from functools import lru_cache
import secrets

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "VoicePilot API"
    app_env: str = "development"
    database_url: str = "sqlite:///./voicepilot.db"
    secret_key: str = ""
    access_token_expire_minutes: int = 30
    cors_origins: str = "http://localhost:3000"
    seed_demo_data: bool = False
    seed_email: str | None = None
    seed_password: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.app_env.lower() == "production":
            if len(self.secret_key) < 32 or self.secret_key.startswith("replace-with-"):
                raise ValueError("Production requires SECRET_KEY with at least 32 characters")
            if self.seed_demo_data:
                raise ValueError("SEED_DEMO_DATA must be disabled in production")
        elif not self.secret_key:
            self.secret_key = secrets.token_urlsafe(48)
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
