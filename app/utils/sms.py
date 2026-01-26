from __future__ import annotations

import re

from solapi import SolapiMessageService
from solapi.model import RequestMessage

from app.core.config import settings


def _normalize_phone(phone: str) -> str:
    # Solapi는 하이픈 없는 번호를 흔히 사용합니다. (예: 01012345678)
    return re.sub(r"[^0-9]", "", phone or "")


def send_sms(*, to: str, text: str) -> None:
    """
    SOLAPI로 SMS 발송.
    - 자격증명은 .env에서 로드: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_NUMBER
    """
    if not settings.SOLAPI_API_KEY or not settings.SOLAPI_API_SECRET or not settings.SOLAPI_SENDER_NUMBER:
        raise RuntimeError("SOLAPI 환경변수가 설정되지 않았습니다. (SOLAPI_API_KEY/SECRET/SENDER_NUMBER)")

    to_norm = _normalize_phone(to)
    from_norm = _normalize_phone(settings.SOLAPI_SENDER_NUMBER)
    if not to_norm or not from_norm:
        raise ValueError("수신번호/발신번호가 올바르지 않습니다.")

    message_service = SolapiMessageService(api_key=settings.SOLAPI_API_KEY, api_secret=settings.SOLAPI_API_SECRET)
    message = RequestMessage(from_=from_norm, to=to_norm, text=text)
    message_service.send(message)

