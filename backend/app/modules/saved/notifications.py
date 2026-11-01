import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import JSON, DateTime, ForeignKey, String, UniqueConstraint, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAtMixin, UUIDPrimaryKeyMixin
from app.modules.plans.models import Plan
from app.modules.profiles.schemas import ProfileData
from app.modules.profiles.service import get_profile
from app.modules.scans.models import Scan
from app.modules.scans.service import aware
from app.modules.users.models import User


class Notification(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "notifications"
    __table_args__ = (UniqueConstraint("user_id", "key"),)

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(30))
    data: Mapped[dict] = mapped_column(JSON)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


async def add(db: AsyncSession, user: User, key: str, kind: str, title: str, body: str):
    existing = await db.scalar(select(Notification).where(Notification.user_id == user.id, Notification.key == key))
    if existing is None:
        db.add(Notification(user_id=user.id, key=key, kind=kind, data={"title": title, "body": body}))


async def reminders(db: AsyncSession, user: User):
    profile = ProfileData.model_validate((await get_profile(db, user)).data)
    # Serialized per user, including multiple browser tabs.
    await db.execute(select(User).where(User.id == user.id).with_for_update())
    today = datetime.now(UTC).date()
    if profile.notifications.scan:
        latest = await db.scalar(
            select(Scan)
            .where(Scan.user_id == user.id, Scan.status == "success")
            .order_by(Scan.created_at.desc())
            .limit(1)
        )
        if latest and datetime.now(UTC) - aware(latest.created_at) >= timedelta(days=14):
            await add(
                db, user, f"scan-{latest.id}", "scan", "Time for a new scan", "Scan in similar light to track changes."
            )
    if profile.notifications.trip:
        trips = (
            await db.scalars(select(Plan).where(Plan.user_id == user.id, Plan.saved.is_(True), Plan.trip.is_not(None)))
        ).all()
        for plan in trips:
            if 0 <= (datetime.fromisoformat(plan.trip["start"]).date() - today).days <= 2:
                await add(
                    db,
                    user,
                    f"trip-{plan.id}",
                    "trip",
                    f"Your {plan.trip['destination']['name']} trip is coming up",
                    "Review your saved kit before departure.",
                )
    await db.flush()
