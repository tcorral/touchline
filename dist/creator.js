import { BUILTIN_TACTICS, parseTacticDefinition } from './tactics.js';
import { matchesAnyLocale, onLocaleChange, t } from './i18n.js';
const formation = [[-145, 0, 7], [-105, -70, 6], [-115, -25, 7], [-115, 25, 7], [-105, 70, 6], [-45, -55, 5], [-35, 0, 6], [-45, 55, 5], [65, -50, 5], [80, 0, 6], [65, 50, 5]];
let colors = ['#e8d84a', '#237d58', '#ffffff'];
let steps = [{ op: 'formation' }, { op: 'chase' }, { op: 'keeper' }];
let selectedPlayer = 0;
const nameInput = document.querySelector('#tactic-name');
const tacticPresetSelect = document.querySelector('#tactic-template');
const loadTemplateButton = document.querySelector('#load-template');
const colorInputs = [document.querySelector('#shirt-color'), document.querySelector('#shorts-color'), document.querySelector('#number-color')];
const presetSelect = document.querySelector('#formation-preset');
const canvas = document.querySelector('#formation-pitch');
const context = canvas.getContext('2d');
const playerList = document.querySelector('#player-list');
const xInput = document.querySelector('#player-x'), yInput = document.querySelector('#player-y'), strengthInput = document.querySelector('#player-strength');
const stepList = document.querySelector('#step-list');
const preview = document.querySelector('#json-preview');
const status = document.querySelector('#save-status');
const pitch = { left: 27, top: 22, width: 666, height: 406 };
const presets = { '4-3-3': [4, 3, 3], '4-4-2': [4, 4, 2], '3-5-2': [3, 5, 2], '5-3-2': [5, 3, 2] };
const stepLabelKeys = { formation: 'opFormation', chase: 'opChase', keeper: 'opKeeper', defend: 'opDefend', shoot: 'opShoot', pass: 'opPass', 'pass-or-shoot': 'opPassOrShoot', 'kick-space-or-shoot': 'opKickSpace' };
let statusSource = 'preview';
let statusView = { error: false, message: () => t('readyToSave') };
function paintStatus() { status.textContent = statusView.message(); status.classList.toggle('error', statusView.error); }
function showStatus(source, error, message) { statusSource = source; statusView = { error, message }; paintStatus(); }
function liveError(fallback) { return () => { try {
    parseTacticDefinition(definition());
    return t(fallback);
}
catch (error) {
    return error instanceof Error ? error.message : t(fallback);
} }; }
function pitchPoint(x, y) { return { x: pitch.left + (x + 160) / 320 * pitch.width, y: pitch.top + (y + 120) / 240 * pitch.height }; }
function drawPitch() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#287444';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#b8d69b';
    context.lineWidth = 2;
    context.strokeRect(pitch.left, pitch.top, pitch.width, pitch.height);
    context.beginPath();
    context.moveTo(pitch.left + pitch.width / 2, pitch.top);
    context.lineTo(pitch.left + pitch.width / 2, pitch.top + pitch.height);
    context.stroke();
    context.beginPath();
    context.ellipse(pitch.left + pitch.width / 2, pitch.top + pitch.height / 2, 57, 57, 0, 0, Math.PI * 2);
    context.stroke();
    context.strokeRect(pitch.left, pitch.top + pitch.height * .28, 67, pitch.height * .44);
    context.strokeRect(pitch.left + pitch.width - 67, pitch.top + pitch.height * .28, 67, pitch.height * .44);
    formation.forEach(([x, y], index) => { const p = pitchPoint(x, y); context.beginPath(); context.arc(p.x, p.y, index === selectedPlayer ? 17 : 14, 0, Math.PI * 2); context.fillStyle = index === selectedPlayer ? '#f1b84a' : colors[0]; context.fill(); context.lineWidth = 2; context.strokeStyle = '#102017'; context.stroke(); context.fillStyle = colors[2]; context.font = '700 12px DM Sans, sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(String(index + 1), p.x, p.y); });
}
function renderPlayers() {
    playerList.replaceChildren();
    formation.forEach((_, index) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'player-chip'; button.textContent = index === 0 ? t('gk') : 'P' + (index + 1); button.setAttribute('aria-label', index === 0 ? t('selectGk') : t('selectPlayerN', { n: index + 1 })); button.setAttribute('aria-pressed', String(index === selectedPlayer)); button.addEventListener('click', () => selectPlayer(index)); playerList.append(button); });
    xInput.value = String(formation[selectedPlayer][0]);
    yInput.value = String(formation[selectedPlayer][1]);
    strengthInput.value = String(formation[selectedPlayer][2]);
    drawPitch();
}
function selectPlayer(index) { selectedPlayer = index; renderPlayers(); }
function updatePlayer() { formation[selectedPlayer] = [Math.max(-160, Math.min(160, Number(xInput.value) || 0)), Math.max(-120, Math.min(120, Number(yInput.value) || 0)), Math.max(1, Math.min(10, Number(strengthInput.value) || 1))]; xInput.value = String(formation[selectedPlayer][0]); yInput.value = String(formation[selectedPlayer][1]); strengthInput.value = String(formation[selectedPlayer][2]); drawPitch(); updatePreview(); }
function arrangeFormation(value) {
    const counts = presets[value];
    if (!counts)
        return;
    formation[0] = [-145, 0, 7];
    let player = 1;
    counts.forEach((count, line) => { const x = [-105, -35, 65][line]; for (let row = 0; row < count; row++) {
        const y = (row - (count - 1) / 2) * Math.min(42, 150 / count);
        formation[player++] = [x, y, 6];
    } });
    presetSelect.value = value;
    renderPlayers();
    updatePreview();
}
function definition() { return { name: nameInput.value.trim(), colors: [colors[0], colors[1], colors[2]], formation: formation.map(row => [...row]), steps: steps.map(step => ({ ...step })) }; }
function updatePreview(preserveNotice = false) {
    const value = definition();
    preview.value = JSON.stringify(value, null, 2);
    if (preserveNotice && statusSource === 'notice') {
        paintStatus();
        return;
    }
    try {
        parseTacticDefinition(value);
        showStatus('preview', false, () => t('readyToSave'));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : t('checkDetails');
        showStatus('preview', true, () => message);
    }
}
function makeStep(op) {
    switch (op) {
        case 'formation':
        case 'chase':
        case 'keeper':
        case 'defend': return { op };
        case 'shoot': return { op, player: 'all', deviation: 0 };
        case 'pass': return { op, from: 1, to: 2 };
        case 'pass-or-shoot': return { op, whenXBelow: 80, deviation: 0 };
        case 'kick-space-or-shoot': return { op, samples: 50, whenXAbove: 50, deviation: 15 };
    }
}
function numberField(label, key, value, min = -999, max = 999) {
    const wrapper = document.createElement('label');
    wrapper.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = '1';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.dataset.key = key;
    wrapper.append(input);
    return wrapper;
}
function playerField(label, key, value) {
    const wrapper = document.createElement('label');
    wrapper.textContent = label;
    const select = document.createElement('select');
    select.dataset.key = key;
    if (key === 'player') {
        const all = document.createElement('option');
        all.value = 'all';
        all.textContent = t('allPlayers');
        select.append(all);
    }
    for (let index = 0; index < 11; index++) {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${index + 1}${index === 0 ? ' ' + t('gkParen') : ''}`;
        select.append(option);
    }
    select.value = String(value);
    wrapper.append(select);
    return wrapper;
}
function renderSteps() {
    stepList.replaceChildren();
    steps.forEach((step, index) => {
        const row = document.createElement('article');
        row.className = 'step-row';
        row.dataset.index = String(index);
        const top = document.createElement('div');
        top.className = 'step-top';
        const number = document.createElement('span');
        number.className = 'step-number';
        number.textContent = String(index + 1).padStart(2, '0');
        const op = document.createElement('select');
        op.className = 'step-op';
        op.setAttribute('aria-label', t('stepAction', { n: index + 1 }));
        Object.keys(stepLabelKeys).forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = t(stepLabelKeys[value]); op.append(option); });
        op.value = step.op;
        op.addEventListener('change', () => { steps[index] = makeStep(op.value); renderSteps(); updatePreview(); });
        const actions = document.createElement('div');
        actions.className = 'step-actions';
        for (const [key, offset, symbol] of [['moveUp', -1, '↑'], ['moveDown', 1, '↓'], ['removeStep', 0, '×']]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = symbol;
            button.setAttribute('aria-label', t(key));
            button.disabled = key === 'moveUp' ? index === 0 : key === 'moveDown' ? index === steps.length - 1 : false;
            button.addEventListener('click', () => { if (key === 'removeStep') {
                steps.splice(index, 1);
            }
            else {
                const target = index + offset;
                [steps[index], steps[target]] = [steps[target], steps[index]];
            } renderSteps(); updatePreview(); });
            actions.append(button);
        }
        top.append(number, op, actions);
        row.append(top);
        const fields = document.createElement('div');
        fields.className = 'step-fields';
        switch (step.op) {
            case 'shoot':
                fields.append(playerField(t('shooter'), 'player', step.player), numberField(t('deviation'), 'deviation', step.deviation, -120, 120));
                break;
            case 'pass':
                fields.append(playerField(t('from'), 'from', step.from), playerField(t('to'), 'to', step.to));
                break;
            case 'pass-or-shoot':
                fields.append(numberField(t('passBelowX'), 'whenXBelow', step.whenXBelow, -160, 160), numberField(t('shotDeviation'), 'deviation', step.deviation, -120, 120));
                break;
            case 'kick-space-or-shoot':
                fields.append(numberField(t('searchSamples'), 'samples', step.samples, 1, 500), numberField(t('shootAboveX'), 'whenXAbove', step.whenXAbove, -160, 160), numberField(t('deviation'), 'deviation', step.deviation, -120, 120));
                break;
        }
        if (fields.childElementCount)
            row.append(fields);
        stepList.append(row);
    });
}
function updateStepField(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement) || !target.dataset.key)
        return;
    const index = Number(target.closest('.step-row')?.dataset.index);
    if (!Number.isInteger(index) || !steps[index])
        return;
    const key = target.dataset.key;
    const value = target instanceof HTMLSelectElement && target.value === 'all' ? 'all' : Number(target.value);
    steps[index] = { ...steps[index], [key]: value };
    updatePreview();
}
function saveTactic() {
    try {
        const tactic = parseTacticDefinition(definition());
        const saved = JSON.parse(localStorage.getItem('football-custom-tactics') ?? '[]');
        const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        saved.push({ id, definition: tactic });
        localStorage.setItem('football-custom-tactics', JSON.stringify(saved));
        showStatus('notice', false, () => t('savedReady', { name: tactic.name }));
    }
    catch {
        showStatus('notice', true, liveError('couldNotSave'));
    }
}
function applyTemplate(template) {
    nameInput.value = t('nameCopy', { name: template.name });
    colors = [...template.colors];
    colorInputs.forEach((input, index) => input.value = colors[index]);
    formation.splice(0, formation.length, ...template.formation.map(row => [...row]));
    steps = template.steps.map(step => ({ ...step }));
    selectedPlayer = 0;
    presetSelect.value = 'custom';
    renderPlayers();
    renderSteps();
    updatePreview();
    showStatus('notice', false, () => t('loadedCopy', { name: template.name }));
}
async function loadBuiltinTemplates() {
    try {
        const templates = await Promise.all(BUILTIN_TACTICS.map(async (url) => {
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(t('couldNotLoadUrl', { url }));
            return { url, definition: parseTacticDefinition(await response.json()) };
        }));
        templates.forEach(({ url, definition }) => { const option = document.createElement('option'); option.value = url; option.textContent = definition.name; tacticPresetSelect.append(option); });
        loadTemplateButton.disabled = false;
    }
    catch (error) {
        showStatus('notice', true, () => error instanceof Error ? error.message : t('missingBuiltin'));
    }
}
loadTemplateButton.addEventListener('click', () => {
    const url = tacticPresetSelect.value;
    if (!url)
        return;
    fetch(url).then(response => { if (!response.ok)
        throw new Error(t('couldNotLoadUrl', { url })); return response.json(); })
        .then(value => applyTemplate(parseTacticDefinition(value)))
        .catch(error => { showStatus('notice', true, () => error instanceof Error ? error.message : t('couldNotLoadTactic')); });
});
function downloadTactic() {
    try {
        const tactic = parseTacticDefinition(definition());
        const blob = new Blob([JSON.stringify(tactic, null, 2) + '\n'], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const slug = tactic.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        link.download = `${slug || 'tactic'}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showStatus('notice', false, () => t('downloaded'));
    }
    catch {
        showStatus('notice', true, liveError('couldNotDownload'));
    }
}
canvas.addEventListener('pointerdown', event => {
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left) * canvas.width / rect.width, py = (event.clientY - rect.top) * canvas.height / rect.height;
    let closest = -1, best = 24;
    formation.forEach(([x, y], index) => { const p = pitchPoint(x, y), distance = Math.hypot(p.x - px, p.y - py); if (distance < best) {
        closest = index;
        best = distance;
    } });
    if (closest >= 0) {
        selectPlayer(closest);
        canvas.setPointerCapture(event.pointerId);
        canvas.dataset.dragging = 'true';
    }
});
canvas.addEventListener('pointermove', event => { if (canvas.dataset.dragging !== 'true')
    return; const rect = canvas.getBoundingClientRect(), px = (event.clientX - rect.left) * canvas.width / rect.width, py = (event.clientY - rect.top) * canvas.height / rect.height; formation[selectedPlayer] = [Math.round(Math.max(-160, Math.min(160, (px - pitch.left) / pitch.width * 320 - 160))), Math.round(Math.max(-120, Math.min(120, (py - pitch.top) / pitch.height * 240 - 120))), formation[selectedPlayer][2]]; xInput.value = String(formation[selectedPlayer][0]); yInput.value = String(formation[selectedPlayer][1]); drawPitch(); updatePreview(); });
canvas.addEventListener('pointerup', () => { canvas.dataset.dragging = 'false'; });
canvas.addEventListener('pointercancel', () => { canvas.dataset.dragging = 'false'; });
[xInput, yInput, strengthInput].forEach(input => input.addEventListener('input', updatePlayer));
colorInputs.forEach((input, index) => input.addEventListener('input', () => { colors[index] = input.value; drawPitch(); updatePreview(); }));
nameInput.addEventListener('input', () => updatePreview());
presetSelect.addEventListener('change', () => arrangeFormation(presetSelect.value));
stepList.addEventListener('input', updateStepField);
stepList.addEventListener('change', updateStepField);
document.querySelector('#add-step').addEventListener('click', () => { steps.push(makeStep('formation')); renderSteps(); updatePreview(); });
document.querySelector('#save-tactic').addEventListener('click', saveTactic);
document.querySelector('#download-tactic').addEventListener('click', downloadTactic);
if (matchesAnyLocale('defaultTacticName', nameInput.value))
    nameInput.value = t('defaultTacticName');
onLocaleChange(() => { if (matchesAnyLocale('defaultTacticName', nameInput.value))
    nameInput.value = t('defaultTacticName'); renderPlayers(); renderSteps(); updatePreview(true); });
renderPlayers();
renderSteps();
updatePreview();
void loadBuiltinTemplates();
