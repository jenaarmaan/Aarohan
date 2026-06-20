import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "Aarohan"
    API_V1_STR: str = "/api/v1"
    
    # AI Config
    GEMINI_API_KEY: str = Field(
        default="",
        validation_alias="GEMINI_API_KEY"
    )
    
    # Firebase Config
    FIREBASE_PROJECT_ID: str = Field(
        default="aarohan-9f176",
        validation_alias="FIREBASE_PROJECT_ID"
    )
    # If using local service account file path or JSON string
    FIREBASE_CREDENTIALS_JSON: str | None = Field(
        default=None,
        validation_alias="FIREBASE_CREDENTIALS_JSON"
    )

    # Security
    ALLOWED_CORS_ORIGINS: list[str] = ["*"]
    RATE_LIMIT_PER_MINUTE: int = 60

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
