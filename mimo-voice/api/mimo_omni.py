"""
MiMo Voice — Camera Translation (MiMo V2.5-Omni)
Visual translation for menus, signs, and documents.
"""

import os
import time
import base64
import requests
from typing import Optional
from dataclasses import dataclass
from pathlib import Path


@dataclass
class VisualTranslationResult:
    """Result from visual translation."""
    original_text: str          # Extracted text from image
    translated_text: str        # Translated text
    description: str            # Description of what was seen
    allergens: list[str]        # Detected allergens (for menus)
    cultural_notes: list[str]   # Cultural context
    language_detected: str      # Language of the original text
    latency_ms: float           # Total latency


class MiMoOmni:
    """
    MiMo V2.5-Omni visual translation client.
    
    Point camera at menu, sign, or document for instant translation.
    Combines OCR + translation + context understanding.
    """

    # Common allergens to detect
    ALLERGEN_KEYWORDS = {
        "en": ["peanut", "tree nut", "milk", "egg", "wheat", "soy", "fish", "shellfish",
               "sesame", "gluten", "lactose", "dairy", "nut", "almond", "cashew"],
        "ja": ["ピーナッツ", "ナッツ", "乳", "卵", "小麦", "大豆", "魚", "甲殻類",
               "ごま", "グルテン", "ラクトース", "乳製品"],
        "zh": ["花生", "坚果", "牛奶", "鸡蛋", "小麦", "大豆", "鱼", "贝类",
               "芝麻", "麸质", "乳糖", "奶制品"],
    }

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.xiaomimimo.com/v1",
        model: str = "mimo-v2.5-omni",
        timeout: int = 60,
    ):
        self.api_key = api_key or os.environ.get("MIMO_API_KEY")
        if not self.api_key:
            raise ValueError("MiMo API key required.")
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        })

    def translate_image(
        self,
        image_path: str,
        target_language: str = "en",
        context: str = "general",
        detect_allergens: bool = False,
        user_allergens: Optional[list[str]] = None,
    ) -> VisualTranslationResult:
        """
        Translate text in an image.
        
        Args:
            image_path: Path to image file
            target_language: Language to translate to
            context: Context hint (menu, sign, document, general)
            detect_allergens: Whether to flag potential allergens
            user_allergens: User's known allergens to check against
            
        Returns:
            VisualTranslationResult with extracted and translated text
        """
        start_time = time.time()

        # Read and encode image
        image_data = self._load_image(image_path)
        
        # Build prompt based on context
        prompt = self._build_prompt(target_language, context, detect_allergens, user_allergens)

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}",
                            },
                        },
                    ],
                }
            ],
            "max_tokens": 2048,
            "temperature": 0.2,
        }

        response = self.session.post(
            f"{self.base_url}/chat/completions",
            json=payload,
            timeout=self.timeout,
        )
        response.raise_for_status()

        data = response.json()
        content = data["choices"][0]["message"]["content"]
        latency = (time.time() - start_time) * 1000

        # Parse structured response
        return self._parse_response(content, target_language, latency)

    def translate_menu(
        self,
        image_path: str,
        target_language: str = "en",
        user_allergens: Optional[list[str]] = None,
    ) -> VisualTranslationResult:
        """Translate a restaurant menu with allergen detection."""
        return self.translate_image(
            image_path=image_path,
            target_language=target_language,
            context="menu",
            detect_allergens=True,
            user_allergens=user_allergens,
        )

    def translate_sign(
        self,
        image_path: str,
        target_language: str = "en",
    ) -> VisualTranslationResult:
        """Translate a street sign or public notice."""
        return self.translate_image(
            image_path=image_path,
            target_language=target_language,
            context="sign",
        )

    def translate_document(
        self,
        image_path: str,
        target_language: str = "en",
    ) -> VisualTranslationResult:
        """Translate a document page."""
        return self.translate_image(
            image_path=image_path,
            target_language=target_language,
            context="document",
        )

    def _load_image(self, image_path: str) -> str:
        """Load image and return base64 encoded string."""
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")
        
        with open(path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    def _build_prompt(
        self,
        target_language: str,
        context: str,
        detect_allergens: bool,
        user_allergens: Optional[list[str]],
    ) -> str:
        """Build the analysis prompt."""
        prompts = {
            "menu": f"""Analyze this restaurant menu image. 
1. Extract ALL text from the menu.
2. Translate everything to {target_language}.
3. For each dish, provide: original name, translated name, brief description.
4. List ingredients if visible.""",
            
            "sign": f"""Analyze this sign image.
1. Extract ALL text from the sign.
2. Translate to {target_language}.
3. Explain what the sign means in context.""",
            
            "document": f"""Analyze this document image.
1. Extract ALL text from the document.
2. Translate to {target_language}.
3. Preserve the document's structure and formatting.""",
            
            "general": f"""Analyze this image.
1. Extract any visible text.
2. Translate to {target_language}.
3. Describe what you see.""",
        }

        prompt = prompts.get(context, prompts["general"])

        if detect_allergens and user_allergens:
            allergen_list = ", ".join(user_allergens)
            prompt += f"""
5. ALLERGEN ALERT: The user is allergic to: {allergen_list}.
   Flag ANY dish that might contain these allergens.
   Mark safe dishes clearly."""

        prompt += """

Format your response as:
TRANSLATED TEXT:
[translated content here]

DESCRIPTION:
[what you see in the image]

ALLERGENS:
[list any allergens found, or "None detected"]

NOTES:
[any cultural or contextual notes]"""

        return prompt

    def _parse_response(
        self,
        content: str,
        target_language: str,
        latency: float,
    ) -> VisualTranslationResult:
        """Parse structured response from Omni."""
        sections = {
            "translated_text": "",
            "description": "",
            "allergens": [],
            "notes": [],
        }

        current_section = None
        lines = content.split("\n")
        
        for line in lines:
            line_stripped = line.strip()
            if "TRANSLATED TEXT:" in line_stripped.upper():
                current_section = "translated_text"
                # Check if content is on same line
                after = line_stripped.split(":", 1)[-1].strip()
                if after:
                    sections["translated_text"] = after
                continue
            elif "DESCRIPTION:" in line_stripped.upper():
                current_section = "description"
                after = line_stripped.split(":", 1)[-1].strip()
                if after:
                    sections["description"] = after
                continue
            elif "ALLERGENS:" in line_stripped.upper():
                current_section = "allergens"
                after = line_stripped.split(":", 1)[-1].strip()
                if after and after.lower() != "none detected":
                    sections["allergens"].append(after)
                continue
            elif "NOTES:" in line_stripped.upper():
                current_section = "notes"
                after = line_stripped.split(":", 1)[-1].strip()
                if after:
                    sections["notes"].append(after)
                continue
            
            if current_section and line_stripped:
                if current_section == "translated_text":
                    sections["translated_text"] += " " + line_stripped
                elif current_section == "description":
                    sections["description"] += " " + line_stripped
                elif current_section == "allergens":
                    sections["allergens"].append(line_stripped)
                elif current_section == "notes":
                    sections["notes"].append(line_stripped)

        return VisualTranslationResult(
            original_text="",  # Omni returns translated, not always original
            translated_text=sections["translated_text"].strip(),
            description=sections["description"].strip(),
            allergens=sections["allergens"],
            cultural_notes=sections["notes"],
            language_detected="",  # Detected internally
            latency_ms=latency,
        )


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python mimo_omni.py <image_path> [target_language]")
        print("Example: python mimo_omni.py menu.jpg en")
        sys.exit(1)

    image_path = sys.argv[1]
    target = sys.argv[2] if len(sys.argv) > 2 else "en"

    omni = MiMoOmni()
    result = omni.translate_menu(image_path, target_language=target)
    print(f"Translation: {result.translated_text}")
    print(f"Description: {result.description}")
    if result.allergens:
        print(f"⚠️  Allergens: {', '.join(result.allergens)}")
