from __future__ import annotations

from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


OrderStatus = Literal["pending", "purchased", "reviewed"]


class ExcelImportResult(BaseModel):
    inserted_count: int
    failed_count: int
    failures: list[dict[str, Any]] = Field(default_factory=list)


class ImageUploadResult(BaseModel):
    bucket: str
    path: str
    url: str
    attachment_id: Optional[UUID] = None


class StaffUser(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str] = None


class OrderRow(BaseModel):
    id: UUID
    mall_name: str
    product_name: str
    keyword: Optional[str] = None
    option_text: Optional[str] = None
    status: OrderStatus
    client_id: UUID
    assigned_staff_id: Optional[UUID] = None
    invoice_number: Optional[str] = None
    review_screenshot_url: Optional[str] = None


class PublicOrderStatus(BaseModel):
    mall_name: str
    product_name: str
    keyword: Optional[str] = None
    option_text: Optional[str] = None
    status: OrderStatus
    invoice_number: Optional[str] = None
    review_screenshot_url: Optional[str] = None


class AssignStaffRequest(BaseModel):
    order_ids: list[UUID] = Field(min_length=1)
    assigned_staff_id: UUID


class AssignStaffResult(BaseModel):
    updated_count: int

