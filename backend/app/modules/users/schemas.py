import uuid
from datetime import datetime

from app.core.schemas import ApiModel
from app.modules.users.models import User


class UserPublic(ApiModel):
    """The only shape of a user that leaves the API. Never includes hashes or provider ids."""

    id: uuid.UUID
    email: str
    name: str
    avatar_url: str | None
    has_password: bool
    google_linked: bool
    onboarding_completed: bool
    created_at: datetime

    @classmethod
    def from_model(cls, user: User) -> "UserPublic":
        return cls(
            id=user.id,
            email=user.email,
            name=user.name,
            avatar_url=user.avatar_url,
            has_password=user.password_hash is not None,
            google_linked=user.google_id is not None,
            onboarding_completed=user.onboarding_completed_at is not None,
            created_at=user.created_at,
        )
