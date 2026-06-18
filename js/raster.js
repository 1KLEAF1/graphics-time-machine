const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const vertices = [
  { x:  0.0, y:  0.5, z: 0.0 },
  { x: -0.5, y: -0.5, z: 0.0 },
  { x:  0.5, y: -0.5, z: 0.0 }
];

let angle = 0;
const ROTATION_SPEED = 1.0; 

function subtract(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(v) {
    const len = Math.hypot(v.x, v.y, v.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}

let lastTime = performance.now();

function loop(now) {
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  angle += ROTATION_SPEED * dt;

  const transformed = vertices.map(v => rotateY(v, angle)); 
  if (transformed.some(v => v.z <= 0.1)) {
    drawBackground();
    return;
  }
  const screenVerts = transformed.map(v => project(v));
  const normal = computeNormal(transformed);
  const lightDir = normalize({x: -1, y: 1, z: -1}); 
  const color = shade(normal, lightDir);
  drawBackground();
  fillTriangle(screenVerts, color);

  requestAnimationFrame(loop);
}

function rotateY(v, angle) {
  return {
    x: v.x * Math.cos(angle) + v.z * Math.sin(angle),
    y: v.y,
    z: -v.x * Math.sin(angle) + v.z * Math.cos(angle) + 4
  };
}

function project(v) {
  const d = 400;
  return {
    x: (v.x / v.z) * d + canvas.width/2,
    y: -(v.y / v.z) * d + canvas.height/2,
    z: v.z
  };
}

function computeNormal(vArr) {
  const a = subtract(vArr[1], vArr[0]);
  const b = subtract(vArr[2], vArr[0]);
  return normalize(cross(a, b));
}

function fillTriangle(verts, color) {
  const [v0, v1, v2] = verts;
  const minX = Math.floor(Math.max(0, Math.min(v0.x, v1.x, v2.x)));
  const maxX = Math.ceil(Math.min(canvas.width-1, Math.max(v0.x, v1.x, v2.x)));
  const minY = Math.floor(Math.max(0, Math.min(v0.y, v1.y, v2.y)));
  const maxY = Math.ceil(Math.min(canvas.height-1, Math.max(v0.y, v1.y, v2.y)));

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w0 = edgeFunction(v1, v2, {x, y});
      const w1 = edgeFunction(v2, v0, {x, y});
      const w2 = edgeFunction(v0, v1, {x, y});
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
        const index = (y * canvas.width + x) * 4;
        data[index] = color.r;
        data[index+1] = color.g;
        data[index+2] = color.b;
        data[index+3] = 255;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function edgeFunction(a, b, p) {
  return (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
}

function drawBackground() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function shade(normal, lightDir) {
  const ambient = 0.2;
  const diffuse = Math.max(0, dot(normal, lightDir)) * 0.8;
  const intensity = ambient + diffuse;
  const val = Math.floor(intensity * 255);
  return {r: val, g: val, b: val};
}

requestAnimationFrame(loop);