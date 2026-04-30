"""
MiMo Voice — Tests
Run: pytest tests/ -v
"""

import os
import pytest
from unittest.mock import patch, MagicMock

# Add parent to path
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.mimo_translator import MiMoTranslator, TranslationContext, TranslationResult
from api.context_engine import ContextEngine, Situation, Domain, Politeness
from api.mimo_tts import MiMoTTS, TTSResult


class TestContextEngine:
    """Test context auto-detection."""

    def setup_method(self):
        self.engine = ContextEngine()

    def test_restaurant_detection(self):
        state = self.engine.analyze_text("Can I have the check please?")
        assert state.situation == Situation.RESTAURANT

    def test_hospital_detection(self):
        state = self.engine.analyze_text("I have a headache and need to see a doctor")
        assert state.situation == Situation.HOSPITAL

    def test_airport_detection(self):
        state = self.engine.analyze_text("What gate is my flight departing from?")
        assert state.situation == Situation.AIRPORT

    def test_hotel_detection(self):
        state = self.engine.analyze_text("I'd like to check in to my room")
        assert state.situation == Situation.HOTEL

    def test_emergency_detection(self):
        state = self.engine.analyze_text("Help! Call an ambulance!")
        assert state.situation == Situation.EMERGENCY
        assert state.politeness == Politeness.EMERGENCY

    def test_street_detection(self):
        state = self.engine.analyze_text("Where is the nearest subway station?")
        assert state.situation == Situation.STREET

    def test_manual_override(self):
        self.engine.set_manual_context(Situation.HOSPITAL)
        state = self.engine.analyze_text("Can I have the check?")  # Would be restaurant
        assert state.situation == Situation.HOSPITAL  # But overridden

    def test_context_accumulation(self):
        """Multiple messages should strengthen detection."""
        self.engine.analyze_text("I'd like to order")
        self.engine.analyze_text("What do you recommend?")
        state = self.engine.analyze_text("Can I see the wine list?")
        assert state.situation == Situation.RESTAURANT
        assert state.confidence > 0.5

    def test_emergency_phrases(self):
        phrase = self.engine.get_emergency_phrase("call_ambulance", "ja")
        assert phrase is not None
        assert "救急車" in phrase

    def test_reset(self):
        self.engine.analyze_text("I need a doctor")
        self.engine.reset()
        state = self.engine.get_state()
        assert state.situation == Situation.GENERAL


class TestTranslationContext:
    """Test translation context building."""

    def test_default_context(self):
        ctx = TranslationContext()
        assert ctx.situation == "general"
        assert ctx.domain == "general"
        assert ctx.politeness == "casual"

    def test_restaurant_context(self):
        ctx = TranslationContext(
            situation="restaurant",
            source_language="en",
            target_language="ja",
        )
        assert ctx.situation == "restaurant"


@pytest.mark.skipif(
    not os.environ.get("MIMO_API_KEY"),
    reason="MIMO_API_KEY not set"
)
class TestMiMoTranslator:
    """Test MiMo translation API (requires API key)."""

    def setup_method(self):
        self.translator = MiMoTranslator()

    def test_basic_translation(self):
        result = self.translator.translate(
            "Hello, how are you?",
            TranslationContext(
                source_language="en",
                target_language="ja",
            )
        )
        assert result.translated_text
        assert result.latency_ms > 0

    def test_restaurant_translation(self):
        result = self.translator.translate(
            "Can I have the check?",
            TranslationContext(
                situation="restaurant",
                source_language="en",
                target_language="ja",
            )
        )
        # Should translate as "bill" not "bank check"
        assert result.translated_text

    def test_idiom_translation(self):
        result = self.translator.translate_idiom(
            "Break a leg!",
            TranslationContext(
                source_language="en",
                target_language="ja",
            )
        )
        # Should translate meaning, not literal
        assert result.translated_text


@pytest.mark.skipif(
    not os.environ.get("MIMO_API_KEY"),
    reason="MIMO_API_KEY not set"
)
class TestMiMoTTS:
    """Test MiMo TTS API (requires API key)."""

    def setup_method(self):
        self.tts = MiMoTTS()

    def test_basic_synthesis(self):
        result = self.tts.synthesize(
            "Hello, welcome to Tokyo!",
            language="en",
        )
        assert result.audio_data
        assert result.duration_ms > 0

    def test_japanese_synthesis(self):
        result = self.tts.synthesize(
            "東京へようこそ",
            language="ja",
        )
        assert result.audio_data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
