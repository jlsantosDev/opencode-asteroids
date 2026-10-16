'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = SKINS[skinIndex].bala;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.points = POINTS[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  // Hook: se llama cuando una bala lo destruye
  onShotDown() {}

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Asteroide especial ────────────────────────────────────────────────────────
class SpecialAsteroid extends Asteroid {
  constructor(x, y) {
    super(x, y, 3);
    // Velocidad explícita: la base heredada arrastra ruido rand(-15, 15)
    const SPEED_MIN = 150, SPEED_MAX = 210;  // px/s: cruza la pantalla en ~4-5 s
    const mag = Math.hypot(this.vx, this.vy) || 1;
    const speed = rand(SPEED_MIN, SPEED_MAX);
    this.vx = this.vx / mag * speed;
    this.vy = this.vy / mag * speed;
    const ROT_MIN = 4, ROT_MAX = 6;
    this.rotSpeed = rand(ROT_MIN, ROT_MAX) * (Math.random() < 0.5 ? -1 : 1);
    this.points = 60;   // bonus: x3 lo que vale un asteroide grande
    this.age = 0;
    this.lifetime = 10;  // desaparece solo a los 10 segundos
  }

  update(dt) {
    super.update(dt);
    this.age += dt;
    if (this.age >= this.lifetime) this.dead = true;
  }

  split() { return []; }  // no se escinde: se rompe en fragmentos

  onShotDown() {
    spawnDebris(this.x, this.y, 18);
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    // Contorno rojo parpadeante
    ctx.strokeStyle = Math.floor(this.age * 6) % 2 === 0
      ? 'rgba(255, 0, 0, 1)'
      : 'rgba(255, 0, 0, 0.15)';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Fragmentos del asteroide especial ────────────────────────────────────────
class Debris {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const SPEED_MIN = 500, SPEED_MAX = 800;  // muy rápidos
    const speed = rand(SPEED_MIN, SPEED_MAX);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = rand(2, 4);
    this.ttl  = 2;   // máximo 2 segundos en escena
    this.life = this.ttl;
    this.dead = false;
    this.color = `hsl(${randInt(0, 15)}, 100%, ${randInt(45, 60)}%)`;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    // Fuera de la escena o agotada su vida -> desaparece
    if (this.ttl <= 0 ||
        this.x < -this.size || this.x > W + this.size ||
        this.y < -this.size || this.y > H + this.size)
      this.dead = true;
  }

  draw() {
    const alpha = Math.max(this.ttl / this.life, 0);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.fillStyle = this.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(this.size, 0);
    ctx.lineTo(-this.size,  this.size * 0.7);
    ctx.lineTo(-this.size, -this.size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function spawnDebris(x, y, count = 18) {
  for (let i = 0; i < count; i++) debris.push(new Debris(x, y));
}

// ── Piel de la nave (skins) ─────────────────────────────────────────────────
// Registro data-driven: la silueta son coordenadas locales de la nave
// (nariz hacia +x), en el mismo espacio que el radio de colisión.
const SKIN_BASE = {
  relleno: null,                        // sin relleno por defecto
  llama:   'rgba(255, 130, 0, 0.85)',   // color de la llama del propulsor
  tobera:  [-8, 4],                     // [x de la boca, semiancho de la llama]
  detalle: null,                        // polilínea opcional (sin cerrar)
  bala:    '#fff',                      // color de las balas
  acento:  '#0ff',                      // trazo mientras dura el boost
};

const SKINS = [
  {
    ...SKIN_BASE,
    nombre: 'Clásica',
    trazo:  '#fff',
    puntos: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],   // triángulo con muesca
  },
  {
    ...SKIN_BASE,
    nombre: 'Delta',
    trazo:  '#7df9ff',
    relleno: 'rgba(125, 249, 255, 0.12)',
    llama:  'rgba(125, 249, 255, 0.85)',
    tobera: [-12, 3],
    bala:   '#7df9ff',
    acento: '#fff',                     // su trazo ya es cian: invierte el aviso
    puntos: [[22, 0], [-6, -4], [-18, -15], [-12, -2], [-12, 2], [-18, 15], [-6, 4]],
  },
  {
    ...SKIN_BASE,
    nombre: 'Daga',
    trazo:  '#ff5df1',
    relleno: 'rgba(255, 93, 241, 0.10)',
    llama:  'rgba(255, 93, 241, 0.85)',
    tobera: [-12, 3],
    bala:   '#ff5df1',
    // Hoja estrecha con la cola hendida: se lee como un dardo, no como un pétalo
    puntos: [[26, 0], [4, -5], [-8, -7], [-17, -3], [-11, 0], [-17, 3], [-8, 7], [4, 5]],
  },
  {
    ...SKIN_BASE,
    nombre: 'Cruzada',
    trazo:  '#ffd23f',
    tobera: [-12, 3],
    bala:   '#ffd23f',
    puntos: [[16, 0], [3, -3], [3, -13], [-3, -13], [-3, -3], [-12, -3],
             [-12, 3], [-3, 3], [-3, 13], [3, 13], [3, 3]],
  },
  {
    ...SKIN_BASE,
    nombre: 'Disco',
    trazo:  '#a0ff8f',
    relleno: 'rgba(160, 255, 143, 0.10)',
    llama:  'rgba(160, 255, 143, 0.85)',
    tobera: [-13, 4],
    bala:   '#a0ff8f',
    // +x es la nariz y al apuntar hacia arriba se convierte en el eje vertical:
    // por eso el radio mayor va en ry, para que al vuelo se lea un disco ancho.
    elipse: [11, 17],
    detalle: [[5, -5], [10, 0], [5, 5]],   // burbuja de la cabina, en la nariz
  },
];

// Traza la silueta de una piel en coordenadas locales, escalada.
// La usan la nave y los iconos de vidas del HUD para que siempre coincidan.
function trazarSilueta(skin, escala = 1) {
  ctx.beginPath();
  if (skin.elipse) {
    ctx.ellipse(0, 0, skin.elipse[0] * escala, skin.elipse[1] * escala,
                0, 0, Math.PI * 2);
    return;
  }
  const p = skin.puntos;
  ctx.moveTo(p[0][0] * escala, p[0][1] * escala);
  for (let i = 1; i < p.length; i++)
    ctx.lineTo(p[i][0] * escala, p[i][1] * escala);
  ctx.closePath();
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;   // segundos restantes de velocidad x2
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = this.speedBoost > 0 ? 520 : 260;  // px/s² (doble con boost)
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);

    if (this.speedBoost > 0) {
      this.speedBoost -= dt;
      // Estela de partículas mientras dura el boost
      if (Math.random() > 0.5) {
        particles.push(new Particle(this.x, this.y));
      }
    }
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = this.speedBoost > 0 ? skin.acento : skin.trazo;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta de la piel activa
    trazarSilueta(skin);
    if (skin.relleno) {
      ctx.fillStyle = skin.relleno;
      ctx.fill();
    }
    ctx.stroke();

    // Detalle interior (cabina, costillas): solo si la piel lo define
    if (skin.detalle) {
      const d = skin.detalle;
      ctx.beginPath();
      ctx.moveTo(d[0][0], d[0][1]);
      for (let i = 1; i < d.length; i++) ctx.lineTo(d[i][0], d[i][1]);
      ctx.stroke();
    }

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      const [boca, ancho] = skin.tobera;
      ctx.beginPath();
      ctx.moveTo(boca, -ancho);
      ctx.lineTo(boca - rand(6, 14), 0);
      ctx.lineTo(boca,  ancho);
      ctx.strokeStyle = skin.llama;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up de velocidad ─────────────────────────────────────────────────────
class SpeedPowerup {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.ttl = 8;       // vida útil en segundos
    this.dead = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo en los últimos 2 segundos
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;

    ctx.save();
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Símbolo de rayo
    ctx.beginPath();
    ctx.moveTo(this.x + 2, this.y - 6);
    ctx.lineTo(this.x - 3, this.y + 1);
    ctx.lineTo(this.x, this.y + 1);
    ctx.lineTo(this.x - 2, this.y + 6);
    ctx.lineTo(this.x + 3, this.y - 1);
    ctx.lineTo(this.x, this.y - 1);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
// La piel elegida vive fuera de initGame(): se crea una Ship nueva al reiniciar
// y reset() se llama en cada vida, así que guardarlo ahí la perdería.
let skinIndex = 0;
let skinFlash = 0;   // segundos restantes del aviso del HUD al cambiar de piel

let ship, bullets, asteroids, particles, powerups, debris;
let specialTimer;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnSpecial() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  asteroids.push(new SpecialAsteroid(x, y));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  debris    = [];
  specialTimer = 4;   // primer especial pronto; luego cada 10 s
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  debris    = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Antes de las ramas de estado: en 'dead' y 'gameover' el update sale temprano
  // y la tecla quedaría muerta justo cuando uno quiere probar pieles nuevas.
  if (pressed('KeyS')) {
    skinIndex = (skinIndex + 1) % SKINS.length;
    skinFlash = 2;
  }
  if (skinFlash > 0) skinFlash -= dt;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    debris.forEach(d => d.update(dt));
    debris = debris.filter(d => !d.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    debris.forEach(d => d.update(dt));
    debris = debris.filter(d => !d.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Aparición periódica del asteroide especial (cada 10 s)
  specialTimer -= dt;
  if (specialTimer <= 0) {
    specialTimer = 10;
    // No spawnea si el campo está vacío: no debe bloquear el fin de nivel
    if (asteroids.length > 0) spawnSpecial();
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));
  debris.forEach(d => d.update(dt));
  powerups = powerups.filter(p => !p.dead);
  debris    = debris.filter(d => !d.dead);

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a.points;
        a.onShotDown();
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        // 8% de probabilidad de soltar power-up de velocidad
        if (Math.random() < 0.08) powerups.push(new SpeedPowerup(a.x, a.y));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        // Si tenía boost activo, reinicia el timer a 5s en la nueva vida
        if (ship.speedBoost > 0) ship.speedBoost = 5;
        killShip();
        break;
      }
    }
  }

  // Nave vs power-up de velocidad
  for (const p of powerups) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      ship.speedBoost = 5;
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
const ESCALA_ICONO = 0.45;   // el triángulo clásico medía 9 px de nariz vs 20

function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  const skin = SKINS[skinIndex];
  ctx.strokeStyle = skin.trazo;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  trazarSilueta(skin, ESCALA_ICONO);
  if (skin.relleno) {
    ctx.fillStyle = skin.relleno;
    ctx.fill();
  }
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Indicador de velocidad
  if (ship.speedBoost > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0ff';
    ctx.fillText(`VELOCIDAD ${ship.speedBoost.toFixed(1)}s`, W - 14, 46);
  }

  // Nombre de la piel: único aviso visible cuando la nave no está en escena
  // (game over, o reapareciendo), donde ni el sprite ni los iconos ayudan.
  if (skinFlash > 0) {
    ctx.textAlign = 'left';
    ctx.font      = '13px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(`PIEL: ${SKINS[skinIndex].nombre}  [S]`, 14, H - 14);
    ctx.font      = '15px monospace';
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  debris.forEach(d => d.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  powerups.forEach(p => p.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
