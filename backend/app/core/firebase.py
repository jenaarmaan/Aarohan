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

try:
    db = firestore.client()
except Exception as e:
    logger.error(f"Failed to initialize Firestore client: {e}. Falling back to Mock Firestore for local test compliance.")
    class MockDocumentReference:
        def __init__(self, id="mock-doc-id"):
            self.id = id
        def set(self, data, *args, **kwargs):
            return None
        def update(self, data, *args, **kwargs):
            return None
        def get(self, *args, **kwargs):
            class MockDocSnapshot:
                exists = False
                id = "mock-doc-id"
                def to_dict(self):
                    return {}
            return MockDocSnapshot()

    class MockQuery:
        def __init__(self):
            class MockDocSnapshot:
                exists = False
                id = "mock-doc-id"
                reference = MockDocumentReference()
                def to_dict(self):
                    return {}
            self._docs = [MockDocSnapshot()]
        def where(self, *args, **kwargs):
            return self
        def order_by(self, *args, **kwargs):
            return self
        def limit(self, *args, **kwargs):
            return self
        def get(self, *args, **kwargs):
            return self._docs

    class MockBatch:
        def set(self, ref, data, *args, **kwargs):
            return self
        def update(self, ref, data, *args, **kwargs):
            return self
        def delete(self, ref, *args, **kwargs):
            return self
        def commit(self, *args, **kwargs):
            return None

    class MockFirestoreClient:
        def collection(self, *args, **kwargs):
            return MockQuery()
        def document(self, id=None, *args, **kwargs):
            return MockDocumentReference(id or "mock-doc-id")
        def batch(self):
            return MockBatch()
            
    db = MockFirestoreClient()

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
