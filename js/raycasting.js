const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const map = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 2, 2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 2, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

let posX = 2.5;
let posY = 2.5;
let dirX = 1.0;
let dirY = 0.0;
let planeX = 0.0;
let planeY = 0.66;

const keys = {};

window.addEventListener('keydown', (e) => { keys[e.key] = true; e.preventDefault(); });
window.addEventListener('keyup', (e) => { keys[e.key] = false; e.preventDefault(); });

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
  const moveSpeed = 4.0 * dt;
  const rotSpeed = 3.0 * dt;

  if (keys['w'] || keys['W']) {
    let newX = posX + dirX * moveSpeed;
    let newY = posY + dirY * moveSpeed;
    if (map[Math.floor(posY)][Math.floor(newX)] == 0) posX = newX;
    if (map[Math.floor(newY)][Math.floor(posX)] == 0) posY = newY;
  }
  if (keys['s'] || keys['S']) {
    let newX = posX - dirX * moveSpeed;
    let newY = posY - dirY * moveSpeed;
    if (map[Math.floor(posY)][Math.floor(newX)] == 0) posX = newX;
    if (map[Math.floor(newY)][Math.floor(posX)] == 0) posY = newY;
  }

  let strafeX = -dirY * moveSpeed;
  let strafeY =  dirX * moveSpeed;
  if (keys['a'] || keys['A']) {
    let newX = posX - strafeX;
    let newY = posY - strafeY;
    if (map[Math.floor(posY)][Math.floor(newX)] == 0) posX = newX;
    if (map[Math.floor(newY)][Math.floor(posX)] == 0) posY = newY;
  }
  if (keys['d'] || keys['D']) {
    let newX = posX + strafeX;
    let newY = posY + strafeY;
    if (map[Math.floor(posY)][Math.floor(newX)] == 0) posX = newX;
    if (map[Math.floor(newY)][Math.floor(posX)] == 0) posY = newY;
  }

  if (keys['ArrowLeft']) {
    const oldDirX = dirX;
    dirX = dirX * Math.cos(-rotSpeed) - dirY * Math.sin(-rotSpeed);
    dirY = oldDirX * Math.sin(-rotSpeed) + dirY * Math.cos(-rotSpeed);
    const oldPlaneX = planeX;
    planeX = planeX * Math.cos(-rotSpeed) - planeY * Math.sin(-rotSpeed);
    planeY = oldPlaneX * Math.sin(-rotSpeed) + planeY * Math.cos(-rotSpeed);
  }
  if (keys['ArrowRight']) {
    const oldDirX = dirX;
    dirX = dirX * Math.cos(rotSpeed) - dirY * Math.sin(rotSpeed);
    dirY = oldDirX * Math.sin(rotSpeed) + dirY * Math.cos(rotSpeed);
    const oldPlaneX = planeX;
    planeX = planeX * Math.cos(rotSpeed) - planeY * Math.sin(rotSpeed);
    planeY = oldPlaneX * Math.sin(rotSpeed) + planeY * Math.cos(rotSpeed);
  }
}

function draw() {
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
  ctx.fillStyle = '#444444';
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

  for (let x = 0; x < canvas.width; x++) {
    const cameraX = 2 * x / canvas.width - 1;
    let rayDirX = dirX + planeX * cameraX;
    let rayDirY = dirY + planeY * cameraX;

    let mapX = Math.floor(posX);
    let mapY = Math.floor(posY);

    let deltaDistX = Math.abs(1 / rayDirX) || 1e10;
    let deltaDistY = Math.abs(1 / rayDirY) || 1e10;

    let sideDistX;
    let sideDistY;
    let stepX;
    let stepY;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (posX - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1.0 - posX) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (posY - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1.0 - posY) * deltaDistY;
    }

    let hit = 0;
    let side = 0; 
    const maxSteps = 64;
    for (let i = 0; i < maxSteps; i++) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      if (map[mapY][mapX] > 0) {
        hit = 1;
        break;
      }
    }

    if (hit === 0) continue;

    let perpWallDist;
    if (side === 0) {
      perpWallDist = (mapX - posX + (1 - stepX) / 2) / rayDirX;
    } else {
      perpWallDist = (mapY - posY + (1 - stepY) / 2) / rayDirY;
    }

    let lineHeight = Math.floor(canvas.height / perpWallDist);

    let drawStart = Math.max(0, -lineHeight / 2 + canvas.height / 2);
    let drawEnd = Math.min(canvas.height - 1, lineHeight / 2 + canvas.height / 2);

    let wallType = map[mapY][mapX];
    let color;
    if (wallType === 1) color = { r: 220, g: 50, b: 50 };
    else if (wallType === 2) color = { r: 50, g: 50, b: 220 };
    else if (wallType === 3) color = { r: 50, g: 200, b: 50 };

    if (side === 1) {
      color.r = Math.floor(color.r * 0.7);
      color.g = Math.floor(color.g * 0.7);
      color.b = Math.floor(color.b * 0.7);
    }

    ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
    ctx.fillRect(x, drawStart, 1, drawEnd - drawStart + 1);
  }
}

requestAnimationFrame(loop);