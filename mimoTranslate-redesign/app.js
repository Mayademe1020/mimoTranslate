// ============================================================
// MiMo Travel Buddy — Travel-First
// Your companion, not your alarm system.
// ============================================================

// ---- Utilities ----
function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function escAttr(s) { return s.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('visible');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('visible'), 2500);
}
function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

// ---- Sound ----
const Sound = {
    ctx: null,
    enabled: localStorage.getItem('sound_enabled') === 'true',
    init() { if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} },
    play(type) {
        if (!this.enabled || !this.ctx) return;
        try {
            const o = this.ctx.createOscillator(), g = this.ctx.createGain();
            o.connect(g); g.connect(this.ctx.destination);
            const n = this.ctx.currentTime;
            if (type === 'send') { o.type = 'sine'; o.frequency.setValueAtTime(600, n); g.gain.setValueAtTime(0.06, n); g.gain.exponentialRampToValueAtTime(0.001, n + 0.08); o.start(n); o.stop(n + 0.08); }
            else if (type === 'receive') { o.type = 'sine'; o.frequency.setValueAtTime(800, n); g.gain.setValueAtTime(0.06, n); g.gain.exponentialRampToValueAtTime(0.001, n + 0.12); o.start(n); o.stop(n + 0.12); }
            else if (type === 'error') { o.type = 'sawtooth'; o.frequency.setValueAtTime(200, n); g.gain.setValueAtTime(0.06, n); g.gain.exponentialRampToValueAtTime(0.001, n + 0.15); o.start(n); o.stop(n + 0.15); }
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
    document.getElementById('themeIcon').textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
}
updateThemeUI();

// ---- State ----
const state = {
    destination: JSON.parse(localStorage.getItem('mimo_destination') || 'null'),
    lastTranslation: null,
    lastContext: 'restaurant',
    medical: JSON.parse(localStorage.getItem('medicalProfile') || '{}'),
    history: JSON.parse(localStorage.getItem('translationHistory') || '[]'),
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

// ---- Quick Phrases ----
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
    ],
    hotel: [
        { label: '🔑 Check in', text: 'I have a reservation' },
        { label: '📶 WiFi', text: 'What is the WiFi password?' },
        { label: '🧹 Room service', text: 'Can I get room service?' },
        { label: '❄️ AC', text: 'Can you turn up the AC?' },
    ],
    shopping: [
        { label: '💰 Price?', text: 'How much does this cost?' },
        { label: '📏 Size', text: 'Do you have this in my size?' },
        { label: '💳 Card', text: 'Can I pay by card?' },
        { label: '🔄 Return', text: 'Can I return this?' },
    ],
    transport: [
        { label: '🗺️ Where?', text: 'Where is this place?' },
        { label: '🚇 Metro', text: 'Where is the nearest metro?' },
        { label: '🚕 Taxi', text: 'Can you call me a taxi?' },
        { label: '📍 Lost', text: 'I am lost, can you help?' },
    ],
    social: [
        { label: '👋 Hello', text: 'Hello!' },
        { label: '🙏 Thank you', text: 'Thank you very much' },
        { label: '😊 Please', text: 'Please' },
        { label: '👋 Goodbye', text: 'Goodbye!' },
    ],
};

const CONTEXT_META = {
    restaurant: { icon: '🍽️', title: 'At a restaurant?' },
    airport: { icon: '✈️', title: 'At the airport?' },
    hotel: { icon: '🏨', title: 'At your hotel?' },
    shopping: { icon: '🛒', title: 'Shopping?' },
    transport: { icon: '🗺️', title: 'Getting around?' },
    social: { icon: '👋', title: 'Meeting people?' },
};

// ---- First Hour ----
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
// DASHBOARD
// ============================================================

function initDashboard() {
    const welcome = document.getElementById('welcomeSection');
    const content = document.getElementById('dashboardContent');
    const bar = document.getElementById('bottomBar');

    if (state.destination) {
        welcome.style.display = 'none';
        content.style.display = 'flex';
        bar.style.display = 'flex';
        renderDashboard();
    } else {
        welcome.style.display = 'flex';
        content.style.display = 'none';
        bar.style.display = 'none';
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
    state.tipsDismissed = false;
    localStorage.removeItem('tipsDismissed');
    initDashboard();
}

function renderDashboard() {
    const lang = LANGUAGES[state.destination];
    if (!lang) return;

    document.getElementById('topbarFlag').textContent = lang.flag;
    document.getElementById('topbarCountry').textContent = `${lang.country} · ${lang.name}`;
    document.getElementById('greeting').textContent = `${getGreeting()} in ${lang.city}!`;

    renderContext();
    renderTips();
    checkPractice();
}

// ---- Context ----
function renderContext(context) {
    const ctx = context || state.lastContext || 'restaurant';
    const phrases = QUICK_PHRASES[ctx] || QUICK_PHRASES.restaurant;
    const meta = CONTEXT_META[ctx] || CONTEXT_META.restaurant;

    document.getElementById('contextIcon').textContent = meta.icon;
    document.getElementById('contextTitle').textContent = meta.title;

    const container = document.getElementById('contextPhrases');
    container.innerHTML = phrases.map(p =>
        `<button class="context-pill" data-text="${escAttr(p.text)}">${p.label}</button>`
    ).join('');

    container.querySelectorAll('.context-pill').forEach(btn => {
        btn.addEventListener('click', () => openChatWith(btn.dataset.text));
    });
}

// Context switcher
document.getElementById('contextSwitch').addEventListener('click', () => {
    const modal = document.getElementById('contextModal');
    const options = document.getElementById('contextOptions');
    options.innerHTML = Object.entries(CONTEXT_META).map(([key, meta]) =>
        `<button class="context-option" data-ctx="${key}">
            <span class="context-option-icon">${meta.icon}</span>
            ${meta.title.replace('?', '')}
        </button>`
    ).join('');

    options.querySelectorAll('.context-option').forEach(btn => {
        btn.addEventListener('click', () => {
            state.lastContext = btn.dataset.ctx;
            renderContext(btn.dataset.ctx);
            modal.classList.remove('active');
        });
    });

    modal.classList.add('active');
});
document.getElementById('closeContext').addEventListener('click', () => {
    document.getElementById('contextModal').classList.remove('active');
});
document.getElementById('contextModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('contextModal')) {
        document.getElementById('contextModal').classList.remove('active');
    }
});

// ---- Tips ----
function renderTips() {
    const tips = CULTURAL_TIPS[state.destination] || [];
    const section = document.getElementById('tipsSection');

    if (state.tipsDismissed || tips.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    document.getElementById('tipsList').innerHTML = tips.map(t => `<li>${escHtml(t)}</li>`).join('');
}

document.getElementById('tipsDismiss').addEventListener('click', () => {
    state.tipsDismissed = true;
    localStorage.setItem('tipsDismissed', 'true');
    document.getElementById('tipsSection').style.display = 'none';
});

// ---- Practice ----
function checkPractice() {
    const h = state.history;
    if (h.length < 3) { document.getElementById('practiceSection').style.display = 'none'; return; }

    const freq = {};
    h.forEach(r => { r.source.toLowerCase().split(/\s+/).forEach(w => { if (w.length > 2) freq[w] = (freq[w] || 0) + 1; }); });
    const top = Object.entries(freq).filter(([_, c]) => c >= 3).sort((a, b) => b[1] - a[1])[0];

    if (top) {
        document.getElementById('practicePrompt').textContent = `You've translated "${top[0]}" ${top[1]} times. Want to practice it?`;
        document.getElementById('practiceSection').style.display = 'block';
        document.getElementById('practiceYes').onclick = () => openChatWith(`Practice: ${top[0]}`);
        document.getElementById('practiceNo').onclick = () => document.getElementById('practiceSection').style.display = 'none';
    } else {
        document.getElementById('practiceSection').style.display = 'none';
    }
}

// ============================================================
// CHAT OVERLAY
// ============================================================

const chatMessages = document.getElementById('chatMessages');

function openChatWith(text) {
    openChatOverlay('Translate');
    handleChatMsg(text);
}

function openChatOverlay(title) {
    document.getElementById('chatOverlay').style.display = 'flex';
    document.getElementById('chatTitle').textContent = title;
    chatMessages.innerHTML = '';
    document.getElementById('chatInput').value = '';
    document.getElementById('chatInput').focus();
}

function closeChat() {
    document.getElementById('chatOverlay').style.display = 'none';
    chatMessages.innerHTML = '';
}

document.getElementById('chatBack').addEventListener('click', closeChat);

function addMsg(type, html) {
    const el = document.createElement('div');
    el.className = `chat-msg chat-msg-${type}`;
    el.innerHTML = `<div class="chat-bubble chat-bubble-${type}">${html}</div>`;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return el;
}

function addTyping() {
    const el = document.createElement('div');
    el.className = 'chat-typing';
    el.id = 'chatTyping';
    el.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return el;
}

function removeTyping() { const el = document.getElementById('chatTyping'); if (el) el.remove(); }

function setHints(chips) {
    const c = document.getElementById('chatHints');
    c.innerHTML = chips.map(h => `<button class="hint-chip" data-action="${escAttr(h.action || '')}" data-text="${escAttr(h.text || '')}">${escHtml(h.label)}</button>`).join('');
    c.querySelectorAll('.hint-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.action) handleChatAction(btn.dataset.action);
            else if (btn.dataset.text) handleChatMsg(btn.dataset.text);
        });
    });
}

// Chat input
document.getElementById('chatSend').addEventListener('click', () => {
    const v = document.getElementById('chatInput').value.trim();
    if (v) { handleChatMsg(v); document.getElementById('chatInput').value = ''; }
});
document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const v = document.getElementById('chatInput').value.trim();
        if (v) { handleChatMsg(v); document.getElementById('chatInput').value = ''; }
    }
});

async function handleChatMsg(text) {
    if (!text) return;
    addMsg('user', escHtml(text));
    Sound.play('send');
    if (isQuestion(text)) await handleQuestion(text);
    else await doTranslate(text);
}

function isQuestion(t) {
    const q = t.toLowerCase();
    return q.startsWith('what') || q.startsWith('how') || q.startsWith('where') || q.startsWith('when') || q.startsWith('should') || q.startsWith('do ') || q.startsWith('can ') || q.startsWith('is ') || q.includes('?');
}

async function handleQuestion(text) {
    const typing = addTyping();
    await new Promise(r => setTimeout(r, 600));
    removeTyping();
    const lang = LANGUAGES[state.destination];
    const q = text.toLowerCase();
    if (q.includes('tip') || q.includes('gratuity')) {
        const tips = CULTURAL_TIPS[state.destination] || [];
        addMsg('buddy', `In ${lang?.country || 'most places'}:<br><br>${tips.length ? tips.map(t => `• ${escHtml(t)}`).join('<br>') : 'Research local tipping customs.'}`);
    } else if (q.includes('safe') || q.includes('danger')) {
        addMsg('buddy', `Generally safe, but:<br><br>• Keep belongings close<br>• Save emergency numbers<br>• Let someone know where you're going`);
    } else {
        addMsg('buddy', `Good question! I'm best at translating — try typing something, or use the quick phrases on the dashboard.`);
    }
    setHints([{ label: '⏱️ First-hour guide', action: 'firsthour' }, { label: '🍽️ Restaurant phrases', action: 'context_restaurant' }]);
}

async function doTranslate(text) {
    const targetLang = state.destination || 'ja';
    const typing = addTyping();
    try {
        const res = await fetch('/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, source_language: 'auto', target_language: targetLang }) });
        const data = await res.json();
        removeTyping();
        if (!res.ok) throw new Error(data.error || 'Translation failed');

        state.lastTranslation = data;
        if (data.situation && data.situation !== 'general') {
            state.lastContext = data.situation;
            renderContext(data.situation);
        }

        state.history.unshift({ source: data.source_text, target: data.translated_text, from: data.source_language, to: data.target_language, time: Date.now() });
        if (state.history.length > 100) state.history.pop();
        localStorage.setItem('translationHistory', JSON.stringify(state.history));

        let html = `<div class="chat-translation">${escHtml(data.translated_text)}</div>`;
        const labels = { restaurant: '🍽️ Restaurant', airport: '✈️ Airport', hotel: '🏨 Hotel', shopping: '🛒 Shopping', street: '🗺️ Street', hospital: '🏥 Medical', emergency: '🆘 Emergency' };
        if (data.situation && data.situation !== 'general') html += `<div class="chat-meta">${labels[data.situation] || data.situation} detected</div>`;
        html += `<div class="chat-actions"><button class="chat-action" onclick="copyLast()">📋 Copy</button><button class="chat-action" onclick="speakLast()">🔊 Listen</button><button class="chat-action" onclick="saveLast()">⭐ Save</button></div>`;

        addMsg('buddy', html);
        Sound.play('receive');
        checkPractice();
        setHints([{ label: '🔊 Listen again', action: 'speak' }, { label: `🍽️ More ${state.lastContext} phrases`, action: `context_${state.lastContext}` }]);
    } catch (err) {
        removeTyping();
        addMsg('buddy', `Hmm, that didn't work. Try again?<br><small style="color:var(--text-muted)">${escHtml(err.message)}</small>`);
        Sound.play('error');
        setHints([{ label: '🔄 Retry', text }]);
    }
}

// Global helpers
window.copyLast = () => { if (state.lastTranslation) { navigator.clipboard.writeText(state.lastTranslation.translated_text); showToast('Copied!'); } };
window.speakLast = () => { if (state.lastTranslation) speakText(state.lastTranslation.translated_text, state.lastTranslation.target_language); };
window.saveLast = () => {
    if (state.lastTranslation) {
        const f = JSON.parse(localStorage.getItem('favorites') || '[]');
        f.unshift({ source: state.lastTranslation.source_text, target: state.lastTranslation.translated_text, from: state.lastTranslation.source_language, to: state.lastTranslation.target_language, time: Date.now() });
        if (f.length > 50) f.pop();
        localStorage.setItem('favorites', JSON.stringify(f));
        showToast('Saved!');
    }
};

function handleChatAction(a) {
    if (a === 'firsthour') showFirstHour();
    else if (a === 'allergy') openMedical();
    else if (a === 'speak' && state.lastTranslation) speakText(state.lastTranslation.translated_text, state.lastTranslation.target_language);
    else if (a.startsWith('context_')) { const ctx = a.replace('context_', ''); renderContext(ctx); openChatWith(`Show me ${ctx} phrases`); }
}

async function showFirstHour() {
    const lang = state.destination || 'ja';
    const ld = LANGUAGES[lang];
    const phrases = FIRST_HOUR[lang] || FIRST_HOUR._default;
    openChatOverlay(`${ld.flag} First Hour`);
    let html = `<div class="guide-intro">The 5 phrases you'll need in your first hour. Tap to hear them.</div><div class="guide-phrases">`;
    phrases.forEach(p => {
        html += `<div class="guide-phrase" onclick="handleChatMsg('${escAttr(p.local)}')"><div><div class="guide-phrase-text">${escHtml(p.local)}</div><div class="guide-phrase-en">${escHtml(p.en)}</div></div><button class="guide-phrase-play" onclick="event.stopPropagation(); speakText('${escAttr(p.local)}','${lang}')">🔊</button></div>`;
    });
    html += '</div>';
    addMsg('buddy', html);
    setHints([{ label: '🍽️ Restaurant phrases', action: 'context_restaurant' }, { label: '🥜 Allergy card', action: 'allergy' }]);
}

// Make handleChatMsg globally accessible for onclick
window.handleChatMsg = handleChatMsg;

// ---- Speak ----
async function speakText(text, language) {
    try {
        const res = await fetch('/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language }) });
        if (!res.ok) return;
        const blob = await res.blob();
        new Audio(URL.createObjectURL(blob)).play();
    } catch(e) {}
}

// ============================================================
// EMERGENCY
// ============================================================

document.getElementById('bottomEmergency').addEventListener('click', openEmergency);

function openEmergency() {
    const overlay = document.getElementById('emergencyOverlay');
    const m = state.medical;
    const lang = state.destination || 'ja';
    const ld = LANGUAGES[lang];

    document.getElementById('emergencyLangLabel').textContent = `I need help in ${ld?.name || lang}`;
    document.getElementById('emergencySpeakBtn').innerHTML = `🔊 TAP TO SPEAK IN ${(ld?.name || lang).toUpperCase()}`;

    document.getElementById('emergencyMedical').innerHTML = `
        <div class="emergency-medical-row"><span class="emergency-medical-label">Blood</span><span class="emergency-medical-value">${escHtml(m.bloodType || 'Not set')}</span></div>
        <div class="emergency-medical-row"><span class="emergency-medical-label">Allergies</span><span class="emergency-medical-value">${escHtml(m.allergies || 'Not set')}</span></div>
        <div class="emergency-medical-row"><span class="emergency-medical-label">Medications</span><span class="emergency-medical-value">${escHtml(m.medications || 'Not set')}</span></div>
        <div class="emergency-medical-row"><span class="emergency-medical-label">Contact</span><span class="emergency-medical-value">${escHtml(m.emergencyContact || 'Not set')}</span></div>`;

    overlay.classList.add('active');

    document.getElementById('emergencyCloseBtn').onclick = () => overlay.classList.remove('active');
    document.getElementById('emergencySpeakBtn').onclick = async () => {
        const btn = document.getElementById('emergencySpeakBtn');
        btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Speaking...';
        let text = 'I need help. This is an emergency.';
        if (m.bloodType || m.allergies || m.medications) {
            text += ' Medical info: ';
            if (m.bloodType) text += 'Blood type: ' + m.bloodType + '. ';
            if (m.allergies) text += 'Allergies: ' + m.allergies + '. ';
            if (m.medications) text += 'Medications: ' + m.medications + '. ';
            if (m.emergencyContact) text += 'Emergency contact: ' + m.emergencyContact + '. ';
        }
        try {
            const res = await fetch('/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, source_language: 'en', target_language: lang, situation: 'emergency' }) });
            const data = await res.json();
            if (res.ok) speakText(data.translated_text, lang);
        } catch(e) {}
        btn.disabled = false; btn.innerHTML = `🔊 TAP TO SPEAK IN ${(ld?.name || lang).toUpperCase()}`;
    };
}

// ============================================================
// MEDICAL
// ============================================================

document.getElementById('bottomAllergy').addEventListener('click', openMedical);

function openMedical() {
    const modal = document.getElementById('medicalModal');
    const m = state.medical;
    document.getElementById('medBloodType').value = m.bloodType || '';
    document.getElementById('medAllergies').value = m.allergies || '';
    document.getElementById('medMedications').value = m.medications || '';
    document.getElementById('medContact').value = m.emergencyContact || '';
    document.getElementById('medNotes').value = m.medicalNotes || '';
    modal.classList.add('active');
}

document.getElementById('closeMedical').addEventListener('click', () => document.getElementById('medicalModal').classList.remove('active'));
document.getElementById('medicalModal').addEventListener('click', (e) => { if (e.target === document.getElementById('medicalModal')) document.getElementById('medicalModal').classList.remove('active'); });

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
// FIRST HOUR (bottom bar)
// ============================================================

document.getElementById('bottomGuide').addEventListener('click', showFirstHour);

// ============================================================
// VOICE INPUT
// ============================================================

const micBtn = document.getElementById('micBtn');
let recognition = null;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => { document.getElementById('translateInput').value = e.results[0][0].transcript; micBtn.classList.remove('listening'); };
    recognition.onend = () => micBtn.classList.remove('listening');
    recognition.onerror = () => micBtn.classList.remove('listening');
}

micBtn.addEventListener('click', () => {
    if (!recognition) { showToast('Voice not supported'); return; }
    if (micBtn.classList.contains('listening')) { recognition.stop(); micBtn.classList.remove('listening'); }
    else {
        const map = { ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ru: 'ru-RU', ar: 'ar-SA', hi: 'hi-IN', th: 'th-TH', vi: 'vi-VN' };
        recognition.lang = map[state.destination] || 'en-US';
        recognition.start();
        micBtn.classList.add('listening');
    }
});

document.getElementById('camBtn').addEventListener('click', () => showToast('Camera translate coming soon!'));

// ============================================================
// TRANSLATE BUTTON (dashboard)
// ============================================================

document.getElementById('translateBtn').addEventListener('click', async () => {
    const input = document.getElementById('translateInput');
    const text = input.value.trim();
    if (!text) return;

    const resultDiv = document.getElementById('translateResult');
    const resultText = document.getElementById('resultText');
    resultDiv.style.display = 'block';
    resultText.innerHTML = '<span class="spinner spinner-dark"></span>';

    try {
        const res = await fetch('/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, source_language: 'auto', target_language: state.destination || 'ja' }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Translation failed');

        state.lastTranslation = data;
        resultText.textContent = data.translated_text;
        resultText.style.fontFamily = LANGUAGES[state.destination] ? 'var(--font-jp), var(--font)' : 'var(--font)';

        if (data.situation && data.situation !== 'general') { state.lastContext = data.situation; renderContext(data.situation); }

        state.history.unshift({ source: data.source_text, target: data.translated_text, from: data.source_language, to: data.target_language, time: Date.now() });
        if (state.history.length > 100) state.history.pop();
        localStorage.setItem('translationHistory', JSON.stringify(state.history));
        Sound.play('receive');
        checkPractice();
    } catch (err) {
        resultText.textContent = 'Error: ' + err.message;
        Sound.play('error');
    }
});

document.getElementById('translateInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('translateBtn').click(); } });

document.getElementById('resultCopy').addEventListener('click', window.copyLast);
document.getElementById('resultSpeak').addEventListener('click', window.speakLast);
document.getElementById('resultSave').addEventListener('click', window.saveLast);

// ============================================================
// THEME
// ============================================================

document.getElementById('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeUI();
});

// ============================================================
// MENU
// ============================================================

const menuOverlay = document.getElementById('menuOverlay');
document.getElementById('menuBtn').addEventListener('click', () => menuOverlay.classList.add('open'));
document.getElementById('menuClose').addEventListener('click', () => menuOverlay.classList.remove('open'));
menuOverlay.addEventListener('click', (e) => { if (e.target === menuOverlay) menuOverlay.classList.remove('open'); });

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        const a = item.dataset.action;
        menuOverlay.classList.remove('open');
        switch(a) {
            case 'destination': state.destination = null; localStorage.removeItem('mimo_destination'); initDashboard(); break;
            case 'phrasebook': showPhrasebook(); break;
            case 'practice': showPractice(); break;
            case 'allergy': case 'dietary': case 'medical': openMedical(); break;
            case 'firsthour': showFirstHour(); break;
            case 'history': showHistory(); break;
            case 'sound': Sound.toggle(); break;
        }
    });
});

function showPhrasebook() {
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    openChatOverlay('📖 Phrasebook');
    if (!favs.length) { addMsg('buddy', 'Empty! Translate things and save them.'); setHints([]); return; }
    let html = '';
    favs.slice(0, 10).forEach(f => { html += `<div style="padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="openChatWith('${escAttr(f.source)}')"><div style="font-weight:600">${escHtml(f.target)}</div><div style="color:var(--text-soft);font-size:12px">${escHtml(f.source)}</div></div>`; });
    addMsg('buddy', html);
    setHints([]);
}

function showPractice() {
    openChatOverlay('🎯 Practice');
    if (state.history.length < 3) { addMsg('buddy', 'Translate a few things first!'); setHints([]); return; }
    const freq = {};
    state.history.forEach(h => { freq[h.source] = (freq[h.source] || 0) + 1; });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    let html = '<div class="guide-intro">Your most translated phrases. Try saying them without looking!</div><div class="guide-phrases">';
    top.forEach(([phrase, count]) => { html += `<div class="guide-phrase" onclick="handleChatMsg('${escAttr(phrase)}')"><div><div class="guide-phrase-text">${escHtml(phrase)}</div><div class="guide-phrase-en">${count} times</div></div><div class="guide-phrase-play" style="background:var(--accent-soft);color:var(--accent)">→</div></div>`; });
    html += '</div>';
    addMsg('buddy', html);
    setHints([]);
}

function showHistory() {
    openChatOverlay('🕐 History');
    if (!state.history.length) { addMsg('buddy', 'No translations yet.'); setHints([]); return; }
    let html = '';
    state.history.slice(0, 8).forEach(h => { html += `<div style="padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="openChatWith('${escAttr(h.source)}')"><div style="font-weight:600">${escHtml(h.target)}</div><div style="color:var(--text-soft);font-size:12px">${escHtml(h.source)}</div></div>`; });
    addMsg('buddy', html);
    setHints([]);
}

// Make openChatWith global for onclick handlers
window.openChatWith = openChatWith;

// ============================================================
// ONBOARDING
// ============================================================

(function() {
    if (localStorage.getItem('onboarding_done')) { document.getElementById('onboardingOverlay').classList.remove('active'); return; }
    const steps = [
        { icon: '✈️', title: 'Your travel buddy', desc: 'Not just a translator — cultural tips, quick phrases, and everything you need for your trip.' },
        { icon: '💡', title: 'Context-aware', desc: 'I detect what you need — restaurant, airport, hotel — and show the right phrases instantly.' },
        { icon: '🎯', title: 'Always ready', desc: 'First-hour guide, allergy cards, and emergency help — all one tap away.' },
    ];
    let step = 0;
    const overlay = document.getElementById('onboardingOverlay');
    function render() {
        const s = steps[step];
        document.getElementById('onboardingIcon').textContent = s.icon;
        document.getElementById('onboardingStep').textContent = `Step ${step + 1} of 3`;
        document.getElementById('onboardingTitle').textContent = s.title;
        document.getElementById('onboardingDesc').textContent = s.desc;
        document.getElementById('onboardingDots').innerHTML = steps.map((_, i) => `<div class="onboarding-dot ${i === step ? 'active' : ''}"></div>`).join('');
        document.getElementById('onboardingBtn').textContent = step === 2 ? "Let's go!" : 'Next';
    }
    document.getElementById('onboardingSkip').addEventListener('click', close);
    document.getElementById('onboardingBtn').addEventListener('click', () => { if (step < 2) { step++; render(); } else close(); });
    function close() { overlay.classList.remove('active'); localStorage.setItem('onboarding_done', '1'); }
    overlay.classList.add('active');
    render();
})();

// ============================================================
// START
// ============================================================

initDashboard();
