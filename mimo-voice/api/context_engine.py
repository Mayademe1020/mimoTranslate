"""
MiMo Voice — Context Engine
Auto-detects user situation for context-aware translation.
Uses GPS, conversation content, and manual selection.
"""

import re
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class Situation(Enum):
    RESTAURANT = "restaurant"
    HOSPITAL = "hospital"
    AIRPORT = "airport"
    HOTEL = "hotel"
    STREET = "street"
    OFFICE = "office"
    EMERGENCY = "emergency"
    SHOPPING = "shopping"
    GENERAL = "general"


class Domain(Enum):
    MEDICAL = "medical"
    LEGAL = "legal"
    BUSINESS = "business"
    TRAVEL = "travel"
    GENERAL = "general"


class Politeness(Enum):
    CASUAL = "casual"
    FORMAL = "formal"
    EMERGENCY = "emergency"


# Keywords that signal each situation
SITUATION_KEYWORDS = {
    Situation.RESTAURANT: [
        "menu", "order", "food", "eat", "drink", "bill", "check", "table",
        "waiter", "reservation", "tip", "appetizer", "dessert", "bill",
        "check please", "can i have", "i'd like", "what do you recommend",
        "allergy", "vegetarian", "vegan", "gluten",
    ],
    Situation.HOSPITAL: [
        "doctor", "hospital", "medicine", "pain", "sick", "hurt", "fever",
        "headache", "stomach", "allergic", "prescription", "emergency room",
        "ambulance", "blood", "breath", "chest", "dizzy", "nausea",
        "appointment", "pharmacy", "pill", "injection", "x-ray",
    ],
    Situation.AIRPORT: [
        "flight", "gate", "boarding", "passport", "luggage", "baggage",
        "check-in", "security", "customs", "terminal", "delay", "cancel",
        "transfer", "connecting", "seat", "aisle", "window", "carry-on",
        "departure", "arrival", "landed",
    ],
    Situation.HOTEL: [
        "room", "hotel", "check-in", "check-out", "reservation", "booking",
        "key", "towel", "wifi", "password", "breakfast", "checkout",
        "reception", "lobby", "elevator", "floor", "housekeeping",
        "minibar", "safe", "air conditioning",
    ],
    Situation.STREET: [
        "where", "direction", "left", "right", "straight", "turn", "near",
        "far", "walk", "bus", "train", "subway", "metro", "taxi", "uber",
        "map", "street", "road", "avenue", "block", "corner", "traffic",
        "stop", "light", "crosswalk",
    ],
    Situation.OFFICE: [
        "meeting", "office", "business", "contract", "deal", "price",
        "negotiate", "deadline", "project", "team", "manager", "client",
        "presentation", "report", "budget", "schedule", "interview",
    ],
    Situation.EMERGENCY: [
        "help", "emergency", "call 911", "call police", "fire", "accident",
        "bleeding", "unconscious", "choking", "drowning", "robbery",
        "theft", "danger", "urgent", "ambulance",
    ],
    Situation.SHOPPING: [
        "buy", "price", "how much", "expensive", "cheap", "discount",
        "sale", "size", "color", "try on", "fit", "pay", "cash", "card",
        "credit", "receipt", "return", "exchange", "shop", "store",
    ],
}

# Domain-specific terms for better translation
DOMAIN_TERMS = {
    Domain.MEDICAL: {
        "en": ["prescription", "dosage", "symptom", "diagnosis", "allergic reaction",
               "blood pressure", "heart rate", "x-ray", "MRI", "CT scan"],
        "ja": ["処方箋", "用量", "症状", "診断", "アレルギー反応",
               "血圧", "心拍数", "レントゲン", "MRI", "CTスキャン"],
    },
    Domain.LEGAL: {
        "en": ["contract", "agreement", "clause", "liability", "warranty",
               "plaintiff", "defendant", "testimony", "verdict", "appeal"],
    },
    Domain.BUSINESS: {
        "en": ["proposal", "quotation", "invoice", "deadline", "deliverable",
               "stakeholder", "ROI", "KPI", "quarterly", "revenue"],
    },
}

# Emergency phrases (pre-translated for instant access)
EMERGENCY_PHRASES = {
    "call_ambulance": {
        "en": "Call an ambulance!",
        "ja": "救急車を呼んでください！",
        "zh": "请叫救护车！",
        "ko": "구급차를 불러주세요!",
        "es": "¡Llame a una ambulancia!",
        "fr": "Appelez une ambulance !",
        "de": "Rufen Sie einen Krankenwagen!",
    },
    "call_police": {
        "en": "Call the police!",
        "ja": "警察を呼んでください！",
        "zh": "请叫警察！",
        "ko": "경찰을 불러주세요!",
        "es": "¡Llame a la policía!",
        "fr": "Appelez la police !",
        "de": "Rufen Sie die Polizei!",
    },
    "i_need_help": {
        "en": "I need help!",
        "ja": "助けてください！",
        "zh": "我需要帮助！",
        "ko": "도와주세요!",
        "es": "¡Necesito ayuda!",
        "fr": "J'ai besoin d'aide !",
        "de": "Ich brauche Hilfe!",
    },
    "i_am_lost": {
        "en": "I am lost.",
        "ja": "道に迷いました。",
        "zh": "我迷路了。",
        "ko": "길을 잃었습니다.",
        "es": "Estoy perdido/a.",
        "fr": "Je suis perdu(e).",
        "de": "Ich habe mich verlaufen.",
    },
    "i_am_allergic": {
        "en": "I am allergic to {allergen}.",
        "ja": "私は{allergen}アレルギーです。",
        "zh": "我对{allergen}过敏。",
        "ko": "저는 {allergen} 알레르기가 있습니다.",
        "es": "Soy alérgico/a a {allergen}.",
        "fr": "Je suis allergique à {allergen}.",
        "de": "Ich bin allergisch gegen {allergen}.",
    },
}


@dataclass
class ContextState:
    """Current context state."""
    situation: Situation = Situation.GENERAL
    domain: Domain = Domain.GENERAL
    politeness: Politeness = Politeness.CASUAL
    location_name: Optional[str] = None     # e.g., "Narita Airport"
    gps_lat: Optional[float] = None
    gps_lon: Optional[float] = None
    country: Optional[str] = None           # ISO 3166-1 alpha-2
    manual_override: bool = False            # True if user manually set context
    confidence: float = 0.0                  # 0-1 confidence in auto-detection


class ContextEngine:
    """
    Context engine that auto-detects user situation.
    
    Combines three signals:
    1. GPS/location data (if available)
    2. Conversation content analysis
    3. Manual user selection
    """

    def __init__(self):
        self.state = ContextState()
        self.conversation_history: list[str] = []
        self.max_history = 20  # Keep last N messages for context

    def analyze_text(self, text: str) -> ContextState:
        """
        Analyze text to detect situation.
        
        Call this with each user utterance to update context.
        """
        self.conversation_history.append(text)
        if len(self.conversation_history) > self.max_history:
            self.conversation_history.pop(0)

        # If manually overridden, don't auto-detect
        if self.state.manual_override:
            return self.state

        # Score each situation based on keyword matches
        text_lower = text.lower()
        scores = {}
        for situation, keywords in SITUATION_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > 0:
                scores[situation] = score

        # Also check conversation history (weighted less)
        for msg in self.conversation_history[-5:]:
            msg_lower = msg.lower()
            for situation, keywords in SITUATION_KEYWORDS.items():
                score = sum(0.5 for kw in keywords if kw in msg_lower)
                scores[situation] = scores.get(situation, 0) + score

        # Pick highest scoring situation
        if scores:
            best_situation = max(scores, key=scores.get)
            confidence = min(scores[best_situation] / 5.0, 1.0)

            if confidence > 0.2:  # Minimum threshold
                self.state.situation = best_situation
                self.state.confidence = confidence
                self._update_domain_and_politeness()

        return self.state

    def set_location(self, lat: float, lon: float, location_name: Optional[str] = None):
        """Update GPS location."""
        self.state.gps_lat = lat
        self.state.gps_lon = lon
        self.state.location_name = location_name

    def set_manual_context(
        self,
        situation: Situation,
        domain: Optional[Domain] = None,
        politeness: Optional[Politeness] = None,
    ):
        """Manually set context (overrides auto-detection)."""
        self.state.situation = situation
        self.state.manual_override = True
        if domain:
            self.state.domain = domain
        else:
            self._update_domain_and_politeness()
        if politeness:
            self.state.politeness = politeness

    def clear_manual_override(self):
        """Return to auto-detection mode."""
        self.state.manual_override = False

    def get_emergency_phrase(self, phrase_key: str, target_language: str, **kwargs) -> Optional[str]:
        """
        Get pre-translated emergency phrase.
        
        Returns phrase instantly without API call.
        """
        phrases = EMERGENCY_PHRASES.get(phrase_key)
        if not phrases:
            return None
        
        phrase = phrases.get(target_language, phrases.get("en"))
        if kwargs:
            phrase = phrase.format(**kwargs)
        return phrase

    def _update_domain_and_politeness(self):
        """Update domain and politeness based on situation."""
        mapping = {
            Situation.RESTAURANT: (Domain.TRAVEL, Politeness.FORMAL),
            Situation.HOSPITAL: (Domain.MEDICAL, Politeness.FORMAL),
            Situation.AIRPORT: (Domain.TRAVEL, Politeness.FORMAL),
            Situation.HOTEL: (Domain.TRAVEL, Politeness.FORMAL),
            Situation.STREET: (Domain.TRAVEL, Politeness.CASUAL),
            Situation.OFFICE: (Domain.BUSINESS, Politeness.FORMAL),
            Situation.EMERGENCY: (Domain.GENERAL, Politeness.EMERGENCY),
            Situation.SHOPPING: (Domain.TRAVEL, Politeness.CASUAL),
            Situation.GENERAL: (Domain.GENERAL, Politeness.CASUAL),
        }
        domain, politeness = mapping.get(self.state.situation, (Domain.GENERAL, Politeness.CASUAL))
        self.state.domain = domain
        self.state.politeness = politeness

    def get_state(self) -> ContextState:
        """Get current context state."""
        return self.state

    def reset(self):
        """Reset context to defaults."""
        self.state = ContextState()
        self.conversation_history.clear()


# Cultural tips database
CULTURAL_TIPS = {
    "JP": {
        "restaurant": [
            "Don't tip at restaurants — it's not customary and can be seen as rude.",
            "Say 'itadakimasu' before eating and 'gochisousama' after.",
            "Slurping noodles is acceptable and shows you're enjoying the food.",
        ],
        "general": [
            "Bow when greeting — the depth shows respect level.",
            "Remove shoes when entering homes and some restaurants.",
            "Don't blow your nose in public.",
        ],
    },
    "KR": {
        "restaurant": [
            "Don't pour your own drink — pour for others and they'll pour for you.",
            "Wait for the eldest person to start eating before you begin.",
        ],
        "general": [
            "Use two hands when giving or receiving items.",
            "Don't write names in red ink.",
        ],
    },
    "TH": {
        "general": [
            "Don't touch anyone's head — it's the most sacred part of the body.",
            "Remove shoes before entering temples.",
            "The king is deeply revered — never disrespect the monarchy.",
        ],
    },
    "IN": {
        "general": [
            "Use your right hand for eating and giving items.",
            "Remove shoes before entering temples and homes.",
            "Namaste with palms together is the standard greeting.",
        ],
    },
}


def get_cultural_tips(country: str, situation: str = "general") -> list[str]:
    """Get cultural tips for a country and situation."""
    country_tips = CULTURAL_TIPS.get(country.upper(), {})
    return country_tips.get(situation, country_tips.get("general", []))
