"""
MiMo Voice — Main Translation Pipeline
End-to-end: Speech → Text → Context → Translation → Speech

This is the core pipeline that replaces RTranslator's:
  Whisper → NLLB → gTTS
with:
  Whisper-Streaming → MiMo V2.5-Pro → MiMo V2-TTS
"""

import os
import time
import asyncio
from typing import Optional, Callable
from dataclasses import dataclass
from pathlib import Path

from .mimo_translator import MiMoTranslator, TranslationContext, TranslationResult
from .mimo_tts import MiMoTTS, TTSResult
from .context_engine import ContextEngine, Situation, Domain, Politeness, ContextState
from .mimo_omni import MiMoOmni, VisualTranslationResult


@dataclass
class PipelineConfig:
    """Configuration for the translation pipeline."""
    # API
    api_key: Optional[str] = None
    base_url: str = "https://api.xiaomimimo.com/v1"
    
    # Models
    translation_model: str = "mimo-v2.5-pro"
    tts_model: str = "mimo-v2-tts"
    omni_model: str = "mimo-v2.5-omni"
    
    # Languages
    source_language: str = "en"
    target_language: str = "ja"
    
    # Context
    auto_detect_context: bool = True
    default_situation: str = "general"
    default_domain: str = "general"
    default_politeness: str = "casual"
    
    # Streaming
    enable_streaming: bool = True
    
    # Camera
    enable_camera: bool = True
    user_allergens: Optional[list[str]] = None
    
    # Performance
    translation_timeout: int = 30
    tts_timeout: int = 15


@dataclass
class TranslationPipelineResult:
    """Complete result from the translation pipeline."""
    # Input
    source_text: str
    source_language: str
    
    # Output
    translated_text: str
    target_language: str
    
    # Audio
    audio_data: Optional[bytes] = None
    audio_format: str = "wav"
    
    # Context
    situation: str = "general"
    domain: str = "general"
    politeness: str = "casual"
    
    # Visual (if camera used)
    visual_result: Optional[VisualTranslationResult] = None
    
    # Performance
    total_latency_ms: float = 0
    translation_latency_ms: float = 0
    tts_latency_ms: float = 0
    tokens_used: int = 0


class MiMoVoicePipeline:
    """
    Complete voice translation pipeline.
    
    Flow:
    1. Audio input → Whisper-Streaming → text (handled externally)
    2. Text → Context Engine → detect situation
    3. Text + Context → MiMo V2.5-Pro → translated text
    4. Translated text → MiMo V2-TTS → audio output
    
    Camera mode:
    1. Image → MiMo V2.5-Omni → translated text + description
    2. Translated text → MiMo V2-TTS → audio output
    """

    def __init__(self, config: Optional[PipelineConfig] = None):
        if config is None:
            config = PipelineConfig()

        self.config = config
        
        # Initialize components
        self.translator = MiMoTranslator(
            api_key=config.api_key,
            base_url=config.base_url,
            model=config.translation_model,
            timeout=config.translation_timeout,
        )
        
        self.tts = MiMoTTS(
            api_key=config.api_key,
            base_url=config.base_url,
            model=config.tts_model,
            timeout=config.tts_timeout,
        )
        
        self.context_engine = ContextEngine()
        
        if config.enable_camera:
            self.omni = MiMoOmni(
                api_key=config.api_key,
                base_url=config.base_url,
                model=config.omni_model,
            )
        else:
            self.omni = None

        # Callbacks
        self.on_translation: Optional[Callable] = None
        self.on_audio: Optional[Callable] = None
        self.on_context_change: Optional[Callable] = None

    def translate(
        self,
        text: str,
        source_language: Optional[str] = None,
        target_language: Optional[str] = None,
        situation: Optional[str] = None,
        generate_audio: bool = True,
    ) -> PipelineResult:
        """
        Translate text with context awareness and optional TTS.
        
        Args:
            text: Text to translate
            source_language: Override source language
            target_language: Override target language
            situation: Override situation detection
            generate_audio: Whether to generate speech output
            
        Returns:
            PipelineResult with translation and audio
        """
        start_time = time.time()
        
        source_lang = source_language or self.config.source_language
        target_lang = target_language or self.config.target_language

        # Step 1: Context analysis
        context_state = self.context_engine.analyze_text(text)
        if situation:
            context_state.situation = Situation(situation)
            context_state.manual_override = True

        # Step 2: Build translation context
        translation_context = TranslationContext(
            situation=context_state.situation.value,
            domain=context_state.domain.value,
            politeness=context_state.politeness.value,
            source_language=source_lang,
            target_language=target_lang,
        )

        # Step 3: Check for emergency phrases (instant, no API)
        if context_state.politeness == Politeness.EMERGENCY:
            emergency_result = self._try_emergency_phrase(text, target_lang)
            if emergency_result:
                return emergency_result

        # Step 4: Translate
        translation_result = self.translator.translate(text, translation_context)

        # Step 5: Generate audio
        audio_data = None
        tts_latency = 0
        if generate_audio:
            tts_result = self.tts.synthesize(
                text=translation_result.translated_text,
                language=target_lang,
                emotion=self._get_emotion(context_state),
            )
            audio_data = tts_result.audio_data
            tts_latency = tts_result.latency_ms

        total_latency = (time.time() - start_time) * 1000

        result = TranslationPipelineResult(
            source_text=text,
            source_language=source_lang,
            translated_text=translation_result.translated_text,
            target_language=target_lang,
            audio_data=audio_data,
            situation=context_state.situation.value,
            domain=context_state.domain.value,
            politeness=context_state.politeness.value,
            total_latency_ms=total_latency,
            translation_latency_ms=translation_result.latency_ms,
            tts_latency_ms=tts_latency,
            tokens_used=translation_result.tokens_used,
        )

        # Fire callback
        if self.on_translation:
            self.on_translation(result)

        return result

    def translate_image(
        self,
        image_path: str,
        target_language: Optional[str] = None,
        context: str = "general",
        generate_audio: bool = True,
    ) -> PipelineResult:
        """
        Translate text in an image (menu, sign, document).
        
        Args:
            image_path: Path to image
            target_language: Language to translate to
            context: Type of image (menu, sign, document)
            generate_audio: Whether to generate speech
            
        Returns:
            PipelineResult with visual translation and audio
        """
        if not self.omni:
            raise RuntimeError("Camera mode not enabled. Set enable_camera=True in config.")

        start_time = time.time()
        target_lang = target_language or self.config.target_language

        # Visual translation
        if context == "menu":
            visual_result = self.omni.translate_menu(
                image_path, target_lang, self.config.user_allergens
            )
        elif context == "sign":
            visual_result = self.omni.translate_sign(image_path, target_lang)
        else:
            visual_result = self.omni.translate_document(image_path, target_lang)

        # Generate audio for translated text
        audio_data = None
        tts_latency = 0
        if generate_audio and visual_result.translated_text:
            tts_result = self.tts.synthesize(
                text=visual_result.translated_text,
                language=target_lang,
            )
            audio_data = tts_result.audio_data
            tts_latency = tts_result.latency_ms

        total_latency = (time.time() - start_time) * 1000

        return PipelineResult(
            source_text=visual_result.original_text,
            source_language=visual_result.language_detected,
            translated_text=visual_result.translated_text,
            target_language=target_lang,
            audio_data=audio_data,
            visual_result=visual_result,
            total_latency_ms=total_latency,
            translation_latency_ms=visual_result.latency_ms,
            tts_latency_ms=tts_latency,
        )

    def _try_emergency_phrase(self, text: str, target_lang: str) -> Optional[PipelineResult]:
        """Try to match emergency phrase for instant response."""
        text_lower = text.lower().strip()
        
        emergency_map = {
            "call an ambulance": "call_ambulance",
            "call ambulance": "call_ambulance",
            "call the police": "call_police",
            "call police": "call_police",
            "i need help": "i_need_help",
            "help me": "i_need_help",
            "i am lost": "i_am_lost",
            "i'm lost": "i_am_lost",
        }

        for trigger, key in emergency_map.items():
            if trigger in text_lower:
                phrase = self.context_engine.get_emergency_phrase(key, target_lang)
                if phrase:
                    # Generate urgent audio
                    tts_result = self.tts.synthesize(
                        text=phrase,
                        language=target_lang,
                        emotion="urgent",
                    )
                    return PipelineResult(
                        source_text=text,
                        source_language=self.config.source_language,
                        translated_text=phrase,
                        target_language=target_lang,
                        audio_data=tts_result.audio_data,
                        situation="emergency",
                        domain="general",
                        politeness="emergency",
                        total_latency_ms=tts_result.latency_ms,
                        tts_latency_ms=tts_result.latency_ms,
                    )

        return None

    def _get_emotion(self, state: ContextState) -> str:
        """Map context to TTS emotion."""
        if state.politeness == Politeness.EMERGENCY:
            return "urgent"
        elif state.situation == Situation.HOSPITAL:
            return "calm"
        else:
            return "neutral"

    def set_languages(self, source: str, target: str):
        """Change language pair."""
        self.config.source_language = source
        self.config.target_language = target

    def set_context(self, situation: str, **kwargs):
        """Manually set context."""
        self.context_engine.set_manual_context(
            Situation(situation),
            domain=Domain(kwargs.get("domain", "general")),
            politeness=Politeness(kwargs.get("politeness", "casual")),
        )

    def reset_context(self):
        """Reset to auto-detection."""
        self.context_engine.clear_manual_override()
        self.context_engine.reset()


# Quick usage functions
def quick_translate(
    text: str,
    source: str = "en",
    target: str = "ja",
    situation: str = "general",
    api_key: Optional[str] = None,
) -> str:
    """Quick translation without audio."""
    config = PipelineConfig(
        api_key=api_key,
        source_language=source,
        target_language=target,
    )
    pipeline = MiMoVoicePipeline(config)
    result = pipeline.translate(text, generate_audio=False)
    return result.translated_text


def quick_voice_translate(
    text: str,
    source: str = "en",
    target: str = "ja",
    situation: str = "general",
    output_path: str = "translation.wav",
    api_key: Optional[str] = None,
) -> str:
    """Quick translation with audio output."""
    config = PipelineConfig(
        api_key=api_key,
        source_language=source,
        target_language=target,
    )
    pipeline = MiMoVoicePipeline(config)
    result = pipeline.translate(text, generate_audio=True)
    
    if result.audio_data:
        with open(output_path, "wb") as f:
            f.write(result.audio_data)
    
    return result.translated_text
