export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const distance = (a, b) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
export function normalizeAngle(a) { while (a < 0)
    a += Math.PI * 2; while (a >= Math.PI * 2)
    a -= Math.PI * 2; return a; }
export function angle(a, b) { const dx = b.x - a.x, dy = b.y - a.y; return normalizeAngle(dx > 0 ? Math.atan(dy / dx) : dx < 0 ? Math.atan(dy / dx) + Math.PI : a.y < b.y ? Math.PI / 2 : -Math.PI / 2); }
export const point = (p, f = 1) => ({ x: Math.floor(p.x * f + 0.5), y: Math.floor(p.y * f + 0.5) });
export class JavaRandom {
    constructor(seed) {
        this.random = () => (this.next(26) * 134217728 + this.next(27)) / 9007199254740992;
        this.seed = (BigInt(seed) ^ 0x5deece66dn) & ((1n << 48n) - 1n);
    }
    next(bits) { this.seed = (this.seed * 0x5deece66dn + 11n) & ((1n << 48n) - 1n); return Number(this.seed >> BigInt(48 - bits)); }
}
export class Player {
    constructor(number, strength) {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.number = clamp(number, 1, 99);
        this.strength = clamp(strength, 1, 10);
        this.speed = 10 - this.strength;
    }
    setXY(x, y) { this.x = this.targetX = x; this.y = this.targetY = y; }
    goTo(x, y) { this.targetX = x; this.targetY = y; }
    move() { const target = { x: this.targetX, y: this.targetY }; if (distance(this, target) > this.speed + 4) {
        const a = angle(this, target);
        this.x += Math.cos(a) * this.speed;
        this.y += Math.sin(a) * this.speed;
    }
    else {
        this.x = this.targetX;
        this.y = this.targetY;
    } }
}
export class Ball {
    constructor(random = Math.random) {
        this.random = random;
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.speed = 0;
        this.history = [0, 0, 0, 0, 0];
    }
    setXY(x, y) { this.x = x; this.y = y; this.speed = 0; }
    goal() { if (this.x > 160 && this.y > -30 && this.y < 30)
        return 0; if (this.x < -160 && this.y > -30 && this.y < 30)
        return 1; return -1; }
    kick(team, player, x, y, strength) {
        if (this.speed >= 15)
            return;
        x += Math.trunc(this.random() * 41) - 20;
        y += Math.trunc(this.random() * 41) - 20;
        this.angle = angle(this, { x, y });
        this.speed = strength * 3;
        this.history.shift();
        this.history.push(player * 10 + team);
        const h = this.history;
        if ((h[0] === h[2] && h[0] === h[4] && h[1] === h[3]) || (h[0] === h[3] && h[1] === h[4])) {
            this.speed = 30;
            this.angle = this.random() * Math.PI * 2;
        }
    }
    move() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        if (this.goal() === -1) {
            if (this.x > 160) {
                this.x = 160;
                this.angle = normalizeAngle(Math.PI - this.angle);
            }
            if (this.x < -160) {
                this.x = -160;
                this.angle = normalizeAngle(Math.PI - this.angle);
            }
            if (this.y > 120) {
                this.y = 120;
                this.angle = normalizeAngle(-this.angle);
            }
            if (this.y < -120) {
                this.y = -120;
                this.angle = normalizeAngle(-this.angle);
            }
        }
        if (this.speed > 0)
            this.speed--;
    }
}
export class Situation {
    constructor(own, opponents, ball) {
        this.own = own;
        this.opponents = opponents;
        this.ball = ball;
    }
    nearest(list, p, exclude = [], ahead = false) { let best = [-1, 999]; list.forEach((q, i) => { if (!exclude.includes(i) && (!ahead || q.x > p.x)) {
        const d = Math.trunc(distance(q, p));
        if (d < best[1])
            best = [i, d];
    } }); return best; }
    closer() { return this.nearest(this.own, this.ball)[1] < this.nearest(this.opponents, this.ball)[1]; }
    closestBall() { return this.nearest(this.own, this.ball)[0]; }
    nextPlayer(i) { return this.nearest(this.own, this.own[i], [i], true)[0]; }
}
const demo = [[-152, 0, 7], [-100, 100, 5], [-120, 30, 5], [-120, -30, 5], [-100, -100, 5], [20, 100, 5], [-20, 30, 5], [-20, -30, 5], [20, -100, 5], [120, 30, 7], [100, -60, 7]];
const other = [[-150, 0, 6], [-120, -30, 7], [-120, 30, 7], [-100, 0, 6], [-100, 50, 6], [-60, 0, 4], [-20, -40, 4], [0, 0, 4], [50, 50, 6], [100, 50, 6], [120, -50, 6]];
export function createTactic(id) {
    const formation = (id.startsWith('Demo') ? demo : other).map(row => [...row]);
    if (id === 'Demo02') {
        formation[0][2] = 5;
        formation[5][2] = 7;
        formation[9][2] = 5;
    }
    if (id === 'Ana') {
        formation[2][0] = -100;
        formation[4][0] = -80;
        formation[6][1] = -100;
        formation[8][1] = 100;
    }
    const names = { Demo01: 'Demo01', Demo02: 'Demo02', Pepe: 'F.C. Pepe', Juan: 'Real Juan', Ana: 'Ana total' };
    const colors = { Demo01: ['#ffff00', '#1e8cff', '#000000'], Demo02: ['#ff0000', '#000000', '#ffffff'], Pepe: ['#ffc800', '#ff80ff', '#000000'], Juan: ['#ffffff', '#ffffff', '#000000'], Ana: ['#000000', '#0000ff', '#ffffff'] };
    return { name: names[id], colors: colors[id], formation, commands(s, random) {
            const c = formation.map(([x, y], player) => ({ kind: 'move', player, x, y }));
            const chase = () => c.push({ kind: 'move', player: s.closestBall(), ...s.ball });
            const keeper = () => c.push({ kind: 'move', player: 0, x: formation[0][0], y: clamp(Math.trunc(s.ball.y / 2), -20, 20) });
            const defend = () => { if (!s.closer() || s.ball.x < 0)
                for (let i = 1; i < 4; i++) {
                    const p = s.opponents[s.nearest(s.opponents, { x: formation[i][0], y: formation[i][1] })[0]];
                    c.push({ kind: 'move', player: i, x: p.x + 10, y: p.y });
                } };
            if (id.startsWith('Demo')) {
                chase();
                for (let i = 0; i < 11; i++)
                    c.push({ kind: 'shoot', player: i, deviation: 0 });
            }
            else if (id === 'Pepe') {
                chase();
                keeper();
                [1, 3, 4, 5, 6, 8, 10, 9, 9].forEach((to, player) => c.push({ kind: 'pass', player, to }));
                c.push({ kind: 'shoot', player: 9, deviation: 10 }, { kind: 'shoot', player: 10, deviation: -10 });
            }
            else if (id === 'Juan') {
                keeper();
                defend();
                chase();
                for (let i = 0; i < 11; i++)
                    c.push(s.own[i].x < 80 ? { kind: 'pass', player: i, to: s.nextPlayer(i) } : { kind: 'shoot', player: i, deviation: 0 });
            }
            else {
                defend();
                keeper();
                chase();
                let best = 9999999, x = 0, y = 0;
                for (let i = 0; i < 50; i++) {
                    const xx = Math.trunc(random() * 340) - 170, yy = Math.trunc(random() * 240) - 120;
                    let h = yy * 5 - xx * 100;
                    for (const p of s.own)
                        if (Math.trunc(distance({ x: xx, y: yy }, p)) < 70)
                            h -= 1000;
                    for (const p of s.opponents)
                        if (Math.trunc(distance({ x: xx, y: yy }, p)) < 70)
                            h += 1000;
                    if (best > h) {
                        best = h;
                        x = xx;
                        y = yy;
                    }
                }
                for (let i = 0; i < 11; i++)
                    c.push(s.own[i].x > 50 ? { kind: 'shoot', player: i, deviation: 15 } : { kind: 'kick', player: i, x, y });
            }
            return c;
        } };
}
export class Match {
    constructor(tactics = [createTactic('Demo01'), createTactic('Demo02')], random = Math.random) {
        this.tactics = tactics;
        this.random = random;
        this.score = [0, 0];
        this.cachedWinner = -1;
        this.teams = tactics.map(t => t.formation.map((r, i) => new Player(i + 1, r[2])));
        this.ball = new Ball(random);
        this.turn = Math.trunc(random() * 2);
        this.kickoff();
    }
    factor(team) { return team === 0 ? 1 : -1; }
    kickoff() { this.teams.forEach((players, n) => players.forEach((p, i) => { const r = this.tactics[n].formation[i], f = this.factor(n); const x = (clamp(r[0], -160, 160) - 160) * f / 2, y = r[1] * f; p.setXY(x, y); if (distance(p, { x: 0, y: 0 }) < 30)
        p.setXY(p.x - 30, y); })); }
    situation(team) { const f = this.factor(team); return new Situation(this.teams[team].map(p => point(p, f)), this.teams[1 - team].map(p => point(p, f)), point(this.ball, f)); }
    execute(team, c) {
        const i = clamp(c.player, 0, 10), p = this.teams[team][i], f = this.factor(team);
        if (c.kind === 'move') {
            p.goTo(c.x * f, c.y * f);
            return;
        }
        if (c.kind === 'pass') {
            const q = this.teams[team][clamp(c.to, 0, 10)];
            this.execute(team, { kind: 'kick', player: i, x: q.x * f, y: q.y * f });
            return;
        }
        let x, y, grade = 100;
        if (c.kind === 'shoot') {
            x = 190 * f;
            y = c.deviation * f;
        }
        else {
            const d = distance(p, { x: c.x, y: c.y });
            if (d < 50)
                grade = Math.trunc(d * 2);
            x = c.x * f;
            y = c.y * f;
        }
        if (distance(p, this.ball) < 10)
            this.ball.kick(team, i, x, y, Math.trunc(p.strength * grade / 100));
    }
    executeTactics() { for (let n = 0; n < 2; n++) {
        const team = (n + this.turn) % 2;
        for (const c of this.tactics[team].commands(this.situation(team), this.random))
            this.execute(team, c);
    } }
    move() { for (const team of this.teams)
        for (const p of team)
            p.move(); this.ball.move(); this.executeTactics(); const g = this.ball.goal(); if (g !== -1) {
        this.score[g]++;
        this.kickoff();
        this.ball.setXY(0, 0);
        this.teams[1 - g][10].setXY(0, 0);
    } this.turn = 1 - this.turn; }
    winner() { if (this.cachedWinner !== -1)
        return this.cachedWinner; if (this.score[0] > this.score[1])
        return 0; if (this.score[0] < this.score[1])
        return 1; return this.cachedWinner = Math.trunc(this.random() * 2); }
    snapshot() { return { turn: this.turn, score: [...this.score], ball: [this.ball.x, this.ball.y, this.ball.angle, this.ball.speed, ...this.ball.history], players: this.teams.flatMap(t => t.map(p => [p.x, p.y, p.targetX, p.targetY])) }; }
}
export class Game {
    constructor(match = new Match()) {
        this.match = match;
        this.ticks = 0;
    }
    tick() { if (this.ticks < 1800) {
        this.match.move();
        this.ticks++;
    } }
    get clock() { return `${String(Math.trunc(this.ticks / 600)).padStart(2, '0')}:${String(Math.trunc(this.ticks % 600 / 10)).padStart(2, '0')}`; }
    get finished() { return this.ticks >= 1800; }
}
