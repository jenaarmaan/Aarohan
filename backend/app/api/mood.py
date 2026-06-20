from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.models.schemas import MoodCreate
from app.core.firebase import db
from app.services.digital_twin import compile_user_analytics
from datetime import datetime

router = APIRouter(prefix="/moods", tags=["Moods"])

@router.post("", status_code=status.HTTP_201_CREATED)
def create_mood_checkin(
    checkin: MoodCreate,
    user_id: str = Depends(get_current_user)
):
    """
    Submits a daily emotional check-in (mood, energy, stress scores from 1 to 10).
    """
    try:
        mood_ref = db.collection("mood_entries").document()
        data = {
            "id": mood_ref.id,
            "user_id": user_id,
            "mood_score": checkin.mood_score,
            "energy_score": checkin.energy_score,
            "stress_score": checkin.stress_score,
            "created_at": datetime.utcnow()
        }
        mood_ref.set(data)
        
        # Compile new analytics cache since a new data point was registered
        compile_user_analytics(user_id)
        
        return {"status": "success", "mood_id": mood_ref.id}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record mood entry: {e}"
        )

@router.get("")
def get_mood_history(user_id: str = Depends(get_current_user)):
    """
    Retrieves the historical log of mood entries for the current user.
    """
    try:
        docs = (
            db.collection("mood_entries")
            .where("user_id", "==", user_id)
            .order_by("created_at", direction="DESCENDING")
            .get()
        )
        return [d.to_dict() for d in docs]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch mood history: {e}"
        )
