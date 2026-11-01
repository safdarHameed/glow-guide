from typing import Literal

from pydantic import Field, model_validator

from app.core.schemas import ApiModel


class Location(ApiModel):
    id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=150)
    country: str = Field(min_length=1, max_length=100)
    country_code: str = Field(min_length=2, max_length=2)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    stores: list[str] = Field(default_factory=list, max_length=20)


class Notifications(ApiModel):
    uv: bool = True
    scan: bool = True
    price: bool = True
    trip: bool = True


class ProfileData(ApiModel):
    city: Location | None = None
    recent_cities: list[Location] = Field(default_factory=list, max_length=4)
    concerns: list[str] = Field(default_factory=list, max_length=3)
    avoid: list[str] = Field(default_factory=list, max_length=50)
    owned: list[str] = Field(default_factory=list, max_length=100)
    budget_mode: Literal["product", "routine"] = "routine"
    budget_min: float = Field(default=0, ge=0, le=1e9)
    budget_max: float | None = Field(default=None, gt=0, le=1e9)
    skin_type_override: str | None = Field(default=None, max_length=50)
    units: Literal["C", "F"] = "C"
    notifications: Notifications = Field(default_factory=Notifications)
    keep_scan_history: bool = True
    scan_consent: bool = False
    onboarding: Literal["done", "skipped"] | None = None
    plan_outdated: bool = False

    @model_validator(mode="after")
    def valid_budget(self):
        if self.budget_max is not None and self.budget_min > self.budget_max:
            raise ValueError("Minimum budget must not exceed maximum budget.")
        if any(len(s) > 200 for s in self.concerns + self.avoid + self.owned):
            raise ValueError("Profile entries must be 200 characters or fewer.")
        return self
