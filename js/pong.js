const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let ball = { x: 400, y: 300, vx: 300, vy: 200 };
let leftPaddle = { y: 250 };
let rightPaddle = { y: 250 };
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 80;
const BALL_RADIUS = 8;

let scoreLeft = 0;
let scoreRight = 0;

let speedAdd = 1;

const keys = {};
window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
});
window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

let lastTime = performance.now();

function loop(now) {
    let dt = (now - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = now;

    update(dt);
    draw();
    requestAnimationFrame(loop);
}

function update(dt) {
    if (keys["w"] || keys["W"]) leftPaddle.y -= 400 * dt;
    if (keys["s"] || keys["S"]) leftPaddle.y += 400 * dt;
    leftPaddle.y = Math.max(
        0,
        Math.min(canvas.height - PADDLE_HEIGHT, leftPaddle.y),
    );
    let aiSpeed = 300;
    if (ball.y < rightPaddle.y + PADDLE_HEIGHT / 2) {
        rightPaddle.y -= aiSpeed * dt;
    } else {
        rightPaddle.y += aiSpeed * dt;
    }
    rightPaddle.y = Math.max(
        0,
        Math.min(canvas.height - PADDLE_HEIGHT, rightPaddle.y),
    );

    ball.x += ball.vx * dt * speedAdd;
    ball.y += ball.vy * dt * speedAdd;

    if (ball.y - BALL_RADIUS <= 0) {
        ball.y = BALL_RADIUS;
        ball.vy = -ball.vy;
    }
    if (ball.y + BALL_RADIUS >= canvas.height) {
        ball.y = canvas.height - BALL_RADIUS;
        ball.vy = -ball.vy;
    }

    if (
        ball.x - BALL_RADIUS <= 30 &&
        ball.x - BALL_RADIUS >= 20 &&
        ball.y >= leftPaddle.y &&
        ball.y <= leftPaddle.y + PADDLE_HEIGHT
    ) {
        ball.x = 30 + BALL_RADIUS;
        ball.vx = -ball.vx;
        speedAdd += 0.01
    }

    if (
        ball.x + BALL_RADIUS >= canvas.width - 30 &&
        ball.x + BALL_RADIUS <= canvas.width - 20 &&
        ball.y >= rightPaddle.y &&
        ball.y <= rightPaddle.y + PADDLE_HEIGHT
    ) {
        ball.x = canvas.width - 30 - BALL_RADIUS;
        ball.vx = -ball.vx;
        speedAdd += 0.01
    }

    if (ball.x < 0) {
        scoreRight++;
        resetBall();
    }
    if (ball.x > canvas.width) {
        scoreLeft++;
        resetBall();
    }
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;

    ball.vx = (Math.random() > 0.5 ? 1 : -1) * 300;
    ball.vy = Math.random() * 400 - 200;
}

function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fff";
    ctx.fillRect(20, leftPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT); // левая
    ctx.fillRect(canvas.width - 30, rightPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT); // правая

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "24px monospace";
    ctx.fillText(scoreLeft, 100, 40);
    ctx.fillText(scoreRight, canvas.width - 130, 40);
}

requestAnimationFrame(loop);