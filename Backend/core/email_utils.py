import smtplib
from email.message import EmailMessage
from core.config import settings
from loguru import logger
from fastapi import BackgroundTasks

def send_email_sync(subject: str, body: str, to_email: str = settings.ALERT_EMAIL_RECIPIENT, html_body: str = None):
    """Synchronous email sending utility with HTML support."""
    smtp_user = settings.GMAIL_SENDER or settings.SMTP_USER
    smtp_password = settings.GMAIL_APP_PASSWORD or settings.SMTP_PASSWORD

    if not smtp_user or not smtp_password:
        logger.warning(f"SIMULATED EMAIL to {to_email} | Subject: {subject}")
        return

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = smtp_user
    msg['To'] = to_email or settings.ALERT_EMAIL_RECIPIENT
    msg.set_content(body)

    if html_body:
        msg.add_alternative(html_body, subtype='html')

    try:
        server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email successfully sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")

def trigger_alert_email(background_tasks: BackgroundTasks, disaster_type: str, severity: str, details: str):
    """Utility to attach email dispatch to FastAPI background tasks."""
    subject = f"NEURIX ALERT: {severity} {disaster_type} Detected"
    body = (
        f"NEURIX System has detected a high priority disaster event.\n\n"
        f"Type: {disaster_type}\n"
        f"Severity: {severity}\n"
        f"Details: {details}\n\n"
        f"Please check the NEURIX dashboard for immediate action plans and timeline."
    )
    background_tasks.add_task(send_email_sync, subject, body)
