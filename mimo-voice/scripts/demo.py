#!/usr/bin/env python3
"""
MiMo Voice — Demo Script
Quick test of the translation pipeline.
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import (
    MiMoVoicePipeline,
    PipelineConfig,
    MiMoTranslator,
    TranslationContext,
    MiMoTTS,
    ContextEngine,
    Situation,
)


def demo_basic_translation():
    """Demo: Basic translation with context."""
    print("\n🌍 Demo 1: Basic Translation")
    print("=" * 50)

    translator = MiMoTranslator()

    # Restaurant context
    result = translator.translate(
        "Can I have the check?",
        TranslationContext(
            situation="restaurant",
            source_language="en",
            target_language="ja",
        )
    )
    print(f"Restaurant context:")
    print(f"  EN: 'Can I have the check?'")
    print(f"  JA: '{result.translated_text}'")
    print(f"  Latency: {result.latency_ms:.0f}ms")

    # Same phrase, office context
    result2 = translator.translate(
        "Can I have the check?",
        TranslationContext(
            situation="office",
            source_language="en",
            target_language="ja",
        )
    )
    print(f"\nOffice context:")
    print(f"  EN: 'Can I have the check?'")
    print(f"  JA: '{result2.translated_text}'")


def demo_context_detection():
    """Demo: Auto context detection."""
    print("\n🧠 Demo 2: Context Auto-Detection")
    print("=" * 50)

    engine = ContextEngine()

    phrases = [
        "I'd like a table for two please",
        "My flight is at gate B7",
        "I have a severe headache",
        "Where is the nearest subway?",
        "Help! Call an ambulance!",
    ]

    for phrase in phrases:
        state = engine.analyze_text(phrase)
        print(f"  '{phrase}'")
        print(f"    → Situation: {state.situation.value}, "
              f"Domain: {state.domain.value}, "
              f"Politeness: {state.politeness.value}")
        engine.reset()


def demo_idioms():
    """Demo: Idiom translation."""
    print("\n🎭 Demo 3: Idiom Translation")
    print("=" * 50)

    translator = MiMoTranslator()

    idioms = [
        ("Break a leg!", "en", "ja"),
        ("It's raining cats and dogs", "en", "es"),
        ("Piece of cake", "en", "fr"),
    ]

    for text, src, tgt in idioms:
        result = translator.translate_idiom(
            text,
            TranslationContext(source_language=src, target_language=tgt)
        )
        print(f"  {src}: '{text}'")
        print(f"  {tgt}: '{result.translated_text}'")
        print()


def demo_full_pipeline():
    """Demo: Full voice translation pipeline."""
    print("\n🎤 Demo 4: Full Pipeline (Text → Translation → Audio)")
    print("=" * 50)

    config = PipelineConfig(
        source_language="en",
        target_language="ja",
    )
    pipeline = MiMoVoicePipeline(config)

    # Translate with audio
    result = pipeline.translate(
        "Welcome to Tokyo! How can I help you today?",
        situation="airport",
    )

    print(f"  Source: '{result.source_text}'")
    print(f"  Translated: '{result.translated_text}'")
    print(f"  Situation: {result.situation}")
    print(f"  Domain: {result.domain}")
    print(f"  Total latency: {result.total_latency_ms:.0f}ms")
    print(f"  Translation: {result.translation_latency_ms:.0f}ms")
    print(f"  TTS: {result.tts_latency_ms:.0f}ms")

    if result.audio_data:
        output_path = "demo_output.wav"
        with open(output_path, "wb") as f:
            f.write(result.audio_data)
        print(f"  Audio saved: {output_path} ({len(result.audio_data)} bytes)")


def demo_emergency():
    """Demo: Emergency mode."""
    print("\n🚨 Demo 5: Emergency Mode")
    print("=" * 50)

    config = PipelineConfig(
        source_language="en",
        target_language="ja",
    )
    pipeline = MiMoVoicePipeline(config)

    result = pipeline.translate("Call an ambulance!")
    print(f"  Source: 'Call an ambulance!'")
    print(f"  Translated: '{result.translated_text}'")
    print(f"  Politeness: {result.politeness}")


def main():
    print("🎤 MiMo Voice — Universal Voice Translator")
    print("=" * 50)

    if not os.environ.get("MIMO_API_KEY"):
        print("\n⚠️  Set MIMO_API_KEY to run demos:")
        print("   export MIMO_API_KEY=your_key_here")
        print("   Register at: https://platform.xiaomimimo.com")
        sys.exit(1)

    demo_basic_translation()
    demo_context_detection()
    demo_idioms()
    demo_full_pipeline()
    demo_emergency()

    print("\n✅ All demos complete!")


if __name__ == "__main__":
    main()
