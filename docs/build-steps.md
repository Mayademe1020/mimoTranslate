# MiMo Voice — Build Steps

## Step 1: Fork and Run RTranslator (Day 1)

- Fork https://github.com/niedev/RTranslator
- Clone and build in Android Studio
- Run with existing models (Whisper + NLLB + gTTS)
- Verify basic translation works

## Step 2: Register MiMo API (Day 1)

- Register on https://platform.xiaomimimo.com
- Get API key
- Test MiMo V2.5-Pro translation request
- Test MiMo V2-TTS speech request

## Step 3: Replace Translation Engine (Day 2)

- Find translation module in RTranslator
- Replace NLLB calls with MiMo V2.5-Pro API
- Use context-aware system prompt
- Test: EN→JA, EN→ES, EN→FR
- Compare NLLB vs MiMo quality

## Step 4: Replace Text-to-Speech (Day 3)

- Find TTS module in RTranslator
- Replace gTTS with MiMo V2-TTS API
- Test multiple languages sound natural

## Step 5: Add Real-Time Streaming (Day 4)

- Integrate Whisper-Streaming
- GitHub: https://github.com/ufal/whisper_streaming
- Wire: Whisper-Streaming → MiMo → MiMo Speech
- Test: speak English → hear Japanese in under 5 seconds

## Step 6: Add Context Engine (Day 5)

- GPS-based context detection
- Conversation-based context detection
- Manual context selector
- Test: same phrase, different contexts, different translations

## Step 7: Add Camera Mode (Day 6)

- Add camera capture to app
- Connect MiMo V2.5-Omni for image processing
- Test: menu translation, sign translation

## Step 8: Polish and Demo (Day 7)

- Record demo video
- Write README with architecture diagram
- Push to GitHub
- Submit MiMo Orbit application
