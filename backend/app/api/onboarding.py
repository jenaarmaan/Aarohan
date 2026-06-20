from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.models.schemas import OnboardingRequest
from app.core.firebase import db
from datetime import datetime

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

@router.post("", status_code=status.HTTP_201_CREATED)
def create_onboarding_profile(
    profile: OnboardingRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Submits user onboarding details: persona, current feeling, concerns, and privacy toggles.
    """
    try:
        # Save or update user persona configuration in Firestore
        persona_ref = db.collection("personas").document(user_id)
        persona_data = {
            "user_id": user_id,
            "persona_type": profile.persona_type,
            "life_context": profile.life_context,
            "baseline_feeling": profile.baseline_feeling,
            "top_concerns": profile.top_concerns,
            "privacy_controls": {
                "allow_ai_analysis": profile.allow_ai_analysis,
                "allow_data_retention": profile.allow_data_retention
            },
            "updated_at": datetime.utcnow()
        }
        persona_ref.set(persona_data)
        
        # Initialize default analytics cache
        analytics_ref = db.collection("user_analytics").document(user_id)
        analytics_ref.set({
            "user_id": user_id,
            "avg_stress": 50.0 if profile.baseline_feeling == "Overwhelmed" else 30.0,
            "avg_mood": 5.0,
            "current_burnout_score": 30.0,
            "current_crisis_level": 1,
            "top_triggers": [],
            "recent_timeline": [],
            "updated_at": datetime.utcnow()
        })
        
        return {"status": "success", "message": "Onboarding profile saved successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save onboarding: {e}"
        )

@router.get("")
def get_onboarding_profile(user_id: str = Depends(get_current_user)):
    """
    Retrieves the current user's onboarding persona profile.
    """
    try:
        doc = db.collection("personas").document(user_id).get()
        if not doc.exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Onboarding profile not found"
            )
        return doc.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch profile: {e}"
        )
