import zoneinfo

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""
    supabase_db_url: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    email_from: str = ""
    email_api_key: str = ""
    admin_bootstrap_email: str = ""
    admin_bootstrap_password: str = ""
    environment: str = "development"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

BUSINESS_TZ = zoneinfo.ZoneInfo("America/New_York")
