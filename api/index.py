import sys
import os

# Add backend directory to the Python path to import app correctly
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

# Import main FastAPI application instance
from app.main import app
