from typing import Literal

from pydantic import Field, HttpUrl, field_validator

from app.core.schemas import ApiModel
from app.modules.profiles.schemas import Location

CATEGORIES = ("Cleansers", "Serums", "Moisturizers", "Sunscreens", "Exfoliants", "Aftercare")
# Models often answer "Cleanser" or "SPF" instead of the exact category; map common variants by prefix.
_CATEGORY_PREFIXES = {
    "cleans": "Cleansers",
    "serum": "Serums",
    "moistur": "Moisturizers",
    "sunscreen": "Sunscreens",
    "spf": "Sunscreens",
    "exfoli": "Exfoliants",
    "after": "Aftercare",
}


class Ingredient(ApiModel):
    name: str = Field(max_length=200)
    tone: Literal["good", "neutral", "avoid"] = "neutral"
    note: str = Field(default="From the listed ingredients", max_length=500)


class Offer(ApiModel):
    store: str = Field(max_length=150)
    price: float = Field(gt=0, le=1e9, allow_inf_nan=False)
    currency: str = Field(pattern=r"^[A-Z]{3}$")
    url: HttpUrl
    verified: bool = False
    in_stock: bool | None = None
    checked: str = "Not independently confirmed"
    delivery: str = "Check retailer"


class ProductData(ApiModel):
    source_confirmed: bool = Field(default=False, exclude=True)
    brand: str = Field(min_length=1, max_length=150)
    name: str = Field(min_length=1, max_length=300)
    category: Literal["Cleansers", "Serums", "Moisturizers", "Sunscreens", "Exfoliants", "Aftercare"]
    size: str = Field(default="See retailer", max_length=80)
    texture: str = Field(default="Unknown", max_length=100)
    tags: list[str] = Field(default_factory=list, max_length=10)
    ingredients: list[Ingredient] = Field(default_factory=list, max_length=100)
    ingredients_confirmed: bool = False
    offers: list[Offer] = Field(min_length=1, max_length=10)
    why: list[str] = Field(default_factory=list, max_length=10)
    match: int = Field(default=0, ge=0, le=100)
    suitable: bool = True
    not_suitable_reason: str | None = None
    rating: float = Field(default=0, ge=0, le=5)
    reviews: str = "Not available"
    sources: list[HttpUrl] = Field(default_factory=list, max_length=20)

    @field_validator("category", mode="before")
    @classmethod
    def _canonical_category(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        key = value.strip().lower()
        return next((c for prefix, c in _CATEGORY_PREFIXES.items() if key.startswith(prefix)), value)


class SearchInput(ApiModel):
    city: Location | None = None
    query: str = Field(default="", max_length=500)
    category: str | None = Field(default=None, max_length=50)
    refresh: bool = False
