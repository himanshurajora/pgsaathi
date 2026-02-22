import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "PGSaathi <noreply@pgsaathi.com>")


def send_otp_email(to_email: str, otp: str, name: str) -> bool:
    """Send OTP via SMTP. Returns True if sent, False if SMTP not configured."""
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASS]):
        logger.warning(f"[DEV MODE] SMTP not configured. OTP for {to_email}: {otp}")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "PGSaathi - Email Verification OTP"
        msg["From"] = SMTP_FROM
        msg["To"] = to_email
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="background:#D97706;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
            <h1 style="color:white;margin:0;font-size:24px;font-weight:800">PGSaathi</h1>
            <p style="color:#FDE68A;margin:4px 0 0;font-size:13px">Your PG Management Companion</p>
          </div>
          <h2 style="color:#1C1917;margin-bottom:8px">Hi {name},</h2>
          <p style="color:#78716C">Your email verification OTP is:</p>
          <div style="background:#FEF3C7;border:2px dashed #D97706;border-radius:10px;padding:24px;text-align:center;margin:20px 0">
            <h1 style="color:#D97706;font-size:42px;letter-spacing:10px;margin:0;font-weight:800">{otp}</h1>
            <p style="color:#78716C;font-size:13px;margin:8px 0 0">Expires in 10 minutes</p>
          </div>
          <p style="color:#A8A29E;font-size:13px">If you did not request this, please ignore this email.</p>
        </div>
        """
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to_email, msg.as_string())
        logger.info(f"OTP email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send OTP email: {e}")
        return False
