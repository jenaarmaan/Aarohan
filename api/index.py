"""
Vercel Serverless Function entrypoint for the FastAPI backend.
Vercel detects this file at api/index.py and routes /api/* requests to it.
"""
import sys
import os

# Add the backend directory to the Python path so FastAPI app imports work
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, backend_dir)

from app.main import app
