from datetime import datetime, timezone, timedelta
from app.services.scoring_engine import calculate_stress_score, calculate_burnout_risk

def test_calculate_stress_score():
    # Case 1: Neutral inputs
    score = calculate_stress_score(mood_stress_1_10=5.0, sentiment_polarity=0.0)
    # mood 5.0 -> (5.0-1)*(100/9) = 44.44. Sentiment 0.0 -> (1-0)*50 = 50.0.
    # 44.44*0.6 + 50.0*0.4 = 26.66 + 20.0 = 46.66
    assert abs(score - 46.67) < 0.1

    # Case 2: Maximum stress
    max_score = calculate_stress_score(mood_stress_1_10=10.0, sentiment_polarity=-1.0)
    assert max_score == 100.0

    # Case 3: Minimum stress
    min_score = calculate_stress_score(mood_stress_1_10=1.0, sentiment_polarity=1.0)
    assert min_score == 0.0

def test_calculate_burnout_risk_cold_start():
    # Cold start with baseline survey
    baseline = {"stress_level": 60.0}
    brs = calculate_burnout_risk([], [], [], baseline)
    
    assert brs["burnout_probability"] > 0
    assert brs["confidence"] == 0.3 # Low initial confidence
    assert brs["exhaustion_risk"] in ["Low", "Medium", "High"]

def test_calculate_burnout_risk_active_logs():
    now = datetime.now(timezone.utc)
    # Mock journals showing increasing negativity
    journals = [
        {"created_at": now - timedelta(days=5), "sentiment_polarity": 0.5},
        {"created_at": now - timedelta(days=3), "sentiment_polarity": 0.1},
        {"created_at": now - timedelta(days=1), "sentiment_polarity": -0.4}
    ]
    
    # Mock mood checkins showing rising stress
    moods = [
        {"created_at": now - timedelta(days=5), "mood_score": 7, "stress_score": 3.0},
        {"created_at": now - timedelta(days=3), "mood_score": 5, "stress_score": 6.0},
        {"created_at": now - timedelta(days=1), "mood_score": 3, "stress_score": 8.0}
    ]
    
    triggers = [
        {"trigger_name": "Deadline", "severity": 0.8, "trend": "Increasing"}
    ]
    
    brs = calculate_burnout_risk(journals, moods, triggers)
    
    assert brs["burnout_probability"] > 50.0
    assert brs["confidence"] > 0.3 # Increased confidence due to more logs
    assert "temporal_metrics" in brs
    assert brs["temporal_metrics"]["emotional_volatility"] > 0
