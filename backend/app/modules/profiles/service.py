from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.modules.profiles.models import Profile
from app.modules.profiles.schemas import ProfileData
from app.modules.users.models import User
from app.services.currency import exchange_rate


async def get_profile(db: AsyncSession, user: User) -> Profile:
    row = await db.get(Profile, user.id)
    if row is None:
        await db.execute(select(User).where(User.id == user.id).with_for_update())
        row = await db.get(Profile, user.id)
    if row is None:
        row = Profile(user_id=user.id, data=ProfileData().model_dump(mode="json", by_alias=True))
        db.add(row)
        await db.flush()
    return row


async def update_profile(db: AsyncSession, user: User, patch: dict) -> ProfileData:
    row = await get_profile(db, user)
    data = ProfileData.model_validate({**row.data, **patch})
    if data.onboarding == "done" and data.city is None:
        raise AppError(422, "CITY_REQUIRED", "Choose a city before finishing onboarding.")
    old_city = row.data.get("city")
    if data.city and old_city and old_city["currency"] != data.city.currency and "budgetMax" not in patch:
        rate = await exchange_rate(old_city["currency"], data.city.currency)
        data.budget_min = round(data.budget_min * rate, 2)
        if data.budget_max is not None:
            data.budget_max = max(0.01, round(data.budget_max * rate, 2))
    if any(
        k in patch
        for k in ("city", "concerns", "avoid", "owned", "budgetMode", "budgetMin", "budgetMax", "skinTypeOverride")
    ):
        data.plan_outdated = True
    if data.city:
        data.recent_cities = [data.city, *[c for c in data.recent_cities if c.id != data.city.id]][:4]
    if data.onboarding == "done" and user.onboarding_completed_at is None:
        user.onboarding_completed_at = datetime.now(UTC)
    row.data = data.model_dump(mode="json", by_alias=True)
    await db.flush()
    return data
