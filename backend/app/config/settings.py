from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "ArachneAI"
    ENV: str = "development"
    DATABASE_URL: str = "sqlite:///./arachneai.db"
    GEMINI_API_KEY: str = ""
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24
    TARGET_APP_URL: str = "http://localhost:9000"
    BACKEND_URL: str = "http://localhost:8001"
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:3000,http://localhost:3001,http://localhost:3002,"
        "http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002"
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
