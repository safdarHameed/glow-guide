from typing import Literal
from uuid import UUID

from pydantic import Field

from app.core.schemas import ApiModel
from app.modules.profiles.schemas import Location


class PlanInput(ApiModel):
    city: Location | None = None
    scan_id: str = "latest"
    keep_changes: bool = True
    refresh_products: bool = False


class Step(ApiModel):
    id: str = Field(min_length=1, max_length=100)
    category: Literal["Cleanser", "Serum", "Moisturizer", "Sunscreen", "Cleansing oil", "Exfoliant", "Aftercare"]
    product_id: UUID
    reason: str = Field(min_length=1, max_length=1000)
    owned: bool = False
    edited: bool = False


class Routine(ApiModel):
    morning: list[Step] = Field(default_factory=list, max_length=12)
    evening: list[Step] = Field(default_factory=list, max_length=12)


class PlanPatch(ApiModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    saved: bool | None = None
    is_current: bool | None = None
    routine: Routine | None = None


class DuplicateInput(ApiModel):
    city: Location
