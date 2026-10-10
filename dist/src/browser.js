import { Game, Match, JavaRandom, createTactic } from './engine.js';
const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d');
const image = new Image();
image.src = 'assets/Campo.png';
const playerBase = new Image();
playerBase.src = 'assets/players-base.png';
const shirtMask = new Image();
shirtMask.src = 'assets/players-shirt-mask.png';
const shortsMask = new Image();
shortsMask.src = 'assets/players-shorts-mask.png';
let playerSheets = [];
let game, paused = false, waitUntil = 0, lastTick = 0, goalAnimationUntil = 0, goalAnimationStarted = 0;
// Simulation coordinates span x=-160..160 and y=-120..120.
// Map those limits to the actual pitch lines in the 600x400 background.
const FIELD_X_SCALE = 1.5, FIELD_Y_SCALE = 4 / 3;
const toCanvas = (x, y) => ({ x: 300 + x * FIELD_X_SCALE, y: 200 + y * FIELD_Y_SCALE });
const fromCanvas = (x, y) => ({ x: (x - 300) / FIELD_X_SCALE, y: (y - 200) / FIELD_Y_SCALE });
const selectA = document.querySelector('#a'), selectB = document.querySelector('#b');
for (const id of ['Demo01', 'Demo02', 'Pepe', 'Juan', 'Ana'])
    for (const select of [selectA, selectB]) {
        const o = document.createElement('option');
        o.value = id;
        o.textContent = createTactic(id).name;
        select.append(o);
    }
selectB.value = 'Demo02';
function tintedLayer(mask, color) {
    const layer = document.createElement('canvas');
    layer.width = mask.naturalWidth;
    layer.height = mask.naturalHeight;
    const c = layer.getContext('2d');
    c.fillStyle = color;
    c.fillRect(0, 0, layer.width, layer.height);
    c.globalCompositeOperation = 'destination-in';
    c.drawImage(mask, 0, 0);
    return layer;
}
function rebuildPlayerSheets() {
    if (!playerBase.complete || !playerBase.naturalWidth || !shirtMask.complete || !shortsMask.complete)
        return;
    playerSheets = game.match.tactics.map(t => {
        const sheet = document.createElement('canvas');
        sheet.width = playerBase.naturalWidth;
        sheet.height = playerBase.naturalHeight;
        const c = sheet.getContext('2d');
        c.drawImage(playerBase, 0, 0);
        c.globalCompositeOperation = 'multiply';
        c.drawImage(tintedLayer(shirtMask, t.colors[0]), 0, 0);
        c.drawImage(tintedLayer(shortsMask, t.colors[1]), 0, 0);
        c.globalCompositeOperation = 'source-over';
        return sheet;
    });
}
[playerBase, shirtMask, shortsMask].forEach(img => img.addEventListener('load', () => { if (game)
    rebuildPlayerSheets(); }));
function reset() { const seed = Number(document.querySelector('#seed').value); game = new Game(new Match([createTactic(selectA.value), createTactic(selectB.value)], new JavaRandom(seed).random)); rebuildPlayerSheets(); paused = false; document.querySelector('#pause').textContent = 'Pause'; waitUntil = performance.now() + 6000; lastTick = waitUntil; }
document.querySelector('#restart').addEventListener('click', reset);
document.querySelector('#pause').addEventListener('click', () => { paused = !paused; document.querySelector('#pause').textContent = paused ? 'Resume' : 'Pause'; lastTick = performance.now(); });
canvas.addEventListener('mousemove', e => { const r = canvas.getBoundingClientRect(); const q = fromCanvas((e.clientX - r.left) * 600 / r.width, (e.clientY - r.top) * 400 / r.height); document.querySelector('#coordinates').textContent = `${Math.trunc(q.x)}, ${Math.trunc(q.y)}`; });
function drawGoalCelebration(now) {
    const elapsed = now - goalAnimationStarted;
    if (elapsed < 0 || elapsed >= 1500)
        return;
    const progress = elapsed / 1500;
    const fade = progress < 0.72 ? 1 : (1 - progress) / 0.28;
    const ease = 1 - Math.pow(1 - Math.min(1, progress * 5), 3);
    const scale = 0.72 + 0.28 * ease + Math.sin(progress * Math.PI * 8) * 0.025 * (1 - progress);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, fade));
    ctx.translate(300, 200);
    ctx.scale(scale, scale);
    // Bright radial burst behind the headline.
    ctx.fillStyle = 'rgba(255,224,76,0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, 112, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 18; i++) {
        const a = i * Math.PI / 9;
        const r1 = 68, r2 = i % 2 === 0 ? 126 : 108;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a + 0.045) * r2, Math.sin(a + 0.045) * r2);
        ctx.lineTo(Math.cos(a - 0.045) * r2, Math.sin(a - 0.045) * r2);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,232,105,0.88)' : 'rgba(255,255,255,0.78)';
        ctx.fill();
    }
    ctx.font = '900 italic 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#10251a';
    ctx.strokeText('GOAL!', 0, 0);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText('GOAL!', 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillText('GOAL!', 0, 0);
    ctx.restore();
}
function draw() {
    ctx.fillStyle = '#196c36';
    ctx.fillRect(0, 0, 600, 400);
    if (image.complete && image.naturalWidth)
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 15px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`${game.match.tactics[0].name} : ${game.match.score[0]}`, 150, 50);
    ctx.fillText(`${game.match.tactics[1].name} : ${game.match.score[1]}`, 410, 50);
    ctx.fillText(game.clock, 280, 50);
    game.match.teams.forEach((players, t) => players.forEach(p => {
        const screen = toCanvas(p.x, p.y), x = Math.trunc(screen.x), y = Math.trunc(screen.y), colors = game.match.tactics[t].colors;
        const dx = p.targetX - p.x, dy = p.targetY - p.y;
        const moving = Math.abs(dx) + Math.abs(dy) > 1;
        const direction = moving ? (Math.round((Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 4)) + 2) % 8 : 4;
        const pose = moving ? Math.floor(game.ticks / 4) % 5 : 0;
        if (playerSheets[t])
            ctx.drawImage(playerSheets[t], direction * 64, pose * 64, 64, 64, x - 14, y - 14, 28, 28);
        else {
            ctx.fillStyle = colors[0];
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = colors[2];
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(String(p.number), x, y + 12);
    }));
    const b = game.match.ball, ballScreen = toCanvas(b.x, b.y);
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.arc(Math.trunc(ballScreen.x), Math.trunc(ballScreen.y), 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (game.finished) {
        ctx.fillStyle = 'white';
        ctx.fillText(`Gana : ${game.match.tactics[game.match.winner()].name}`, 250, 365);
    }
    if (goalAnimationUntil > performance.now())
        drawGoalCelebration(performance.now());
    document.querySelector('#status').textContent = game.finished ? 'Match finished' : paused ? 'Paused' : performance.now() < waitUntil ? 'Kickoff in a moment…' : 'Match in progress';
}
function frame(now) { if (!paused && now >= waitUntil) {
    const speed = Number(document.querySelector('#speed').value);
    let count = 0;
    while (now - lastTick >= 100 / speed && count++ < 100) {
        const previousScore = game.match.score[0] + game.match.score[1];
        game.tick();
        const currentScore = game.match.score[0] + game.match.score[1];
        if (currentScore > previousScore && (speed === 1 || speed === 5)) {
            goalAnimationStarted = now;
            goalAnimationUntil = now + 1500;
        }
        lastTick += 100 / speed;
    }
} draw(); requestAnimationFrame(frame); }
reset();
requestAnimationFrame(frame);
