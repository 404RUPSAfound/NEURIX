import sys
import os
sys.path.append(os.getcwd())
from core.email_utils import send_email_sync
from core.config import settings

print(f"Testing email to {settings.ALERT_EMAIL_RECIPIENT}...")
try:
    send_email_sync(
        subject="🚀 NEURIX SMTP TEST",
        body="If you see this, NEURIX tactical SMTP relay is operational.",
        to_email=settings.ALERT_EMAIL_RECIPIENT
    )
    print("Test triggered. Check loguru output above.")
except Exception as e:
    print(f"Test failed: {e}")
