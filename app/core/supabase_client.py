from supabase import Client, create_client

from app.core.config import settings


def get_supabase() -> Client:
    # Service role key는 서버 전용(절대 프론트 노출 금지)
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

