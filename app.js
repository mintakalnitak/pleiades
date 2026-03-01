let userConfig = JSON.parse(localStorage.getItem('pleiades_user')) || null;
let periodData = JSON.parse(localStorage.getItem('pleiades_data')) || {};
let hydrationData = JSON.parse(localStorage.getItem('pleiades_hydration')) || {};

// ── DOM References ──
const views = { profile: document.getElementById('view-profile'), dashboard: document.getElementById('view-dashboard'), calendar: document.getElementById('view-calendar'), history: document.getElementById('view-history'), game: document.getElementById('view-game') };
const navBtns = { dashboard: document.getElementById('nav-dashboard'), calendar: document.getElementById('nav-calendar'), history: document.getElementById('nav-history'), game: document.getElementById('nav-game'), profile: document.getElementById('nav-profile') };

const profileForm = document.getElementById('profile-form');
const userNameInput = document.getElementById('user-name');
const userAgeInput = document.getElementById('user-age');
const userCycleLengthInput = document.getElementById('user-cycle-length');
const userPeriodLengthInput = document.getElementById('user-period-length');

const greetingTitle = document.getElementById('greeting-title');
const countdownDays = document.getElementById('countdown-days');
const circleDays = document.getElementById('circle-days');
const predictionDate = document.getElementById('prediction-date');
const btnSetPeriodDate = document.getElementById('btn-set-period-date');
const datePickerHidden = document.getElementById('date-picker-hidden');
const insightText = document.getElementById('insight-text');
const btnNextInsight = document.getElementById('btn-next-insight');
const currentPhaseBadge = document.getElementById('current-phase-badge');
const phasePointer = document.getElementById('phase-pointer');

let cycleChart = null, moodChart = null, historyChart = null;

const calendarGrid = document.querySelector('.calendar-grid');
const calendarMonthYear = document.getElementById('calendar-month-year');
const btnPrevMonth = document.getElementById('prev-month');
const btnNextMonth = document.getElementById('next-month');
const calendarPreview = document.getElementById('calendar-preview');
const previewDate = document.getElementById('preview-date');
const previewContent = document.getElementById('preview-content');
const previewEmpty = document.getElementById('preview-empty');
const previewFlow = document.getElementById('preview-flow');
const previewPain = document.getElementById('preview-pain');
const previewMood = document.getElementById('preview-mood');
const previewEnergy = document.getElementById('preview-energy');
const previewNotes = document.getElementById('preview-notes');
const btnEditLogPreview = document.getElementById('btn-edit-log-preview');
const btnLogThisDate = document.getElementById('btn-log-this-date');

const logModalOverlay = document.getElementById('log-modal-overlay');
const btnCloseModal = document.getElementById('btn-close-modal');
const modalDateLabel = document.getElementById('modal-date-label');
const logForm = document.getElementById('log-form');
const logDateInput = document.getElementById('log-date-input');
const logPain = document.getElementById('log-pain');
const logFlow = document.getElementById('log-flow');
const logMood = document.getElementById('log-mood');
const logNotes = document.getElementById('log-notes');
const painLabel = document.getElementById('pain-label');
const logSleep = document.getElementById('log-sleep');
const logEnergy = document.getElementById('log-energy');
const sleepLabel = document.getElementById('sleep-label');
const energyLabel = document.getElementById('energy-label');

let currentCalendarDate = new Date();
let selectedLogDate = new Date();
let insightIndex = 0;

const formatDate = (date) => { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const friendlyDate = (date) => date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const todayStr = () => formatDate(new Date());

// ── Init ──
function init() {
    bindEvents();
    initDarkMode();
    initHydration();
    if (!userConfig) { switchView('profile'); }
    else { populateProfileForm(); updateDashboard(); updateInsights(); updateCycleInsights(); updateMoodChart(); switchView('dashboard'); }
    renderCalendar();
    initMemoryGame();
    initTrivia();
    checkNotificationPermission();
    scheduleNotificationCheck();
}

// ── Dark Mode ──
function initDarkMode() {
    const saved = localStorage.getItem('pleiades_dark');
    if (saved === 'true') document.body.classList.add('dark-mode');
    const btn = document.getElementById('btn-dark-mode');
    if (btn) btn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('pleiades_dark', document.body.classList.contains('dark-mode'));
        btn.querySelector('i').className = document.body.classList.contains('dark-mode') ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
}

// ── Notifications ──
function checkNotificationPermission() {
    const btn = document.getElementById('btn-notifications');
    if (!btn || !('Notification' in window)) return;
    btn.addEventListener('click', async () => {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') { new Notification('Pleiades 🌸', { body: 'Notifications enabled! We\'ll remind you before your period.' }); }
    });
}
function scheduleNotificationCheck() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    setInterval(() => {
        const { daysLeft } = calculatePredictions();
        if (daysLeft !== null && daysLeft >= 1 && daysLeft <= 3) {
            const lastNotif = localStorage.getItem('pleiades_last_notif');
            if (lastNotif !== todayStr()) {
                new Notification('Pleiades Reminder 🌸', { body: `Your period is expected in ${daysLeft} day(s). Stay prepared! 💪` });
                localStorage.setItem('pleiades_last_notif', todayStr());
            }
        }
    }, 60000 * 30);
}

// ── Navigation ──
function switchView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    Object.values(navBtns).forEach(b => b.classList.remove('active'));
    views[viewName].classList.remove('hidden');
    navBtns[viewName].classList.add('active');
    if (viewName === 'calendar') renderCalendar();
    if (viewName === 'history') updateHistoryView();
}

// ── Event Binding ──
function bindEvents() {
    Object.keys(navBtns).forEach(key => navBtns[key].addEventListener('click', () => switchView(key)));
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        userConfig = { name: userNameInput.value, age: userAgeInput.value, cycleLength: parseInt(userCycleLengthInput.value), periodLength: parseInt(userPeriodLengthInput.value) };
        localStorage.setItem('pleiades_user', JSON.stringify(userConfig));
        updateDashboard(); updateInsights(); updateCycleInsights(); updateMoodChart(); switchView('dashboard');
    });
    if (btnSetPeriodDate && datePickerHidden) {
        btnSetPeriodDate.addEventListener('click', () => { datePickerHidden.showPicker ? datePickerHidden.showPicker() : datePickerHidden.click(); });
        datePickerHidden.addEventListener('input', (e) => {
            if (e.target.value) {
                const parts = e.target.value.split('-');
                selectedLogDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                currentCalendarDate = new Date(selectedLogDate);
                const dateStr = formatDate(selectedLogDate);
                if (!periodData[dateStr]) { periodData[dateStr] = { isPeriod: true, flow: 'medium', pain: 0, mood: 'none', notes: 'Logged via shortcut', symptoms: [], meds: [], sleep: 5, energy: 5 }; localStorage.setItem('pleiades_data', JSON.stringify(periodData)); }
                updateDashboard(); updateCycleInsights(); switchView('calendar'); renderCalendar(); showCalendarPreview(selectedLogDate);
                setTimeout(() => calendarPreview.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
                e.target.value = '';
            }
        });
    }
    btnPrevMonth.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1); renderCalendar(); });
    btnNextMonth.addEventListener('click', () => { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1); renderCalendar(); });
    if (btnEditLogPreview) btnEditLogPreview.addEventListener('click', () => openLogModal(selectedLogDate));
    if (btnLogThisDate) btnLogThisDate.addEventListener('click', () => openLogModal(selectedLogDate));
    btnCloseModal.addEventListener('click', closeLogModal);
    logModalOverlay.addEventListener('click', (e) => { if (e.target === logModalOverlay) closeLogModal(); });
    logPain.addEventListener('input', () => { painLabel.textContent = logPain.value; });
    if (logSleep) logSleep.addEventListener('input', () => { sleepLabel.textContent = logSleep.value; });
    if (logEnergy) logEnergy.addEventListener('input', () => { energyLabel.textContent = logEnergy.value; });
    document.querySelectorAll('.flow-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.flow-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); logFlow.value = btn.dataset.value; }); });
    document.querySelectorAll('.mood-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); logMood.value = btn.dataset.value; }); });
    document.querySelectorAll('.symptom-btn').forEach(btn => { btn.addEventListener('click', () => btn.classList.toggle('active')); });
    document.querySelectorAll('.med-btn').forEach(btn => { btn.addEventListener('click', () => btn.classList.toggle('active')); });

    logForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dateStr = logDateInput.value;
        const isPeriod = logFlow.value !== 'none';
        const symptoms = Array.from(document.querySelectorAll('.symptom-btn.active')).map(b => b.dataset.value);
        const meds = Array.from(document.querySelectorAll('.med-btn.active')).map(b => b.dataset.value);
        const entry = { isPeriod, pain: logPain.value, flow: logFlow.value, mood: logMood.value, notes: logNotes.value, symptoms, meds, sleep: logSleep ? logSleep.value : 5, energy: logEnergy ? logEnergy.value : 5 };
        const hasMood = logMood.value !== 'none';
        if (!isPeriod && entry.pain == 0 && !hasMood && !entry.notes && !symptoms.length && !meds.length) { delete periodData[dateStr]; } else { periodData[dateStr] = entry; }
        localStorage.setItem('pleiades_data', JSON.stringify(periodData));
        updateDashboard(); updateCycleInsights(); updateMoodChart(); closeLogModal(); switchView('calendar'); renderCalendar(); showCalendarPreview(selectedLogDate);
        setTimeout(() => calendarPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    });
    if (btnNextInsight) btnNextInsight.addEventListener('click', () => { insightIndex = (insightIndex + 1) % INSIGHTS.length; insightText.textContent = INSIGHTS[insightIndex]; });
    document.querySelectorAll('.game-tab').forEach(tab => { tab.addEventListener('click', () => { document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.game-panel').forEach(p => p.classList.add('hidden')); tab.classList.add('active'); document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden'); }); });
    const btnExport = document.getElementById('btn-export-data');
    if (btnExport) btnExport.addEventListener('click', exportData);
}

// ── Modal ──
function openLogModal(date) {
    selectedLogDate = date;
    const dateStr = formatDate(date);
    logDateInput.value = dateStr;
    modalDateLabel.textContent = `📅 ${friendlyDate(date)}`;
    const data = periodData[dateStr] || { pain: 0, flow: 'none', mood: 'none', notes: '', symptoms: [], meds: [], sleep: 5, energy: 5 };
    logPain.value = data.pain; painLabel.textContent = data.pain;
    logFlow.value = data.flow; logMood.value = data.mood || 'none'; logNotes.value = data.notes;
    if (logSleep) { logSleep.value = data.sleep || 5; sleepLabel.textContent = data.sleep || 5; }
    if (logEnergy) { logEnergy.value = data.energy || 5; energyLabel.textContent = data.energy || 5; }
    document.querySelectorAll('.flow-btn').forEach(b => b.classList.toggle('active', b.dataset.value === data.flow));
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.toggle('active', b.dataset.value === (data.mood || 'none')));
    document.querySelectorAll('.symptom-btn').forEach(b => b.classList.toggle('active', (data.symptoms || []).includes(b.dataset.value)));
    document.querySelectorAll('.med-btn').forEach(b => b.classList.toggle('active', (data.meds || []).includes(b.dataset.value)));
    logModalOverlay.classList.remove('hidden'); document.body.style.overflow = 'hidden';
}
function closeLogModal() { logModalOverlay.classList.add('hidden'); document.body.style.overflow = ''; }

// ── Calendar Preview ──
function showCalendarPreview(date) {
    selectedLogDate = date; const dateStr = formatDate(date);
    calendarPreview.classList.remove('hidden'); previewDate.textContent = friendlyDate(date);
    if (periodData[dateStr]) {
        previewContent.classList.remove('hidden'); previewEmpty.classList.add('hidden');
        const d = periodData[dateStr];
        previewFlow.textContent = d.flow.charAt(0).toUpperCase() + d.flow.slice(1);
        previewPain.textContent = d.pain;
        previewMood.textContent = d.mood && d.mood !== 'none' ? d.mood.charAt(0).toUpperCase() + d.mood.slice(1) : 'Normal';
        if (previewEnergy) previewEnergy.textContent = (d.energy || 5) + '/10';
        previewNotes.textContent = d.notes || '—';
    } else { previewContent.classList.add('hidden'); previewEmpty.classList.remove('hidden'); }
}

// ── Calendar Render ──
function renderCalendar() {
    const year = currentCalendarDate.getFullYear(), month = currentCalendarDate.getMonth();
    calendarMonthYear.textContent = new Date(year, month, 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });
    calendarGrid.querySelectorAll('.calendar-day').forEach(d => d.remove());
    const { allPredictions, ovulationDates } = calculatePredictions();
    const predictionsArr = allPredictions || [], ovulArr = ovulationDates || [];
    const firstDay = new Date(year, month, 1).getDay(), totalDays = new Date(year, month + 1, 0).getDate();
    const tStr = formatDate(new Date()), selStr = formatDate(selectedLogDate);
    for (let i = 0; i < firstDay; i++) { const e = document.createElement('div'); e.className = 'calendar-day empty'; calendarGrid.appendChild(e); }
    for (let i = 1; i <= totalDays; i++) {
        const cell = document.createElement('div'); cell.className = 'calendar-day'; cell.textContent = i;
        const cellDate = new Date(year, month, i), dateStr = formatDate(cellDate);
        if (dateStr === tStr) cell.classList.add('today');
        if (dateStr === selStr) cell.classList.add('selected');
        if (periodData[dateStr]?.flow && periodData[dateStr].flow !== 'none') cell.classList.add('period');
        else if (periodData[dateStr]) cell.classList.add('symptom');
        else if (ovulArr.includes(dateStr)) cell.classList.add('ovulation');
        else if (predictionsArr.includes(dateStr)) cell.classList.add('predicted');
        cell.addEventListener('click', () => { selectedLogDate = cellDate; renderCalendar(); showCalendarPreview(cellDate); });
        calendarGrid.appendChild(cell);
    }
}

// ── Predictions ──
function calculatePredictions() {
    if (!userConfig) return { predictedDate: null, daysLeft: null, allPredictions: [], ovulationDates: [] };
    const cycleLength = getSmartCycleLength();
    const periodDates = Object.keys(periodData).filter(d => periodData[d].flow !== 'none' && periodData[d].isPeriod).sort();
    if (!periodDates.length) return { predictedDate: null, daysLeft: null, allPredictions: [], ovulationDates: [] };
    let lastPeriodStartIndex = periodDates.length - 1;
    for (let i = periodDates.length - 1; i > 0; i--) { const diff = (new Date(periodDates[i]) - new Date(periodDates[i - 1])) / 86400000; if (diff <= 1.5) lastPeriodStartIndex = i - 1; else break; }
    const startOfLastPeriod = new Date(periodDates[lastPeriodStartIndex]); startOfLastPeriod.setHours(12, 0, 0, 0);
    const predictedNext = new Date(startOfLastPeriod); predictedNext.setDate(predictedNext.getDate() + cycleLength);
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const daysLeft = Math.floor((predictedNext - today) / 86400000);
    const msSinceStart = today - startOfLastPeriod;
    const daysSinceStart = Math.floor(msSinceStart / 86400000) + 1;
    const isCurrentlyInPeriod = (daysSinceStart >= 1 && daysSinceStart <= userConfig.periodLength);
    const allPredictions = [], ovulationDates = [];
    let base = new Date(startOfLastPeriod);
    for (let i = 0; i < 3; i++) {
        base.setDate(base.getDate() + cycleLength);
        for (let j = 0; j < userConfig.periodLength; j++) { const d = new Date(base); d.setDate(d.getDate() + j); allPredictions.push(formatDate(d)); }
        const ovulDate = new Date(base); ovulDate.setDate(ovulDate.getDate() - 14);
        for (let j = -2; j <= 2; j++) { const d = new Date(ovulDate); d.setDate(d.getDate() + j); ovulationDates.push(formatDate(d)); }
    }
    return { predictedDate: predictedNext, daysLeft, allPredictions, isCurrentlyInPeriod, daysSinceStart, ovulationDates };
}

function getSmartCycleLength() {
    const periodDates = Object.keys(periodData).filter(d => periodData[d].flow !== 'none' && periodData[d].isPeriod).sort();
    if (periodDates.length < 2) return userConfig.cycleLength;
    const starts = []; let blockStart = periodDates[0];
    for (let i = 1; i < periodDates.length; i++) { if ((new Date(periodDates[i]) - new Date(periodDates[i - 1])) / 86400000 > 2) { starts.push(blockStart); blockStart = periodDates[i]; } }
    starts.push(blockStart);
    if (starts.length < 2) return userConfig.cycleLength;
    const lengths = [];
    for (let i = 1; i < starts.length; i++) lengths.push(Math.round((new Date(starts[i]) - new Date(starts[i - 1])) / 86400000));
    return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
}

// ── Dashboard ──
function updateDashboard() {
    if (!userConfig) return;
    greetingTitle.textContent = `Hello, ${userConfig.name}!`;
    const { predictedDate, daysLeft, isCurrentlyInPeriod, daysSinceStart } = calculatePredictions();
    if (predictedDate && daysLeft !== null) {
        if (isCurrentlyInPeriod) { countdownDays.textContent = daysSinceStart; circleDays.textContent = daysSinceStart; circleDays.nextElementSibling.textContent = 'Period Day'; predictionDate.innerHTML = `Next period predicted for: <strong>${predictedDate.toLocaleDateString()}</strong>`; setProgress(100); }
        else if (daysLeft < 0) { countdownDays.textContent = '0'; circleDays.textContent = '!'; circleDays.nextElementSibling.textContent = 'Late'; predictionDate.innerHTML = `Period is <strong>${Math.abs(daysLeft)} days late</strong>`; setProgress(100); }
        else { countdownDays.textContent = daysLeft; circleDays.textContent = daysLeft; circleDays.nextElementSibling.textContent = 'Days Left'; predictionDate.innerHTML = `Next period: <strong>${predictedDate.toLocaleDateString()}</strong>`; setProgress(Math.max(0, Math.min(100, (1 - daysLeft / userConfig.cycleLength) * 100))); }
    } else { countdownDays.textContent = '--'; circleDays.textContent = '--'; if (circleDays.nextElementSibling) circleDays.nextElementSibling.textContent = 'Days'; predictionDate.innerHTML = 'Log your periods to get predictions!'; setProgress(0); }
    updateStreak(); updateIrregularityWarning(); updateOvulationWindow();
}

function setProgress(pct) { const c = document.getElementById('progress-bar'); if (!c) return; const r = c.r.baseVal.value, circ = r * 2 * Math.PI; c.style.strokeDasharray = `${circ} ${circ}`; c.style.strokeDashoffset = circ - (pct / 100 * circ); }

function updateStreak() {
    const badge = document.getElementById('streak-badge'), countEl = document.getElementById('streak-count');
    if (!badge) return; let streak = 0, d = new Date();
    for (let i = 0; i < 365; i++) { if (periodData[formatDate(d)]) { streak++; d.setDate(d.getDate() - 1); } else break; }
    if (streak >= 2) { badge.classList.remove('hidden'); countEl.textContent = streak; } else badge.classList.add('hidden');
}

function updateIrregularityWarning() {
    const warn = document.getElementById('irregularity-warning'), txt = document.getElementById('irregularity-text');
    if (!warn) return;
    const periodDates = Object.keys(periodData).filter(d => periodData[d].flow !== 'none' && periodData[d].isPeriod).sort();
    const starts = []; let bs = periodDates[0];
    for (let i = 1; i < periodDates.length; i++) { if ((new Date(periodDates[i]) - new Date(periodDates[i - 1])) / 86400000 > 2) { starts.push(bs); bs = periodDates[i]; } }
    if (bs) starts.push(bs);
    if (starts.length < 3) { warn.classList.add('hidden'); return; }
    const lens = [];
    for (let i = 1; i < starts.length; i++) lens.push(Math.round((new Date(starts[i]) - new Date(starts[i - 1])) / 86400000));
    const mn = Math.min(...lens), mx = Math.max(...lens);
    if (mx - mn > 7) { warn.classList.remove('hidden'); txt.textContent = `Cycle length varied by ${mx - mn} days (${mn}–${mx} days). Consider consulting a doctor.`; }
    else warn.classList.add('hidden');
}

function updateOvulationWindow() {
    const el = document.getElementById('ovulation-window'), txt = document.getElementById('ovulation-text');
    if (!el) return;
    const { ovulationDates } = calculatePredictions();
    if (ovulationDates && ovulationDates.length) { el.classList.remove('hidden'); const s = new Date(ovulationDates[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), e = new Date(ovulationDates[ovulationDates.length - 1]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); txt.textContent = `Fertile window: ${s} – ${e}`; }
    else el.classList.add('hidden');
}

function populateProfileForm() { if (!userConfig) return; userNameInput.value = userConfig.name; userAgeInput.value = userConfig.age; userCycleLengthInput.value = userConfig.cycleLength; userPeriodLengthInput.value = userConfig.periodLength; }

// ── Insights ──
const INSIGHTS = ["💧 Stay hydrated! Drinking water helps reduce bloating and headaches during your cycle.", "🥬 Iron-rich foods like spinach and lentils are great to restore nutrients lost during periods.", "🧘 Light yoga or a short walk can naturally ease menstrual cramps — try 15 minutes!", "🛁 A warm bath or heating pad placed on your lower abdomen can relieve cramp pain effectively.", "🍫 Magnesium-rich dark chocolate can satisfy chocolate cravings and help boost serotonin levels.", "🫚 Omega-3 fatty acids found in flaxseeds and fish can reduce period pain. Add them to your diet!", "😴 Your body needs extra rest during your period — it's doing a lot of work. Sleep is healing!", "📊 Tracking your cycle helps you predict and prepare for your next period more accurately.", "🍋 Vitamin C boosts iron absorption — pair lemon juice with iron-rich meals.", "🌸 Spotting your mood patterns in your cycle log helps you understand your emotional health better."];
function updateInsights() { insightIndex = Math.floor(Math.random() * INSIGHTS.length); if (insightText) insightText.textContent = INSIGHTS[insightIndex]; }

// ── Hydration ──
function initHydration() {
    const container = document.getElementById('hydration-glasses'); if (!container) return;
    const today = todayStr(); if (!hydrationData[today]) hydrationData[today] = 0;
    container.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const g = document.createElement('div'); g.className = 'hydration-glass'; if (i < hydrationData[today]) g.classList.add('filled');
        g.innerHTML = '<span>💧</span>';
        g.addEventListener('click', () => { hydrationData[today] = i + 1; localStorage.setItem('pleiades_hydration', JSON.stringify(hydrationData)); renderHydration(); });
        container.appendChild(g);
    }
    renderHydration();
}
function renderHydration() {
    const today = todayStr(), count = hydrationData[today] || 0;
    const cEl = document.getElementById('hydration-count'), bar = document.getElementById('hydration-bar'), msg = document.getElementById('hydration-message');
    if (cEl) cEl.textContent = `${count} / 8 glasses`;
    if (bar) bar.style.width = `${(count / 8) * 100}%`;
    const glasses = document.querySelectorAll('.hydration-glass');
    glasses.forEach((g, i) => { if (i < count) g.classList.add('filled'); else g.classList.remove('filled'); });
    if (msg) { if (count >= 8) msg.textContent = '🎉 You hit your hydration goal today!'; else if (count >= 5) msg.textContent = 'Almost there! Keep drinking 💪'; else msg.textContent = 'Tap the glasses to track your water intake today 💧'; }
}

// ════════════════════════════════════
// Cycle Analytics & Mood Chart
// ════════════════════════════════════
function updateCycleInsights() {
    if (!userConfig) return;
    const { daysSinceStart } = calculatePredictions();
    const cycleLength = getSmartCycleLength(), periodLength = userConfig.periodLength;
    const day = (daysSinceStart > 0 && daysSinceStart <= cycleLength) ? daysSinceStart : 1;
    let phaseName = "";
    let leftPct = (day / cycleLength) * 100;
    if (day <= periodLength) phaseName = "Menstruation Phase";
    else if (day <= Math.floor(cycleLength / 2)) phaseName = "Follicular Phase";
    else if (day <= Math.floor(cycleLength / 2) + 2) phaseName = "Ovulation Phase";
    else phaseName = "Luteal Phase";
    if (currentPhaseBadge) currentPhaseBadge.textContent = `Phase: ${phaseName} (Day ${day})`;
    if (phasePointer) phasePointer.style.left = `${leftPct}%`;
    renderCycleChart();
}

function renderCycleChart() {
    const ctx = document.getElementById('cycleChart'); if (!ctx || !userConfig) return;
    if (cycleChart) cycleChart.destroy();
    const cycleLength = getSmartCycleLength(), periodLength = userConfig.periodLength;
    const { daysSinceStart } = calculatePredictions();
    const labels = Array.from({ length: cycleLength }, (_, i) => `Day ${i + 1}`);
    const dataPoints = [];
    for (let i = 1; i <= cycleLength; i++) { let v = 10; if (i <= periodLength) v = 80; else if (i > Math.floor(cycleLength / 2) - 3 && i < Math.floor(cycleLength / 2) + 3) v = 95; else v = 40; dataPoints.push(v); }
    cycleChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ label: 'Cycle Intensity', data: dataPoints, borderColor: '#ff758c', backgroundColor: 'rgba(255,117,140,0.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: (c) => (c.dataIndex + 1 === daysSinceStart ? 8 : 0), pointBackgroundColor: '#ff758c', segment: { borderDash: (c) => { const d = c.p1DataIndex + 1; return d > (daysSinceStart > 0 ? daysSinceStart : 0) ? [5, 5] : []; } } }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => { const d = c.dataIndex + 1; return `${d > daysSinceStart ? 'Predicted' : 'Actual'} Intensity: ${c.parsed.y}`; } } } }, scales: { y: { display: false, min: 0, max: 120 }, x: { grid: { display: false }, ticks: { callback: (v, i) => (i + 1) % 7 === 0 ? `Day ${i + 1}` : '', font: { size: 10 } } } } } });
}

function updateMoodChart() {
    const ctx = document.getElementById('moodChart'); if (!ctx) return;
    if (moodChart) moodChart.destroy();
    const moodMap = { none: 3, happy: 5, sensitive: 2, sad: 1, irritable: 1, anxious: 2 };
    const dates = Object.keys(periodData).sort().slice(-14);
    if (dates.length < 2) { moodChart = new Chart(ctx, { type: 'bar', data: { labels: ['Log more data'], datasets: [{ data: [0], backgroundColor: 'rgba(255,117,140,0.2)' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }); return; }
    const labels = dates.map(d => { const dt = new Date(d); return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); });
    const moodData = dates.map(d => moodMap[periodData[d].mood || 'none'] || 3);
    const energyData = dates.map(d => parseInt(periodData[d].energy || 5));
    moodChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ label: 'Mood', data: moodData, borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.1)', borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#a78bfa' }, { label: 'Energy', data: energyData, borderColor: '#4fc3f7', backgroundColor: 'rgba(79,195,247,0.05)', borderWidth: 2, fill: false, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#4fc3f7', borderDash: [4, 4] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 11 }, usePointStyle: true } } }, scales: { y: { min: 0, max: 10, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } } } });
}

// ════════════════════════════════════
// History View
// ════════════════════════════════════
function updateHistoryView() {
    const periodDates = Object.keys(periodData).filter(d => periodData[d].flow !== 'none' && periodData[d].isPeriod).sort();
    const starts = []; let bs = periodDates[0];
    for (let i = 1; i < periodDates.length; i++) { if ((new Date(periodDates[i]) - new Date(periodDates[i - 1])) / 86400000 > 2) { starts.push(bs); bs = periodDates[i]; } }
    if (bs && periodDates.length) starts.push(bs);
    const cycleLengths = [];
    for (let i = 1; i < starts.length; i++) cycleLengths.push(Math.round((new Date(starts[i]) - new Date(starts[i - 1])) / 86400000));

    // Stats
    const avgCycle = cycleLengths.length ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) : '--';
    document.getElementById('stat-avg-cycle').textContent = avgCycle !== '--' ? `${avgCycle}d` : '--';
    document.getElementById('stat-avg-period').textContent = userConfig ? `${userConfig.periodLength}d` : '--';
    document.getElementById('stat-total-logs').textContent = Object.keys(periodData).length;
    // Most common flow
    const flows = {};
    Object.values(periodData).forEach(d => { if (d.flow && d.flow !== 'none') flows[d.flow] = (flows[d.flow] || 0) + 1; });
    const topFlow = Object.entries(flows).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('stat-avg-flow').textContent = topFlow ? topFlow[0].charAt(0).toUpperCase() + topFlow[0].slice(1) : '--';

    // History Chart
    const hCtx = document.getElementById('historyChart');
    if (hCtx && cycleLengths.length) {
        if (historyChart) historyChart.destroy();
        const hLabels = cycleLengths.map((_, i) => `Cycle ${i + 1}`);
        historyChart = new Chart(hCtx, { type: 'bar', data: { labels: hLabels, datasets: [{ label: 'Cycle Length (days)', data: cycleLengths, backgroundColor: cycleLengths.map(l => l < 25 || l > 35 ? 'rgba(255,77,109,0.7)' : 'rgba(255,117,140,0.5)'), borderRadius: 10, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.04)' } }, x: { grid: { display: false } } } } });
    }

    // History List
    const list = document.getElementById('history-list');
    if (list) {
        if (!starts.length) { list.innerHTML = '<p style="color:var(--text-muted);text-align:center;">No period history recorded yet.</p>'; return; }
        list.innerHTML = '';
        starts.reverse().forEach((s, idx) => {
            const sDate = new Date(s);
            const item = document.createElement('div'); item.className = 'history-item';
            const flowKey = periodData[s]?.flow || 'medium';
            item.innerHTML = `<div><div class="history-item-date">${sDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div><div style="font-size:0.8rem;color:var(--text-muted);">Period Start${cycleLengths[starts.length - 1 - idx] ? ' · Cycle: ' + cycleLengths[starts.length - 1 - idx] + 'd' : ''}</div></div><span class="history-item-badge flow-${flowKey}">${flowKey}</span>`;
            list.appendChild(item);
        });
    }
}

// ── Export Data ──
function exportData() {
    let csv = 'Date,Flow,Pain,Mood,Sleep,Energy,Symptoms,Medications,Notes\n';
    Object.keys(periodData).sort().forEach(d => {
        const e = periodData[d];
        csv += `${d},${e.flow || ''},${e.pain || 0},${e.mood || ''},${e.sleep || ''},${e.energy || ''},"${(e.symptoms || []).join(';')}","${(e.meds || []).join(';')}","${(e.notes || '').replace(/"/g, "'")}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `pleiades_data_${todayStr()}.csv`; a.click();
}

// ════════════════════════════════════
// GAME 1: Mood Smasher
// ════════════════════════════════════
let gameAnger = 100;
const gameFace = document.getElementById('game-face'), gameBar = document.getElementById('game-bar'), gameMessage = document.getElementById('game-message'), btnResetGame = document.getElementById('btn-reset-game');
if (gameFace) {
    gameFace.addEventListener('click', () => {
        if (gameAnger <= 0) return; gameAnger -= 10; gameBar.style.width = gameAnger + '%';
        gameFace.classList.remove('shake'); void gameFace.offsetWidth; gameFace.classList.add('shake');
        if (gameAnger > 60) { gameFace.textContent = '😡'; gameBar.style.background = 'linear-gradient(90deg,#ff758c,#ff4d6d)'; gameMessage.textContent = 'Keep smashing… release it all!'; }
        else if (gameAnger > 30) { gameFace.textContent = '😠'; gameBar.style.background = 'linear-gradient(90deg,#fca311,#f77f00)'; gameMessage.textContent = 'Almost there… letting it out!'; }
        else if (gameAnger > 0) { gameFace.textContent = '😕'; gameBar.style.background = 'linear-gradient(90deg,#ffca3a,#8ac926)'; gameMessage.textContent = 'Almost gone…'; }
        else { gameFace.textContent = '🥰'; gameFace.classList.remove('shake'); gameFace.classList.add('pop-in'); gameBar.style.width = '0%'; gameMessage.textContent = 'Ahhh… much better! You are amazing! 🌸'; btnResetGame.classList.remove('hidden'); }
    });
    btnResetGame.addEventListener('click', () => { gameAnger = 100; gameFace.textContent = '�'; gameBar.style.width = '100%'; gameBar.style.background = 'linear-gradient(90deg,#ff758c,#ff4d6d)'; gameMessage.textContent = 'Tap to smash the anger!'; btnResetGame.classList.add('hidden'); gameFace.classList.remove('pop-in'); });
}

// ════════════════════════════════════
// GAME 2: Memory Match
// ════════════════════════════════════
const MEMORY_EMOJIS = ['🌸', '🌹', '🍀', '🦋', '🌙', '⭐', '🍓', '💜'];
let memoryCards = [], memoryFlipped = [], memoryMatched = 0, memoryMoves = 0, memoryLock = false;
function initMemoryGame() {
    const board = document.getElementById('memory-board'); if (!board) return;
    const pairs = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS]; pairs.sort(() => Math.random() - 0.5);
    memoryFlipped = []; memoryMatched = 0; memoryMoves = 0; memoryLock = false;
    document.getElementById('memory-moves').textContent = '0'; board.innerHTML = ''; memoryCards = [];
    pairs.forEach((emoji, idx) => {
        const card = document.createElement('div'); card.className = 'memory-card';
        card.innerHTML = `<div class="card-inner"><div class="card-front"><i class="fa-solid fa-heart"></i></div><div class="card-back">${emoji}</div></div>`;
        card.dataset.emoji = emoji; card.dataset.idx = idx;
        card.addEventListener('click', () => flipMemoryCard(card));
        board.appendChild(card); memoryCards.push(card);
    });
    document.getElementById('btn-reset-memory').addEventListener('click', initMemoryGame);
}
function flipMemoryCard(card) {
    if (memoryLock || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    card.classList.add('flipped'); memoryFlipped.push(card);
    if (memoryFlipped.length === 2) {
        memoryLock = true; memoryMoves++; document.getElementById('memory-moves').textContent = memoryMoves;
        const [a, b] = memoryFlipped;
        if (a.dataset.emoji === b.dataset.emoji) { a.classList.add('matched'); b.classList.add('matched'); memoryMatched++; memoryFlipped = []; memoryLock = false; if (memoryMatched === MEMORY_EMOJIS.length) setTimeout(() => alert(`🎉 You matched all pairs in ${memoryMoves} moves!`), 300); }
        else { setTimeout(() => { a.classList.remove('flipped'); b.classList.remove('flipped'); memoryFlipped = []; memoryLock = false; }, 900); }
    }
}

// ════════════════════════════════════
// GAME 3: Period Trivia (with completion card)
// ════════════════════════════════════
const TRIVIA = [
    { q: "What is the average length of a menstrual cycle?", opts: ["21 days", "28 days", "35 days", "14 days"], ans: 1 },
    { q: "Which hormone triggers ovulation?", opts: ["Estrogen", "Progesterone", "LH (Luteinizing Hormone)", "FSH"], ans: 2 },
    { q: "Which nutrient is important to replenish during menstruation?", opts: ["Vitamin D", "Iron", "Calcium", "Zinc"], ans: 1 },
    { q: "What is the typical duration of a period?", opts: ["1–2 days", "3–7 days", "10–12 days", "14 days"], ans: 1 },
    { q: "Which phase follows ovulation in the menstrual cycle?", opts: ["Follicular phase", "Luteal phase", "Proliferative phase", "Menstrual phase"], ans: 1 },
    { q: "What term describes irregular or painful periods?", opts: ["Amenorrhea", "Dysmenorrhea", "Menorrhagia", "Oligomenorrhea"], ans: 1 },
    { q: "Which food can help naturally ease menstrual cramps?", opts: ["Caffeine", "Ginger", "Salt", "Alcohol"], ans: 1 },
    { q: "PMS stands for…", opts: ["Post Menstrual Symptoms", "Premenstrual Syndrome", "Periodic Mood Shift", "Prenatal Mood Sensitivity"], ans: 1 },
    { q: "Estrogen levels are highest during which phase?", opts: ["Menstrual phase", "Follicular phase", "Luteal phase", "All phases equally"], ans: 1 },
    { q: "What is the inner lining of the uterus called?", opts: ["Myometrium", "Perimetrium", "Endometrium", "Cervix"], ans: 2 }
];
let triviaIndex = 0, triviaScore = 0, triviaShuffled = [];
function initTrivia() {
    const qEl = document.getElementById('trivia-question'); if (!qEl) return;
    triviaShuffled = [...TRIVIA].sort(() => Math.random() - 0.5); triviaIndex = 0; triviaScore = 0;
    document.getElementById('trivia-score').textContent = '0';
    document.getElementById('trivia-total').textContent = triviaShuffled.length;
    document.getElementById('trivia-feedback').textContent = '';
    document.getElementById('btn-next-trivia').classList.add('hidden');
    const comp = document.getElementById('trivia-completion'); if (comp) comp.classList.add('hidden');
    document.getElementById('trivia-question-box').style.display = '';
    document.getElementById('trivia-options').style.display = '';
    document.getElementById('trivia-score-display').style.display = '';
    loadTriviaQuestion();
    document.getElementById('btn-next-trivia').onclick = () => { triviaIndex++; if (triviaIndex < triviaShuffled.length) loadTriviaQuestion(); else endTrivia(); };
    document.getElementById('btn-reset-trivia').onclick = initTrivia;
}
function loadTriviaQuestion() {
    const qData = triviaShuffled[triviaIndex];
    document.getElementById('trivia-question').textContent = `Q${triviaIndex + 1}. ${qData.q}`;
    document.getElementById('trivia-feedback').textContent = '';
    document.getElementById('btn-next-trivia').classList.add('hidden');
    const optEl = document.getElementById('trivia-options'); optEl.innerHTML = '';
    qData.opts.forEach((opt, i) => { const btn = document.createElement('button'); btn.className = 'trivia-opt-btn'; btn.textContent = opt; btn.addEventListener('click', () => checkTriviaAnswer(i, qData.ans)); optEl.appendChild(btn); });
}
function checkTriviaAnswer(sel, cor) {
    const fb = document.getElementById('trivia-feedback');
    const btns = document.querySelectorAll('.trivia-opt-btn'); btns.forEach(b => b.disabled = true); btns[cor].classList.add('correct');
    if (sel === cor) { triviaScore++; document.getElementById('trivia-score').textContent = triviaScore; fb.textContent = '✅ Correct! Well done!'; fb.style.color = '#155724'; }
    else { btns[sel].classList.add('wrong'); fb.textContent = `❌ The answer is: "${triviaShuffled[triviaIndex].opts[cor]}"`; fb.style.color = '#721c24'; }
    document.getElementById('btn-next-trivia').classList.remove('hidden');
}
function endTrivia() {
    document.getElementById('trivia-question-box').style.display = 'none';
    document.getElementById('trivia-options').style.display = 'none';
    document.getElementById('trivia-score-display').style.display = 'none';
    document.getElementById('trivia-feedback').textContent = '';
    document.getElementById('btn-next-trivia').classList.add('hidden');
    const comp = document.getElementById('trivia-completion'); if (!comp) return;
    comp.classList.remove('hidden');
    const total = triviaShuffled.length;
    document.getElementById('trivia-completion-title').textContent = `Quiz Complete! ${triviaScore}/${total}`;
    const pct = triviaScore / total;
    let msg = '', stars = '';
    if (pct >= 0.9) { msg = '🌸 Excellent! You really know your cycle!'; stars = '⭐⭐⭐⭐⭐'; }
    else if (pct >= 0.7) { msg = '👍 Great job! You\'re well-informed!'; stars = '⭐⭐⭐⭐'; }
    else if (pct >= 0.5) { msg = '💪 Good effort! Keep learning!'; stars = '⭐⭐⭐'; }
    else { msg = '� Keep practising — knowledge is power!'; stars = '⭐⭐'; }
    document.getElementById('trivia-completion-text').textContent = msg;
    document.getElementById('trivia-completion-stars').textContent = stars;
}

// ── Start app ──
document.addEventListener('DOMContentLoaded', init);
