"""
MiMo Voice — MiMo V2.5-Pro API Client
Replaces NLLB translation with context-aware MiMo translation.
"""

import os
import json
import time
import requests
from typing import Optional, Literal
from dataclasses import dataclass, field


@dataclass
class TranslationContext:
    """Context-aware translation parameters."""
    situation: str = "general"          # restaurant, hospital, airport, hotel, street, office, etc.
    domain: str = "general"             # medical, legal, business, travel, general
    politeness: str = "casual"          # casual, formal, emergency
    source_language: str = "en"         # ISO 639-1
    target_language: str = "ja"         # ISO 639-1
    user_notes: str = ""                # additional context hints


@dataclass
class TranslationResult:
    """Result from MiMo translation API."""
    translated_text: str
    source_text: str
    source_language: str
    target_language: str
    context_used: str
    politeness: str
    domain: str
    tokens_used: int = 0
    latency_ms: float = 0
    cultural_notes: Optional[str] = None


class MiMoTranslator:
    """
    MiMo V2.5-Pro translation client.
    
    Replaces NLLB with context-aware, meaning-based translation.
    Understands situations and translates intent, not just words.
    """

    # Supported languages (ISO 639-1)
    SUPPORTED_LANGUAGES = {
        "en", "zh", "ja", "ko", "es", "fr", "de", "it", "pt", "ru",
        "ar", "hi", "th", "vi", "id", "ms", "tr", "pl", "nl", "sv",
        "da", "no", "fi", "el", "he", "cs", "ro", "hu", "sk", "uk",
        "bg", "hr", "sr", "sl", "et", "lv", "lt", "bn", "ta", "te",
        "ur", "sw", "am", "my", "km", "lo", "si", "ka", "az", "uz",
        "kk", "mn", "ne", "mr", "gu", "kn", "ml", "or", "pa", "fil"
    }

    # Situation presets
    SITUATION_PRESETS = {
        "restaurant": {
            "domain": "travel",
            "politeness": "formal",
            "hint": "User is at a restaurant. Food/dining vocabulary. 'Check' means bill."
        },
        "hospital": {
            "domain": "medical",
            "politeness": "formal",
            "hint": "Medical context. Use correct medical terminology. Be precise."
        },
        "airport": {
            "domain": "travel",
            "politeness": "formal",
            "hint": "Airport/travel context. Flight, boarding, customs vocabulary."
        },
        "hotel": {
            "domain": "travel",
            "politeness": "formal",
            "hint": "Hotel/accommodation context. Booking, check-in, amenities vocabulary."
        },
        "street": {
            "domain": "travel",
            "politeness": "casual",
            "hint": "Street/directions context. Navigation, landmarks vocabulary."
        },
        "office": {
            "domain": "business",
            "politeness": "formal",
            "hint": "Office/business context. Professional vocabulary."
        },
        "emergency": {
            "domain": "general",
            "politeness": "emergency",
            "hint": "EMERGENCY. Translate urgently and clearly. No pleasantries."
        },
        "shopping": {
            "domain": "travel",
            "politeness": "casual",
            "hint": "Shopping context. Prices, sizes, bargaining vocabulary."
        },
    }

    SYSTEM_PROMPT_TEMPLATE = """You are a professional translator powered by MiMo.
The user is in a {situation} situation.
Translate from {source_language} to {target_language}.
Translate MEANING, not words literally.
Use politeness level: {politeneness} (casual/formal/emergency).
Use domain vocabulary: {domain} (medical/legal/travel/business/general).
If idiom, translate the MEANING, not literal words.
If cultural context matters, add a brief note in brackets [like this].
Keep the translation natural and fluent in the target language.
{user_notes}

User said: "{text}""""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.xiaomimimo.com/v1",
        model: str = "mimo-v2.5-pro",
        timeout: int = 30,
        max_retries: int = 3,
    ):
        self.api_key = api_key or os.environ.get("MIMO_API_KEY")
        if not self.api_key:
            raise ValueError(
                "MiMo API key required. Set MIMO_API_KEY env var or pass api_key parameter.\n"
                "Register at: https://platform.xiaomimimo.com"
            )
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        })

    def _build_prompt(self, text: str, context: TranslationContext) -> str:
        """Build the translation prompt with context."""
        situation_hint = ""
        if context.situation in self.SITUATION_PRESETS:
            preset = self.SITUATION_PRESETS[context.situation]
            situation_hint = preset["hint"]
        else:
            situation_hint = f"Situation: {context.situation}"

        user_notes = context.user_notes
        if situation_hint:
            user_notes = f"{situation_hint}\n{user_notes}".strip()

        return self.SYSTEM_PROMPT_TEMPLATE.format(
            situation=context.situation,
            source_language=context.source_language,
            target_language=context.target_language,
            politeness=context.politeness,
            domain=context.domain,
            user_notes=user_notes,
            text=text,
        )

    def translate(
        self,
        text: str,
        context: Optional[TranslationContext] = None,
        stream: bool = False,
    ) -> TranslationResult:
        """
        Translate text with context awareness.
        
        Args:
            text: Text to translate
            context: Translation context (situation, domain, politeness)
            stream: Whether to stream the response
            
        Returns:
            TranslationResult with translated text and metadata
        """
        if context is None:
            context = TranslationContext()

        prompt = self._build_prompt(text, context)
        start_time = time.time()

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a professional translator. Output ONLY the translation, nothing else. No explanations, no quotes, no labels."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,  # Low temp for consistent translations
            "max_tokens": 2048,
            "stream": stream,
        }

        for attempt in range(self.max_retries):
            try:
                response = self.session.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    timeout=self.timeout,
                    stream=stream,
                )
                response.raise_for_status()

                if stream:
                    return self._handle_stream(response, text, context, start_time)
                else:
                    return self._handle_response(response, text, context, start_time)

            except requests.exceptions.Timeout:
                if attempt == self.max_retries - 1:
                    raise
                time.sleep(1 * (attempt + 1))
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 429:  # Rate limited
                    retry_after = int(e.response.headers.get("Retry-After", 5))
                    time.sleep(retry_after)
                    continue
                raise

    def _handle_response(
        self,
        response: requests.Response,
        source_text: str,
        context: TranslationContext,
        start_time: float,
    ) -> TranslationResult:
        """Handle non-streaming response."""
        data = response.json()
        translated = data["choices"][0]["message"]["content"].strip()
        
        # Clean up common LLM translation artifacts
        translated = self._clean_translation(translated)
        
        latency = (time.time() - start_time) * 1000
        tokens = data.get("usage", {}).get("total_tokens", 0)

        return TranslationResult(
            translated_text=translated,
            source_text=source_text,
            source_language=context.source_language,
            target_language=context.target_language,
            context_used=context.situation,
            politeness=context.politeness,
            domain=context.domain,
            tokens_used=tokens,
            latency_ms=latency,
        )

    def _handle_stream(
        self,
        response: requests.Response,
        source_text: str,
        context: TranslationContext,
        start_time: float,
    ) -> TranslationResult:
        """Handle streaming response."""
        translated = ""
        for line in response.iter_lines():
            if not line:
                continue
            line = line.decode("utf-8")
            if line.startswith("data: "):
                line = line[6:]
            if line.strip() == "[DONE]":
                break
            try:
                data = json.loads(line)
                delta = data["choices"][0].get("delta", {})
                content = delta.get("content", "")
                translated += content
            except json.JSONDecodeError:
                continue

        translated = self._clean_translation(translated)
        latency = (time.time() - start_time) * 1000

        return TranslationResult(
            translated_text=translated,
            source_text=source_text,
            source_language=context.source_language,
            target_language=context.target_language,
            context_used=context.situation,
            politeness=context.politeness,
            domain=context.domain,
            latency_ms=latency,
        )

    @staticmethod
    def _clean_translation(text: str) -> str:
        """Remove common LLM translation artifacts."""
        # Remove surrounding quotes if present
        if (text.startswith('"') and text.endswith('"')) or \
           (text.startswith("'") and text.endswith("'")):
            text = text[1:-1]
        # Remove "Translation:" prefix if present
        for prefix in ["Translation:", "translation:", "Translated:", "translated:"]:
            if text.startswith(prefix):
                text = text[len(prefix):].strip()
        return text.strip()

    def translate_idiom(self, text: str, context: Optional[TranslationContext] = None) -> TranslationResult:
        """
        Specifically handle idiomatic expressions.
        Translates the MEANING, not literal words.
        """
        if context is None:
            context = TranslationContext()
        context.user_notes = (
            "This may contain idioms or colloquial expressions. "
            "Translate the MEANING/intent, not literal words. "
            "For example: 'Break a leg' → 'Good luck', not literal translation."
        )
        return self.translate(text, context)

    def batch_translate(
        self,
        texts: list[str],
        context: Optional[TranslationContext] = None,
    ) -> list[TranslationResult]:
        """Translate multiple texts with the same context."""
        return [self.translate(text, context) for text in texts]


# Convenience function
def translate(
    text: str,
    source: str = "en",
    target: str = "ja",
    situation: str = "general",
    domain: str = "general",
    politeness: str = "casual",
    api_key: Optional[str] = None,
) -> str:
    """
    Quick translation function.
    
    Returns just the translated text string.
    """
    translator = MiMoTranslator(api_key=api_key)
    ctx = TranslationContext(
        situation=situation,
        domain=domain,
        politeness=politeness,
        source_language=source,
        target_language=target,
    )
    result = translator.translate(text, ctx)
    return result.translated_text


if __name__ == "__main__":
    # Test translation
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python mimo_translator.py 'text to translate' [source] [target] [situation]")
        print("Example: python mimo_translator.py 'Can I have the check?' en ja restaurant")
        sys.exit(1)

    text = sys.argv[1]
    source = sys.argv[2] if len(sys.argv) > 2 else "en"
    target = sys.argv[3] if len(sys.argv) > 3 else "ja"
    situation = sys.argv[4] if len(sys.argv) > 4 else "general"

    result = translate(text, source=source, target=target, situation=situation)
    print(f"Translated: {result}")
