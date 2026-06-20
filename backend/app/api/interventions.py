from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.models.schemas import InterventionResultSubmit
from app.services.digital_twin import log_outcome_event

router = APIRouter(prefix="/interventions", tags=["Interventions"])

@router.post("/outcome", status_code=status.HTTP_201_CREATED)
def submit_intervention_outcome(
    payload: InterventionResultSubmit,
    user_id: str = Depends(get_current_user)
):
    """
    Registers a recommendation feedback loop event. 
    Builds personal wellness memory data to personalize future recommendations.
    """
    try:
        # Logs the feedback loop details: event -> emotion -> behavior -> intervention -> outcome
        result = log_outcome_event(
            user_id=user_id,
            event=payload.event,
            emotion=payload.emotion,
            behavior=payload.behavior,
            intervention=payload.intervention,
            outcome=payload.outcome,
            confidence=0.9
        )
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to record outcome loop"
            )
            
        return {"status": "success", "message": "Intervention outcome registered successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit outcome: {e}"
        )
