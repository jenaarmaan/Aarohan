import os
import json
import logging
# pyrefly: ignore [missing-import]
import firebase_admin
from firebase_admin import credentials, auth, firestore
from app.core.config import settings

logger = logging.getLogger("aarohan.firebase")

# Initialize Firebase Admin SDK
try:
    if not firebase_admin._apps:
        if settings.FIREBASE_CREDENTIALS_JSON:
            try:
                # Try parsing as JSON string first
                cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase initialized using service account credentials dictionary.")
            except Exception as e:
                # Treat as path if JSON parsing fails
                if os.path.exists(settings.FIREBASE_CREDENTIALS_JSON):
                    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_JSON)
                    firebase_admin.initialize_app(cred)
                    logger.info(f"Firebase initialized using service account key file at {settings.FIREBASE_CREDENTIALS_JSON}.")
                else:
                    raise e
        else:
            # Fallback to application default credentials or project ID options
            firebase_admin.initialize_app(options={
                'projectId': settings.FIREBASE_PROJECT_ID
            })
            logger.info("Firebase initialized with default credentials.")
except Exception as e:
    logger.error(f"Error initializing Firebase Admin SDK: {e}")
    # Initialize with default options to prevent crash during builds/tests
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': settings.FIREBASE_PROJECT_ID})

db = firestore.client()

def verify_firebase_token(token: str) -> dict:
    """
    Verifies a Firebase ID token sent from the client.
    Returns the decoded token claims if valid, otherwise raises ValueError.
    """
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise ValueError("Invalid authentication token")
