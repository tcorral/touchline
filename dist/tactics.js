import { clamp, distance } from './engine.js';
import { t } from './i18n.js';
export const BUILTIN_TACTICS = ['tactics/demo01.json', 'tactics/demo02.json', 'tactics/pepe.json', 'tactics/juan.json', 'tactics/ana.json'];
export function loadTactic(value) {
    return compileTactic(parseTacticDefinition(value));
}
export function compileTactic(definition) {
    const formation = definition.formation.map(row => [...row]);
    const steps = definition.steps.map(step => ({ ...step }));
    return {
        name: definition.name,
        colors: [...definition.colors],
        formation,
        commands(situation, random) {
            const commands = [];
            for (const step of steps)
                applyStep(step, formation, situation, random, commands);
            return commands;
        }
    };
}
function applyStep(step, formation, s, random, commands) {
    switch (step.op) {
        case 'formation':
            formation.forEach(([x, y], player) => commands.push({ kind: 'move', player, x, y }));
            return;
        case 'chase':
            commands.push({ kind: 'move', player: s.closestBall(), ...s.ball });
            return;
        case 'keeper':
            commands.push({ kind: 'move', player: 0, x: formation[0][0], y: clamp(Math.trunc(s.ball.y / 2), -20, 20) });
            return;
        case 'defend':
            if (!s.closer() || s.ball.x < 0)
                for (let i = 1; i < 4; i++) {
                    const mark = s.opponents[s.nearest(s.opponents, { x: formation[i][0], y: formation[i][1] })[0]];
                    commands.push({ kind: 'move', player: i, x: mark.x + 10, y: mark.y });
                }
            return;
        case 'shoot':
            if (step.player === 'all') {
                for (let i = 0; i < 11; i++)
                    commands.push({ kind: 'shoot', player: i, deviation: step.deviation });
            }
            else
                commands.push({ kind: 'shoot', player: step.player, deviation: step.deviation });
            return;
        case 'pass':
            commands.push({ kind: 'pass', player: step.from, to: step.to });
            return;
        case 'pass-or-shoot':
            for (let i = 0; i < 11; i++)
                commands.push(s.own[i].x < step.whenXBelow ? { kind: 'pass', player: i, to: s.nextPlayer(i) } : { kind: 'shoot', player: i, deviation: step.deviation });
            return;
        case 'kick-space-or-shoot': {
            let best = 9999999, x = 0, y = 0;
            for (let i = 0; i < step.samples; i++) {
                const xx = Math.trunc(random() * 340) - 170, yy = Math.trunc(random() * 240) - 120;
                let score = yy * 5 - xx * 100;
                for (const player of s.own)
                    if (Math.trunc(distance({ x: xx, y: yy }, player)) < 70)
                        score -= 1000;
                for (const player of s.opponents)
                    if (Math.trunc(distance({ x: xx, y: yy }, player)) < 70)
                        score += 1000;
                if (best > score) {
                    best = score;
                    x = xx;
                    y = yy;
                }
            }
            for (let i = 0; i < 11; i++)
                commands.push(s.own[i].x > step.whenXAbove ? { kind: 'shoot', player: i, deviation: step.deviation } : { kind: 'kick', player: i, x, y });
        }
    }
}
export function parseTacticDefinition(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error(t('errObject'));
    const raw = value;
    if (typeof raw.name !== 'string' || !raw.name.trim())
        throw new Error(t('errName'));
    if (!Array.isArray(raw.colors) || raw.colors.length !== 3 || raw.colors.some(color => typeof color !== 'string' || !color.trim())) {
        throw new Error(t('errColors'));
    }
    if (!Array.isArray(raw.formation) || raw.formation.length !== 11)
        throw new Error(t('errFormation'));
    const formation = raw.formation.map((row, index) => {
        if (!Array.isArray(row) || row.length !== 3 || row.some(n => typeof n !== 'number' || !Number.isFinite(n))) {
            throw new Error(t('errPlayer', { n: index + 1 }));
        }
        return [row[0], row[1], row[2]];
    });
    if (!Array.isArray(raw.steps) || raw.steps.length === 0)
        throw new Error(t('errSteps'));
    return {
        name: raw.name.trim(),
        colors: [raw.colors[0], raw.colors[1], raw.colors[2]],
        formation,
        steps: raw.steps.map((step, index) => parseStep(step, index))
    };
}
function parseStep(value, index) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.op !== 'string') {
        throw new Error(t('errStepOp', { n: index + 1 }));
    }
    const step = value;
    const stepLabel = t('stepN', { n: index + 1 });
    switch (step.op) {
        case 'formation':
        case 'chase':
        case 'keeper':
        case 'defend':
            return { op: step.op };
        case 'shoot':
            return { op: 'shoot', player: step.player === 'all' ? 'all' : playerIndex(step.player, t('labelPlayer', { step: stepLabel })), deviation: finiteNumber(step.deviation, t('labelDeviation', { step: stepLabel })) };
        case 'pass':
            return { op: 'pass', from: playerIndex(step.from, t('labelPasser', { step: stepLabel })), to: playerIndex(step.to, t('labelReceiver', { step: stepLabel })) };
        case 'pass-or-shoot':
            return { op: 'pass-or-shoot', whenXBelow: finiteNumber(step.whenXBelow, t('labelLine', { step: stepLabel })), deviation: finiteNumber(step.deviation, t('labelDeviation', { step: stepLabel })) };
        case 'kick-space-or-shoot':
            return { op: 'kick-space-or-shoot', samples: sampleCount(step.samples), whenXAbove: finiteNumber(step.whenXAbove, t('labelLine', { step: stepLabel })), deviation: finiteNumber(step.deviation, t('labelDeviation', { step: stepLabel })) };
        default:
            throw new Error(t('errUnknown', { op: String(step.op) }));
    }
}
function playerIndex(value, label) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 10)
        throw new Error(t('errPlayerIndex', { label }));
    return value;
}
function finiteNumber(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        throw new Error(t('errNumber', { label }));
    return value;
}
function sampleCount(value) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 500)
        throw new Error(t('errSamples'));
    return value;
}
