import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.firebase import db
from app.api import onboarding, journals, mood, chat, dashboard, interventions

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aarohan.main")

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Aarohan Predictive Wellness Intelligence API",
    version="1.0.0"
)

# Attach rate limiter state and error handlers
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers (Standard)
api_prefix = settings.API_V1_STR
app.include_router(onboarding.router, prefix=api_prefix)
app.include_router(journals.router, prefix=api_prefix)
app.include_router(mood.router, prefix=api_prefix)
app.include_router(chat.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(interventions.router, prefix=api_prefix)

# Register API Routers (Sandbox /_/backend prefix fallback)
sandbox_prefix = f"/_/backend{api_prefix}"
app.include_router(onboarding.router, prefix=sandbox_prefix)
app.include_router(journals.router, prefix=sandbox_prefix)
app.include_router(mood.router, prefix=sandbox_prefix)
app.include_router(chat.router, prefix=sandbox_prefix)
app.include_router(dashboard.router, prefix=sandbox_prefix)
app.include_router(interventions.router, prefix=sandbox_prefix)

@app.get("/health", tags=["System"])
def health_check():
    """
    Verifies API status and tests connectivity to the Firebase Firestore cluster.
    """
    try:
        # Perform a fast read test
        db.collection("health_check").document("status").get()
        return {
            "status": "healthy",
            "database": "connected",
            "project": settings.PROJECT_NAME
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

@app.get("/", tags=["System"])
def root():
    return {
        "message": "Welcome to Aarohan Predictive Wellness Intelligence API.",
        "docs_url": "/docs"
    }
