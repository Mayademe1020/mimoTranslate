# MiMo Voice — API Layer

Context-aware voice translation powered by Xiaomi MiMo V2.5.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MiMo Voice Pipeline                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Whisper  │───▶│ Context  │───▶│ MiMo     │───▶ Audio    │
│  │ Stream   │    │ Engine   │    │ Pro      │    (TTS)     │
│  └──────────┘    └──────────┘    └──────────┘              │
│  Speech-to-Text  Situation       Translation               │
│  (~3.3s latency) Detection       + Meaning                 │
│                                                             │
│  ┌──────────┐    ┌──────────┐                              │
│  │ Camera   │───▶│ MiMo     │───▶ Translated               │
│  │ Input    │    │ Omni     │    Menu/Sign                  │
│  └──────────┘    └──────────┘                              │
│  Image capture    Visual OCR                               │
│                   + Translation                            │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Set API key
export MIMO_API_KEY=your_key_here

# 2. Install
pip install -r requirements.txt

# 3. Test
python -c "from api import quick_translate; print(quick_translate('Hello!', 'en', 'ja'))"
```

## Modules

| Module | Purpose | Replaces |
|--------|---------|----------|
| `mimo_translator.py` | Context-aware translation | NLLB (local ONNX) |
| `mimo_tts.py` | Natural speech synthesis | gTTS (robotic) |
| `mimo_omni.py` | Camera/visual translation | (new feature) |
| `context_engine.py` | Situation detection | (new feature) |
| `pipeline.py` | End-to-end pipeline | (orchestration) |

## Usage

### Basic Translation
```python
from api import MiMoTranslator, TranslationContext

translator = MiMoTranslator()

# Restaurant context — "check" = bill
result = translator.translate(
    "Can I have the check?",
    TranslationContext(
        situation="restaurant",
        source_language="en",
        target_language="ja",
    )
)
# → "お会計をお願いします" (bill, not bank check)
```

### Full Pipeline with Audio
```python
from api import MiMoVoicePipeline, PipelineConfig

config = PipelineConfig(
    source_language="en",
    target_language="ja",
)
pipeline = MiMoVoicePipeline(config)

result = pipeline.translate(
    "Welcome to Tokyo!",
    situation="airport",
)
# result.translated_text — translated text
# result.audio_data — WAV audio bytes
```

### Camera Translation
```python
from api import MiMoOmni

omni = MiMoOmni()

# Menu translation with allergen detection
result = omni.translate_menu(
    "menu.jpg",
    target_language="en",
    user_allergens=["peanut", "shellfish"],
)
# result.translated_text — translated menu
# result.allergens — flagged allergens
```

### Context Detection
```python
from api import ContextEngine

engine = ContextEngine()

# Auto-detect situation from conversation
state = engine.analyze_text("I'd like a table for two")
# state.situation → Situation.RESTAURANT
# state.domain → Domain.TRAVEL
# state.politeness → Politeness.FORMAL
```

## Supported Languages

60+ languages including: en, zh, ja, ko, es, fr, de, it, pt, ru, ar, hi, th, vi, id, ms, tr, pl, nl, sv, da, no, fi, el, he, cs, ro, hu, sk, uk, bg, hr, sr, sl, et, lv, lt, bn, ta, te, ur, sw, am, my, km, lo, si, ka, az, uz, kk, mn, ne, mr, gu, kn, ml, or, pa, fil

## Context Presets

| Situation | Domain | Politeness | Example |
|-----------|--------|------------|---------|
| restaurant | travel | formal | "Check" → bill |
| hospital | medical | formal | Correct medical terms |
| airport | travel | formal | Flight vocabulary |
| hotel | travel | formal | Booking vocabulary |
| street | travel | casual | Direction vocabulary |
| office | business | formal | Professional tone |
| emergency | general | emergency | Urgent, clear |
| shopping | travel | casual | Price vocabulary |

## Android Integration

See `android/` directory for drop-in replacements:
- `MiMoTranslator.java` — replaces NLLB Translator
- `MiMoTTS.java` — replaces gTTS

## Files

```
mimo-voice/
├── api/
│   ├── __init__.py
│   ├── mimo_translator.py    # MiMo V2.5-Pro translation
│   ├── mimo_tts.py           # MiMo V2-TTS speech
│   ├── mimo_omni.py          # MiMo V2.5-Omni camera
│   ├── context_engine.py     # Situation detection
│   └── pipeline.py           # End-to-end pipeline
├── android/
│   └── java/.../translation/
│       ├── MiMoTranslator.java  # Android translator
│       └── MiMoTTS.java         # Android TTS
├── config/
│   └── settings.yaml
├── tests/
│   └── test_api.py
├── scripts/
│   └── demo.py
├── requirements.txt
├── setup.sh
└── .env.example
```

## Next Steps

1. Get API key from https://platform.xiaomimimo.com
2. Run `bash setup.sh`
3. Test with `python scripts/demo.py`
4. Integrate into RTranslator Android app
