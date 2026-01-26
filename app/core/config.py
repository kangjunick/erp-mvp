from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Storage
    SUPABASE_STORAGE_BUCKET: str = "order-images"
    # bucket이 public이 아니라면 signed url로 내려줍니다.
    SUPABASE_STORAGE_PUBLIC: bool = True
    SUPABASE_SIGNED_URL_EXPIRES_SECONDS: int = 60 * 60 * 24 * 365  # 1y

    # DB tables
    SUPABASE_ORDERS_TABLE: str = "orders"
    SUPABASE_ORDER_ATTACHMENTS_TABLE: str = "order_attachments"

    # Bulk insert chunk size
    BULK_INSERT_CHUNK_SIZE: int = 500

    # Solapi (SMS)
    SOLAPI_API_KEY: str = ""
    SOLAPI_API_SECRET: str = ""
    SOLAPI_SENDER_NUMBER: str = ""  # 등록된 발신번호

    # Public status link base (고객 조회 링크)
    FRONTEND_PUBLIC_BASE_URL: str = "http://localhost:5173"


settings = Settings()

