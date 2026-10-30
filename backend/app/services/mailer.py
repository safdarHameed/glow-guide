import logging
from dataclasses import dataclass
from email.message import EmailMessage

import aiosmtplib

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Mail:
    to: str
    subject: str
    text: str
    html: str


async def send_mail(mail: Mail) -> None:
    """Sends through SMTP when configured; otherwise logs the email so local development needs no mail server."""
    settings = get_settings()
    if not settings.smtp_enabled:
        logger.info("Email (SMTP not configured, not sent) to=%s subject=%r\n%s", mail.to, mail.subject, mail.text)
        return

    message = EmailMessage()
    message["From"] = settings.mail_from
    message["To"] = mail.to
    message["Subject"] = mail.subject
    message.set_content(mail.text)
    message.add_alternative(mail.html, subtype="html")

    await aiosmtplib.send(
        message,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_password,
        use_tls=settings.smtp_port == 465,
        start_tls=settings.smtp_port == 587,
    )
