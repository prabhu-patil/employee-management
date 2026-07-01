from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://emp_user:emp_pass@db:5432/emp_db"
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALLOWED_ORIGINS: List[str] = ["http://localhost:4200", "http://localhost:4300", "http://localhost"]
    FRONTEND_URL: str = "http://localhost:4300"
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
