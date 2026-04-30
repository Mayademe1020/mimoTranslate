# MiMo Voice — Universal Voice Translator

## What We're Building

A context-aware, real-time voice translation tool powered by Xiaomi MiMo V2.5.

Not a basic word-for-word translator. This tool understands the SITUATION and translates MEANING.

## The Core Difference

**Google Translate:**
User: "Can I have the check?"
Result: "小切手をもらえますか？" (bank check — WRONG)

**Our Tool:**
User: "Can I have the check?"
Tool: "Person is at a restaurant. 'Check' means 'bill'."
Result: "お会計をお願いします" (bill — CORRECT)

## Foundation

Fork RTranslator: https://github.com/niedev/RTranslator

RTranslator already has:
- Conversation mode (two people, two languages)
- Walkie-talkie mode (quick street conversations)
- Bluetooth headset support
- Whisper for speech recognition
- Offline capability

## What We Change

| Component | RTranslator Uses | We Replace With |
|-----------|-----------------|-----------------|
| Translation | Meta NLLB | MiMo V2.5-Pro API |
| Text-to-Speech | gTTS (robotic) | MiMo V2-TTS (natural) |
| Camera | None | MiMo V2.5-Omni |
| Streaming | Basic | Whisper-Streaming (3.3s latency) |
| Context | None | MiMo context engine |

## Tech Stack

- **Speech-to-Text:** faster-whisper (https://github.com/SYSTRAN/faster-whisper)
- **Streaming:** Whisper-Streaming (https://github.com/ufal/whisper_streaming)
- **Translation:** MiMo V2.5-Pro API (https://platform.xiaomimimo.com)
- **Voice Output:** MiMo V2-TTS
- **Camera:** MiMo V2.5-Omni
- **App Base:** RTranslator Android app
- **Desktop option:** VoiceStreamAI (https://github.com/alesaccoia/VoiceStreamAI)
