from typing import Annotated

from email_validator import EmailNotValidError, validate_email
from pydantic import AfterValidator, field_validator

from app.core.schemas import ApiModel
from app.modules.users.schemas import UserPublic


def _normalize_email(value: str) -> str:
    try:
        return validate_email(value.strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError:
        raise ValueError("Enter a valid email address.") from None


def _check_new_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Use at least 8 characters.")
    if len(value) > 128:
        raise ValueError("Use 128 characters or fewer.")
    return value


Email = Annotated[str, AfterValidator(_normalize_email)]
NewPassword = Annotated[str, AfterValidator(_check_new_password)]


class SignupIn(ApiModel):
    name: str
    email: Email
    password: NewPassword

    @field_validator("name")
    @classmethod
    def _check_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Enter your name.")
        if len(value) > 80:
            raise ValueError("Use 80 characters or fewer.")
        return value


class LoginIn(ApiModel):
    email: Email
    password: str

    @field_validator("password")
    @classmethod
    def _check_password(cls, value: str) -> str:
        if not value:
            raise ValueError("Enter your password.")
        return value


class GoogleIn(ApiModel):
    code: str


class ForgotPasswordIn(ApiModel):
    email: Email


class ResetPasswordIn(ApiModel):
    token: str
    password: NewPassword


class AuthOut(ApiModel):
    user: UserPublic
    # True only when this request created the account, so the client can start onboarding.
    is_new_user: bool = False


class MeOut(ApiModel):
    user: UserPublic


class GoogleProviderOut(ApiModel):
    enabled: bool
    client_id: str | None


class ProvidersOut(ApiModel):
    google: GoogleProviderOut
