import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user
from app.models.schemas import ChatMessageCreate
from app.core.firebase import db
from app.services.gemini_extractor import generate_chat_response
from datetime import datetime

router = APIRouter(prefix="/chat", tags=["Chat"])
logger = logging.getLogger("aarohan.chat")

@router.post("", status_code=status.HTTP_201_CREATED)
def send_chat_message(
    payload: ChatMessageCreate,
    user_id: str = Depends(get_current_user)
):
    """
    Sends a message to the Aarohi Companion. Runs the Context Retrieval Pipeline before calling Gemini.
    """
    try:
        session_id = payload.session_id
        
        # 1. Initialize session if not present
        if not session_id:
            session_ref = db.collection("chat_sessions").document()
            session_ref.set({
                "id": session_ref.id,
                "user_id": user_id,
                "title": f"Session - {datetime.utcnow().strftime('%b %d, %Y')}",
                "created_at": datetime.utcnow()
            })
            session_id = session_ref.id
            
        # 2. Retrieve Context (Onboarding & Cached Analytics & Memory)
        persona_doc = db.collection("personas").document(user_id).get()
        persona_data = persona_doc.to_dict() if persona_doc.exists else {}
        
        analytics_doc = db.collection("user_analytics").document(user_id).get()
        analytics_data = analytics_doc.to_dict() if analytics_doc.exists else {}
        
        memory_docs = db.collection("wellness_memory").where("user_id", "==", user_id).get()
        memories = [m.to_dict() for m in memory_docs]
        
        # Compile contextual parameters
        context = {
            "persona_type": persona_data.get("persona_type", "User"),
            "life_context": persona_data.get("life_context", "General Life"),
            "burnout_score": analytics_data.get("current_burnout_score", 30),
            "burnout_risk": "High" if analytics_data.get("current_burnout_score", 30) > 70 else "Medium" if analytics_data.get("current_burnout_score", 30) > 40 else "Low",
            "crisis_level": analytics_data.get("current_crisis_level", 1),
            "top_triggers": [t.get("trigger") for t in analytics_data.get("top_triggers", [])],
            "memories": [{"trigger": m.get("trigger"), "interventions": m.get("successful_interventions"), "effectiveness": m.get("effectiveness")} for m in memories]
        }
        
        # 3. Retrieve recent message history (last 8 messages in this session)
        history_docs = (
            db.collection("chat_messages")
            .where("session_id", "==", session_id)
            .order_by("timestamp", direction="DESCENDING")
            .limit(8)
            .get()
        )
        
        # Convert to chronological history list
        history = []
        for doc in reversed(history_docs):
            d = doc.to_dict()
            history.append({
                "role": "user" if d.get("sender") == "user" else "model",
                "text": d.get("text", "")
            })
            
        # 4. Generate response using contextualized Gemini prompt builder
        response_text = generate_chat_response(history, payload.text, context)
        
        # 5. Log messages to Firestore (flat message structure to bypass 1MB document limit)
        user_msg_ref = db.collection("chat_messages").document()
        user_msg_ref.set({
            "id": user_msg_ref.id,
            "session_id": session_id,
            "user_id": user_id,
            "sender": "user",
            "text": payload.text,
            "timestamp": datetime.utcnow()
        })
        
        aarohi_msg_ref = db.collection("chat_messages").document()
        aarohi_msg_ref.set({
            "id": aarohi_msg_ref.id,
            "session_id": session_id,
            "user_id": user_id,
            "sender": "aarohi",
            "text": response_text,
            "timestamp": datetime.utcnow()
        })
        
        return {
            "session_id": session_id,
            "response": response_text
        }
    except Exception as e:
        logger.error(f"Error in send_chat_message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate conversation response"
        )

@router.get("/sessions")
def get_chat_sessions(user_id: str = Depends(get_current_user)):
    """
    Fetches all active chat sessions for the current user.
    """
    try:
        docs = (
            db.collection("chat_sessions")
            .where("user_id", "==", user_id)
            .order_by("created_at", direction="DESCENDING")
            .get()
        )
        return [d.to_dict() for d in docs]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch sessions: {e}"
        )

@router.get("/sessions/{session_id}/messages")
def get_session_messages(
    session_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Retrieves all messages logged under a specific chat session.
    """
    try:
        # Verify ownership of session first
        sess = db.collection("chat_sessions").document(session_id).get()
        if not sess.exists or sess.to_dict().get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized access to chat session"
            )
            
        docs = (
            db.collection("chat_messages")
            .where("session_id", "==", session_id)
            .order_by("timestamp", direction="ASCENDING")
            .get()
        )
        return [d.to_dict() for d in docs]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch messages: {e}"
        )

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_session(
    session_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Deletes a specific chat session and all messages associated with it.
    """
    try:
        # Verify ownership of session first
        sess_ref = db.collection("chat_sessions").document(session_id)
        sess = sess_ref.get()
        if not sess.exists or sess.to_dict().get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized access to chat session"
            )
            
        # Delete all messages in the session
        messages = db.collection("chat_messages").where("session_id", "==", session_id).get()
        batch = db.batch()
        for msg in messages:
            batch.delete(msg.reference)
        
        # Delete the session itself
        batch.delete(sess_ref)
        batch.commit()
        
        return
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting chat session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {e}"
        )
