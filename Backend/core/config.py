import os
from dotenv import load_dotenv

# Load .env file from the Backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "NEURIX Tactical Intelligence")
    VERSION: str = os.getenv("VERSION", "2.0.0")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "neurix-offline-ai-ndrf-2024-secure-key-xyz")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_HOURS: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "72"))

    # AI Config
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    OLLAMA_HEALTH_URL: str = os.getenv("OLLAMA_HEALTH_URL", "http://localhost:11434/api/tags")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:0.5b")
    OLLAMA_TIMEOUT: int = int(os.getenv("OLLAMA_TIMEOUT", "90"))

    # Gemini API / Claude API
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "AIzaSyC_NHqQzb4d3DS0RKcNsBx74LrJA1TXjv8")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    # Google Maps API
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")

    # SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./neurix.db")

    # Email (Gmail SMTP)
    GMAIL_SENDER: str = os.getenv("GMAIL_SENDER", "")
    GMAIL_APP_PASSWORD: str = os.getenv("GMAIL_APP_PASSWORD", "")
    
    # Legacy SMTP (fallback)
    SMTP_SERVER: str = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    ALERT_EMAIL_RECIPIENT: str = os.getenv("ALERT_EMAIL_RECIPIENT", "rupsapandit156@gmail.com")

    @property
    def email_configured(self) -> bool:
        """Check if email is properly configured."""
        return bool(self.GMAIL_SENDER and self.GMAIL_APP_PASSWORD and 
                   "@gmail.com" in self.GMAIL_SENDER and
                   len(self.GMAIL_APP_PASSWORD.replace(" ", "")) == 16)

settings = Settings()
