# MiMo Orbit Application Text

Use this when filling out the form at https://platform.xiaomimimo.com

## Project Name
MiMo Voice — Universal Voice Translator

## Project Description
An open-source, context-aware, real-time voice translation tool
powered entirely by Xiaomi MiMo V2.5 models. Built on RTranslator's
proven conversation architecture, enhanced with three MiMo model layers:

- MiMo-V2.5-Pro for context-aware translation using chain-of-thought
  reasoning. Understands situations (restaurant, hospital, airport)
  and adjusts vocabulary and politeness levels.

- MiMo-V2-TTS for expressive speech synthesis with natural emotion
  and proper intonation in the target language.

- MiMo-V2.5-Omni for visual translation — camera reads menus,
  signs, and documents for instant translation.

Uses faster-whisper for 4x faster speech recognition and
Whisper-Streaming for real-time streaming with 3.3 second latency.

Supports conversation mode, walkie-talkie mode, camera mode,
and specialized modes for medical, legal, and business contexts.

No existing open-source translator offers context-aware,
domain-specialized, camera-capable translation.

## Token Needs
Each translation session uses text reasoning, translation,
and speech synthesis APIs. A 10-minute conversation generates
50-100 turns across all three models. Camera translation adds
multimodal API calls per image. Testing thousands of conversations
across 20+ language pairs. Estimated 100M-200M tokens.

## AI Tools
MiMo API (text, multimodal, speech), Whisper, faster-whisper,
Whisper-Streaming, RTranslator, Cursor, Claude Code

## Links
GitHub: https://github.com/Maledademe1020/MimoTranslate
Demo: [your video URL]
