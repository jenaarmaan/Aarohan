import logging
from app.core.firebase import db

logger = logging.getLogger("aarohan.recommendation")

# Static default interventions if no memory exists yet
DEFAULT_INTERVENTIONS = [
    {
        "title": "Box Breathing Routine",
        "description": "Inhale for 4 seconds, hold for 4, exhale for 4, hold for 4. Repeat 4 times.",
        "category": "Coping",
        "suitable_categories": ["ACADEMICS", "WORK"],
        "min_stress_threshold": 30
    },
    {
        "title": "Rest & Nature Walk",
        "description": "Disconnect from devices and take a 15-minute walk outside.",
        "category": "Routine",
        "suitable_categories": ["HEALTH", "RELATIONSHIPS"],
        "min_stress_threshold": 40
    },
    {
        "title": "Pomodoro Focus Correction",
        "description": "Study/Work for 25 minutes, then rest for 10 minutes (doubled rest interval).",
        "category": "Study-Rest Balance",
        "suitable_categories": ["ACADEMICS", "WORK", "FINANCE"],
        "min_stress_threshold": 50
    },
    {
        "title": "Mindful Social Reset",
        "description": "Call a trusted friend or peer for a 10-minute casual chat (no exam or work talk).",
        "category": "Routine",
        "suitable_categories": ["RELATIONSHIPS", "OTHER"],
        "min_stress_threshold": 40
    },
    {
        "title": "Prioritized Task Chunking",
        "description": "List all concerns, select the top single item, and break it into 15-minute micro-tasks.",
        "category": "Coping",
        "suitable_categories": ["ACADEMICS", "WORK", "FINANCE"],
        "min_stress_threshold": 60
    }
]

def generate_personalized_recommendations(user_id: str, current_brs: float, top_triggers: list[dict]) -> list[dict]:
    """
    Generates dynamic interventions based on user's current BRS risk and active triggers.
    Prioritizes items found in the user's wellness_memory with high effectiveness.
    """
    try:
        recommendations = []
        
        # 1. Fetch user's wellness memory
        memory_docs = db.collection("wellness_memory").where("user_id", "==", user_id).get()
        memories = [m.to_dict() for m in memory_docs]
        
        # Extract triggers the user has experienced
        trigger_categories = [t.get("taxonomy_category") for t in top_triggers]
        trigger_names = [t.get("trigger_name") for t in top_triggers]
        
        # 2. Check memory matches first (Defensible Moat)
        for mem in memories:
            trig_name = mem.get("trigger")
            if trig_name in trigger_names and mem.get("effectiveness", 0.5) > 0.6:
                for routine in mem.get("successful_interventions", []):
                    # Find if we have details or create a memory recommendation
                    recommendations.append({
                        "title": f"Personalized: {routine}",
                        "description": f"This intervention was previously identified as highly effective when dealing with '{trig_name}'.",
                        "category": "Coping",
                        "effectiveness_score": mem.get("effectiveness", 0.8),
                        "confidence_score": round(mem.get("effectiveness", 0.8) * 0.95, 2),
                        "is_highly_effective": True
                    })
                    
        # 3. Filter default recommendations
        for default in DEFAULT_INTERVENTIONS:
            # Match triggers category or general stress
            is_match = False
            for cat in default["suitable_categories"]:
                if cat in trigger_categories:
                    is_match = True
                    break
                    
            if is_match or current_brs > default["min_stress_threshold"]:
                # Check if we already have it in recommended
                if not any(r["title"].endswith(default["title"]) for r in recommendations):
                    recommendations.append({
                        "title": default["title"],
                        "description": default["description"],
                        "category": default["category"],
                        "effectiveness_score": 0.5,
                        "confidence_score": 0.7,
                        "is_highly_effective": False
                    })
                    
        # Limit to top 3 recommendations
        return recommendations[:3]
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}")
        return DEFAULT_INTERVENTIONS[:2]
