// State Management
let userConfig = JSON.parse(localStorage.getItem('pleiades_user')) || null;
let periodData = JSON.parse(localStorage.getItem('pleiades_data')) || {};

// DOM Elements
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

// Profile Elements
const profileForm = document.getElementById('profile-form');
const userNameInput = document.getElementById('user-name');
const userAgeInput = document.getElementById('user-age');
const userCycleLengthInput = document.getElementById('user-cycle-length');
const userPeriodLengthInput = document.getElementById('user-period-length');

// Dashboard Elements
const greetingTitle = document.getElementById('greeting-title');
const countdownDays = document.getElementById('countdown-days');
const circleDays = document.getElementById('circle-days');
const predictionDate = document.getElementById('prediction-date');
const btnLogToday = document.getElementById('btn-log-today');

// Log Elements
const logForm = document.getElementById('log-form');
const logDateDisplay = document.getElementById('log-date-display');
const logDateInput = document.getElementById('log-date-input');
const logPain = document.getElementById('log-pain');
const logFlow = document.getElementById('log-flow');
const logMood = document.getElementById('log-mood');
const logNotes = document.getElementById('log-notes');

const calendarGrid = document.querySelector('.calendar-grid');
const calendarMonthYear = document.getElementById('calendar-month-year');
const btnPrevMonth = document.getElementById('prev-month');
const btnNextMonth = document.getElementById('next-month');

// Calendar Preview Elements
const calendarPreview = document.getElementById('calendar-preview');
const previewDate = document.getElementById('preview-date');
const previewContent = document.getElementById('preview-content');
const previewEmpty = document.getElementById('preview-empty');
const previewFlow = document.getElementById('preview-flow');
const previewPain = document.getElementById('preview-pain');
const previewMood = document.getElementById('preview-mood');
const previewNotes = document.getElementById('preview-notes');
const btnEditLogPreview = document.getElementById('btn-edit-log-preview');

let currentCalendarDate = new Date();
let selectedLogDate = new Date(); // To allow logging for other dates if clicked on calendar

// Formatting dates to YYYY-MM-DD local time
const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Initialization
function init() {
    bindEvents();
    if (!userConfig) {
        switchView('profile');
    } else {
        populateProfileForm();
        updateDashboard();
        switchView('dashboard');
    }
    renderCalendar();
}

function bindEvents() {
    // Navigation
    Object.keys(navBtns).forEach(key => {
        navBtns[key].addEventListener('click', () => switchView(key));
    });

    // Profile Save
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
        switchView('dashboard');
    });

    // Log Form Save
    logForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dateStr = logDateInput.value;
        const isPeriod = logFlow.value !== 'none';

        periodData[dateStr] = {
            isPeriod: isPeriod,
            pain: logPain.value,
            flow: logFlow.value,
            mood: logMood.value,
            notes: logNotes.value
        };

        const hasMood = logMood.value !== 'none';
        if (!isPeriod && periodData[dateStr].pain == 0 && !hasMood && !periodData[dateStr].notes) {
            delete periodData[dateStr]; // clear empty logs
        }

        localStorage.setItem('pleiades_data', JSON.stringify(periodData));
        updateDashboard();
        renderCalendar();

        // Slight anim to show success
        const btn = logForm.querySelector('button');
        const oldText = btn.textContent;
        btn.textContent = 'Saved!';
        setTimeout(() => { btn.textContent = oldText }, 1500);
    });

    btnLogToday.addEventListener('click', () => {
        selectedLogDate = new Date();
        setLogFormDate(selectedLogDate);
        // Scroll to log form roughly
        document.querySelector('.log-card').scrollIntoView({ behavior: 'smooth' });
    });

    // Calendar Controls
    btnPrevMonth.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    btnNextMonth.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });

    if (btnEditLogPreview) {
        btnEditLogPreview.addEventListener('click', () => {
            setLogFormDate(selectedLogDate);
            switchView('dashboard');
            document.querySelector('.log-card').scrollIntoView({ behavior: 'smooth' });
        });
    }
}

function switchView(viewName) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    Object.values(navBtns).forEach(b => b.classList.remove('active'));

    views[viewName].classList.remove('hidden');
    navBtns[viewName].classList.add('active');

    if (viewName === 'calendar') {
        renderCalendar();
    }
}

function populateProfileForm() {
    if (!userConfig) return;
    userNameInput.value = userConfig.name;
    userAgeInput.value = userConfig.age;
    userCycleLengthInput.value = userConfig.cycleLength;
    userPeriodLengthInput.value = userConfig.periodLength;
}

function calculatePredictions() {
    if (!userConfig) return { predictedDate: null, daysLeft: null };
    const cycleLength = userConfig.cycleLength;

    // Find latest recorded period date
    const periodDates = Object.keys(periodData)
        .filter(d => periodData[d].flow !== 'none' && periodData[d].isPeriod)
        .sort();

    if (periodDates.length === 0) return { predictedDate: null, daysLeft: null, allPredictions: [] };

    const lastPeriodStr = periodDates[periodDates.length - 1];
    const lastPeriodDate = new Date(lastPeriodStr);
    lastPeriodDate.setHours(12, 0, 0, 0); // Avoid timezone shifts with midnight

    const predictedNext = new Date(lastPeriodDate);
    predictedNext.setDate(predictedNext.getDate() + cycleLength);

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diffTime = predictedNext - today;
    let daysLeft = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Calculate predictions for calendar (next 3 cycles roughly)
    const allPredictions = [];
    let currentPrediction = new Date(lastPeriodDate);
    for (let i = 0; i < 3; i++) {
        currentPrediction.setDate(currentPrediction.getDate() + cycleLength);
        // Add periodLength days to the prediction
        for (let j = 0; j < userConfig.periodLength; j++) {
            let d = new Date(currentPrediction);
            d.setDate(d.getDate() + j);
            allPredictions.push(formatDate(d));
        }
    }

    return { predictedDate: predictedNext, daysLeft, allPredictions };
}

function updateDashboard() {
    if (!userConfig) return;
    greetingTitle.textContent = `Hello, ${userConfig.name}!`;

    const { predictedDate, daysLeft } = calculatePredictions();

    if (predictedDate && daysLeft !== null) {
        if (daysLeft < 0) {
            countdownDays.textContent = "0";
            circleDays.textContent = "!";
            circleDays.nextElementSibling.textContent = "Late";
            predictionDate.innerHTML = `Period is <strong>${Math.abs(daysLeft)} days late</strong>`;
        } else {
            countdownDays.textContent = daysLeft;
            circleDays.textContent = daysLeft;
            circleDays.nextElementSibling.textContent = "Days";
            predictionDate.innerHTML = `Next period predicted for: <strong>${predictedDate.toLocaleDateString()}</strong>`;
        }
    } else {
        countdownDays.textContent = "--";
        circleDays.textContent = "--";
        circleDays.nextElementSibling.textContent = "Days";
        predictionDate.innerHTML = `Log your periods to get predictions!`;
    }

    setLogFormDate(selectedLogDate);
}

function setLogFormDate(date) {
    const dateStr = formatDate(date);
    logDateInput.value = dateStr;

    const todayStr = formatDate(new Date());
    logDateDisplay.textContent = dateStr === todayStr ? "Today" : date.toLocaleDateString();

    const logData = periodData[dateStr] || { pain: 0, flow: 'none', mood: 'none', notes: '' };
    logPain.value = logData.pain;
    logFlow.value = logData.flow;
    logMood.value = logData.mood || 'none';
    logNotes.value = logData.notes;
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    calendarMonthYear.textContent = firstDay.toLocaleDateString('default', { month: 'long', year: 'numeric' });

    // Clear previous days (keep day names)
    const daysToRemove = calendarGrid.querySelectorAll('.calendar-day');
    daysToRemove.forEach(d => d.remove());

    const { allPredictions } = calculatePredictions();
    const predictionsArray = allPredictions || [];

    const startingDay = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    const totalDays = lastDay.getDate();

    // Empty slots before 1st
    for (let i = 0; i < startingDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDiv);
    }

    const todayStr = formatDate(new Date());
    const selectedStr = formatDate(selectedLogDate);

    for (let i = 1; i <= totalDays; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = i;

        const currentCellDate = new Date(year, month, i);
        const dateStr = formatDate(currentCellDate);

        if (dateStr === todayStr) {
            dayDiv.classList.add('today');
        }
        if (dateStr === selectedStr) {
            dayDiv.classList.add('selected');
        }

        if (periodData[dateStr] && periodData[dateStr].flow !== 'none') {
            dayDiv.classList.add('period');
        } else if (periodData[dateStr]) {
            dayDiv.classList.add('symptom');
        } else if (predictionsArray.includes(dateStr)) {
            dayDiv.classList.add('predicted');
        }

        // Click to preview log for this day inside the calendar
        dayDiv.addEventListener('click', () => {
            selectedLogDate = currentCellDate;

            // Re-render calendar so selection outline updates
            renderCalendar();

            // Populate the preview panel
            calendarPreview.classList.remove('hidden');
            previewDate.textContent = currentCellDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            if (periodData[dateStr]) {
                previewContent.classList.remove('hidden');
                previewEmpty.classList.add('hidden');

                previewFlow.textContent = periodData[dateStr].flow.charAt(0).toUpperCase() + periodData[dateStr].flow.slice(1);
                previewPain.textContent = periodData[dateStr].pain;
                previewMood.textContent = periodData[dateStr].mood !== 'none' ? periodData[dateStr].mood : 'Normal';
                previewNotes.textContent = periodData[dateStr].notes ? periodData[dateStr].notes : 'None';
            } else {
                previewContent.classList.add('hidden');
                previewEmpty.classList.remove('hidden');
            }
        });

        calendarGrid.appendChild(dayDiv);
    }
}

// Game Elements and Logic
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

        if (gameAnger <= 60 && gameAnger > 30) {
            gameFace.textContent = '😠';
            gameBar.style.background = '#fca311';
            gameMessage.textContent = 'Keep smashing... letting it out!';
        } else if (gameAnger <= 30 && gameAnger > 0) {
            gameFace.textContent = '😕';
            gameBar.style.background = '#ffca3a';
            gameMessage.textContent = 'Almost gone...';
        } else if (gameAnger <= 0) {
            gameFace.textContent = '🥰';
            gameFace.classList.remove('shake');
            gameFace.classList.add('pop-in');
            gameBar.style.width = '0%';
            gameMessage.textContent = 'Ahhh... much better! You are amazing!';
            btnResetGame.classList.remove('hidden');
        }
    });

    btnResetGame.addEventListener('click', () => {
        gameAnger = 100;
        gameFace.textContent = '😡';
        gameBar.style.width = '100%';
        gameBar.style.background = '#e56b6f';
        gameMessage.textContent = 'Tap to smash the anger!';
        btnResetGame.classList.add('hidden');
        gameFace.classList.remove('pop-in');
    });
}

// Start app
document.addEventListener('DOMContentLoaded', init);
