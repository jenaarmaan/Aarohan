import logging
import json
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger("aarohan.gemini_extractor")

# Configure Gemini API
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY is not set in configuration.")

# We use gemini-1.5-flash as the primary stable multimodal model
MODEL_NAME = "gemini-1.5-flash"

SYSTEM_EXTRACTION_PROMPT = """
You are the Emotional Intelligence parsing engine for AAROHAN, a Universal Mental Wellness Platform.
Your task is to analyze user journal entries (which could be text or audio transcriptions) and extract structured insights.

You must categorize all extracted events into the following Standard Event Taxonomy categories:
- ACADEMICS (exams, classes, mock tests, study plans, rank rankings)
- WORK (deadlines, meetings, workload, performance reviews, office politics)
- FINANCE (funding, income, bills, expenses, burn rate)
- HEALTH (sleep, physical illness, exercise, diet, injury)
- RELATIONSHIPS (family, friends, arguments, loneliness, socializing)
- OTHER (general events not matching above categories)

You MUST respond ONLY with a JSON object. Do not include any markdown wrappers like ```json.
The JSON object must strictly match the following schema:
{
  "transcription": "String (Required: If processing text, this is just the input text. If processing audio, this is the exact transcription of the audio)",
  "sentiment_polarity": Float (between -1.0 and 1.0, representing sentiment: negative to positive),
  "extracted_events": [
    {
      "event_name": "String (e.g. 'mock test preparation', 'work project deadline', 'insufficient sleep')",
      "taxonomy_category": "String (Must be one of: ACADEMICS, WORK, FINANCE, HEALTH, RELATIONSHIPS, OTHER)"
    }
  ],
  "extracted_emotions": [
    {
      "emotion_name": "String (e.g. 'anxiety', 'fear', 'excitement', 'sadness', 'joy')",
      "confidence": Float (between 0.0 and 1.0 representing classification confidence)
    }
  ],
  "extracted_behaviors": [
    "String (e.g. 'sleep loss', 'social isolation', 'overthinking', 'procrastination')"
  ],
  "summary_explanation": "String (Brief summary explanation of what is causing the emotional state and its behavioral result)",
  "self_harm_detected": Boolean (True if there are indicators of self-harm, suicidal ideation, or severe clinical crisis, otherwise False)
}

Analyze the user's input carefully. Be highly objective and evaluate confidence scores realistically.
"""

def get_gemini_model():
    return genai.GenerativeModel(
        model_name=MODEL_NAME,
        generation_config={"response_mime_type": "application/json"}
    )

def analyze_journal(content: str) -> dict:
    """
    Analyzes a text journal entry using Gemini.
    """
    try:
        model = get_gemini_model()
        prompt = f"{SYSTEM_EXTRACTION_PROMPT}\n\nUser Journal Entry:\n{content}"
        
        response = model.generate_content(prompt)
        result = json.loads(response.text.strip())
        
        # Ensure transcription matches content if text
        if "transcription" not in result or not result["transcription"]:
            result["transcription"] = content
            
        return result
    except Exception as e:
        logger.error(f"Error in analyze_journal: {e}")
        # Fallback dictionary if Gemini fails
        return {
            "transcription": content,
            "sentiment_polarity": 0.0,
            "extracted_events": [],
            "extracted_emotions": [],
            "extracted_behaviors": [],
            "summary_explanation": "Analysis currently unavailable.",
            "self_harm_detected": False
        }

def analyze_voice_journal(audio_bytes: bytes, mime_type: str) -> dict:
    """
    Directly feeds audio bytes into Gemini to transcribe and analyze the voice journal in a single step.
    """
    try:
        model = get_gemini_model()
        
        audio_part = {
            "mime_type": mime_type,
            "data": audio_bytes
        }
        
        prompt = f"{SYSTEM_EXTRACTION_PROMPT}\n\nPlease transcribe the attached audio and perform full emotional analysis on the transcription."
        
        response = model.generate_content([audio_part, prompt])
        result = json.loads(response.text.strip())
        return result
    except Exception as e:
        logger.error(f"Error in analyze_voice_journal: {e}")
        return {
            "transcription": "[Audio transcription failed]",
            "sentiment_polarity": 0.0,
            "extracted_events": [],
            "extracted_emotions": [],
            "extracted_behaviors": [],
            "summary_explanation": "Audio analysis currently unavailable.",
            "self_harm_detected": False
        }

def generate_chat_response(
    history: list[dict], 
    user_message: str, 
    context: dict
) -> str:
    """
    Generates a conversational response from Aarohi using contextual memory parameters.
    The history parameter is a list of {"role": "user"|"model", "parts": [str]} dicts.
    """
    try:
        # Build Aarohi system instructions using the retrieval context
        persona_type = context.get("persona_type", "User")
        life_context = context.get("life_context", "General Life")
        burnout_risk = context.get("burnout_risk", "Low")
        burnout_score = context.get("burnout_score", 0)
        crisis_level = context.get("crisis_level", 1)
        top_triggers = ", ".join(context.get("top_triggers", []))
        
        system_instruction = f"""
You are Aarohi, the empathetic AI mental wellness companion for AAROHAN.
The user is a {persona_type} navigating a {life_context} context.
Your role is to act as a supportive wellness coach, not a therapist. Always keep your responses concise, warm, and actionable.

Active User Profile Metrics:
- Current Burnout Risk: {burnout_risk} (Score: {burnout_score}/100)
- Top Stress Triggers: {top_triggers or 'None detected yet'}
- Current Distress Level: Level {crisis_level} (out of 4)

Guidelines:
1. Refer to the user's specific context (e.g., if they are a Student preparing for exams, or an Entrepreneur building a startup) naturally when offering support.
2. Incorporate lessons from their Wellness Digital Twin (e.g., reminding them gently of what interventions have worked for them before, if available).
3. If their crisis level is Level 3 or 4, keep your response extremely gentle, encourage them to reach out to real-world help, and do not try to diagnose or treat them.
4. Keep the conversation focused on stress triggers, burnout prevention, and general resilience.
"""
        
        # Configure model with system instructions
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=system_instruction
        )
        
        # Set up chat sessions
        chat = model.start_chat(history=[])
        
        # Add history
        for h in history:
            role = "user" if h["role"] == "user" else "model"
            # Manually inject history into the chat object structure if needed, or build a single prompt wrapper
            # For simplicity with the python SDK, we can construct the context prompt
            pass

        # Since building chat history state dynamically is simpler with a combined prompt if SDK chat history objects are strict:
        # Let's write a simple query combining history to prevent SDK schema discrepancies:
        prompt_lines = []
        for h in history:
            sender = "User" if h["role"] == "user" else "Aarohi"
            prompt_lines.append(f"{sender}: {h['text']}")
        prompt_lines.append(f"User: {user_message}")
        prompt_lines.append("Aarohi:")
        
        full_prompt = "\n".join(prompt_lines)
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Error generating chat response: {e}")
        return "I am here for you, but I'm currently having trouble connecting. Take a deep breath. How can I help you in this moment?"
