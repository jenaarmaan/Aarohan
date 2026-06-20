import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.api.deps import get_current_user
from app.models.schemas import JournalCreate
from app.core.firebase import db
from app.services.gemini_extractor import analyze_journal, analyze_voice_journal
from app.services.scoring_engine import calculate_stress_score
from app.services.digital_twin import log_emotion_event, update_trigger_evolution, compile_user_analytics
from datetime import datetime

router = APIRouter(prefix="/journals", tags=["Journals"])
logger = logging.getLogger("aarohan.journals")

@router.post("", status_code=status.HTTP_201_CREATED)
def create_text_journal(
    entry: JournalCreate,
    user_id: str = Depends(get_current_user)
):
    """
    Submits a text journal entry. Automatically triggers emotional extraction and scoring.
    """
    if not entry.content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Journal content cannot be empty"
        )
        
    try:
        # 1. Run Gemini extraction
        analysis = analyze_journal(entry.content)
        
        # 2. Get recent mood check-in to compute stress score
        mood_query = (
            db.collection("mood_entries")
            .where("user_id", "==", user_id)
            .order_by("created_at", direction="DESCENDING")
            .limit(1)
            .get()
        )
        
        mood_stress = None
        if mood_query:
            mood_stress = mood_query[0].to_dict().get("stress_score")
            
        # 3. Calculate stress score
        stress_val = calculate_stress_score(mood_stress, analysis.get("sentiment_polarity"))
        
        # 4. Save to journal_entries collection
        journal_ref = db.collection("journal_entries").document()
        journal_data = {
            "id": journal_ref.id,
            "user_id": user_id,
            "content": entry.content,
            "audio_url": entry.audio_url,
            "sentiment_polarity": analysis.get("sentiment_polarity", 0.0),
            "extracted_events": analysis.get("extracted_events", []),
            "extracted_emotions": analysis.get("extracted_emotions", []),
            "self_harm_detected": analysis.get("self_harm_detected", False),
            "stress_score": stress_val,
            "created_at": datetime.utcnow(),
            "is_synced": True
        }
        journal_ref.set(journal_data)
        
        # 5. Log events to behavioral graph and update triggers
        for ev in analysis.get("extracted_events", []):
            event_name = ev.get("event_name")
            category = ev.get("taxonomy_category", "OTHER")
            
            # Log relation edge for each emotion/behavior detected
            for emo in analysis.get("extracted_emotions", []):
                emotion_name = emo.get("emotion_name")
                for bh in analysis.get("extracted_behaviors", []):
                    log_emotion_event(user_id, event_name, emotion_name, bh)
                    
        # Evolve triggers
        update_trigger_evolution(user_id, analysis.get("extracted_events", []))
        
        # 6. Refresh user dashboard cache (user_analytics)
        compile_user_analytics(user_id)
        
        return {
            "status": "success",
            "journal_id": journal_ref.id,
            "stress_score": stress_val,
            "analysis": {
                "events": analysis.get("extracted_events"),
                "emotions": analysis.get("extracted_emotions"),
                "summary": analysis.get("summary_explanation"),
                "self_harm_flag": analysis.get("self_harm_detected")
            }
        }
    except Exception as e:
        logger.error(f"Error creating journal: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process journal entry: {e}"
        )

@router.post("/voice", status_code=status.HTTP_201_CREATED)
async def upload_voice_journal(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    """
    Accepts direct audio file upload (MP3/WebM/WAV). Transcribes and runs emotional analysis in a single step.
    """
    if not file.content_type.startswith("audio/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File uploaded is not a valid audio format"
        )
        
    try:
        audio_bytes = await file.read()
        
        # 1. Run Gemini multimodal audio transcription & extraction
        analysis = analyze_voice_journal(audio_bytes, file.content_type)
        transcribed_text = analysis.get("transcription", "[Empty transcription]")
        
        # 2. Get recent mood check-in to compute stress score
        mood_query = (
            db.collection("mood_entries")
            .where("user_id", "==", user_id)
            .order_by("created_at", direction="DESCENDING")
            .limit(1)
            .get()
        )
        
        mood_stress = None
        if mood_query:
            mood_stress = mood_query[0].to_dict().get("stress_score")
            
        # 3. Calculate stress score
        stress_val = calculate_stress_score(mood_stress, analysis.get("sentiment_polarity"))
        
        # 4. Save to journal_entries collection
        journal_ref = db.collection("journal_entries").document()
        journal_data = {
            "id": journal_ref.id,
            "user_id": user_id,
            "content": transcribed_text,
            "audio_url": "uploaded_voice_journal", # Indicator
            "sentiment_polarity": analysis.get("sentiment_polarity", 0.0),
            "extracted_events": analysis.get("extracted_events", []),
            "extracted_emotions": analysis.get("extracted_emotions", []),
            "self_harm_detected": analysis.get("self_harm_detected", False),
            "stress_score": stress_val,
            "created_at": datetime.utcnow(),
            "is_synced": True
        }
        journal_ref.set(journal_data)
        
        # 5. Log events to behavioral graph and update triggers
        for ev in analysis.get("extracted_events", []):
            event_name = ev.get("event_name")
            for emo in analysis.get("extracted_emotions", []):
                emotion_name = emo.get("emotion_name")
                for bh in analysis.get("extracted_behaviors", []):
                    log_emotion_event(user_id, event_name, emotion_name, bh)
                    
        update_trigger_evolution(user_id, analysis.get("extracted_events", []))
        
        # 6. Refresh user dashboard cache
        compile_user_analytics(user_id)
        
        return {
            "status": "success",
            "journal_id": journal_ref.id,
            "transcription": transcribed_text,
            "stress_score": stress_val,
            "analysis": {
                "events": analysis.get("extracted_events"),
                "emotions": analysis.get("extracted_emotions"),
                "summary": analysis.get("summary_explanation"),
                "self_harm_flag": analysis.get("self_harm_detected")
            }
        }
    except Exception as e:
        logger.error(f"Error processing voice upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process voice journal: {e}"
        )

@router.get("")
def get_user_journals(user_id: str = Depends(get_current_user)):
    """
    Fetches the history of journal entries for the current user.
    """
    try:
        docs = (
            db.collection("journal_entries")
            .where("user_id", "==", user_id)
            .order_by("created_at", direction="DESCENDING")
            .get()
        )
        return [d.to_dict() for d in docs]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch journals: {e}"
        )
