"""Imports every model so Base.metadata is complete for Alembic and test setup."""

from app.db.base import Base
from app.modules.ai.models import AiConnection, AiUsage
from app.modules.auth.models import AuthSession, PasswordResetToken
from app.modules.plans.models import Plan
from app.modules.products.models import Product, ProductReport
from app.modules.profiles.models import Profile
from app.modules.saved.models import SavedProduct
from app.modules.saved.notifications import Notification
from app.modules.scans.models import Scan, ScanMask
from app.modules.users.models import User

__all__ = [
    "AiConnection",
    "AiUsage",
    "AuthSession",
    "Base",
    "Notification",
    "PasswordResetToken",
    "Plan",
    "Product",
    "ProductReport",
    "Profile",
    "SavedProduct",
    "Scan",
    "ScanMask",
    "User",
]
