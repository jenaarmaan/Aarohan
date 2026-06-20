from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class OnboardingRequest(BaseModel):
    persona_type: str = Field(..., json_schema_extra={"example": "Student"})
    life_context: str = Field(..., json_schema_extra={"example": "Competitive Exams"})
    baseline_feeling: str = Field(..., json_schema_extra={"example": "Overwhelmed"})
    top_concerns: List[str] = Field(default=[], json_schema_extra={"example": ["Exams", "Grades"]})
    allow_ai_analysis: bool = True
    allow_data_retention: bool = True

class JournalCreate(BaseModel):
    content: str = Field(default="")
    audio_url: Optional[str] = None

class MoodCreate(BaseModel):
    mood_score: int = Field(..., ge=1, le=10, json_schema_extra={"example": 5})
    energy_score: int = Field(..., ge=1, le=10, json_schema_extra={"example": 5})
    stress_score: int = Field(..., ge=1, le=10, json_schema_extra={"example": 5})

class ChatMessageCreate(BaseModel):
    text: str = Field(..., json_schema_extra={"example": "I feel really stressed about my upcoming presentation."})
    session_id: Optional[str] = None

class InterventionResultSubmit(BaseModel):
    event: str = Field(..., json_schema_extra={"example": "Work Deadline"})
    emotion: str = Field(..., json_schema_extra={"example": "Anxiety"})
    behavior: str = Field(..., json_schema_extra={"example": "Sleep Loss"})
    intervention: str = Field(..., json_schema_extra={"example": "Box Breathing Routine"})
    outcome: str = Field(..., json_schema_extra={"example": "Stress Reduced"})
