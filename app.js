let userConfig = JSON.parse(localStorage.getItem('pleiades_user')) || null;
let periodData = JSON.parse(localStorage.getItem('pleiades_data')) || {};

// ── DOM References ──
const views = {
    profile: document.getElementById('view-profile'),
    dashboard: document.getElementById('view-dashboard'),
    calendar: document.getElementById('view-calendar'),
    game: document.getElementById('view-game')
};
const navBtns = {
    dashboard: document.getElementById('nav-dashboard'),
    calendar: document.getElementById('nav-calendar'),
    game: document.getElementById('nav-game'),
    profile: document.getElementById('nav-profile')
};

// Profile
const profileForm = document.getElementById('profile-form');
const userNameInput = document.getElementById('user-name');
const userAgeInput = document.getElementById('user-age');
const userCycleLengthInput = document.getElementById('user-cycle-length');
const userPeriodLengthInput = document.getElementById('user-period-length');

// Dashboard
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

let cycleChart = null;

// Calendar
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
const previewNotes = document.getElementById('preview-notes');
const btnEditLogPreview = document.getElementById('btn-edit-log-preview');
const btnLogThisDate = document.getElementById('btn-log-this-date');

// Modal
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

// ── State for selected date / calendar ──
let currentCalendarDate = new Date();
let selectedLogDate = new Date();
let insightIndex = 0;

// ── Helpers ──
const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const friendlyDate = (date) =>
    date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ── Init ──
function init() {
    bindEvents();
    if (!userConfig) {
        switchView('profile');
    } else {
        populateProfileForm();
        updateDashboard();
        updateInsights();
        updateCycleInsights();
        switchView('dashboard');
    }
    renderCalendar();
    initMemoryGame();
    initTrivia();
}

// ── Navigation ──
function switchView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    Object.values(navBtns).forEach(b => b.classList.remove('active'));
    views[viewName].classList.remove('hidden');
    navBtns[viewName].classList.add('active');
    if (viewName === 'calendar') renderCalendar();
}

// ── Event Binding ──
function bindEvents() {
    // Nav
    Object.keys(navBtns).forEach(key =>
        navBtns[key].addEventListener('click', () => switchView(key))
    );

    // Profile save
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        userConfig = {
            name: userNameInput.value,
            age: userAgeInput.value,
            cycleLength: parseInt(userCycleLengthInput.value),
            periodLength: parseInt(userPeriodLengthInput.value)
        };
        localStorage.setItem('pleiades_user', JSON.stringify(userConfig));
        updateDashboard();
        updateInsights();
        updateCycleInsights();
        switchView('dashboard');
    });

    // Set Period Date
    if (btnSetPeriodDate && datePickerHidden) {
        btnSetPeriodDate.addEventListener('click', () => {
            datePickerHidden.showPicker ? datePickerHidden.showPicker() : datePickerHidden.click();
        });

        datePickerHidden.addEventListener('input', (e) => {
            if (e.target.value) {
                const parts = e.target.value.split('-');
                selectedLogDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                currentCalendarDate = new Date(selectedLogDate);

                // Automatically log this as a period start
                const dateStr = formatDate(selectedLogDate);
                if (!periodData[dateStr]) {
                    periodData[dateStr] = {
                        isPeriod: true,
                        flow: 'medium',
                        pain: 0,
                        mood: 'none',
                        notes: 'Logged via shortcut'
                    };
                    localStorage.setItem('pleiades_data', JSON.stringify(periodData));
                }

                updateDashboard();
                updateCycleInsights();

                // Switch to calendar and show preview
                switchView('calendar');
                renderCalendar();
                showCalendarPreview(selectedLogDate);

                // Ensure it's scrolled into view
                setTimeout(() => {
                    calendarPreview.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);

                e.target.value = '';
            }
        });
    }

    // Calendar controls
    btnPrevMonth.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    btnNextMonth.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });

    // Calendar preview — edit existing
    if (btnEditLogPreview) {
        btnEditLogPreview.addEventListener('click', () => openLogModal(selectedLogDate));
    }
    // Calendar preview — log new
    if (btnLogThisDate) {
        btnLogThisDate.addEventListener('click', () => openLogModal(selectedLogDate));
    }

    // Modal close
    btnCloseModal.addEventListener('click', closeLogModal);
    logModalOverlay.addEventListener('click', (e) => {
        if (e.target === logModalOverlay) closeLogModal();
    });

    // Pain slider live label
    logPain.addEventListener('input', () => { painLabel.textContent = logPain.value; });

    // Flow buttons
    document.querySelectorAll('.flow-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.flow-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            logFlow.value = btn.dataset.value;
        });
    });

    // Mood buttons
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            logMood.value = btn.dataset.value;
        });
    });

    // Log form submit
    logForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dateStr = logDateInput.value;
        const isPeriod = logFlow.value !== 'none';

        const entry = {
            isPeriod,
            pain: logPain.value,
            flow: logFlow.value,
            mood: logMood.value,
            notes: logNotes.value
        };

        const hasMood = logMood.value !== 'none';
        if (!isPeriod && entry.pain == 0 && !hasMood && !entry.notes) {
            delete periodData[dateStr];
        } else {
            periodData[dateStr] = entry;
        }

        localStorage.setItem('pleiades_data', JSON.stringify(periodData));
        updateDashboard();
        updateCycleInsights();

        // 3. Close modal → show calendar with data marked
        closeLogModal();
        switchView('calendar');
        renderCalendar();
        showCalendarPreview(selectedLogDate);
        setTimeout(() => calendarPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    });

    // Insights
    if (btnNextInsight) {
        btnNextInsight.addEventListener('click', () => {
            insightIndex = (insightIndex + 1) % INSIGHTS.length;
            insightText.textContent = INSIGHTS[insightIndex];
        });
    }

    // Game tabs
    document.querySelectorAll('.game-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.game-panel').forEach(p => p.classList.add('hidden'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
        });
    });
}

// ── Modal open/close ──
function openLogModal(date) {
    selectedLogDate = date;
    const dateStr = formatDate(date);
    logDateInput.value = dateStr;
    modalDateLabel.textContent = `📅 ${friendlyDate(date)}`;

    // Pre-fill from existing data
    const data = periodData[dateStr] || { pain: 0, flow: 'none', mood: 'none', notes: '' };
    logPain.value = data.pain;
    painLabel.textContent = data.pain;
    logFlow.value = data.flow;
    logMood.value = data.mood || 'none';
    logNotes.value = data.notes;

    // Activate button states
    document.querySelectorAll('.flow-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.value === data.flow);
    });
    document.querySelectorAll('.mood-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.value === (data.mood || 'none'));
    });

    logModalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function setLogFormDate(date) {
    selectedLogDate = date;
    const dateStr = formatDate(date);
    logDateInput.value = dateStr;
    modalDateLabel.textContent = `📅 ${friendlyDate(date)}`;
}

function closeLogModal() {
    logModalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
}

// ── Calendar Preview ──
function showCalendarPreview(date) {
    selectedLogDate = date;
    const dateStr = formatDate(date);

    calendarPreview.classList.remove('hidden');
    previewDate.textContent = friendlyDate(date);

    if (periodData[dateStr]) {
        previewContent.classList.remove('hidden');
        previewEmpty.classList.add('hidden');

        const d = periodData[dateStr];
        previewFlow.textContent = d.flow.charAt(0).toUpperCase() + d.flow.slice(1);
        previewPain.textContent = d.pain;
        previewMood.textContent = d.mood && d.mood !== 'none' ? d.mood.charAt(0).toUpperCase() + d.mood.slice(1) : 'Normal';
        previewNotes.textContent = d.notes || '—';
    } else {
        previewContent.classList.add('hidden');
        previewEmpty.classList.remove('hidden');
    }
}

// ── Calendar Render ──
function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    calendarMonthYear.textContent = new Date(year, month, 1).toLocaleDateString('default', { month: 'long', year: 'numeric' });

    // Remove old day cells (keep day-name headers)
    calendarGrid.querySelectorAll('.calendar-day').forEach(d => d.remove());

    const { allPredictions } = calculatePredictions();
    const predictionsArray = allPredictions || [];

    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const todayStr = formatDate(new Date());
    const selectedStr = formatDate(selectedLogDate);

    // Empty spacers
    for (let i = 0; i < firstDay; i++) {
        const e = document.createElement('div');
        e.className = 'calendar-day empty';
        calendarGrid.appendChild(e);
    }

    for (let i = 1; i <= totalDays; i++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        cell.textContent = i;

        const cellDate = new Date(year, month, i);
        const dateStr = formatDate(cellDate);

        if (dateStr === todayStr) cell.classList.add('today');
        if (dateStr === selectedStr) cell.classList.add('selected');

        if (periodData[dateStr]?.flow && periodData[dateStr].flow !== 'none') {
            cell.classList.add('period');
        } else if (periodData[dateStr]) {
            cell.classList.add('symptom');
        } else if (predictionsArray.includes(dateStr)) {
            cell.classList.add('predicted');
        }

        cell.addEventListener('click', () => {
            selectedLogDate = cellDate;
            renderCalendar();
            showCalendarPreview(cellDate);
        });

        calendarGrid.appendChild(cell);
    }
}

// ── Predictions ──
function calculatePredictions() {
    if (!userConfig) return { predictedDate: null, daysLeft: null, allPredictions: [] };
    const cycleLength = userConfig.cycleLength;

    const periodDates = Object.keys(periodData)
        .filter(d => periodData[d].flow !== 'none' && periodData[d].isPeriod)
        .sort();

    if (!periodDates.length) return { predictedDate: null, daysLeft: null, allPredictions: [] };

    // Find the START of the latest period block
    // We start from the last date and go back as long as the dates are consecutive
    let lastPeriodStartIndex = periodDates.length - 1;
    for (let i = periodDates.length - 1; i > 0; i--) {
        const current = new Date(periodDates[i]);
        const previous = new Date(periodDates[i - 1]);
        const diffDays = (current - previous) / 86400000;

        if (diffDays <= 1.5) { // Within 1 day (handling DST/timezone slop)
            lastPeriodStartIndex = i - 1;
        } else {
            break; // Found a gap, this is the start of the most recent block
        }
    }

    const startOfLastPeriod = new Date(periodDates[lastPeriodStartIndex]);
    startOfLastPeriod.setHours(12, 0, 0, 0);

    const predictedNext = new Date(startOfLastPeriod);
    predictedNext.setDate(predictedNext.getDate() + cycleLength);

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const daysLeft = Math.floor((predictedNext - today) / 86400000);

    // Calculate if currently in period
    const msSinceStart = today - startOfLastPeriod;
    const daysSinceStart = Math.floor(msSinceStart / 86400000) + 1;
    const isCurrentlyInPeriod = (daysSinceStart >= 1 && daysSinceStart <= userConfig.periodLength);

    const allPredictions = [];
    let base = new Date(startOfLastPeriod);
    for (let i = 0; i < 3; i++) {
        base.setDate(base.getDate() + cycleLength);
        for (let j = 0; j < userConfig.periodLength; j++) {
            const d = new Date(base);
            d.setDate(d.getDate() + j);
            allPredictions.push(formatDate(d));
        }
    }

    return { predictedDate: predictedNext, daysLeft, allPredictions, isCurrentlyInPeriod, daysSinceStart };
}

// ── Dashboard Update ──
function updateDashboard() {
    if (!userConfig) return;
    greetingTitle.textContent = `Hello, ${userConfig.name}!`;

    const { predictedDate, daysLeft, isCurrentlyInPeriod, daysSinceStart } = calculatePredictions();

    if (predictedDate && daysLeft !== null) {
        if (isCurrentlyInPeriod) {
            countdownDays.textContent = daysSinceStart;
            circleDays.textContent = daysSinceStart;
            circleDays.nextElementSibling.textContent = 'Period Day';
            predictionDate.innerHTML = `Next period predicted for: <strong>${predictedDate.toLocaleDateString()}</strong>`;
            setProgress(100);
        } else if (daysLeft < 0) {
            countdownDays.textContent = '0';
            circleDays.textContent = '!';
            circleDays.nextElementSibling.textContent = 'Late';
            predictionDate.innerHTML = `Period is <strong>${Math.abs(daysLeft)} days late</strong>`;
            setProgress(100);
        } else {
            countdownDays.textContent = daysLeft;
            circleDays.textContent = daysLeft;
            circleDays.nextElementSibling.textContent = 'Days Left';
            predictionDate.innerHTML = `Next period: <strong>${predictedDate.toLocaleDateString()}</strong>`;
            const pct = Math.max(0, Math.min(100, (1 - daysLeft / userConfig.cycleLength) * 100));
            setProgress(pct);
        }
    } else {
        countdownDays.textContent = '--';
        circleDays.textContent = '--';
        circleDays.nextElementSibling && (circleDays.nextElementSibling.textContent = 'Days');
        predictionDate.innerHTML = `Log your periods to get predictions!`;
        setProgress(0);
    }
}

function setProgress(percent) {
    const circle = document.getElementById('progress-bar');
    if (!circle) return;
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference - (percent / 100 * circumference);
}

// ── Profile form population ──
function populateProfileForm() {
    if (!userConfig) return;
    userNameInput.value = userConfig.name;
    userAgeInput.value = userConfig.age;
    userCycleLengthInput.value = userConfig.cycleLength;
    userPeriodLengthInput.value = userConfig.periodLength;
}

// ── Daily Insights ──
const INSIGHTS = [
    "💧 Stay hydrated! Drinking water helps reduce bloating and headaches during your cycle.",
    "🥬 Iron-rich foods like spinach and lentils are great to restore nutrients lost during periods.",
    "🧘 Light yoga or a short walk can naturally ease menstrual cramps — try 15 minutes!",
    "🛁 A warm bath or heating pad placed on your lower abdomen can relieve cramp pain effectively.",
    "🍫 Magnesium-rich dark chocolate can satisfy chocolate cravings and help boost serotonin levels.",
    "🫚 Omega-3 fatty acids found in flaxseeds and fish can reduce period pain. Add them to your diet!",
    "😴 Your body needs extra rest during your period — it's doing a lot of work. Sleep is healing!",
    "📊 Tracking your cycle helps you predict and prepare for your next period more accurately.",
    "🍋 Vitamin C boosts iron absorption — pair lemon juice with iron-rich meals.",
    "🌸 Spotting your mood patterns in your cycle log helps you understand your emotional health better."
];

function updateInsights() {
    insightIndex = Math.floor(Math.random() * INSIGHTS.length);
    if (insightText) insightText.textContent = INSIGHTS[insightIndex];
}

// ════════════════════════════════════
// GAME 1: Mood Smasher
// ════════════════════════════════════
let gameAnger = 100;
const gameFace = document.getElementById('game-face');
const gameBar = document.getElementById('game-bar');
const gameMessage = document.getElementById('game-message');
const btnResetGame = document.getElementById('btn-reset-game');

if (gameFace) {
    gameFace.addEventListener('click', () => {
        if (gameAnger <= 0) return;
        gameAnger -= 10;
        gameBar.style.width = gameAnger + '%';

        gameFace.classList.remove('shake');
        void gameFace.offsetWidth;
        gameFace.classList.add('shake');

        if (gameAnger > 60) {
            gameFace.textContent = '😡';
            gameBar.style.background = 'linear-gradient(90deg,#ff758c,#ff4d6d)';
            gameMessage.textContent = 'Keep smashing… release it all!';
        } else if (gameAnger > 30) {
            gameFace.textContent = '😠';
            gameBar.style.background = 'linear-gradient(90deg,#fca311,#f77f00)';
            gameMessage.textContent = 'Almost there… letting it out!';
        } else if (gameAnger > 0) {
            gameFace.textContent = '😕';
            gameBar.style.background = 'linear-gradient(90deg,#ffca3a,#8ac926)';
            gameMessage.textContent = 'Almost gone…';
        } else {
            gameFace.textContent = '🥰';
            gameFace.classList.remove('shake');
            gameFace.classList.add('pop-in');
            gameBar.style.width = '0%';
            gameMessage.textContent = 'Ahhh… much better! You are amazing! 🌸';
            btnResetGame.classList.remove('hidden');
        }
    });

    btnResetGame.addEventListener('click', () => {
        gameAnger = 100;
        gameFace.textContent = '😡';
        gameBar.style.width = '100%';
        gameBar.style.background = 'linear-gradient(90deg,#ff758c,#ff4d6d)';
        gameMessage.textContent = 'Tap to smash the anger!';
        btnResetGame.classList.add('hidden');
        gameFace.classList.remove('pop-in');
    });
}

// ════════════════════════════════════
// GAME 2: Memory Match
// ════════════════════════════════════
const MEMORY_EMOJIS = ['🌸', '🌹', '🍀', '🦋', '🌙', '⭐', '🍓', '💜'];
let memoryCards = [], memoryFlipped = [], memoryMatched = 0, memoryMoves = 0, memoryLock = false;

function initMemoryGame() {
    const board = document.getElementById('memory-board');
    if (!board) return;

    const pairs = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS];
    pairs.sort(() => Math.random() - 0.5);

    memoryFlipped = [];
    memoryMatched = 0;
    memoryMoves = 0;
    memoryLock = false;
    document.getElementById('memory-moves').textContent = '0';
    board.innerHTML = '';
    memoryCards = [];

    pairs.forEach((emoji, idx) => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front"><i class="fa-solid fa-heart"></i></div>
                <div class="card-back">${emoji}</div>
            </div>`;
        card.dataset.emoji = emoji;
        card.dataset.idx = idx;
        card.addEventListener('click', () => flipMemoryCard(card));
        board.appendChild(card);
        memoryCards.push(card);
    });

    document.getElementById('btn-reset-memory').addEventListener('click', initMemoryGame);
}

function flipMemoryCard(card) {
    if (memoryLock || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    card.classList.add('flipped');
    memoryFlipped.push(card);

    if (memoryFlipped.length === 2) {
        memoryLock = true;
        memoryMoves++;
        document.getElementById('memory-moves').textContent = memoryMoves;

        const [a, b] = memoryFlipped;
        if (a.dataset.emoji === b.dataset.emoji) {
            a.classList.add('matched');
            b.classList.add('matched');
            memoryMatched++;
            memoryFlipped = [];
            memoryLock = false;
            if (memoryMatched === MEMORY_EMOJIS.length) {
                setTimeout(() => alert(`🎉 You matched all pairs in ${memoryMoves} moves!`), 300);
            }
        } else {
            setTimeout(() => {
                a.classList.remove('flipped');
                b.classList.remove('flipped');
                memoryFlipped = [];
                memoryLock = false;
            }, 900);
        }
    }
}

// ════════════════════════════════════
// GAME 3: Period Trivia
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
    const questionEl = document.getElementById('trivia-question');
    if (!questionEl) return;

    triviaShuffled = [...TRIVIA].sort(() => Math.random() - 0.5);
    triviaIndex = 0;
    triviaScore = 0;
    document.getElementById('trivia-score').textContent = '0';
    document.getElementById('trivia-total').textContent = triviaShuffled.length;
    document.getElementById('trivia-feedback').textContent = '';
    document.getElementById('btn-next-trivia').classList.add('hidden');
    document.getElementById('btn-reset-trivia').classList.add('hidden');

    loadTriviaQuestion();

    document.getElementById('btn-next-trivia').addEventListener('click', () => {
        triviaIndex++;
        if (triviaIndex < triviaShuffled.length) {
            loadTriviaQuestion();
        } else {
            endTrivia();
        }
    });

    document.getElementById('btn-reset-trivia').addEventListener('click', initTrivia);
}

function loadTriviaQuestion() {
    const qData = triviaShuffled[triviaIndex];
    document.getElementById('trivia-question').textContent = `Q${triviaIndex + 1}. ${qData.q}`;
    document.getElementById('trivia-feedback').textContent = '';
    document.getElementById('btn-next-trivia').classList.add('hidden');

    const optionsEl = document.getElementById('trivia-options');
    optionsEl.innerHTML = '';
    qData.opts.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'trivia-opt-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => checkTriviaAnswer(i, qData.ans));
        optionsEl.appendChild(btn);
    });
}

function checkTriviaAnswer(selected, correct) {
    const feedback = document.getElementById('trivia-feedback');
    const optBtns = document.querySelectorAll('.trivia-opt-btn');
    optBtns.forEach(b => b.disabled = true);
    optBtns[correct].classList.add('correct');

    if (selected === correct) {
        triviaScore++;
        document.getElementById('trivia-score').textContent = triviaScore;
        feedback.textContent = '✅ Correct! Well done!';
        feedback.style.color = '#155724';
    } else {
        optBtns[selected].classList.add('wrong');
        feedback.textContent = `❌ The answer is: "${triviaShuffled[triviaIndex].opts[correct]}"`;
        feedback.style.color = '#721c24';
    }

    document.getElementById('btn-next-trivia').classList.remove('hidden');
}

function endTrivia() {
    document.getElementById('trivia-question').textContent = `🎉 Quiz Complete! You scored ${triviaScore} out of ${triviaShuffled.length}.`;
    document.getElementById('trivia-options').innerHTML = '';
    document.getElementById('trivia-feedback').textContent = triviaScore >= 7 ? '🌸 Excellent! You really know your cycle!' : triviaScore >= 4 ? '👍 Good job! Keep learning!' : '💪 Keep practising — knowledge is power!';
    document.getElementById('trivia-feedback').style.color = 'var(--accent-color)';
    document.getElementById('btn-next-trivia').classList.add('hidden');
    document.getElementById('btn-reset-trivia').classList.remove('hidden');
}

function updateCycleInsights() {
    if (!userConfig) return;
    const { daysSinceStart } = calculatePredictions();
    const cycleLength = userConfig.cycleLength;
    const periodLength = userConfig.periodLength;

    // Default to Day 1 if no logs
    const day = (daysSinceStart > 0 && daysSinceStart <= cycleLength) ? daysSinceStart : 1;

    // Update Phase Badge & Pointer
    let phaseName = "";
    let leftPct = (day / cycleLength) * 100;

    if (day <= periodLength) {
        phaseName = "Menstruation Phase";
    } else if (day <= Math.floor(cycleLength / 2)) {
        phaseName = "Follicular Phase";
    } else if (day <= Math.floor(cycleLength / 2) + 2) {
        phaseName = "Ovulation Phase";
    } else {
        phaseName = "Luteal Phase";
    }

    if (currentPhaseBadge) currentPhaseBadge.textContent = `Phase: ${phaseName} (Day ${day})`;
    if (phasePointer) phasePointer.style.left = `${leftPct}%`;

    // Initialize/Update Chart
    renderCycleChart();
}

function renderCycleChart() {
    const ctx = document.getElementById('cycleChart');
    if (!ctx) return;

    if (cycleChart) cycleChart.destroy();

    const cycleLength = userConfig.cycleLength;
    const periodLength = userConfig.periodLength;
    const { daysSinceStart } = calculatePredictions();
    const labels = Array.from({ length: cycleLength }, (_, i) => `Day ${i + 1}`);

    // Generate assumed data for visualization
    const dataPoints = [];

    for (let i = 1; i <= cycleLength; i++) {
        // Mock hormone level or intensity
        let value = 10;
        if (i <= periodLength) value = 80;
        else if (i > Math.floor(cycleLength / 2) - 3 && i < Math.floor(cycleLength / 2) + 3) value = 95;
        else value = 40;

        dataPoints.push(value);
    }

    cycleChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cycle Intensity',
                data: dataPoints,
                borderColor: '#ff758c',
                backgroundColor: 'rgba(255, 117, 140, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: (context) => (context.dataIndex + 1 === daysSinceStart ? 8 : 0),
                pointBackgroundColor: '#ff758c',
                segment: {
                    borderDash: (ctx) => {
                        const day = ctx.p1DataIndex + 1;
                        return day > (daysSinceStart > 0 ? daysSinceStart : 0) ? [5, 5] : [];
                    }
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const day = context.dataIndex + 1;
                            const isPredicted = day > daysSinceStart;
                            return `${isPredicted ? 'Predicted' : 'Actual'} Intensity: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: { display: false, min: 0, max: 120 },
                x: {
                    grid: { display: false },
                    ticks: {
                        callback: function (val, index) {
                            return (index + 1) % 7 === 0 ? `Day ${index + 1}` : '';
                        },
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

// ── Start app ──
document.addEventListener('DOMContentLoaded', init);
