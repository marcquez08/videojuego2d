window.addEventListener("load", () => {

    document.getElementById("resetBtn").addEventListener("click", () => {

    objects = [];
    regenerationQueue = [];

    score = 0;
    eliminadas = 0;
    aliados = 0;
    enemigos = 0;

    TYPES.forEach(t => typeCount[t.name] = 0);

    // Regenerar todo
    TYPES.forEach(t => {
        for (let i = 0; i < t.max; i++) {
            generateObjectByType(t);
        }
    });

});

/* =========================
CANVAS
========================= */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* =========================
HUD
========================= */
const scoreEl = document.getElementById("score");
const objetosEl = document.getElementById("objetos");
const eliminadasEl = document.getElementById("eliminadas");
const aliadosEl = document.getElementById("aliados");
const enemigosEl = document.getElementById("enemigos");

const hud = document.querySelector(".hud-panel");
const showHudBtn = document.getElementById("showHudBtn");

const rulesBtn = document.getElementById("rulesBtn");
const rulesPanel = document.getElementById("rulesPanel");

// Ocultar HUD al hacer click
hud.addEventListener("click", () => {
    hud.style.display = "none";
    showHudBtn.style.display = "block";
});

// Mostrar HUD otra vez
showHudBtn.addEventListener("click", () => {
    hud.style.display = "block";
    showHudBtn.style.display = "none";
});

rulesBtn.addEventListener("click", () => {
    if (rulesPanel.style.display === "none") {
        rulesPanel.style.display = "block";
    } else {
        rulesPanel.style.display = "none";
    }
});

/* =========================
AUDIO
========================= */
const bgMusic = new Audio("assets/theme.mpeg");
bgMusic.loop = true;
bgMusic.volume = 0.5;

const hitSound = new Audio("assets/bs.mpeg");
hitSound.volume = 0.7;

window.addEventListener("click", () => {
    bgMusic.play().catch(()=>{});
}, { once: true });

/* =========================
TIPOS
========================= */
const TYPES = [
{ name: "type1", minSpeed: 1, maxSpeed: 5, img: "assets/tf.png", max: 7, score: 10, size: 25 },
{ name: "type2", minSpeed: 1, maxSpeed: 5, img: "assets/xw.png", max: 7, score: -10, size: 25 },
{ name: "type3", minSpeed: 4, maxSpeed: 8, img: "assets/tb.png", max: 4, score: 50, size: 30 },
{ name: "type4", minSpeed: 4, maxSpeed: 8, img: "assets/yw.png", max: 4, score: -50, size: 30 },
{ name: "type5", minSpeed: 10, maxSpeed: 15, img: "assets/sd.png", max: 3, score: 100, size: 50 }
];

/* =========================
EXPLOSIONES
========================= */
const explosionImg = new Image();
explosionImg.src = "assets/boom.png";

let explosions = [];

/* =========================
VARIABLES
========================= */
let objects = [];
let eliminadas = 0;
let score = 0;
let aliados = 0;
let enemigos = 0;
let regenerationQueue = [];

let typeCount = {};
TYPES.forEach(t => typeCount[t.name] = 0);

/* =========================
IMÁGENES
========================= */
const loadedImages = {};
TYPES.forEach(t => {
    const img = new Image();
    img.src = t.img;
    loadedImages[t.name] = img;
});

/* =========================
CLASE
========================= */
class GameObject {
    constructor(x, y, typeConfig) {
        this.size = typeConfig.size;
        this.posX = x;
        this.posY = y;

        this.type = typeConfig.name;
        this.image = loadedImages[this.type];

        this.score = typeConfig.score;

        this.dy = Math.random() *
            (typeConfig.maxSpeed - typeConfig.minSpeed) + typeConfig.minSpeed;

        this.dx = (Math.random() * 2 - 1) * 2;

        this.maxDx = 5; // velocidad horizontal máxima
    }

    limitSpeed() {
        if (this.dx > this.maxDx) this.dx = this.maxDx;
        if (this.dx < -this.maxDx) this.dx = -this.maxDx;
    }

    draw(ctx) {
        if (this.image && this.image.complete) {
            ctx.drawImage(
                this.image,
                this.posX - this.size,
                this.posY - this.size,
                this.size * 2,
                this.size * 2
            );
        }
    }

    update(ctx) {
        this.draw(ctx);

        this.posX += this.dx;
        this.posY += this.dy;

        // Rebote lateral
        if (this.posX < this.size || this.posX > canvas.width - this.size) {
            this.dx *= -1;
        }

        // CASCADA: sale abajo → aparece arriba
        if (this.posY > canvas.height + this.size) {
            this.posY = -this.size;
        }
        this.dx *= 0.98; // fricción ligera
    }

    bounce(other) {

        let dx = this.posX - other.posX;

        let force = 1.2;

        if (dx > 0) {
            this.dx = Math.abs(this.dx) + force;
            other.dx = -Math.abs(other.dx) - force;
        } else {
            this.dx = -Math.abs(this.dx) - force;
            other.dx = Math.abs(other.dx) + force;
        }

        // Limitar velocidad después del choque
        this.limitSpeed();
        other.limitSpeed();
    }
}

/* =========================
COLISIONES
========================= */
function detectCollisions() {
    for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {

            let o1 = objects[i];
            let o2 = objects[j];

            let dx = o1.posX - o2.posX;
            let dy = o1.posY - o2.posY;

            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < o1.size + o2.size && distance > 0) {
                o1.bounce(o2);
            }
        }
    }
}

/* =========================
GENERACIÓN
========================= */
function generateObjectByType(typeConfig) {
    if (typeCount[typeConfig.name] >= typeConfig.max) return;

    let x = Math.random() * canvas.width;
    let y = -20;

    objects.push(new GameObject(x, y, typeConfig));
    typeCount[typeConfig.name]++;
}

/* =========================
CLICK
========================= */
canvas.addEventListener("click", function (event) {

    const rect = canvas.getBoundingClientRect();

    const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);

    for (let i = objects.length - 1; i >= 0; i--) {

        let dx = mouseX - objects[i].posX;
        let dy = mouseY - objects[i].posY;

        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= objects[i].size) {

            let removed = objects[i];

            hitSound.currentTime = 0;
            hitSound.play().catch(()=>{});

            drawExplosion(removed.posX, removed.posY);

            // 👇 CONTADOR CORRECTO
            if (removed.type === "type2" || removed.type === "type4") {
                aliados++;
            } else {
                enemigos++;
            }

            objects.splice(i, 1);

            eliminadas++;
            score += removed.score;

            typeCount[removed.type]--;

            regenerationQueue.push({
                time: Date.now() + (Math.random() * 3000 + 500),
                type: TYPES.find(t => t.name === removed.type)
            });

            break;
        }
    }
});

/* =========================
EXPLOSIONES
========================= */
function drawExplosion(x, y) {
    explosions.push({ x, y, life: 20 });
}

function drawExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        let e = explosions[i];

        ctx.drawImage(explosionImg, e.x - 30, e.y - 30, 60, 60);

        e.life--;
        if (e.life <= 0) explosions.splice(i, 1);
    }
}

/* =========================
REGENERACIÓN
========================= */
function handleRegeneration() {
    let now = Date.now();

    regenerationQueue = regenerationQueue.filter(item => {
        if (now >= item.time) {
            generateObjectByType(item.type);
            return false;
        }
        return true;
    });
}

/* =========================
HUD
========================= */
function updateHUD() {
    scoreEl.textContent = score;
    objetosEl.textContent = objects.length;
    eliminadasEl.textContent = eliminadas;
    aliadosEl.textContent = aliados;
    enemigosEl.textContent = enemigos;
}

/* =========================
LOOP
========================= */
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detectCollisions();
    objects.forEach(o => o.update(ctx));
    drawExplosions(); // 👈 AHORA SÍ FUNCIONA
    handleRegeneration();
    updateHUD();

    requestAnimationFrame(animate);
}

/* =========================
INIT
========================= */
TYPES.forEach(t => {
    for (let i = 0; i < t.max; i++) {
        generateObjectByType(t);
    }
});

animate();

}); 