const STORAGE_KEY = 'gemeenteconnect-ux-analytics-v1';

const showBadButton = document.getElementById('showBad');
const showGoodButton = document.getElementById('showGood');
const showDashboardButton = document.getElementById('showDashboard');
const resetSessionButton = document.getElementById('resetSession');
const topSwitchToggle = document.getElementById('topSwitchToggle');
const topSwitch = document.querySelector('.top-switch');
const researcherDashboard = document.getElementById('researcherDashboard');
const analyticsActiveVersion = document.getElementById('analyticsActiveVersion');
const badVersion = document.getElementById('badVersion');
const goodVersion = document.getElementById('goodVersion');
const badMobileMenuToggle = document.getElementById('badMobileMenuToggle');
const badNavShell = document.getElementById('badNavShell');
const responsiveMobileQuery = window.matchMedia('(max-width: 600px)');

let badMobileChaosTimer = null;

const versionConfig = {
    bad: {
        label: 'Slechte UX-versie',
        root: badVersion,
        defaultPanel: 'info'
    },
    good: {
        label: 'Goede UX-versie',
        root: goodVersion,
        defaultPanel: 'home'
    }
};

const analyticsState = loadAnalyticsState();

showBadButton.addEventListener('click', () => {
    setActiveVersion('bad');
});

showGoodButton.addEventListener('click', () => {
    setActiveVersion('good');
});

if (showDashboardButton && researcherDashboard) {
    showDashboardButton.addEventListener('click', toggleDashboard);
}

if (resetSessionButton) {
    resetSessionButton.addEventListener('click', resetSession);
}

if (topSwitchToggle && topSwitch) {
    topSwitch.classList.add('is-hidden');
    topSwitchToggle.addEventListener('click', toggleTopSwitch);
}

if (badMobileMenuToggle && badNavShell) {
    badMobileMenuToggle.addEventListener('click', toggleBadMobileMenu);
}

document.addEventListener('click', event => {
    const activeRoot = getActiveVersionRoot();

    if (!activeRoot || !activeRoot.contains(event.target)) {
        return;
    }

    registerClick(activeRoot.dataset.versionRoot);
}, true);

window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY) {
        return;
    }

    const restoredState = loadAnalyticsState();
    applyAnalyticsState(restoredState);
    syncShellState();
    renderAnalyticsDashboard();
});

window.addEventListener('resize', syncResponsiveUx);

if (typeof responsiveMobileQuery.addEventListener === 'function') {
    responsiveMobileQuery.addEventListener('change', syncResponsiveUx);
} else if (typeof responsiveMobileQuery.addListener === 'function') {
    responsiveMobileQuery.addListener(syncResponsiveUx);
}

setFormsToManualValidation();
initializeGoodValidation();
hideBadWarning();
syncShellState();
renderAnalyticsDashboard();
ensureInitialTaskState();
setInterval(renderAnalyticsDashboard, 1000);

function setActiveVersion(version) {
    analyticsState.activeVersion = version;
    analyticsState.dashboardOpen = false;
    saveAnalyticsState();
    syncShellState();
    ensureInitialTaskState();
}

function toggleDashboard() {
    analyticsState.dashboardOpen = !analyticsState.dashboardOpen;
    saveAnalyticsState();
    syncShellState();
    renderAnalyticsDashboard();
}

function resetSession() {
    localStorage.removeItem(STORAGE_KEY);

    const defaultState = createDefaultAnalyticsState();
    applyAnalyticsState(defaultState);
    syncShellState();
    renderAnalyticsDashboard();

    window.location.reload();
}

function toggleTopSwitch() {
    if (!topSwitch || !topSwitchToggle) {
        return;
    }

    const isHidden = topSwitch.classList.toggle('is-hidden');

    topSwitchToggle.textContent = isHidden ? 'Toon UX-menu' : 'Verberg UX-menu';
    topSwitchToggle.setAttribute('aria-expanded', String(!isHidden));
}

function syncShellState() {
    const isDashboardOpen = analyticsState.dashboardOpen;
    document.body.classList.toggle('dashboard-open', isDashboardOpen);

    if (researcherDashboard) {
        researcherDashboard.hidden = !isDashboardOpen;
        researcherDashboard.classList.toggle('active', isDashboardOpen);
    }

    if (showBadButton) {
        showBadButton.classList.toggle('active', !isDashboardOpen && analyticsState.activeVersion === 'bad');
    }

    if (showGoodButton) {
        showGoodButton.classList.toggle('active', !isDashboardOpen && analyticsState.activeVersion === 'good');
    }

    if (showDashboardButton) {
        showDashboardButton.classList.toggle('active', isDashboardOpen);
    }

    if (versionConfig.bad.root) {
        versionConfig.bad.root.classList.toggle('active', !isDashboardOpen && analyticsState.activeVersion === 'bad');
    }

    if (versionConfig.good.root) {
        versionConfig.good.root.classList.toggle('active', !isDashboardOpen && analyticsState.activeVersion === 'good');
    }

    updateActiveVersionLabel();
    syncResponsiveUx();
}

function updateActiveVersionLabel() {
    if (!analyticsActiveVersion) {
        return;
    }

    analyticsActiveVersion.textContent = versionConfig[analyticsState.activeVersion].label;
}

function setFormsToManualValidation() {
    document.querySelectorAll('form').forEach(form => {
        form.noValidate = true;
    });
}

function initializeGoodValidation() {
    document.querySelectorAll('.good-form input, .good-form select').forEach(field => {
        const messageElement = getGoodFieldMessageElement(field);

        if (!messageElement) {
            return;
        }

        field.setAttribute('aria-describedby', messageElement.id);
        field.addEventListener('input', () => validateGoodField(field));
        field.addEventListener('change', () => validateGoodField(field));
        field.addEventListener('blur', () => validateGoodField(field));
    });
}

function getGoodFieldMessageElement(field) {
    if (!field.id) {
        return null;
    }

    return document.getElementById(`${field.id}Message`);
}

function setGoodFieldState(field, message, isValid) {
    const messageElement = getGoodFieldMessageElement(field);

    if (messageElement) {
        messageElement.textContent = message;
        messageElement.classList.toggle('is-error', !isValid && Boolean(message));
        messageElement.classList.toggle('is-success', isValid && Boolean(message));
    }

    if (message) {
        field.setAttribute('aria-invalid', isValid ? 'false' : 'true');
    } else {
        field.setAttribute('aria-invalid', 'false');
    }

    return isValid;
}

function validateGoodField(field) {
    if (!field || !field.id) {
        return true;
    }

    const value = field.value.trim();
    let isValid = true;
    let message = 'Correct ingevuld.';

    switch (field.id) {
        case 'goodService':
        case 'goodTime':
        case 'docType':
        case 'changeAction':
            isValid = value.length > 0;
            message = isValid ? 'Correct ingevuld.' : 'Maak een keuze.';
            break;
        case 'goodName': {
            const nameParts = value.split(/\s+/).filter(Boolean);
            isValid = nameParts.length >= 2 && nameParts.every(part => part.length >= 2);
            message = isValid ? 'Naam is in orde.' : 'Gebruik minstens voor- en familienaam.';
            break;
        }
        case 'goodDate': {
            if (!value) {
                isValid = false;
                message = 'Kies een datum.';
                break;
            }

            const selectedDate = new Date(`${value}T00:00:00`);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            isValid = selectedDate > today;
            message = isValid ? 'Datum ligt in de toekomst.' : 'De datum moet in de toekomst liggen.';
            break;
        }
        case 'oldAddress':
        case 'newAddress':
            isValid = value.length >= 10;
            message = isValid ? 'Adres is duidelijk genoeg.' : 'Schrijf het volledige adres uit.';
            break;
        case 'moveDate': {
            if (!value) {
                isValid = false;
                message = 'Kies een verhuisdatum.';
                break;
            }

            const selectedMoveDate = new Date(`${value}T00:00:00`);
            const todayMove = new Date();
            todayMove.setHours(0, 0, 0, 0);
            isValid = selectedMoveDate >= todayMove;
            message = isValid ? 'Verhuisdatum is geldig.' : 'De verhuisdatum mag niet in het verleden liggen.';
            break;
        }
        case 'docReason':
            isValid = value.length >= 8;
            message = isValid ? 'Reden is duidelijk.' : 'Geef een iets uitgebreidere reden op.';
            break;
        case 'bookingCode':
            isValid = /^GEM-\d{4}-\d{4}$/.test(value);
            message = isValid ? 'Afspraakcode klopt.' : 'Gebruik het formaat GEM-2026-1234.';
            break;
        default:
            isValid = true;
            message = '';
    }

    return setGoodFieldState(field, message, isValid);
}

function validateGoodForm(form) {
    const fields = Array.from(form.querySelectorAll('input, select'));
    let firstInvalidField = null;
    let isValid = true;

    fields.forEach(field => {
        const fieldIsValid = validateGoodField(field);

        if (!fieldIsValid) {
            isValid = false;

            if (!firstInvalidField) {
                firstInvalidField = field;
            }
        }
    });

    return {
        isValid,
        firstInvalidField
    };
}

function getBadFormErrorMessage(formKind, form) {
    switch (formKind) {
        case 'appointment': {
            const procedure = form.querySelector('#badAppointmentProcedure');
            const nameField = form.querySelector('#badAppointmentName');
            const dateField = form.querySelector('#badAppointmentDate');
            const timeField = form.querySelector('#badAppointmentTime');

            if (!procedure || !procedure.value) {
                return 'Foutcode 401: Procedure token ontbreekt.';
            }

            if (!nameField || nameField.value.trim().length < 6) {
                return 'Foutcode 403: String constraints violated.';
            }

            if (!dateField || !dateField.value) {
                return 'Foutcode 412: Temporal stamp missing.';
            }

            const selectedDate = new Date(`${dateField.value}T00:00:00`);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate <= today) {
                return 'Foutcode 412: Temporal order mismatch.';
            }

            if (!timeField || !timeField.value) {
                return 'Foutcode 422: Slot matrix rejected.';
            }

            return '';
        }
        case 'move': {
            const oldAddress = form.querySelector('#badOldAddress');
            const newAddress = form.querySelector('#badNewAddress');
            const moveDate = form.querySelector('#badMoveDate');
            const familySelect = form.querySelector('#badFamilySelect');

            if (!oldAddress || oldAddress.value.trim().length < 10) {
                return 'Foutcode 428: Origin address vector incomplete.';
            }

            if (!newAddress || newAddress.value.trim().length < 10) {
                return 'Foutcode 428: Destination address vector incomplete.';
            }

            if (!moveDate || !moveDate.value) {
                return 'Foutcode 409: Spatial timestamp missing.';
            }

            const selectedMoveDate = new Date(`${moveDate.value}T00:00:00`);
            const todayMove = new Date();
            todayMove.setHours(0, 0, 0, 0);
            if (selectedMoveDate < todayMove) {
                return 'Foutcode 409: Temporal relocation mismatch.';
            }

            if (!familySelect || !familySelect.value) {
                return 'Foutcode 428: Family-state flag absent.';
            }

            return '';
        }
        case 'docs': {
            const documentType = form.querySelector('#badDocumentType');
            const reasonField = form.querySelector('#badDocReason');

            if (!documentType || !documentType.value) {
                return 'Foutcode 451: Document ontology unresolved.';
            }

            if (!reasonField || reasonField.value.trim().length < 8) {
                return 'Foutcode 451: Semantic payload too short.';
            }

            return '';
        }
        case 'change': {
            const bookingCode = form.querySelector('#badBookingCode');
            const actionSelect = form.querySelector('#badChangeAction');

            if (!bookingCode || !/^GEM-\d{4}-\d{4}$/.test(bookingCode.value.trim())) {
                return 'Foutcode 409: Reservation token mismatch.';
            }

            if (!actionSelect || !actionSelect.value) {
                return 'Foutcode 422: Action vector missing.';
            }

            return '';
        }
        default:
            return 'Foutcode 400: Unknown form topology.';
    }
}

function showBadWarning(message) {
    const warning = document.getElementById('badWarning');

    if (!warning) {
        return;
    }

    warning.textContent = message;
    warning.classList.add('visible');
}

function hideBadWarning() {
    const warning = document.getElementById('badWarning');

    if (!warning) {
        return;
    }

    warning.classList.remove('visible');
}

function revealSuccessFeedback(feedbackId) {
    const feedback = document.getElementById(feedbackId);

    if (!feedback) {
        return;
    }

    feedback.style.display = 'block';
}

function ensureInitialTaskState() {
    const activeRoot = getActiveVersionRoot();

    if (!activeRoot) {
        return;
    }

    const version = activeRoot.dataset.versionRoot;
    const versionState = getVersionState(version);

    if (!versionState.currentTask) {
        beginTask(version, versionConfig[version].defaultPanel, false);
    }
}

function getActiveVersionRoot() {
    const activeVersion = analyticsState.activeVersion;
    return document.querySelector(`.version.active [data-version-root="${activeVersion}"]`);
}

function getVersionState(version) {
    return analyticsState.versions[version] || analyticsState.versions.bad;
}

function loadAnalyticsState() {
    const defaultState = createDefaultAnalyticsState();

    try {
        const rawState = localStorage.getItem(STORAGE_KEY);

        if (!rawState) {
            return defaultState;
        }

        const parsedState = JSON.parse(rawState);

        if (!parsedState || typeof parsedState !== 'object') {
            return defaultState;
        }

        const mergedState = createDefaultAnalyticsState();

        if (versionConfig[parsedState.activeVersion]) {
            mergedState.activeVersion = parsedState.activeVersion;
        }

        mergedState.dashboardOpen = Boolean(parsedState.dashboardOpen);

        Object.keys(mergedState.versions).forEach(version => {
            const savedVersionState = parsedState.versions && parsedState.versions[version] ? parsedState.versions[version] : {};
            const targetVersionState = mergedState.versions[version];

            targetVersionState.interactionErrors = Number(savedVersionState.interactionErrors) || 0;
            targetVersionState.timeOnTaskMs = Number(savedVersionState.timeOnTaskMs) || 0;
            targetVersionState.clickCount = Number(savedVersionState.clickCount) || 0;
            targetVersionState.currentTask = sanitizeTask(savedVersionState.currentTask);
        });

        return mergedState;
    } catch {
        return defaultState;
    }
}

function createDefaultAnalyticsState() {
    return {
        activeVersion: 'bad',
        dashboardOpen: false,
        versions: {
            bad: createVersionState('Slechte UX-versie'),
            good: createVersionState('Goede UX-versie')
        }
    };
}

function createVersionState(label) {
    return {
        label,
        interactionErrors: 0,
        timeOnTaskMs: 0,
        clickCount: 0,
        currentTask: null
    };
}

function sanitizeTask(task) {
    if (!task || typeof task !== 'object') {
        return null;
    }

    const startedAt = Number(task.startedAt);

    if (!Number.isFinite(startedAt)) {
        return null;
    }

    return {
        label: typeof task.label === 'string' && task.label.trim() ? task.label.trim() : 'Onbekende taak',
        startedAt
    };
}

function saveAnalyticsState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(analyticsState));
    } catch {
        // Storage may be unavailable in private mode or restricted environments.
    }
}

function applyAnalyticsState(nextState) {
    analyticsState.activeVersion = nextState.activeVersion;
    analyticsState.dashboardOpen = nextState.dashboardOpen;

    Object.keys(analyticsState.versions).forEach(version => {
        analyticsState.versions[version] = nextState.versions[version];
    });
}

function beginTask(version, taskLabel, shouldPersist = true) {
    const versionState = getVersionState(version);
    versionState.currentTask = {
        label: taskLabel,
        startedAt: Date.now()
    };
    if (shouldPersist) {
        saveAnalyticsState();
    }
    renderAnalyticsDashboard();
}

function completeTask(version) {
    const versionState = getVersionState(version);

    if (!versionState.currentTask) {
        return;
    }

    versionState.timeOnTaskMs += Date.now() - versionState.currentTask.startedAt;
    versionState.currentTask = null;
    saveAnalyticsState();
    renderAnalyticsDashboard();
}

function registerError(version) {
    const versionState = getVersionState(version);
    versionState.interactionErrors += 1;
    saveAnalyticsState();
    renderAnalyticsDashboard();
}

function registerClick(version) {
    const versionState = getVersionState(version);
    versionState.clickCount += 1;
    saveAnalyticsState();
    renderAnalyticsDashboard();
}

function formatDuration(milliseconds) {
    const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));

    if (totalSeconds < 60) {
        return `${totalSeconds} sec`;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes < 60) {
        return `${minutes} min ${seconds} sec`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} u ${remainingMinutes} min`;
}

function getLiveTaskText(version) {
    const versionState = getVersionState(version);

    if (!versionState.currentTask) {
        return 'Geen actieve taak';
    }

    const elapsedMilliseconds = Date.now() - versionState.currentTask.startedAt;
    return `${versionState.currentTask.label} (${formatDuration(elapsedMilliseconds)})`;
}

function renderAnalyticsDashboard() {
    if (analyticsActiveVersion) {
        updateActiveVersionLabel();
    }

    const renderTargets = {
        bad: {
            errors: document.getElementById('analyticsErrorsBad'),
            time: document.getElementById('analyticsTimeBad'),
            clicks: document.getElementById('analyticsClicksBad'),
            task: document.getElementById('analyticsTaskBad')
        },
        good: {
            errors: document.getElementById('analyticsErrorsGood'),
            time: document.getElementById('analyticsTimeGood'),
            clicks: document.getElementById('analyticsClicksGood'),
            task: document.getElementById('analyticsTaskGood')
        }
    };

    Object.keys(renderTargets).forEach(version => {
        const versionState = getVersionState(version);
        const target = renderTargets[version];

        if (target.errors) {
            target.errors.textContent = String(versionState.interactionErrors);
        }

        if (target.time) {
            const totalMilliseconds = versionState.timeOnTaskMs + (versionState.currentTask ? Date.now() - versionState.currentTask.startedAt : 0);
            target.time.textContent = formatDuration(totalMilliseconds);
        }

        if (target.clicks) {
            target.clicks.textContent = String(versionState.clickCount);
        }

        if (target.task) {
            target.task.textContent = getLiveTaskText(version);
        }
    });
}

function badShow(panelName, options = {}) {
    analyticsState.activeVersion = 'bad';
    analyticsState.dashboardOpen = false;
    saveAnalyticsState();
    syncShellState();

    document.querySelectorAll('.bad-panel').forEach(panel => {
        panel.style.display = 'none';
    });

    const target = document.getElementById('bad-' + panelName);
    if (target) {
        target.style.display = 'block';
    }

    if (options.trackTask !== false) {
        beginTask('bad', panelName);
    }

    renderAnalyticsDashboard();
}

function badSubmit(event, resultId) {
    event.preventDefault();

    const form = event.currentTarget;
    const formKind = form.dataset.formKind || 'unknown';
    const errorMessage = getBadFormErrorMessage(formKind, form);

    if (errorMessage) {
        registerError('bad');
        showBadWarning(errorMessage);
        const warning = document.getElementById('badWarning');

        if (warning) {
            warning.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return false;
    }

    hideBadWarning();
    completeTask('bad');
    revealSuccessFeedback(resultId);
    return false;
}

function goodShow(sectionName, options = {}) {
    resetGoodSectionState();
    analyticsState.activeVersion = 'good';
    analyticsState.dashboardOpen = false;
    saveAnalyticsState();
    syncShellState();

    document.querySelectorAll('.good-section').forEach(section => {
        section.classList.remove('active');
    });

    const target = document.getElementById('good-' + sectionName);
    if (target) {
        target.classList.add('active');
        target.style.removeProperty('display');
    }

    document.querySelectorAll('.good-nav button').forEach(button => {
        button.classList.remove('active');
    });
    syncGoodNavigation(sectionName);

    if (options.trackTask !== false) {
        beginTask('good', sectionName);
    }

    renderAnalyticsDashboard();
}

function goodSubmit(event, feedbackId) {
    event.preventDefault();

    const form = event.currentTarget;
    const validation = validateGoodForm(form);

    if (!validation.isValid) {
        registerError('good');

        if (validation.firstInvalidField) {
            validation.firstInvalidField.focus();
            validation.firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return false;
    }

    completeTask('good');
    const section = form.closest('.good-section');
    const successScreen = section ? section.querySelector(`#${feedbackId}`) : document.getElementById(feedbackId);

    form.style.display = 'none';

    if (successScreen) {
        successScreen.style.display = 'block';
    }

    const card = form.closest('.good-card') || section;

    if (card && typeof card.scrollIntoView === 'function') {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    return false;
}

function resetGoodSectionState() {
    document.querySelectorAll('.good-section').forEach(section => {
        const form = section.querySelector('.good-form');
        const successScreen = section.querySelector('.good-success-screen');

        if (form) {
            form.reset();
            form.style.display = '';
        }

        if (successScreen) {
            successScreen.style.display = 'none';
        }

        section.querySelectorAll('.good-field-message').forEach(messageElement => {
            messageElement.textContent = '';
            messageElement.classList.remove('is-error', 'is-success');
        });

        section.querySelectorAll('.good-form input, .good-form select').forEach(field => {
            field.setAttribute('aria-invalid', 'false');
        });
    });
}

function syncResponsiveUx() {
    const isMobile = responsiveMobileQuery.matches;
    const badMobileActive = isMobile && analyticsState.activeVersion === 'bad' && !analyticsState.dashboardOpen;
    const goodMobileActive = isMobile && analyticsState.activeVersion === 'good' && !analyticsState.dashboardOpen;

    if (badVersion) {
        badVersion.classList.toggle('mobile-bad', badMobileActive);
    }

    if (goodVersion) {
        goodVersion.classList.toggle('mobile-good', goodMobileActive);
    }

    syncBadMobileMenuState(badMobileActive);
    syncBadMobileFields(badMobileActive);
    syncGoodNavigation(getActiveGoodSectionName());
}

function getActiveGoodSectionName() {
    const activeSection = document.querySelector('.good-section.active');

    if (!activeSection || !activeSection.id) {
        return 'home';
    }

    return activeSection.id.replace('good-', '') || 'home';
}

function syncGoodNavigation(sectionName) {
    document.querySelectorAll('.good-nav button[data-section], .good-mobile-nav button[data-section]').forEach(button => {
        button.classList.toggle('active', button.dataset.section === sectionName);
    });
}

function syncBadMobileMenuState(isEnabled) {
    if (!badNavShell || !badMobileMenuToggle) {
        return;
    }

    if (!isEnabled) {
        stopBadMobileChaos();
        closeBadMobileMenu(true);
        resetBadMobileMenuPosition();
        return;
    }

    if (badNavShell.classList.contains('is-open')) {
        positionBadMobileMenu();
    }

    scheduleBadMobileChaos();
}

function syncBadMobileFields(isEnabled) {
    const mobileDateFields = document.querySelectorAll('#badAppointmentDate, #badMoveDate');

    mobileDateFields.forEach(field => {
        if (!field.dataset.desktopType) {
            field.dataset.desktopType = field.type;
        }

        if (!field.dataset.desktopPlaceholder) {
            field.dataset.desktopPlaceholder = field.getAttribute('placeholder') || '';
        }

        if (isEnabled) {
            field.type = 'text';
            field.inputMode = 'text';
            field.placeholder = 'dd/mm/jjjj';
        } else {
            field.type = field.dataset.desktopType || 'date';
            field.inputMode = 'numeric';
            field.placeholder = field.dataset.desktopPlaceholder;
        }
    });
}

function openBadMobileMenu() {
    if (!badNavShell || !badMobileMenuToggle) {
        return;
    }

    badNavShell.classList.add('is-open');
    badMobileMenuToggle.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(positionBadMobileMenu);
}

function closeBadMobileMenu(skipReset = false) {
    if (!badNavShell || !badMobileMenuToggle) {
        return;
    }

    badNavShell.classList.remove('is-open');
    badMobileMenuToggle.setAttribute('aria-expanded', 'false');

    if (!skipReset) {
        resetBadMobileMenuPosition();
    }
}

function toggleBadMobileMenu() {
    if (!badNavShell || !badMobileMenuToggle || !responsiveMobileQuery.matches || analyticsState.activeVersion !== 'bad') {
        return;
    }

    if (badNavShell.classList.contains('is-open')) {
        closeBadMobileMenu();
    } else {
        openBadMobileMenu();
    }

    scheduleBadMobileChaos();
}

function positionBadMobileMenu() {
    if (!badNavShell || !badNavShell.classList.contains('is-open')) {
        return;
    }

    const menuRect = badNavShell.getBoundingClientRect();
    const menuWidth = menuRect.width || 180;
    const menuHeight = menuRect.height || 140;
    const maxLeft = Math.max(12, window.innerWidth - menuWidth - 12);
    const maxTop = Math.max(12, window.innerHeight - menuHeight - 12);
    const useLeftEdge = Math.random() > 0.5;
    const left = Math.floor(Math.random() * maxLeft);
    const top = Math.floor(Math.random() * maxTop);

    badNavShell.style.position = 'fixed';
    badNavShell.style.top = `${top}px`;
    badNavShell.style.left = useLeftEdge ? `${left}px` : 'auto';
    badNavShell.style.right = useLeftEdge ? 'auto' : `${Math.floor(Math.random() * 18) + 8}px`;
    badNavShell.style.bottom = 'auto';
    badNavShell.style.transform = `rotate(${Math.floor(Math.random() * 5) - 2}deg)`;
}

function resetBadMobileMenuPosition() {
    if (!badNavShell) {
        return;
    }

    badNavShell.style.position = '';
    badNavShell.style.top = '';
    badNavShell.style.left = '';
    badNavShell.style.right = '';
    badNavShell.style.bottom = '';
    badNavShell.style.transform = '';
}

function scheduleBadMobileChaos() {
    stopBadMobileChaos();

    if (!badNavShell || !badMobileMenuToggle || !responsiveMobileQuery.matches || analyticsState.activeVersion !== 'bad') {
        return;
    }

    badMobileChaosTimer = window.setTimeout(() => {
        if (!badNavShell || !responsiveMobileQuery.matches || analyticsState.activeVersion !== 'bad') {
            return;
        }

        const shouldOpen = Math.random() > 0.45;

        if (shouldOpen) {
            openBadMobileMenu();
        } else {
            closeBadMobileMenu();
        }

        scheduleBadMobileChaos();
    }, 1300 + Math.floor(Math.random() * 1800));
}

function stopBadMobileChaos() {
    if (badMobileChaosTimer) {
        clearTimeout(badMobileChaosTimer);
        badMobileChaosTimer = null;
    }
}
