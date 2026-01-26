from __future__ import annotations

import json
from typing import Any, Optional
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.supabase_client import get_supabase
from app.utils.sms import send_sms
from app.schemas.orders import (
    AssignStaffRequest,
    AssignStaffResult,
    ExcelImportResult,
    OrderRow,
    OrderStatus,
    PublicOrderStatus,
    StaffUser,
)


router = APIRouter(prefix="/api/orders", tags=["orders"])


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    # 엑셀 컬럼명 공백/개행 정리
    df = df.copy()
    df.columns = [str(c).strip().replace("\n", " ") for c in df.columns]
    return df


def _parse_column_map(column_map_json: Optional[str]) -> dict[str, str]:
    """
    column_map_json 예시:
      {"쇼핑몰명": "mall_name", "상품명": "product_name", "키워드": "keyword", "옵션": "option_text"}
    """
    if not column_map_json:
        return {}
    try:
        parsed = json.loads(column_map_json)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=422, detail=f"column_map JSON 파싱 실패: {e.msg}") from e
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=422, detail="column_map은 JSON object여야 합니다.")
    return {str(k): str(v) for k, v in parsed.items()}


def _chunked(items: list[dict[str, Any]], size: int) -> list[list[dict[str, Any]]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


@router.post("/import-excel", response_model=ExcelImportResult)
async def import_orders_excel(
    file: UploadFile = File(..., description="xlsx/xls 파일"),
    # 엑셀에 client_id 컬럼이 없다면 폼으로 고정값을 넘길 수 있습니다.
    client_id: Optional[UUID] = Form(default=None),
    assigned_staff_id: Optional[UUID] = Form(default=None),
    status: OrderStatus = Form(default="pending"),
    # 엑셀 컬럼명 → DB 필드명 매핑(JSON 문자열)
    column_map: Optional[str] = Form(default=None),
    # dry_run=true면 파싱/검증만 하고 insert는 하지 않습니다.
    dry_run: bool = Form(default=False),
):
    """
    pandas로 엑셀을 읽고, Supabase(PostgREST)로 orders 테이블에 bulk insert 합니다.

    기본 기대 필드(최소):
      - mall_name (쇼핑몰명)
      - product_name (상품명)

    선택:
      - keyword, option_text
      - client_id (없으면 폼으로 client_id 제공)
      - assigned_staff_id (폼 제공 가능)
    """
    if not (file.filename or "").lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=415, detail="엑셀(.xlsx/.xls) 파일만 지원합니다.")

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    col_map = _parse_column_map(column_map)

    def _read_excel() -> pd.DataFrame:
        df = pd.read_excel(raw_bytes)  # type: ignore[arg-type]
        return _normalize_columns(df)

    try:
        df = await run_in_threadpool(_read_excel)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"엑셀 파싱 실패: {str(e)}") from e

    if df.empty:
        return ExcelImportResult(inserted_count=0, failed_count=0, failures=[])

    # 엑셀 컬럼명 -> 내부 필드명으로 rename
    if col_map:
        df = df.rename(columns=col_map)

    # NaN -> None
    df = df.where(pd.notnull(df), None)

    required = ["mall_name", "product_name"]
    missing_required_cols = [c for c in required if c not in df.columns]
    if missing_required_cols:
        raise HTTPException(
            status_code=422,
            detail=f"필수 컬럼이 없습니다: {missing_required_cols}. (column_map으로 매핑 가능)",
        )

    rows: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []

    for idx, record in enumerate(df.to_dict(orient="records"), start=2):  # 엑셀은 보통 1행 헤더 → 데이터는 2행부터
        mall_name = (record.get("mall_name") or "").strip() if isinstance(record.get("mall_name"), str) else record.get("mall_name")
        product_name = (record.get("product_name") or "").strip() if isinstance(record.get("product_name"), str) else record.get("product_name")

        row_client_id = record.get("client_id") or client_id
        if not mall_name or not product_name:
            failures.append({"row": idx, "error": "mall_name/product_name 필수값 누락", "data": record})
            continue
        if not row_client_id:
            failures.append({"row": idx, "error": "client_id가 없습니다(엑셀 컬럼 또는 폼으로 제공 필요)", "data": record})
            continue

        payload: dict[str, Any] = {
            "mall_name": mall_name,
            "product_name": product_name,
            "keyword": record.get("keyword"),
            "option_text": record.get("option_text"),
            "status": status,
            "client_id": str(row_client_id),
        }
        if assigned_staff_id:
            payload["assigned_staff_id"] = str(assigned_staff_id)

        # orders 테이블에 없을 수 있는 컬럼은 넣지 않습니다.
        rows.append(payload)

    if dry_run:
        return ExcelImportResult(inserted_count=0, failed_count=len(failures), failures=failures)

    if not rows:
        return ExcelImportResult(inserted_count=0, failed_count=len(failures), failures=failures)

    sb = get_supabase()
    inserted_count = 0

    # supabase-py는 동기 호출이므로 threadpool에서 실행
    async def _insert_chunk(chunk: list[dict[str, Any]]) -> int:
        def _do():
            res = sb.table(settings.SUPABASE_ORDERS_TABLE).insert(chunk).execute()
            # postgrest 응답은 data에 inserted rows 배열
            data = getattr(res, "data", None)
            return len(data) if isinstance(data, list) else len(chunk)

        return await run_in_threadpool(_do)

    chunk_size = max(1, settings.BULK_INSERT_CHUNK_SIZE)
    for chunk in _chunked(rows, chunk_size):
        try:
            inserted_count += await _insert_chunk(chunk)
        except Exception as e:
            # chunk 단위 실패는 row 단위로 분해해서 어느 행이 문제인지 찾기 어려우므로,
            # 최소한 chunk 전체를 failure로 반환합니다.
            failures.append({"row": None, "error": f"chunk insert 실패: {str(e)}", "data": {"chunk_size": len(chunk)}})

    return ExcelImportResult(
        inserted_count=inserted_count,
        failed_count=len(failures),
        failures=failures,
    )


@router.get("", response_model=list[OrderRow])
async def list_orders(
    assigned_staff_id: Optional[UUID] = None,
    status: Optional[OrderStatus] = None,
    limit: int = 500,
):
    """
    관리자 대시보드용: orders 목록 조회.
    (RLS/권한은 추후 적용. 현재는 서버(Service Role)로 조회합니다.)
    """
    sb = get_supabase()

    def _do():
        q = sb.table(settings.SUPABASE_ORDERS_TABLE).select(
            "id,mall_name,product_name,keyword,option_text,status,client_id,assigned_staff_id,invoice_number,review_screenshot_url"
        )
        if assigned_staff_id:
            q = q.eq("assigned_staff_id", str(assigned_staff_id))
        if status:
            q = q.eq("status", status)
        q = q.order("created_at", desc=True).limit(max(1, min(limit, 2000)))
        res = q.execute()
        data = getattr(res, "data", None)
        return data if isinstance(data, list) else []

    data = await run_in_threadpool(_do)
    return data


@router.post("/assign-staff", response_model=AssignStaffResult)
async def assign_staff(req: AssignStaffRequest):
    """
    관리자 대시보드용: 선택한 주문들에 담당직원ID(assigned_staff_id) 배정.
    """
    sb = get_supabase()
    ids = [str(x) for x in req.order_ids]

    def _do():
        # postgrest IN 필터
        q = sb.table(settings.SUPABASE_ORDERS_TABLE).update({"assigned_staff_id": str(req.assigned_staff_id)}).in_(
            "id", ids
        )
        res = q.execute()
        data = getattr(res, "data", None)
        return len(data) if isinstance(data, list) else 0

    updated = await run_in_threadpool(_do)
    return AssignStaffResult(updated_count=updated)


@router.get("/staff", response_model=list[StaffUser])
async def list_staff_users():
    """
    관리자 대시보드용: 직원(staff) 목록 조회.
    기본 SQL 기준 테이블명: app_users
    """
    sb = get_supabase()

    def _do():
        res = (
            sb.table("app_users")
            .select("id,username,display_name,role")
            .eq("role", "staff")
            .eq("is_active", True)
            .order("username")
            .execute()
        )
        data = getattr(res, "data", None)
        if not isinstance(data, list):
            return []
        # role 컬럼은 response_model에 없으니 제거
        for d in data:
            d.pop("role", None)
        return data

    return await run_in_threadpool(_do)


@router.get("/public/{token}", response_model=PublicOrderStatus)
async def get_public_order_status(token: UUID):
    """
    고객용(로그인 없음): orders.public_token(UUID)로 주문 진행상태 조회.
    """
    sb = get_supabase()

    def _do():
        res = (
            sb.table(settings.SUPABASE_ORDERS_TABLE)
            .select("mall_name,product_name,keyword,option_text,status,invoice_number,review_screenshot_url")
            .eq("public_token", str(token))
            .maybe_single()
            .execute()
        )
        return getattr(res, "data", None)

    data = await run_in_threadpool(_do)
    if not data:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")
    return data


def _status_sms_text(*, customer_name: str, kind: str, url: str) -> str:
    # kind: purchased | reviewed
    if kind == "purchased":
        return f"{customer_name}님, 주문하신 상품의 구매가 완료되었습니다. 링크: {url}"
    return f"{customer_name}님, 주문하신 상품의 후기가 완료되었습니다. 링크: {url}"


@router.post("/{order_id}/mark-purchased")
async def mark_purchased(order_id: UUID):
    """
    직원 액션: 구매 완료 처리 → 상태 업데이트 → 고객에게 SMS 발송(가능한 경우).
    """
    sb = get_supabase()

    def _fetch():
        res = (
            sb.table(settings.SUPABASE_ORDERS_TABLE)
            .select("id,status,public_token,customer_name,customer_phone")
            .eq("id", str(order_id))
            .maybe_single()
            .execute()
        )
        return getattr(res, "data", None)

    order = await run_in_threadpool(_fetch)
    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")

    def _update():
        return (
            sb.table(settings.SUPABASE_ORDERS_TABLE)
            .update({"status": "purchased", "purchased_at": "now()"})
            .eq("id", str(order_id))
            .execute()
        )

    await run_in_threadpool(_update)

    sms_sent = False
    sms_error = None
    try:
        name = (order.get("customer_name") or "").strip() or "고객"
        phone = (order.get("customer_phone") or "").strip()
        token = order.get("public_token")
        if phone and token:
            url = f"{settings.FRONTEND_PUBLIC_BASE_URL}/status/{token}"
            text = _status_sms_text(customer_name=name, kind="purchased", url=url)
            await run_in_threadpool(lambda: send_sms(to=phone, text=text))
            sms_sent = True
    except Exception as e:
        sms_error = str(e)

    return {"ok": True, "status": "purchased", "sms_sent": sms_sent, "sms_error": sms_error}


@router.post("/{order_id}/mark-reviewed")
async def mark_reviewed(order_id: UUID):
    """
    직원 액션: 후기 완료 처리 → 상태 업데이트 → 고객에게 SMS 발송(가능한 경우).
    """
    sb = get_supabase()

    def _fetch():
        res = (
            sb.table(settings.SUPABASE_ORDERS_TABLE)
            .select("id,status,public_token,customer_name,customer_phone")
            .eq("id", str(order_id))
            .maybe_single()
            .execute()
        )
        return getattr(res, "data", None)

    order = await run_in_threadpool(_fetch)
    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다.")

    def _update():
        return (
            sb.table(settings.SUPABASE_ORDERS_TABLE)
            .update({"status": "reviewed", "reviewed_at": "now()"})
            .eq("id", str(order_id))
            .execute()
        )

    await run_in_threadpool(_update)

    sms_sent = False
    sms_error = None
    try:
        name = (order.get("customer_name") or "").strip() or "고객"
        phone = (order.get("customer_phone") or "").strip()
        token = order.get("public_token")
        if phone and token:
            url = f"{settings.FRONTEND_PUBLIC_BASE_URL}/status/{token}"
            text = _status_sms_text(customer_name=name, kind="reviewed", url=url)
            await run_in_threadpool(lambda: send_sms(to=phone, text=text))
            sms_sent = True
    except Exception as e:
        sms_error = str(e)

    return {"ok": True, "status": "reviewed", "sms_sent": sms_sent, "sms_error": sms_error}

