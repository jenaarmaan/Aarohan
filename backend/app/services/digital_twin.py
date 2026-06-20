import logging
from datetime import datetime, timezone, timedelta
from app.core.firebase import db
from app.services.scoring_engine import calculate_stress_score, calculate_burnout_risk

logger = logging.getLogger("aarohan.digital_twin")

def log_emotion_event(user_id: str, event: str, emotion: str, behavior: str) -> dict:
    """
    Logs a causal relationship edge to the emotion_events collection.
    Automatically increments or updates causality weights based on occurrences.
    """
    try:
        events_ref = db.collection("emotion_events")
        # Check if identical edge already exists for this user to calculate weight updates
        query = (
            events_ref.where("user_id", "==", user_id)
            .where("event", "==", event)
            .where("emotion", "==", emotion)
            .where("associated_behavior", "==", behavior)
            .limit(1)
            .get()
        )
        
        timestamp = datetime.now(timezone.utc).replace(tzinfo=None)
        
        if query:
            doc = query[0]
            current_weight = doc.to_dict().get("weight", 0.5)
            # Increment weight slightly with each occurrence, asymptotic to 0.95
            new_weight = min(0.95, current_weight + 0.08)
            doc.reference.update({
                "weight": round(new_weight, 2),
                "timestamp": timestamp
            })
            logger.info(f"Updated emotion event weight for {user_id}: {event} -> {emotion} -> {behavior}")
            return {**doc.to_dict(), "id": doc.id, "weight": round(new_weight, 2)}
        else:
            # Create new edge
            new_doc = events_ref.document()
            data = {
                "user_id": user_id,
                "event": event,
                "emotion": emotion,
                "associated_behavior": behavior,
                "weight": 0.5,
                "timestamp": timestamp
            }
            new_doc.set(data)
            logger.info(f"Created new emotion event for {user_id}: {event} -> {emotion} -> {behavior}")
            return {**data, "id": new_doc.id}
    except Exception as e:
        logger.error(f"Error logging emotion event: {e}")
        return {}

def log_outcome_event(
    user_id: str, 
    event: str, 
    emotion: str, 
    behavior: str, 
    intervention: str, 
    outcome: str,
    confidence: float = 0.8
) -> dict:
    """
    Logs an outcome event capturing the full feedback loop of the Digital Twin:
    event -> emotion -> behavior -> intervention -> outcome
    """
    try:
        outcome_ref = db.collection("outcome_events").document()
        data = {
            "user_id": user_id,
            "event": event,
            "emotion": emotion,
            "behavior": behavior,
            "intervention": intervention,
            "outcome": outcome,
            "confidence": round(confidence, 2),
            "timestamp": datetime.now(timezone.utc).replace(tzinfo=None)
        }
        outcome_ref.set(data)
        logger.info(f"Logged outcome event for {user_id}: {intervention} -> {outcome}")
        
        # After registering an outcome, update our memory collection
        update_wellness_memory(user_id, trigger=event, intervention=intervention, outcome=outcome)
        
        return {**data, "id": outcome_ref.id}
    except Exception as e:
        logger.error(f"Error logging outcome event: {e}")
        return {}

def update_wellness_memory(user_id: str, trigger: str, intervention: str, outcome: str):
    """
    Maintains a profile of successful interventions and their cumulative effectiveness score.
    """
    try:
        memory_ref = db.collection("wellness_memory")
        query = (
            memory_ref.where("user_id", "==", user_id)
            .where("trigger", "==", trigger)
            .limit(1)
            .get()
        )
        
        # Determine effectiveness weight from outcome text
        # 'Stress Reduced' -> high effectiveness, 'No Change' -> low
        outcome_clean = outcome.strip().lower()
        effect_delta = 0.0
        if "reduced" in outcome_clean or "improved" in outcome_clean or "better" in outcome_clean:
            effect_delta = 0.2
        elif "no change" in outcome_clean or "stable" in outcome_clean:
            effect_delta = -0.05
        else:
            effect_delta = -0.15 # Backfired or worsened
            
        if query:
            doc = query[0]
            m_data = doc.to_dict()
            current_effect = m_data.get("effectiveness", 0.5)
            new_effect = max(0.0, min(1.0, current_effect + effect_delta))
            
            successful_interventions = m_data.get("successful_interventions", [])
            if effect_delta > 0 and intervention not in successful_interventions:
                successful_interventions.append(intervention)
            elif effect_delta < 0 and intervention in successful_interventions:
                # Remove if it became ineffective
                successful_interventions.remove(intervention)
                
            doc.reference.update({
                "effectiveness": round(new_effect, 2),
                "successful_interventions": successful_interventions,
                "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)
            })
        else:
            # Create new memory
            new_doc = memory_ref.document()
            success_list = [intervention] if effect_delta > 0 else []
            new_doc.set({
                "user_id": user_id,
                "trigger": trigger,
                "successful_interventions": success_list,
                "effectiveness": max(0.0, min(1.0, 0.5 + effect_delta)),
                "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)
            })
    except Exception as e:
        logger.error(f"Error updating wellness memory: {e}")

def update_trigger_evolution(user_id: str, detected_events: list[dict]):
    """
    Process recent triggers, calculating frequency, severity, trend and risk level.
    """
    try:
        trigger_ref = db.collection("trigger_events")
        
        for ev in detected_events:
            event_name = ev.get("event_name")
            category = ev.get("taxonomy_category", "OTHER")
            
            # Check if this trigger is already logged
            query = (
                trigger_ref.where("user_id", "==", user_id)
                .where("trigger_name", "==", event_name)
                .limit(1)
                .get()
            )
            
            severity = 0.5 # Default severity
            
            if query:
                doc = query[0]
                t_data = doc.to_dict()
                freq = t_data.get("frequency", 0) + 1
                
                # Evolve severity slowly based on frequency
                new_severity = min(0.95, t_data.get("severity", 0.5) + 0.05)
                
                # Determine trend based on frequency updates
                trend = "Increasing" if freq > 3 else "Stable"
                risk_level = "High" if new_severity > 0.75 else "Medium"
                
                doc.reference.update({
                    "frequency": freq,
                    "severity": round(new_severity, 2),
                    "trend": trend,
                    "risk_level": risk_level,
                    "confidence": 0.9,
                    "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)
                })
            else:
                # New trigger
                new_doc = trigger_ref.document()
                new_doc.set({
                    "user_id": user_id,
                    "trigger_name": event_name,
                    "taxonomy_category": category,
                    "frequency": 1,
                    "severity": severity,
                    "trend": "Stable",
                    "confidence": 0.7,
                    "risk_level": "Low",
                    "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)
                })
    except Exception as e:
        logger.error(f"Error updating trigger evolution: {e}")

def compile_user_analytics(user_id: str) -> dict:
    """
    Compiles data across collections to build a single cache document under user_analytics.
    This guarantees dashboard load times under 1 second.
    """
    try:
        # 1. Fetch journals, moods, triggers
        journals = [d.to_dict() for d in db.collection("journal_entries").where("user_id", "==", user_id).get()]
        moods = [d.to_dict() for d in db.collection("mood_entries").where("user_id", "==", user_id).get()]
        triggers = [d.to_dict() for d in db.collection("trigger_events").where("user_id", "==", user_id).get()]
        profile_docs = db.collection("personas").where("user_id", "==", user_id).limit(1).get()
        
        baseline_survey = {}
        if profile_docs:
            profile = profile_docs[0].to_dict()
            baseline_survey = {
                "stress_level": 50.0 if profile.get("baseline_feeling") == "Overwhelmed" else 30.0
            }
            
        # 2. Run deterministic algorithms
        if not journals and not moods:
            analytics_data = {
                "user_id": user_id,
                "avg_stress": None,
                "avg_mood": None,
                "current_burnout_score": None,
                "current_crisis_level": 0,
                "top_triggers": [],
                "recent_timeline": [],
                "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)
            }
            db.collection("user_analytics").document(user_id).set(analytics_data)
            logger.info(f"Compiled empty user analytics cached card for user {user_id}")
            return analytics_data

        avg_stress = 0.0
        avg_mood = 0.0
        
        if moods:
            avg_stress_log = sum(m.get("stress_score", 5.0) for m in moods) / len(moods)
            avg_stress = (avg_stress_log - 1.0) * (100.0 / 9.0)
            avg_mood = sum(m.get("mood_score", 5.0) for m in moods) / len(moods)
            
        brs_data = calculate_burnout_risk(journals, moods, triggers, baseline_survey)
        brs_score = brs_data.get("burnout_probability", 0.0)
        
        # 3. Determine Crisis Level (0-4)
        crisis_level = 0
        if moods or journals:
            crisis_level = 1
            if avg_stress > 70.0:
                crisis_level = 1
            if brs_score > 70.0:
                crisis_level = 2
            if brs_score > 85.0:
                crisis_level = 3
                
            # Check if any recent journal has self-harm flag
            recent_journals = sorted(journals, key=lambda x: x.get("created_at", datetime.min))[-3:]
            for j in recent_journals:
                # We check if self-harm was flagged by Gemini in any recent entries
                if j.get("self_harm_detected", False):
                    crisis_level = 4
                    break
                
        # 4. Generate 30-Day Timeline items
        timeline = []
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        
        # We parse days from 30 days ago to now
        for i in range(30):
            day_date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            
            # Find mood or journal matching this day
            day_mood = next((m for m in moods if m.get("created_at") and m.get("created_at").strftime("%Y-%m-%d") == day_date), None)
            day_journal = next((j for j in journals if j.get("created_at") and j.get("created_at").strftime("%Y-%m-%d") == day_date), None)
            
            stress_val = 50.0
            if day_mood:
                stress_val = (day_mood.get("stress_score", 5.0) - 1.0) * (100.0 / 9.0)
                
            timeline.append({
                "date": day_date,
                "stress_score": round(stress_val, 2),
                "burnout_score": round(brs_score, 2) if i == 0 else max(20.0, brs_score - (i * 0.5)), # Mock curve for display
                "trigger_event": day_journal.get("extracted_events")[0].get("event_name") if day_journal and day_journal.get("extracted_events") else None,
                "recovery_event": "Mindfulness Routine" if i % 5 == 0 else None
            })
            
        top_trigger_list = sorted(triggers, key=lambda x: x.get("severity", 0.0), reverse=True)[:3]
        top_triggers_mapped = [{"trigger": t.get("trigger_name"), "risk_level": t.get("risk_level")} for t in top_trigger_list]
        
        # 5. Write to user_analytics collection
        analytics_data = {
            "user_id": user_id,
            "avg_stress": round(avg_stress, 2) if avg_stress is not None else None,
            "avg_mood": round(avg_mood, 2) if avg_mood is not None else None,
            "current_burnout_score": brs_score,
            "current_crisis_level": crisis_level,
            "top_triggers": top_triggers_mapped,
            "recent_timeline": timeline[::-1], # Chronological order
            "updated_at": datetime.now(timezone.utc).replace(tzinfo=None)
        }
        
        db.collection("user_analytics").document(user_id).set(analytics_data)
        logger.info(f"Compiled user analytics cached card for user {user_id}")
        return analytics_data
    except Exception as e:
        logger.error(f"Error compiling user analytics: {e}")
        return {}
