from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    db_path: str = "./data/orbital_watch.db"
    upload_dir: str = "./data/uploads"
    max_upload_mb: int = 100
    catalog_path: str = "../data/catalog/gemini.csv"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def allowed_extensions(self) -> set:
        return {".fits", ".fit", ".bmp", ".png", ".jpg", ".jpeg", ".tif", ".tiff"}

settings = Settings()
