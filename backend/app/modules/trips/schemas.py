from datetime import date
from typing import Literal

from pydantic import model_validator

from app.core.schemas import ApiModel
from app.modules.profiles.schemas import Location


class TripInput(ApiModel):
    destination: Location
    start: date
    end: date
    trip_type: Literal["beach", "city", "work"] = "city"
    buy_at: Literal["home", "dest"] = "home"

    @model_validator(mode="after")
    def dates(self):
        if self.end < self.start:
            raise ValueError("End date must be on or after departure.")
        if (self.end - self.start).days > 90:
            raise ValueError("Trips can be up to 90 days long.")
        return self
