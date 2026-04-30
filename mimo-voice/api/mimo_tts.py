"""
MiMo Voice — MiMo V2-TTS Client
Replaces gTTS (robotic) with natural MiMo speech synthesis.
"""

import os
import time
import base64
import requests
from typing import Optional, Literal
from dataclasses import dataclass


@dataclass
class TTSResult:
    """Result from TTS synthesis."""
    audio_data: bytes           # Raw audio bytes (WAV/MP3)
    format: str                 # "wav" or "mp3"
    duration_ms: float          # Audio duration in ms
    latency_ms: float           # API latency in ms
    text: str                   # Source text
    language: str               # Language code
    voice: str                  # Voice used


class MiMoTTS:
    """
    MiMo V2-TTS client.
    
    Replaces gTTS with natural, expressive speech synthesis.
    Supports emotion, intonation, and natural pacing.
    """

    # Voice presets by language
    VOICE_PRESETS = {
        "en": {"default": "nova", "male": "echo", "female": "nova"},
        "ja": {"default": "yuki", "male": "haru", "female": "yuki"},
        "zh": {"default": "xiaoyi", "male": "yunxi", "female": "xiaoyi"},
        "ko": {"default": "minji", "male": "hyunwoo", "female": "minji"},
        "es": {"default": "elena", "male": "carlos", "female": "elena"},
        "fr": {"default": "claire", "male": "antoine", "female": "claire"},
        "de": {"default": "hanna", "male": "maximilian", "female": "hanna"},
    }

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.xiaomimimo.com/v1",
        model: str = "mimo-v2-tts",
        timeout: int = 30,
    ):
        self.api_key = api_key or os.environ.get("MIMO_API_KEY")
        if not self.api_key:
            raise ValueError(
                "MiMo API key required. Set MIMO_API_KEY env var or pass api_key.\n"
                "Register at: https://platform.xiaomimimo.com"
            )
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        })

    def synthesize(
        self,
        text: str,
        language: str = "en",
        voice: Optional[str] = None,
        speed: float = 1.0,
        emotion: Literal["neutral", "happy", "sad", "urgent", "calm"] = "neutral",
        output_format: Literal["wav", "mp3"] = "wav",
    ) -> TTSResult:
        """
        Synthesize speech from text.
        
        Args:
            text: Text to speak
            language: Language code (ISO 639-1)
            voice: Voice name (auto-selected per language if None)
            speed: Speech speed (0.5-2.0)
            emotion: Emotional tone
            output_format: Audio format
            
        Returns:
            TTSResult with audio data
        """
        if voice is None:
            voice = self._get_default_voice(language)

        start_time = time.time()

        payload = {
            "model": self.model,
            "input": text,
            "voice": voice,
            "speed": speed,
            "response_format": output_format,
            "language": language,
        }

        # Add emotion hint via instruction if not neutral
        if emotion != "neutral":
            emotion_hints = {
                "happy": "Speak with a warm, happy tone.",
                "sad": "Speak with a gentle, somber tone.",
                "urgent": "Speak urgently and clearly.",
                "calm": "Speak calmly and slowly.",
            }
            payload["instruction"] = emotion_hints.get(emotion, "")

        response = self.session.post(
            f"{self.base_url}/audio/speech",
            json=payload,
            timeout=self.timeout,
        )
        response.raise_for_status()

        audio_data = response.content
        latency = (time.time() - start_time) * 1000

        return TTSResult(
            audio_data=audio_data,
            format=output_format,
            duration_ms=self._estimate_duration(audio_data, output_format),
            latency_ms=latency,
            text=text,
            language=language,
            voice=voice,
        )

    def synthesize_streaming(
        self,
        text: str,
        language: str = "en",
        voice: Optional[str] = None,
        chunk_size: int = 4096,
    ):
        """
        Stream audio chunks as they're generated.
        
        Yields audio chunks for real-time playback.
        """
        if voice is None:
            voice = self._get_default_voice(language)

        payload = {
            "model": self.model,
            "input": text,
            "voice": voice,
            "language": language,
            "stream": True,
        }

        response = self.session.post(
            f"{self.base_url}/audio/speech",
            json=payload,
            timeout=self.timeout,
            stream=True,
        )
        response.raise_for_status()

        for chunk in response.iter_content(chunk_size=chunk_size):
            if chunk:
                yield chunk

    def _get_default_voice(self, language: str) -> str:
        """Get default voice for language."""
        presets = self.VOICE_PRESETS.get(language, self.VOICE_PRESETS["en"])
        return presets["default"]

    @staticmethod
    def _estimate_duration(audio_data: bytes, format: str) -> float:
        """Estimate audio duration from data size."""
        # Rough estimate: ~16KB/s for WAV at 16kHz 16-bit mono
        if format == "wav":
            return len(audio_data) / 16000 * 1000
        else:  # mp3
            return len(audio_data) / 2000 * 1000  # ~2KB/s for mp3

    def save_audio(self, result: TTSResult, path: str):
        """Save TTS result to file."""
        with open(path, "wb") as f:
            f.write(result.audio_data)


# Convenience function
def speak(
    text: str,
    language: str = "en",
    emotion: str = "neutral",
    api_key: Optional[str] = None,
) -> bytes:
    """
    Quick TTS function. Returns audio bytes.
    """
    tts = MiMoTTS(api_key=api_key)
    result = tts.synthesize(text, language=language, emotion=emotion)
    return result.audio_data


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python mimo_tts.py 'text to speak' [language] [output.wav]")
        sys.exit(1)

    text = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) > 2 else "en"
    output = sys.argv[3] if len(sys.argv) > 3 else "output.wav"

    tts = MiMoTTS()
    result = tts.synthesize(text, language=lang)
    tts.save_audio(result, output)
    print(f"Saved {result.duration_ms:.0f}ms audio to {output} ({result.latency_ms:.0f}ms latency)")
