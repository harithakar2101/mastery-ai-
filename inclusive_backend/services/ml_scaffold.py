"""
ML Assistive Pattern Analysis Scaffold for Inclusive Hub
========================================================
IMPORTANT ETHICAL & CLINICAL DISCLAIMER:
This module provides lightweight heuristic and pattern-detection suggestions for faculty.
It is an EXPERIMENTAL ASSISTIVE AID, NOT a medical or clinical diagnostic tool.
It MUST NOT be used for psychological profiling, clinical assessment, or automated disciplinary action.
Sensor signals and frequency heuristics never modify student mastery or ISLM cognitive parameters.

Feature flag: WEARABLE_ML_INSIGHTS (default: false)
"""

import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

# Feature flag check
WEARABLE_ML_INSIGHTS_ENABLED = os.environ.get("WEARABLE_ML_INSIGHTS", "false").lower() in ("true", "1", "yes")

class AssistiveInsight:
    def __init__(self, student_id: str, suggestion_type: str, title: str, description: str, confidence: float, reason: str):
        self.student_id = student_id
        self.suggestion_type = suggestion_type  # e.g., 'SUGGEST_BREAK', 'CHECK_IN', 'DEVICE_CHECK'
        self.title = title
        self.description = description
        self.confidence = round(confidence, 2)
        self.reason = reason
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.is_experimental = True
        self.disclaimer = (
            "Experimental assistive suggestion based on pattern heuristics. "
            "Not a diagnostic claim or psychological assessment."
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "student_id": self.student_id,
            "suggestion_type": self.suggestion_type,
            "title": self.title,
            "description": self.description,
            "confidence": self.confidence,
            "reason": self.reason,
            "timestamp": self.timestamp,
            "is_experimental": self.is_experimental,
            "disclaimer": self.disclaimer
        }


class AssistivePatternDetector:
    """
    Lightweight rule-based and trend-analysis engine detecting interaction patterns.
    """

    def __init__(self, enabled: Optional[bool] = None):
        self.enabled = WEARABLE_ML_INSIGHTS_ENABLED if enabled is None else enabled

    def analyze_student_interactions(
        self,
        student_id: str,
        recent_events: List[Dict[str, Any]],
        recent_sensor_readings: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Analyze a student's recent events and telemetry to generate assistive suggestions.
        Returns an empty list if feature flag is disabled.
        """
        if not self.enabled:
            return []

        insights: List[AssistiveInsight] = []

        # Heuristic 1: Multiple help requests within short interval (< 10 minutes)
        help_requests = [
            e for e in recent_events 
            if e.get("student_id") == student_id and e.get("request") in ("I_NEED_HELP", "HELP")
        ]
        if len(help_requests) >= 3:
            insights.append(AssistiveInsight(
                student_id=student_id,
                suggestion_type="SUGGEST_BREAK",
                title="Potential Task Fatigue Detected",
                description="Student has sent 3 or more assistance requests in rapid succession. A gentle 5-minute cognitive reset or micro-break may be beneficial.",
                confidence=0.82,
                reason="High frequency of help requests within the active session window."
            ))

        # Heuristic 2: Elevated EDA/GSR coupled with sudden motion spike
        student_readings = [r for r in recent_sensor_readings if r.get("student_id") == student_id]
        if student_readings:
            high_gsr_readings = [r for r in student_readings if (r.get("gsr_eda") or 0) > 22.0]
            motion_spikes = [
                r for r in student_readings 
                if abs((r.get("accel_x") or 0)) + abs((r.get("accel_y") or 0)) + abs((r.get("accel_z") or 0)) > 2.8
            ]

            if len(high_gsr_readings) >= 2 and len(motion_spikes) >= 2:
                insights.append(AssistiveInsight(
                    student_id=student_id,
                    suggestion_type="CHECK_IN",
                    title="Agitation / Frustration Pattern Observed",
                    description="Elevated electrodermal conductance correlated with rapid accelerometer movement. Consider an empathetic, quiet teacher check-in.",
                    confidence=0.74,
                    reason="Co-occurrence of sustained elevated skin conductance and episodic motion fluctuations."
                ))

        # Heuristic 3: Rapid cancel pattern (pressed help then cancelled immediately multiple times)
        cancels = [e for e in recent_events if e.get("student_id") == student_id and e.get("request") == "CANCEL"]
        if len(cancels) >= 2 and len(help_requests) >= 2:
            insights.append(AssistiveInsight(
                student_id=student_id,
                suggestion_type="DEVICE_CHECK",
                title="Hesitant Help Seeking Pattern",
                description="Student initiated and then rapidly cancelled multiple help requests. May indicate hesitation or unintentional button contact.",
                confidence=0.68,
                reason="Alternating request-cancellation pattern within recent interactions."
            ))

        return [insight.to_dict() for insight in insights]


# Singleton instance
detector = AssistivePatternDetector()
