from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class OnboardingRequest(BaseModel):
    persona_type: str = Field(..., example="Student")
    life_context: str = Field(..., example="Competitive Exams")
    baseline_feeling: str = Field(..., example="Overwhelmed")
    top_concerns: List[str] = Field(default=[], example=["Exams", "Grades"])
    allow_ai_analysis: bool = True
    allow_data_retention: bool = True

class JournalCreate(BaseModel):
    content: str = Field(default="")
    audio_url: Optional[str] = None

class MoodCreate(BaseModel):
    mood_score: int = Field(..., ge=1, le=10, example=5)
    energy_score: int = Field(..., ge=1, le=10, example=5)
    stress_score: int = Field(..., ge=1, le=10, example=5)

class ChatMessageCreate(BaseModel):
    text: str = Field(..., example="I feel really stressed about my upcoming presentation.")
    session_id: Optional[str] = None

class InterventionResultSubmit(BaseModel):
    event: str = Field(..., example="Work Deadline")
    emotion: str = Field(..., example="Anxiety")
    behavior: str = Field(..., example="Sleep Loss")
    intervention: str = Field(..., example="Box Breathing Routine")
    outcome: str = Field(..., example="Stress Reduced")
