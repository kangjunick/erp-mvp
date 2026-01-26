from __future__ import annotations

import mimetypes
from pathlib import PurePosixPath
from typing import Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.supabase_client import get_supabase


router = APIRouter(tags=["storage"])


def _guess_ext(filename: str | None, content_type: str | None) -> str:
    if filename and "." in filename:
        return "." + filename.rsplit(".", 1)[-1].lower()
    if content_type:
        ext = mimetypes.guess_extension(content_type)
        if ext:
            return ext
    return ".png"


def _public_or_signed_url(bucket: str, path: str) -> str:
    sb = get_supabase()
    storage = sb.storage.from_(bucket)

    if settings.SUPABASE_STORAGE_PUBLIC:
        url = storage.get_public_url(path)
        if isinstance(url, str):
            return url
        # supabase-py 버전에 따라 dict 형태일 수 있음
        return url.get("publicUrl") or url.get("publicURL") or url.get("public_url") or str(url)

    signed = storage.create_signed_url(path, settings.SUPABASE_SIGNED_URL_EXPIRES_SECONDS)
    if isinstance(signed, dict) and "signedURL" in signed:
        # 일부 버전은 signedURL만 주고, base url은 별도일 수 있음
        return signed["signedURL"]
    if isinstance(signed, dict) and "signedUrl" in signed:
        return signed["signedUrl"]
    if isinstance(signed, dict) and "signed_url" in signed:
        return signed["signed_url"]
    return str(signed)


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    order_id: Optional[UUID] = Form(default=None),
    kind: str = Form(default="review_screenshot"),
):
    """
    이미지 업로드 → Supabase Storage 저장 → (옵션) order_attachments에 기록 + orders.review_screenshot_url 업데이트.
    프론트는 이 API를 호출해 "실제 DB 저장"까지 완료합니다.
    """
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=415, detail="이미지 파일만 업로드할 수 있습니다.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    ext = _guess_ext(file.filename, file.content_type)
    object_id = uuid4()

    prefix = "misc"
    if order_id:
        prefix = f"orders/{order_id}"

    path = str(PurePosixPath(prefix) / f"{object_id}{ext}")
    bucket = settings.SUPABASE_STORAGE_BUCKET

    sb = get_supabase()

    async def _do_upload():
        def _sync():
            storage = sb.storage.from_(bucket)
            # supabase storage는 같은 path 재업로드 시 충돌 가능 → uuid path로 회피
            storage.upload(
                path,
                content,
                file_options={"content-type": file.content_type or "application/octet-stream"},
            )

        return run_in_threadpool(_sync)

    try:
        await _do_upload()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage 업로드 실패: {str(e)}") from e

    try:
        url = await run_in_threadpool(lambda: _public_or_signed_url(bucket, path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"URL 생성 실패: {str(e)}") from e

    attachment_id: Optional[str] = None

    if order_id:
        # 1) attachments 기록
        try:
            def _insert_attachment():
                res = (
                    sb.table(settings.SUPABASE_ORDER_ATTACHMENTS_TABLE)
                    .insert(
                        {
                            "order_id": str(order_id),
                            "kind": kind,
                            "url": url,
                            "storage_bucket": bucket,
                            "storage_path": path,
                            "mime_type": file.content_type,
                        }
                    )
                    .execute()
                )
                data = getattr(res, "data", None)
                if isinstance(data, list) and data:
                    return data[0].get("id")
                return None

            inserted_id = await run_in_threadpool(_insert_attachment)
            if inserted_id:
                attachment_id = str(inserted_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DB 저장(order_attachments) 실패: {str(e)}") from e

        # 2) spec 호환: review_screenshot이면 orders.review_screenshot_url도 업데이트
        if kind == "review_screenshot":
            try:
                await run_in_threadpool(
                    lambda: sb.table(settings.SUPABASE_ORDERS_TABLE)
                    .update({"review_screenshot_url": url})
                    .eq("id", str(order_id))
                    .execute()
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"DB 저장(orders 업데이트) 실패: {str(e)}") from e

    return {"bucket": bucket, "path": path, "url": url, "attachment_id": attachment_id}


# 기존 프론트/호환용 경로도 제공(원하면 나중에 제거 가능)
@router.post("/api/storage/upload-image")
async def upload_image_compat(
    file: UploadFile = File(...),
    order_id: Optional[UUID] = Form(default=None),
    kind: str = Form(default="review_screenshot"),
):
    return await upload_image(file=file, order_id=order_id, kind=kind)

