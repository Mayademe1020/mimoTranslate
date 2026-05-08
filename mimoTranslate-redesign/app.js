// ============================================================
// MiMo Travel Buddy — Dashboard-First
// Everything visible. Nothing hidden. Proactive, not reactive.
// ============================================================

// ---- Utilities ----
function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}
function escAttr(s) {
    return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('visible'), 2500);
}
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

// ---- Sound System ----
const Sound = {
    ctx: null,
    enabled: localStorage.getItem('sound_enabled') === 'true',
    init() {
        if (this.ctx) return;
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    },
    play(type) {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            const now = this.ctx.currentTime;
            switch(type) {
                case 'send':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    gain.gain.setValueAtTime(0.06, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.start(now); osc.stop(now + 0.08);
                    break;
                case 'receive':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, now);
                    gain.gain.setValueAtTime(0.06, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                    osc.start(now); osc.stop(now + 0.12);
                    break;
                case 'error':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(200, now);
                    gain.gain.setValueAtTime(0.06, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                    osc.start(now); osc.stop(now + 0.15);
                    break;
            }
        } catch(e) {}
    },
    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('sound_enabled', this.enabled);
        document.getElementById('soundIcon').textContent = this.enabled ? '🔊' : '🔇';
        document.getElementById('soundLabel').textContent = this.enabled ? 'Sound: on' : 'Sound: off';
        if (this.enabled) { this.init(); this.play('send'); }
    }
};
document.addEventListener('click', () => Sound.init(), { once: true });

// ---- Theme ----
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
function updateThemeUI() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.getElementById('themeIcon').textContent = dark ? '☀️' : '🌙';
}
updateThemeUI();

// ---- State ----
const state = {
    destination: JSON.parse(localStorage.getItem('mimo_destination') || 'null'),
    lastTranslation: null,
    lastContext: 'general',
    medical: JSON.parse(localStorage.getItem('medicalProfile') || '{}'),
    history: JSON.parse(localStorage.getItem('translationHistory') || '[]'),
    practiceCount: JSON.parse(localStorage.getItem('practiceCount') || '{}'),
    tipsDismissed: localStorage.getItem('tipsDismissed') === 'true',
};

// ---- Languages ----
const LANGUAGES = {
    ja: { name: 'Japanese', flag: '🇯🇵', country: 'Japan', city: 'Tokyo' },
    ko: { name: 'Korean', flag: '🇰🇷', country: 'Korea', city: 'Seoul' },
    zh: { name: 'Chinese', flag: '🇨🇳', country: 'China', city: 'Beijing' },
    es: { name: 'Spanish', flag: '🇪🇸', country: 'Spain', city: 'Madrid' },
    fr: { name: 'French', flag: '🇫🇷', country: 'France', city: 'Paris' },
    de: { name: 'German', flag: '🇩🇪', country: 'Germany', city: 'Berlin' },
    it: { name: 'Italian', flag: '🇮🇹', country: 'Italy', city: 'Rome' },
    pt: { name: 'Portuguese', flag: '🇵🇹', country: 'Portugal', city: 'Lisbon' },
    ru: { name: 'Russian', flag: '🇷🇺', country: 'Russia', city: 'Moscow' },
    ar: { name: 'Arabic', flag: '🇸🇦', country: 'Saudi Arabia', city: 'Riyadh' },
    hi: { name: 'Hindi', flag: '🇮🇳', country: 'India', city: 'Delhi' },
    th: { name: 'Thai', flag: '🇹🇭', country: 'Thailand', city: 'Bangkok' },
    vi: { name: 'Vietnamese', flag: '🇻🇳', country: 'Vietnam', city: 'Hanoi' },
};

// ---- Cultural Tips ----
const CULTURAL_TIPS = {
    ja: ["Don't tip — it's considered rude", "Bow when greeting people", "Remove shoes before entering homes", "Be quiet on public transit"],
    ko: ["Use both hands when giving/receiving", "Don't pour your own drink", "Bow slightly when greeting", "Remove shoes indoors"],
    zh: ["Tea is tapped on the table to say thanks", "Don't stick chopsticks upright in rice", "Business cards: receive with both hands", "Red is lucky, avoid white at funerals"],
    es: ["Lunch is the main meal (2-4pm)", "Greet with a kiss on each cheek", "Shops close for siesta", "Dinner starts late (9-10pm)"],
    fr: ["Say bonjour before any request", "Don't ask for a doggy bag", "Bread goes on the table, not a plate", "Greet with cheek kisses (la bise)"],
    de: ["Be punctual — it's very important", "Shake hands firmly", "Quiet hours: 1-3pm and after 10pm", "Recycle carefully, it's taken seriously"],
    it: ["Don't order cappuccino after 11am", "Dress well, appearance matters", "Greet with a kiss on each cheek", "Don't ask for parmesan on seafood pasta"],
    pt: ["Greet with two kisses on the cheek", "Bread and olives are not free", "Dinner is usually late (8-9pm)", "Fado music is sacred, be respectful"],
    ar: ["Use your right hand for eating/greeting", "Don't show the soles of your shoes", "Accept offered coffee/tea graciously", "Dress modestly, especially women"],
    hi: ["Namaste with palms together is respectful", "Remove shoes before entering temples", "Use right hand for eating", "Don't point with your finger"],
    th: ["Don't touch anyone's head", "Remove shoes before entering homes/temples", "The king is deeply revered", "Don't point your feet at people"],
    vi: ["Pour drinks for others before yourself", "Don't pat anyone's head", "Use both hands when giving gifts", "Remove shoes indoors"],
    ru: ["Shake hands firmly, make eye contact", "Don't whistle indoors", "Bring an odd number of flowers for gifts", "Dress well for any occasion"],
};

// ---- Quick Phrases by Context ----
const QUICK_PHRASES = {
    restaurant: [
        { label: '📋 Menu', text: 'Can I see the menu?' },
        { label: '💰 Bill', text: 'Can I have the check please?' },
        { label: '💧 Water', text: 'Can I have some water?' },
        { label: '🥜 Allergy', text: 'I have a food allergy' },
        { label: '🥗 Vegetarian', text: 'I am vegetarian' },
        { label: '🌶️ Not spicy', text: 'Not spicy please' },
    ],
    airport: [
        { label: '🚪 Gate?', text: 'Where is my gate?' },
        { label: '🚕 Taxi', text: 'Where can I find a taxi?' },
        { label: '🎫 Boarding', text: 'When does boarding start?' },
        { label: '🧳 Luggage', text: 'Where is baggage claim?' },
        { label: '🛂 Passport', text: 'Where is passport control?' },
    ],
    hotel: [
        { label: '🔑 Check in', text: 'I have a reservation' },
        { label: '📶 WiFi', text: 'What is the WiFi password?' },
        { label: '🧹 Cleaning', text: 'Can I get room service?' },
        { label: '❄️ AC', text: 'Can you turn up the AC?' },
    ],
    shopping: [
        { label: '💰 Price?', text: 'How much does this cost?' },
        { label: '📏 Size', text: 'Do you have this in my size?' },
        { label: '💳 Pay', text: 'Can I pay by card?' },
        { label: '🔄 Return', text: 'Can I return this?' },
    ],
    street: [
        { label: '🗺️ Where?', text: 'Where is this place?' },
        { label: '🚇 Metro', text: 'Where is the nearest metro station?' },
        { label: '🚕 Taxi', text: 'Can you call me a taxi?' },
        { label: '📍 Lost', text: 'I am lost, can you help?' },
    ],
    emergency: [
        { label: '🆘 Help', text: 'I need help' },
        { label: '🚑 Ambulance', text: 'I need an ambulance' },
        { label: '👮 Police', text: 'I need the police' },
        { label: '📍 Lost', text: 'I am lost' },
        { label: '🔥 Fire', text: 'Fire!' },
    ],
};

// ---- First Hour Phrases ----
const FIRST_HOUR = {
    ja: [
        { local: 'すみません', en: 'Excuse me' },
        { local: 'ありがとうございます', en: 'Thank you very much' },
        { local: '英語を話せますか？', en: 'Do you speak English?' },
        { local: '助けてください', en: 'Please help me' },
        { local: 'トイレはどこですか？', en: 'Where is the bathroom?' },
    ],
    ko: [
        { local: '실례합니다', en: 'Excuse me' },
        { local: '감사합니다', en: 'Thank you' },
        { local: '영어 할 수 있어요?', en: 'Do you speak English?' },
        { local: '도와주세요', en: 'Please help me' },
        { local: '화장실이 어디에요?', en: 'Where is the bathroom?' },
    ],
    zh: [
        { local: '你好', en: 'Hello' },
        { local: '谢谢', en: 'Thank you' },
        { local: '你会说英语吗？', en: 'Do you speak English?' },
        { local: '请帮帮我', en: 'Please help me' },
        { local: '洗手间在哪里？', en: 'Where is the bathroom?' },
    ],
    _default: [
        { local: 'Hello', en: 'Hello' },
        { local: 'Thank you', en: 'Thank you' },
        { local: 'Do you speak English?', en: 'Do you speak English?' },
        { local: 'Please help me', en: 'Please help me' },
        { local: 'Where is the bathroom?', en: 'Where is the bathroom?' },
    ],
};

// ============================================================
// DASHBOARD INIT
// ============================================================

function initDashboard() {
    const welcomeSection = document.getElementById('welcomeSection');
    const dashboardContent = document.getElementById('dashboardContent');
    const bottomBar = document.getElementById('bottomBar');

    if (state.destination) {
        welcomeSection.style.display = 'none';
        dashboardContent.style.display = 'block';
        bottomBar.style.display = 'flex';
        renderDashboard();
    } else {
        welcomeSection.style.display = 'block';
        dashboardContent.style.display = 'none';
        bottomBar.style.display = 'none';
        renderDestPicker();
    }
}

function renderDestPicker() {
    const grid = document.getElementById('destGrid');
    grid.innerHTML = Object.entries(LANGUAGES).map(([code, l]) =>
        `<button class="dest-chip" data-lang="${code}"><span class="dest-chip-flag">${l.flag}</span>${l.country}</button>`
    ).join('');
    grid.querySelectorAll('.dest-chip').forEach(btn => {
        btn.addEventListener('click', () => selectDestination(btn.dataset.lang));
    });
}

function selectDestination(langCode) {
    state.destination = langCode;
    localStorage.setItem('mimo_destination', JSON.stringify(langCode));
    initDashboard();
}

function renderDashboard() {
    const lang = LANGUAGES[state.destination];
    if (!lang) return;

    // Header
    document.getElementById('topbarFlag').textContent = lang.flag;
    document.getElementById('topbarCountry').textContent = `${lang.country} · ${lang.name}`;
    document.getElementById('greeting').textContent = `${getGreeting()} in ${lang.city}!`;

    renderEmergency();
    renderContextPhrases();
    renderCulturalTips();
    renderPracticePrompt();
    checkPracticePrompt();
}

// ---- Emergency Card ----
function renderEmergency() {
    // Already visible as static HTML
}

// ---- Context Quick Phrases ----
function renderContextPhrases() {
    // Default to restaurant context
    setContext('restaurant');
}

function setContext(context) {
    const phrases = QUICK_PHRASES[context] || QUICK_PHRASES.restaurant;
    const contextLabels = {
        restaurant: { icon: '🍽️', title: 'Restaurant detected' },
        airport: { icon: '✈️', title: 'Airport mode' },
        hotel: { icon: '🏨', title: 'Hotel mode' },
        shopping: { icon: '🛒', title: 'Shopping mode' },
        street: { icon: '🗺️', title: 'Getting around' },
        emergency: { icon: '🆘', title: 'Emergency' },
    };
    const info = contextLabels[context] || contextLabels.restaurant;
    document.getElementById('contextIcon').textContent = info.icon;
    document.getElementById('contextTitle').textContent = info.title;

    const container = document.getElementById('contextPhrases');
    container.innerHTML = phrases.map(p =>
        `<button class="context-pill" data-text="${escAttr(p.text)}">${p.label}</button>`
    ).join('');

    container.querySelectorAll('.context-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            openChatWithContext(btn.dataset.text);
        });
    });
}

// ---- Cultural Tips ----
function renderCulturalTips() {
    const lang = state.destination;
    const tips = CULTURAL_TIPS[lang] || [];
    const tipsSection = document.getElementById('tipsSection');
    const tipsList = document.getElementById('tipsList');

    if (state.tipsDismissed || tips.length === 0) {
        tipsSection.style.display = 'none';
        return;
    }

    tipsSection.style.display = 'block';
    tipsList.innerHTML = tips.map(t => `<li>${escHtml(t)}</li>`).join('');
}

// ---- Practice Prompt ----
function renderPracticePrompt() {
    // Will be shown dynamically
    document.getElementById('practiceSection').style.display = 'none';
}

function checkPracticePrompt() {
    const history = state.history;
    if (history.length < 3) return;

    // Count word frequency
    const wordCount = {};
    history.forEach(h => {
        const words = h.source.toLowerCase().split(/\s+/);
        words.forEach(w => {
            if (w.length > 2) {
                wordCount[w] = (wordCount[w] || 0) + 1;
            }
        });
    });

    // Find words translated 3+ times
    const frequent = Object.entries(wordCount)
        .filter(([_, count]) => count >= 3)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    if (frequent.length > 0) {
        const word = frequent[0][0];
        const section = document.getElementById('practiceSection');
        document.getElementById('practicePrompt').textContent =
            `You've translated "${word}" ${frequent[0][1]} times. Want to practice it?`;
        section.style.display = 'block';

        document.getElementById('practiceYes').onclick = () => {
            openChatWithContext(`Practice: ${word}`);
        };
        document.getElementById('practiceNo').onclick = () => {
            section.style.display = 'none';
        };
    }
}

// ============================================================
// CHAT OVERLAY (for translation results, guides, etc.)
// ============================================================

const chatMessages = document.getElementById('chatMessages');
let chatContext = 'general';

function openChatWithContext(text) {
    openChatOverlay('Translate');
    handleChatMessage(text);
}

function openChatOverlay(title) {
    const overlay = document.getElementById('chatOverlay');
    overlay.style.display = 'flex';
    document.getElementById('chatTitle').textContent = title;
    chatMessages.innerHTML = '';
    document.getElementById('chatInput').value = '';
    document.getElementById('chatInput').focus();
}

function closeChatOverlay() {
    document.getElementById('chatOverlay').style.display = 'none';
    chatMessages.innerHTML = '';
}

document.getElementById('chatBack').addEventListener('click', closeChatOverlay);

function addChatMessage(type, html) {
    const msg = document.createElement('div');
    msg.className = `chat-msg chat-msg-${type}`;
    msg.innerHTML = `<div class="chat-bubble chat-bubble-${type}">${html}</div>`;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msg;
}

function addChatTyping() {
    const el = document.createElement('div');
    el.className = 'chat-typing';
    el.id = 'chatTyping';
    el.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return el;
}

function removeChatTyping() {
    const el = document.getElementById('chatTyping');
    if (el) el.remove();
}

function setChatHints(chips) {
    const container = document.getElementById('chatHints');
    container.innerHTML = chips.map(c =>
        `<button class="hint-chip" data-action="${escAttr(c.action || '')}" data-text="${escAttr(c.text || '')}">${escHtml(c.label)}</button>`
    ).join('');
    container.querySelectorAll('.hint-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.action) handleChatAction(btn.dataset.action);
            else if (btn.dataset.text) handleChatMessage(btn.dataset.text);
        });
    });
}

// ---- Chat Input ----
document.getElementById('chatSend').addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    handleChatMessage(input.value.trim());
    input.value = '';
});
document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleChatMessage(document.getElementById('chatInput').value.trim());
        document.getElementById('chatInput').value = '';
    }
});

async function handleChatMessage(text) {
    if (!text || !text.trim()) return;
    addChatMessage('user', escHtml(text));
    Sound.play('send');

    if (isQuestion(text)) {
        await handleChatQuestion(text);
    } else {
        await translateText(text);
    }
}

function isQuestion(text) {
    const q = text.toLowerCase();
    return q.startsWith('what') || q.startsWith('how') || q.startsWith('where') ||
           q.startsWith('when') || q.startsWith('should') || q.startsWith('do ') ||
           q.startsWith('can ') || q.startsWith('is ') || q.includes('?');
}

async function handleChatQuestion(text) {
    const typing = addChatTyping();
    await new Promise(r => setTimeout(r, 600));
    removeChatTyping();

    const lang = state.destination;
    const langData = LANGUAGES[lang];
    const q = text.toLowerCase();

    if (q.includes('tip') || q.includes('gratuity')) {
        const tips = CULTURAL_TIPS[lang] || [];
        addChatMessage('buddy', `In ${langData ? langData.country : 'most places'}:<br><br>${tips.length ? tips.map(t => `• ${escHtml(t)}`).join('<br>') : "Research local tipping customs before you go."}`);
    } else if (q.includes('safe') || q.includes('danger')) {
        addChatMessage('buddy', `Generally safe for tourists, but:<br><br>• Keep belongings close in crowded areas<br>• Save local emergency numbers<br>• Let someone know where you're going<br><br>Emergency button is always ready. 🆘`);
    } else {
        addChatMessage('buddy', `Good question! I'm best at translating — try asking me to translate something, or use the prepared phrases.<br><br>For detailed advice, check a travel guide for ${langData ? langData.country : 'your destination'}.`);
    }

    setChatHints([
        { label: '⏱️ First-hour guide', action: 'firsthour' },
        { label: '🍽️ Restaurant phrases', action: 'context_restaurant' },
    ]);
}

// ---- Translation ----
async function translateText(text) {
    const targetLang = state.destination || 'ja';
    const typing = addChatTyping();

    try {
        const res = await fetch('/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, source_language: 'auto', target_language: targetLang }),
        });
        const data = await res.json();
        removeChatTyping();

        if (!res.ok) throw new Error(data.error || 'Translation failed');

        state.lastTranslation = data;
        state.lastContext = data.situation || 'general';

        // Track for practice
        const words = text.toLowerCase().split(/\s+/);
        words.forEach(w => {
            if (w.length > 2) {
                state.practiceCount[w] = (state.practiceCount[w] || 0) + 1;
            }
        });
        localStorage.setItem('practiceCount', JSON.stringify(state.practiceCount));

        // Add to history
        state.history.unshift({
            source: data.source_text,
            target: data.translated_text,
            from: data.source_language,
            to: data.target_language,
            time: Date.now(),
        });
        if (state.history.length > 100) state.history.pop();
        localStorage.setItem('translationHistory', JSON.stringify(state.history));

        // Build response
        let html = `<div class="chat-translation">${escHtml(data.translated_text)}</div>`;

        if (data.situation && data.situation !== 'general') {
            const labels = {
                restaurant: '🍽️ Restaurant', airport: '✈️ Airport', hotel: '🏨 Hotel',
                shopping: '🛒 Shopping', street: '🗺️ Street', hospital: '🏥 Medical', emergency: '🆘 Emergency',
            };
            html += `<div class="chat-meta">${labels[data.situation] || data.situation} detected</div>`;
        }

        html += `
            <div class="chat-actions">
                <button class="chat-action" onclick="copyLastTranslation()">📋 Copy</button>
                <button class="chat-action" onclick="speakLastTranslation()">🔊 Listen</button>
                <button class="chat-action" onclick="saveLastTranslation()">⭐ Save</button>
            </div>
        `;

        addChatMessage('buddy', html);
        Sound.play('receive');

        // Update context section on dashboard
        if (data.situation && data.situation !== 'general') {
            setContext(data.situation);
        }

        // Update practice prompt
        checkPracticePrompt();

        setChatHints([
            { label: '🔊 Listen again', action: 'speak' },
            { label: `🍽️ More ${state.lastContext} phrases`, action: `context_${state.lastContext}` },
        ]);

    } catch (err) {
        removeChatTyping();
        addChatMessage('buddy', `Hmm, that didn't work. Try again?<br><small style="color:var(--text-muted)">${escHtml(err.message)}</small>`);
        Sound.play('error');
        setChatHints([{ label: '🔄 Retry', text: text }]);
    }
}

// ---- Global action helpers ----
window.copyLastTranslation = function() {
    if (state.lastTranslation) {
        navigator.clipboard.writeText(state.lastTranslation.translated_text);
        showToast('Copied!');
    }
};
window.speakLastTranslation = function() {
    if (state.lastTranslation) {
        speakText(state.lastTranslation.translated_text, state.lastTranslation.target_language);
    }
};
window.saveLastTranslation = function() {
    if (state.lastTranslation) {
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        favs.unshift({
            source: state.lastTranslation.source_text,
            target: state.lastTranslation.translated_text,
            from: state.lastTranslation.source_language,
            to: state.lastTranslation.target_language,
            time: Date.now(),
        });
        if (favs.length > 50) favs.pop();
        localStorage.setItem('favorites', JSON.stringify(favs));
        showToast('Saved to phrasebook!');
    }
};

// ---- Chat Actions ----
function handleChatAction(action) {
    switch(action) {
        case 'firsthour': showFirstHourGuide(); break;
        case 'allergy': openMedicalProfile(); break;
        case 'speak':
            if (state.lastTranslation) speakText(state.lastTranslation.translated_text, state.lastTranslation.target_language);
            break;
        case 'copy': window.copyLastTranslation(); break;
        case 'context_restaurant': setContext('restaurant'); openChatWithContext('Show me restaurant phrases'); break;
        case 'context_airport': setContext('airport'); openChatWithContext('Show me airport phrases'); break;
        case 'context_hotel': setContext('hotel'); openChatWithContext('Show me hotel phrases'); break;
        case 'context_street': setContext('street'); openChatWithContext('Show me street phrases'); break;
        case 'context_shopping': setContext('shopping'); openChatWithContext('Show me shopping phrases'); break;
    }
}

// ---- First Hour Guide ----
async function showFirstHourGuide() {
    const lang = state.destination || 'ja';
    const langData = LANGUAGES[lang];
    const phrases = FIRST_HOUR[lang] || FIRST_HOUR._default;

    openChatOverlay(`${langData.flag} First Hour`);

    let html = `<div class="guide-intro">These are the 5 phrases you'll need in your first hour. Tap to translate.</div>`;
    html += '<div class="guide-phrases">';
    phrases.forEach(p => {
        html += `
            <div class="guide-phrase" onclick="handleChatMessage('${escAttr(p.local)}')">
                <div>
                    <div class="guide-phrase-text">${escHtml(p.local)}</div>
                    <div class="guide-phrase-en">${escHtml(p.en)}</div>
                </div>
                <button class="guide-phrase-play" onclick="event.stopPropagation(); speakText('${escAttr(p.local)}', '${lang}')">🔊</button>
            </div>
        `;
    });
    html += '</div>';

    addChatMessage('buddy', html);
    setChatHints([
        { label: '🍽️ Restaurant phrases', action: 'context_restaurant' },
        { label: '🥜 Allergy card', action: 'allergy' },
    ]);
}

// ---- Speak ----
async function speakText(text, language) {
    try {
        const res = await fetch('/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, language }),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        audio.play();
    } catch(e) {}
}

// ============================================================
// EMERGENCY
// ============================================================

document.getElementById('emergencyBtn').addEventListener('click', openEmergency);
document.getElementById('bottomEmergency').addEventListener('click', openEmergency);

function openEmergency() {
    const overlay = document.getElementById('emergencyOverlay');
    const medical = state.medical;
    const lang = state.destination || 'ja';
    const langData = LANGUAGES[lang];

    document.getElementById('emergencyLangLabel').textContent = `I need help in ${langData?.name || lang}`;
    document.getElementById('emergencySpeakBtn').innerHTML = `🔊 TAP TO SPEAK IN ${(langData?.name || lang).toUpperCase()}`;

    const medContainer = document.getElementById('emergencyMedical');
    medContainer.innerHTML = `
        <div class="emergency-medical-row"><span class="emergency-medical-label">Blood</span><span class="emergency-medical-value">${escHtml(medical.bloodType || 'Not set')}</span></div>
        <div class="emergency-medical-row"><span class="emergency-medical-label">Allergies</span><span class="emergency-medical-value">${escHtml(medical.allergies || 'Not set')}</span></div>
        <div class="emergency-medical-row"><span class="emergency-medical-label">Medications</span><span class="emergency-medical-value">${escHtml(medical.medications || 'Not set')}</span></div>
        <div class="emergency-medical-row"><span class="emergency-medical-label">Contact</span><span class="emergency-medical-value">${escHtml(medical.emergencyContact || 'Not set')}</span></div>
    `;

    overlay.classList.add('active');

    document.getElementById('emergencyBackBtn').onclick = () => overlay.classList.remove('active');
    document.getElementById('emergencySpeakBtn').onclick = async () => {
        const btn = document.getElementById('emergencySpeakBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Speaking...';

        let text = 'I need help. This is an emergency.';
        if (medical.bloodType || medical.allergies || medical.medications) {
            text += ' Medical info: ';
            if (medical.bloodType) text += 'Blood type: ' + medical.bloodType + '. ';
            if (medical.allergies) text += 'Allergies: ' + medical.allergies + '. ';
            if (medical.medications) text += 'Medications: ' + medical.medications + '. ';
            if (medical.emergencyContact) text += 'Emergency contact: ' + medical.emergencyContact + '. ';
        }

        try {
            const res = await fetch('/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, source_language: 'en', target_language: lang, situation: 'emergency' }),
            });
            const data = await res.json();
            if (res.ok) speakText(data.translated_text, lang);
        } catch(e) {}

        btn.disabled = false;
        btn.innerHTML = `🔊 TAP TO SPEAK IN ${(langData?.name || lang).toUpperCase()}`;
    };
}

// ============================================================
// MEDICAL PROFILE
// ============================================================

document.getElementById('bottomAllergy').addEventListener('click', openMedicalProfile);

function openMedicalProfile() {
    const modal = document.getElementById('medicalModal');
    const medical = state.medical;

    document.getElementById('medBloodType').value = medical.bloodType || '';
    document.getElementById('medAllergies').value = medical.allergies || '';
    document.getElementById('medMedications').value = medical.medications || '';
    document.getElementById('medContact').value = medical.emergencyContact || '';
    document.getElementById('medNotes').value = medical.medicalNotes || '';

    modal.classList.add('active');
}

document.getElementById('closeMedical').addEventListener('click', () => {
    document.getElementById('medicalModal').classList.remove('active');
});
document.getElementById('medicalModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('medicalModal')) {
        document.getElementById('medicalModal').classList.remove('active');
    }
});

document.getElementById('saveMedical').addEventListener('click', () => {
    state.medical = {
        bloodType: document.getElementById('medBloodType').value.trim(),
        allergies: document.getElementById('medAllergies').value.trim(),
        medications: document.getElementById('medMedications').value.trim(),
        emergencyContact: document.getElementById('medContact').value.trim(),
        medicalNotes: document.getElementById('medNotes').value.trim(),
    };
    localStorage.setItem('medicalProfile', JSON.stringify(state.medical));
    showToast('Medical profile saved! 🩺');
    document.getElementById('medicalModal').classList.remove('active');
});

// ============================================================
// STICKY BOTTOM BAR - Speak button
// ============================================================

document.getElementById('bottomSpeak').addEventListener('click', () => {
    openChatOverlay('Speak & Translate');
    document.getElementById('chatInput').focus();
});

// ============================================================
// VOICE INPUT (dashboard mic button)
// ============================================================

const micBtn = document.getElementById('micBtn');
let recognition = null;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        document.getElementById('translateInput').value = text;
        micBtn.classList.remove('listening');
    };
    recognition.onend = () => micBtn.classList.remove('listening');
    recognition.onerror = () => micBtn.classList.remove('listening');
}

micBtn.addEventListener('click', () => {
    if (!recognition) { showToast('Voice input not supported'); return; }
    if (micBtn.classList.contains('listening')) {
        recognition.stop();
        micBtn.classList.remove('listening');
    } else {
        const langMap = { ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ru: 'ru-RU', ar: 'ar-SA', hi: 'hi-IN', th: 'th-TH', vi: 'vi-VN' };
        recognition.lang = langMap[state.destination] || 'en-US';
        recognition.start();
        micBtn.classList.add('listening');
    }
});

// Camera button (placeholder)
document.getElementById('camBtn').addEventListener('click', () => {
    showToast('Camera translate coming soon!');
});

// ============================================================
// TRANSLATE BUTTON (dashboard)
// ============================================================

document.getElementById('translateBtn').addEventListener('click', async () => {
    const input = document.getElementById('translateInput');
    const text = input.value.trim();
    if (!text) return;

    const targetLang = state.destination || 'ja';
    const resultDiv = document.getElementById('translateResult');
    const resultText = document.getElementById('resultText');

    resultDiv.style.display = 'block';
    resultText.innerHTML = '<span class="spinner spinner-dark"></span>';

    try {
        const res = await fetch('/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, source_language: 'auto', target_language: targetLang }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Translation failed');

        state.lastTranslation = data;
        resultText.textContent = data.translated_text;
        resultText.style.fontFamily = LANGUAGES[targetLang] ? 'var(--font-jp), var(--font)' : 'var(--font)';

        // Update context
        if (data.situation && data.situation !== 'general') {
            setContext(data.situation);
        }

        // History
        state.history.unshift({
            source: data.source_text,
            target: data.translated_text,
            from: data.source_language,
            to: data.target_language,
            time: Date.now(),
        });
        if (state.history.length > 100) state.history.pop();
        localStorage.setItem('translationHistory', JSON.stringify(state.history));

        Sound.play('receive');
        checkPracticePrompt();

    } catch (err) {
        resultText.textContent = 'Error: ' + err.message;
        Sound.play('error');
    }
});

document.getElementById('translateInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('translateBtn').click();
    }
});

// Result actions
document.getElementById('resultCopy').addEventListener('click', window.copyLastTranslation);
document.getElementById('resultSpeak').addEventListener('click', window.speakLastTranslation);
document.getElementById('resultSave').addEventListener('click', window.saveLastTranslation);

// ============================================================
// THEME TOGGLE (header)
// ============================================================

document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeUI();
});

// ============================================================
// TIPS DISMISS
// ============================================================

document.getElementById('tipsDismiss').addEventListener('click', () => {
    state.tipsDismissed = true;
    localStorage.setItem('tipsDismissed', 'true');
    document.getElementById('tipsSection').style.display = 'none';
});

// ============================================================
// SIDE MENU
// ============================================================

const menuOverlay = document.getElementById('menuOverlay');

document.getElementById('menuBtn').addEventListener('click', () => menuOverlay.classList.add('open'));
document.getElementById('menuClose').addEventListener('click', () => menuOverlay.classList.remove('open'));
menuOverlay.addEventListener('click', (e) => { if (e.target === menuOverlay) menuOverlay.classList.remove('open'); });

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        const action = item.dataset.action;
        menuOverlay.classList.remove('open');

        switch(action) {
            case 'destination':
                state.destination = null;
                localStorage.removeItem('mimo_destination');
                state.tipsDismissed = false;
                localStorage.removeItem('tipsDismissed');
                initDashboard();
                break;
            case 'phrasebook': showPhrasebook(); break;
            case 'practice': showPracticeMode(); break;
            case 'allergy': openMedicalProfile(); break;
            case 'dietary': openMedicalProfile(); break;
            case 'medical': openMedicalProfile(); break;
            case 'firsthour': showFirstHourGuide(); break;
            case 'history': showHistory(); break;
            case 'sound': Sound.toggle(); break;
        }
    });
});

// ---- Phrasebook ----
function showPhrasebook() {
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    openChatOverlay('📖 Phrasebook');

    if (favs.length === 0) {
        addChatMessage('buddy', 'Your phrasebook is empty. Translate things and save them — they\'ll show up here!');
        setChatHints([]);
        return;
    }

    let html = '';
    favs.slice(0, 10).forEach(f => {
        html += `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:14px;cursor:pointer" onclick="openChatWithContext('${escAttr(f.source)}')">
            <div style="font-weight:600">${escHtml(f.target)}</div>
            <div style="color:var(--text-soft);font-size:12px">${escHtml(f.source)}</div>
        </div>`;
    });

    addChatMessage('buddy', html);
    setChatHints([]);
}

// ---- Practice Mode ----
function showPracticeMode() {
    const history = state.history;
    openChatOverlay('🎯 Practice');

    if (history.length < 3) {
        addChatMessage('buddy', 'Translate a few things first, then I\'ll suggest what to practice!');
        setChatHints([]);
        return;
    }

    // Get most common translations
    const freq = {};
    history.forEach(h => {
        freq[h.source] = (freq[h.source] || 0) + 1;
    });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);

    let html = '<div class="guide-intro">Here are your most translated phrases. Try to say them without looking!</div>';
    html += '<div class="guide-phrases">';
    top.forEach(([phrase, count]) => {
        html += `<div class="guide-phrase" onclick="handleChatMessage('${escAttr(phrase)}')">
            <div>
                <div class="guide-phrase-text">${escHtml(phrase)}</div>
                <div class="guide-phrase-en">Translated ${count} times</div>
            </div>
            <div class="guide-phrase-play" style="background:var(--accent-soft);color:var(--accent);font-size:12px">→</div>
        </div>`;
    });
    html += '</div>';

    addChatMessage('buddy', html);
    setChatHints([]);
}

// ---- History ----
function showHistory() {
    openChatOverlay('🕐 History');

    if (state.history.length === 0) {
        addChatMessage('buddy', 'No translations yet. Start talking!');
        setChatHints([]);
        return;
    }

    let html = '';
    state.history.slice(0, 8).forEach(h => {
        html += `<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:14px;cursor:pointer" onclick="openChatWithContext('${escAttr(h.source)}')">
            <div style="font-weight:600">${escHtml(h.target)}</div>
            <div style="color:var(--text-soft);font-size:12px">${escHtml(h.source)}</div>
        </div>`;
    });

    addChatMessage('buddy', html);
    setChatHints([]);
}

// ============================================================
// ONBOARDING
// ============================================================

(function initOnboarding() {
    if (localStorage.getItem('onboarding_done')) {
        document.getElementById('onboardingOverlay').classList.remove('active');
        return;
    }

    const steps = [
        { icon: '🌍', title: 'Not just a translator', desc: 'A travel companion that helps you before, during, and after your trip.' },
        { icon: '💬', title: 'Your travel dashboard', desc: 'Emergency help, cultural tips, quick phrases — all visible, all proactive.' },
        { icon: '🆘', title: 'Emergency-ready', desc: 'One tap speaks your medical info in the local language. Always visible, always ready.' },
    ];

    let step = 0;
    const overlay = document.getElementById('onboardingOverlay');

    function render() {
        const s = steps[step];
        document.getElementById('onboardingIcon').textContent = s.icon;
        document.getElementById('onboardingStep').textContent = `Step ${step + 1} of 3`;
        document.getElementById('onboardingTitle').textContent = s.title;
        document.getElementById('onboardingDesc').textContent = s.desc;
        document.getElementById('onboardingDots').innerHTML = steps.map((_, i) =>
            `<div class="onboarding-dot ${i === step ? 'active' : ''}"></div>`
        ).join('');
        document.getElementById('onboardingBtn').textContent = step === 2 ? 'Get Started' : 'Next';
    }

    document.getElementById('onboardingSkip').addEventListener('click', close);
    document.getElementById('onboardingBtn').addEventListener('click', () => {
        if (step < 2) { step++; render(); }
        else close();
    });

    function close() {
        overlay.classList.remove('active');
        localStorage.setItem('onboarding_done', '1');
    }

    overlay.classList.add('active');
    render();
})();

// ============================================================
// START
// ============================================================

initDashboard();
