from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Agenda Assistente Facil API"
    database_url: str = "sqlite:///./agenda_assistente.db"
    jwt_secret_key: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    data_encryption_key: str = "bV5jArM2FPxN7QJYJ2NkNfWZH8slyYhQf8QGIlM5x5A="
    google_client_id: str = ""
    google_client_secret: str = ""
    google_oauth_redirect_uri: str = ""
    google_oauth_state_secret: str = ""
    google_calendar_default_id: str = "primary"


settings = Settings()
