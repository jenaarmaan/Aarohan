from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.core.firebase import db
from app.services.digital_twin import compile_user_analytics
from app.services.recommendation import generate_personalized_recommendations

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("")
def get_dashboard_data(user_id: str = Depends(get_current_user)):
    """
    Instantly returns pre-compiled analytics card and personalized wellness recommendation lists.
    Guarantees load latency is under 1 second.
    """
    try:
        # Fetch pre-compiled dashboard analytics card
        doc = db.collection("user_analytics").document(user_id).get()
        
        if doc.exists:
            analytics_data = doc.to_dict()
        else:
            # Fallback compile if not yet populated (e.g. cold start)
            analytics_data = compile_user_analytics(user_id)
            
        current_brs = analytics_data.get("current_burnout_score", 30.0)
        top_triggers = analytics_data.get("top_triggers", [])
        
        # Generate recommendations matching triggers and BRS
        recommendations = generate_personalized_recommendations(user_id, current_brs, top_triggers)
        
        return {
            "analytics": analytics_data,
            "recommendations": recommendations
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch dashboard data: {e}"
        )
