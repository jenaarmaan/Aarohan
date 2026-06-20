import math
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("aarohan.scoring_engine")

def calculate_stress_score(mood_stress_1_10: float | None, sentiment_polarity: float | None) -> float:
    """
    Stress Score Formula:
    Stress = (MoodStress_0_100 * 0.6) + (SentimentStress_0_100 * 0.4)
    """
    # Convert mood stress (1-10) to 0-100 scale
    if mood_stress_1_10 is not None:
        mood_stress_0_100 = (mood_stress_1_10 - 1.0) * (100.0 / 9.0)
        mood_stress_0_100 = max(0.0, min(100.0, mood_stress_0_100))
    else:
        mood_stress_0_100 = 50.0  # Default neutral
        
    # Convert sentiment polarity (-1.0 to 1.0) to stress score (0-100)
    # -1.0 polarity -> 100.0 stress (highly negative)
    # 1.0 polarity -> 0.0 stress (highly positive)
    if sentiment_polarity is not None:
        sentiment_stress_0_100 = (1.0 - sentiment_polarity) * 50.0
        sentiment_stress_0_100 = max(0.0, min(100.0, sentiment_stress_0_100))
    else:
        sentiment_stress_0_100 = 50.0  # Default neutral
        
    stress_score = (mood_stress_0_100 * 0.6) + (sentiment_stress_0_100 * 0.4)
    return round(stress_score, 2)

def calculate_burnout_risk(
    journal_entries: list[dict],
    mood_entries: list[dict],
    trigger_events: list[dict],
    baseline_survey: dict | None = None
) -> dict:
    """
    Calculates the Burnout Risk Score (BRS) deterministically using a 6-factor model:
    BRS = 0.25 * NegativeTrend
        + 0.20 * StressGrowth
        + 0.15 * Volatility
        + 0.15 * RecoveryDelay
        + 0.15 * EngagementDrop
        + 0.10 * TriggerIntensity
    """
    
    # 1. NegativeTrend (0-100)
    # Slope of journal sentiment polarity over the last 10 entries.
    negative_trend = 50.0  # Default baseline
    if len(journal_entries) >= 2:
        # Sort by creation time ascending
        sorted_journals = sorted(journal_entries, key=lambda x: x.get("created_at", datetime.min))[-10:]
        sentiments = [j.get("sentiment_polarity", 0.0) for j in sorted_journals]
        
        # Calculate simple slope: (last - first) / intervals
        # If it decreases, we represent it as positive risk factor
        diff = sentiments[-1] - sentiments[0]
        # Map a decline of -2.0 (total positive to total negative) to 100.0, and an increase to 0.0
        negative_trend = (1.0 - (diff / 2.0)) * 50.0
        negative_trend = max(0.0, min(100.0, negative_trend))
    elif baseline_survey:
        # Fallback to survey baseline
        survey_stress = baseline_survey.get("stress_level", 50.0)
        negative_trend = survey_stress

    # 2. StressGrowth (0-100)
    # Percent increase in mood check-in stress levels over past 7 check-ins
    stress_growth = 50.0  # Default baseline
    if len(mood_entries) >= 2:
        sorted_moods = sorted(mood_entries, key=lambda x: x.get("created_at", datetime.min))[-7:]
        stresses = [m.get("stress_score", 5.0) for m in sorted_moods]
        
        # Convert to 0-100 scale
        start_stress = (stresses[0] - 1.0) * (100.0 / 9.0)
        end_stress = (stresses[-1] - 1.0) * (100.0 / 9.0)
        
        diff = end_stress - start_stress
        # Map diff from -100 to 100 onto 0 to 100
        stress_growth = (diff + 100.0) / 2.0
        stress_growth = max(0.0, min(100.0, stress_growth))
    elif baseline_survey:
        stress_growth = baseline_survey.get("stress_level", 50.0)

    # 3. Emotional Volatility (0-100)
    # Standard deviation of mood scores
    volatility = 30.0  # Default baseline
    if len(mood_entries) >= 3:
        mood_scores = [m.get("mood_score", 5.0) for m in mood_entries]
        mean_mood = sum(mood_scores) / len(mood_scores)
        variance = sum((x - mean_mood) ** 2 for x in mood_scores) / len(mood_scores)
        std_dev = math.sqrt(variance)
        
        # Standard deviation of 1-10 scale max is 4.5
        # Map 0 to 4.5 onto 0 to 100
        volatility = (std_dev / 4.5) * 100.0
        volatility = max(0.0, min(100.0, volatility))

    # 4. Recovery Delay (0-100)
    # Average duration in days to return to baseline mood/stress after a stress spike (>7)
    recovery_delay = 30.0  # Default baseline
    spikes = []
    recoveries = []
    
    # Sort moods chronologically
    sorted_moods = sorted(mood_entries, key=lambda x: x.get("created_at", datetime.min))
    in_spike = False
    spike_time = None
    
    for m in sorted_moods:
        stress = m.get("stress_score", 5.0)
        m_time = m.get("created_at", datetime.min)
        if isinstance(m_time, str):
            # Parse timestamp if it is stored as ISO string in firestore mock/testing
            try:
                m_time = datetime.fromisoformat(m_time.replace("Z", "+00:00"))
            except:
                m_time = datetime.min
                
        if stress >= 7.0:
            if not in_spike:
                in_spike = True
                spike_time = m_time
        else:
            if in_spike:
                # Recovered
                in_spike = False
                if spike_time and m_time != datetime.min:
                    delay_days = (m_time - spike_time).total_seconds() / 86400.0
                    recoveries.append(delay_days)
                    
    if recoveries:
        avg_delay = sum(recoveries) / len(recoveries)
        # Map 0 to 7 days onto 0 to 100
        recovery_delay = (avg_delay / 7.0) * 100.0
        recovery_delay = max(0.0, min(100.0, recovery_delay))

    # 5. Engagement Drop (0-100)
    # Log frequency decline in past 7 days vs past 30 days baseline
    engagement_drop = 0.0  # Default no drop
    now = datetime.now(timezone.utc)
    
    # helper to get timestamps from entries
    def get_time(x):
        t = x.get("created_at", now)
        if isinstance(t, str):
            try:
                return datetime.fromisoformat(t.replace("Z", "+00:00")).replace(tzinfo=None)
            except:
                return now
        elif isinstance(t, datetime):
            return t.replace(tzinfo=None)
        return now

    logs_past_7_days = [x for x in mood_entries if (now - get_time(x)).days <= 7]
    logs_past_30_days = [x for x in mood_entries if (now - get_time(x)).days <= 30]
    
    # Calculate daily average logs
    avg_logs_30 = len(logs_past_30_days) / 30.0
    avg_logs_7 = len(logs_past_7_days) / 7.0
    
    # If the user has a history of logging
    if avg_logs_30 > 0.1:
        if avg_logs_7 < avg_logs_30:
            # Drop percentage
            drop_ratio = (avg_logs_30 - avg_logs_7) / avg_logs_30
            engagement_drop = drop_ratio * 100.0
            engagement_drop = max(0.0, min(100.0, engagement_drop))

    # 6. Trigger Intensity (0-100)
    # Average severity of active triggers
    trigger_intensity = 40.0  # Default baseline
    if trigger_events:
        severities = [t.get("severity", 0.5) * 100.0 for t in trigger_events]
        trigger_intensity = sum(severities) / len(severities)
        trigger_intensity = max(0.0, min(100.0, trigger_intensity))
    elif baseline_survey:
        trigger_intensity = baseline_survey.get("stress_level", 50.0)

    # Compile the final BRS score
    brs_score = (
        (0.25 * negative_trend) +
        (0.20 * stress_growth) +
        (0.15 * volatility) +
        (0.15 * recovery_delay) +
        (0.15 * engagement_drop) +
        (0.10 * trigger_intensity)
    )
    
    brs_score = round(brs_score, 2)
    
    # Determine exhaustion risk category
    if brs_score < 40.0:
        exhaustion_risk = "Low"
    elif brs_score < 75.0:
        exhaustion_risk = "Medium"
    else:
        exhaustion_risk = "High"
        
    # Calculate confidence based on data points available
    total_data_points = len(journal_entries) + len(mood_entries)
    confidence = min(0.95, 0.3 + (total_data_points * 0.05))
    
    return {
        "burnout_probability": brs_score,
        "exhaustion_risk": exhaustion_risk,
        "motivation_decline": brs_score > 65.0,
        "confidence": round(confidence, 2),
        "temporal_metrics": {
            "sentiment_trend_slope": round(negative_trend, 2),
            "stress_growth_rate": round(stress_growth, 2),
            "recovery_delay": round(recovery_delay, 2),
            "emotional_volatility": round(volatility, 2),
            "engagement_drop": round(engagement_drop, 2),
            "trigger_intensity": round(trigger_intensity, 2)
        }
    }
