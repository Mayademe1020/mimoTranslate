const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---- Serve static files ----
app.use('/static', express.static(path.join(__dirname)));

// ---- Language mapping ----
const LANG_MAP = {
    ja: 'ja', ko: 'ko', zh: 'zh-CN', es: 'es', fr: 'fr',
    de: 'de', it: 'it', pt: 'pt', ru: 'ru', ar: 'ar',
    hi: 'hi', th: 'th', vi: 'vi',
};

// ---- Context detection ----
function detectSituation(text) {
    const t = text.toLowerCase();
    if (/menu|bill|check|water|food|eat|restaurant|order|coffee|tea|breakfast|lunch|dinner|spicy|vegetarian|allerg/.test(t)) return 'restaurant';
    if (/gate|boarding|flight|airport|luggage|baggage|passport|customs|terminal/.test(t)) return 'airport';
    if (/hotel|room|check.?in|wifi|password|reservation|checkout|towel/.test(t)) return 'hotel';
    if (/buy|price|cost|shop|store|size|pay|card|cash|how much|discount/.test(t)) return 'shopping';
    if (/where|metro|bus|taxi|train|station|street|road|map|lost|direction/.test(t)) return 'street';
    if (/help|emergency|ambulance|police|hospital|doctor|fire|danger|urgent/.test(t)) return 'emergency';
    return 'general';
}

// ---- Translate endpoint ----
app.post('/translate', async (req, res) => {
    const { text, source_language, target_language } = req.body;

    if (!text || !target_language) {
        return res.status(400).json({ error: 'Missing text or target_language' });
    }

    const src = source_language === 'auto' ? 'auto' : (LANG_MAP[source_language] || source_language);
    const tgt = LANG_MAP[target_language] || target_language;

    try {
        // Try MyMemory API (free, no key needed)
        const langPair = src === 'auto' ? `en|${tgt}` : `${src}|${tgt}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

        const response = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            headers: { 'User-Agent': 'MiMoTravelBuddy/1.0' },
        });

        if (!response.ok) throw new Error(`API returned ${response.status}`);

        const data = await response.json();

        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            const translated = data.responseData.translatedText;
            // MyMemory sometimes returns the same text or garbage — detect that
            const isValid = translated.toLowerCase() !== text.toLowerCase() || src === tgt;

            return res.json({
                source_text: text,
                translated_text: isValid ? translated : text,
                source_language: src === 'auto' ? 'en' : src,
                target_language: tgt,
                situation: detectSituation(text),
            });
        }

        throw new Error(data.responseDetails || 'Translation failed');

    } catch (err) {
        console.error('Translate error:', err.message);
        // Fallback: return original text with situation
        res.json({
            source_text: text,
            translated_text: text,
            source_language: src === 'auto' ? 'en' : src,
            target_language: tgt,
            situation: detectSituation(text),
            error: 'Translation unavailable — showing original text',
        });
    }
});

// ---- Speak endpoint (TTS via Google Translate TTS) ----
app.post('/speak', async (req, res) => {
    const { text, language } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Missing text' });
    }

    const lang = LANG_MAP[language] || language || 'en';

    try {
        // Use Google Translate TTS (free, no key)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;

        const response = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MiMoTravelBuddy/1.0)',
            },
        });

        if (!response.ok) throw new Error(`TTS returned ${response.status}`);

        const buffer = await response.arrayBuffer();
        res.set('Content-Type', 'audio/mpeg');
        res.send(Buffer.from(buffer));

    } catch (err) {
        console.error('TTS error:', err.message);
        res.status(503).json({ error: 'TTS unavailable' });
    }
});

// ---- Health check ----
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// ---- Serve index.html for all other GET routes ----
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/static')) {
        res.sendFile('index.html', { root: __dirname });
    } else {
        next();
    }
});

app.listen(PORT, () => {
    console.log(`MiMo Travel Buddy running on http://localhost:${PORT}`);
});
