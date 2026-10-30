from html import escape

from app.services.mailer import Mail


def password_reset_email(to: str, name: str, link: str, ttl_minutes: int) -> Mail:
    first_name = name.split(" ")[0] or "there"
    text = (
        f"Hi {first_name},\n\n"
        "We received a request to reset your GlowGuide password. Open this link to choose a new one:\n"
        f"{link}\n\n"
        f"The link expires in {ttl_minutes} minutes. If you didn't ask for this, you can ignore this email."
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;color:#17262A;max-width:480px">
      <p>Hi {escape(first_name)},</p>
      <p>We received a request to reset your GlowGuide password.</p>
      <p><a href="{escape(link)}" style="display:inline-block;background:#24695C;color:#fff;padding:12px 20px;
         border-radius:999px;text-decoration:none">Choose a new password</a></p>
      <p style="color:#6A7A7D;font-size:13px">The link expires in {ttl_minutes} minutes.
         If you didn't ask for this, you can ignore this email.</p>
    </div>"""
    return Mail(to=to, subject="Reset your GlowGuide password", text=text, html=html)
