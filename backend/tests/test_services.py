import pytest
from datetime import datetime, timezone
from app.services.recommendation import generate_personalized_recommendations
from app.services.digital_twin import update_trigger_evolution

# Mock Firestore Document Snapshots for local testing
class MockDoc:
    def __init__(self, data):
        self._data = data
    def to_dict(self):
        return self._data
    @property
    def exists(self):
        return True

def test_generate_personalized_recommendations_default(mocker=None):
    # Test case 1: General recommendations with no wellness memory
    # When memory matches are empty, it should fall back to default recommendations
    current_brs = 45.0
    top_triggers = [{"trigger_name": "Deadline", "taxonomy_category": "WORK"}]
    
    recs = generate_personalized_recommendations("test-user", current_brs, top_triggers)
    
    assert len(recs) > 0
    # The first default recommendation matching WORK is Box Breathing
    assert any("Breathing" in r["title"] or "Walk" in r["title"] for r in recs)
    assert not recs[0].get("is_highly_effective", False)

def test_generate_personalized_recommendations_personalized(mocker=None):
    # Test case 2: High stress matching BRS thresholds
    current_brs = 85.0
    top_triggers = [{"trigger_name": "Exam Anxiety", "taxonomy_category": "ACADEMICS"}]
    
    recs = generate_personalized_recommendations("test-user", current_brs, top_triggers)
    
    assert len(recs) > 0
    # Should recommend prioritized task chunking or breathing
    assert any("Prioritized" in r["title"] or "Pomodoro" in r["title"] or "Breathing" in r["title"] for r in recs)

def test_trigger_evolution_mock_run():
    # Verify we can execute the update_trigger_evolution helper safely
    # If using mock database fallback, it should complete without raising errors
    events = [
        {"event_name": "Mock Test", "taxonomy_category": "ACADEMICS"},
        {"event_name": "Project Deadline", "taxonomy_category": "WORK"}
    ]
    try:
        update_trigger_evolution("test-user-uid", events)
        success = True
    except Exception as e:
        success = False
        
    assert success is True
