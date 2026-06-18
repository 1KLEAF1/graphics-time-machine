// raytracer.worker.js — Web Worker для Ray Tracing (улучшенная сцена)

// ---------- ВЕКТОРНАЯ МАТЕМАТИКА ----------
function vec3(x, y, z) { return { x, y, z }; }
function add(a, b) { return vec3(a.x + b.x, a.y + b.y, a.z + b.z); }
function sub(a, b) { return vec3(a.x - b.x, a.y - b.y, a.z - b.z); }
function mul(v, s) { return vec3(v.x * s, v.y * s, v.z * s); }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function cross(a, b) { return vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }
function length(v) { return Math.sqrt(dot(v, v)); }
function normalize(v) { let l = length(v); return l > 0 ? mul(v, 1 / l) : vec3(0, 0, 0); }
function reflect(v, n) { return sub(v, mul(n, 2 * dot(v, n))); }

function refract(incident, normal, eta) {
  let cosi = -dot(incident, normal);
  let sint2 = eta * eta * (1 - cosi * cosi);
  if (sint2 > 1) return null;
  let cost = Math.sqrt(1 - sint2);
  return add(mul(incident, eta), mul(normal, eta * cosi - cost));
}

// ---------- СЦЕНА (объекты) ----------
const objects = [
  // Пол с шахматной текстурой
  {
    type: 'sphere',
    pos: vec3(0, -1004, 0),
    radius: 1000,
    material: { color: vec3(0.5, 0.5, 0.5), emission: vec3(0, 0, 0), mirror: false, glass: false, checker: true }
  },
  // Зеркальная сфера (золотистая)
  {
    type: 'sphere',
    pos: vec3(0, 0.2, 0),
    radius: 1,
    material: { color: vec3(1.0, 0.9, 0.7), emission: vec3(0, 0, 0), mirror: true, glass: false }
  },
  // Стеклянная сфера (слабый голубой оттенок)
  {
    type: 'sphere',
    pos: vec3(1.8, 0.2, -0.5),
    radius: 0.8,
    material: { color: vec3(0.9, 0.95, 1.0), emission: vec3(0, 0, 0), mirror: false, glass: true, eta: 1.5 }
  },
  // Матовая синяя сфера
  {
    type: 'sphere',
    pos: vec3(-1.8, -0.3, 0.3),
    radius: 0.7,
    material: { color: vec3(0.2, 0.5, 1.0), emission: vec3(0, 0, 0), mirror: false, glass: false }
  },
  // Основной свет (яркий тёплый)
  {
    type: 'sphere',
    pos: vec3(1, 4, -1),
    radius: 0.3,
    material: { color: vec3(0, 0, 0), emission: vec3(12, 12, 12), mirror: false, glass: false }
  },
  // Заполняющий свет (слабый холодный)
  {
    type: 'sphere',
    pos: vec3(-2, 2, 3),
    radius: 0.2,
    material: { color: vec3(0, 0, 0), emission: vec3(4, 4, 4), mirror: false, glass: false }
  }
];

// ---------- ПЕРЕСЕЧЕНИЕ ЛУЧА СО СФЕРОЙ ----------
function intersectSphere(rayOrigin, rayDir, sphere) {
  let oc = sub(rayOrigin, sphere.pos);
  let a = dot(rayDir, rayDir);
  let b = 2 * dot(oc, rayDir);
  let c = dot(oc, oc) - sphere.radius * sphere.radius;
  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  let sqrtD = Math.sqrt(discriminant);
  let t1 = (-b - sqrtD) / (2 * a);
  let t2 = (-b + sqrtD) / (2 * a);
  let t = t1;
  if (t1 < 0.001) t = t2;
  if (t < 0.001) return null;
  let point = add(rayOrigin, mul(rayDir, t));
  let normal = normalize(sub(point, sphere.pos));
  return { t, point, normal, object: sphere };
}

function intersectScene(rayOrigin, rayDir) {
  let closest = null;
  for (let obj of objects) {
    let hit = intersectSphere(rayOrigin, rayDir, obj);
    if (hit && (!closest || hit.t < closest.t)) {
      closest = hit;
    }
  }
  return closest;
}

// ---------- ТРАССИРОВКА ЛУЧА ----------
const MAX_DEPTH = 4;

function trace(rayOrigin, rayDir, depth) {
  if (depth <= 0) return vec3(0, 0, 0);

  let hit = intersectScene(rayOrigin, rayDir);
  if (!hit) {
    // Градиент неба
    let t = 0.5 * (rayDir.y + 1.0);
    return add(
      mul(vec3(0.5, 0.7, 1.0), t),           // верх
      mul(vec3(1.0, 0.95, 0.85), 1.0 - t)    // горизонт
    );
  }

  let mat = hit.object.material;
  let pos = hit.point;
  let normal = hit.normal;
  let viewDir = normalize(mul(rayDir, -1));

  // Источник света?
  if (mat.emission.x > 0 || mat.emission.y > 0 || mat.emission.z > 0) {
    return mat.emission;
  }

  // Определяем реальный цвет материала (шахматный пол)
  let matColor = mat.color;
  if (mat.checker) {
    let scale = 2;
    let fx = Math.floor(pos.x * scale);
    let fz = Math.floor(pos.z * scale);
    if ((fx + fz) % 2 === 0) {
      matColor = vec3(0.9, 0.9, 0.9);
    } else {
      matColor = vec3(0.1, 0.1, 0.1);
    }
  }

  let color = vec3(0, 0, 0);

  // Ambient (окружающий свет)
  let ambient = vec3(0.03, 0.03, 0.04);
  color = add(color, vec3(matColor.x * ambient.x, matColor.y * ambient.y, matColor.z * ambient.z));

  // Прямое освещение от источников
  for (let light of objects) {
    if (!(light.material.emission.x > 0 || light.material.emission.y > 0 || light.material.emission.z > 0)) continue;
    let lightDir = normalize(sub(light.pos, pos));
    // Теневой луч
    let shadowHit = intersectScene(add(pos, mul(normal, 0.001)), lightDir);
    if (shadowHit && shadowHit.t < length(sub(light.pos, pos))) {
      continue; // в тени
    }
    let diff = Math.max(0, dot(normal, lightDir));
    color = add(color, mul(vec3(matColor.x * light.material.emission.x,
                                matColor.y * light.material.emission.y,
                                matColor.z * light.material.emission.z), diff));
  }

  // Отражение
  if (mat.mirror) {
    let reflDir = reflect(viewDir, normal);
    let reflColor = trace(add(pos, mul(normal, 0.001)), reflDir, depth - 1);
    color = add(color, reflColor);
  }

  // Преломление (стекло)
  if (mat.glass) {
    let entering = dot(normal, viewDir) < 0;
    let eta = entering ? 1.0 / mat.eta : mat.eta;
    let incident = entering ? mul(rayDir, -1) : rayDir;
    let N = entering ? normal : mul(normal, -1);
    let refrDir = refract(incident, N, eta);
    if (refrDir) {
      let refrColor = trace(add(pos, mul(N, -0.001)), refrDir, depth - 1);
      color = add(color, refrColor);
    } else {
      // полное внутреннее отражение
      let reflDir = reflect(viewDir, normal);
      let reflColor = trace(add(pos, mul(normal, 0.001)), reflDir, depth - 1);
      color = add(color, reflColor);
    }
  }

  return color;
}

// ---------- РЕНДЕРИНГ ----------
function render(width, height) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  // Камера и FOV
  const cameraPos = vec3(0.5, 1.2, 4.5);
  const fov = 65 * Math.PI / 180;
  const aspect = width / height;
  const halfHeight = Math.tan(fov / 2);
  const halfWidth = halfHeight * aspect;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = (x + 0.5) / width * 2 - 1;
      const sy = 1 - (y + 0.5) / height * 2;
      const rd = normalize(vec3(sx * halfWidth, sy * halfHeight, -1));
      const color = trace(cameraPos, rd, MAX_DEPTH);

      // Гамма-коррекция
      let r = Math.pow(Math.max(0, color.x), 1 / 2.2);
      let g = Math.pow(Math.max(0, color.y), 1 / 2.2);
      let b = Math.pow(Math.max(0, color.z), 1 / 2.2);

      const index = (y * width + x) * 4;
      pixels[index] = Math.min(255, Math.floor(r * 255));
      pixels[index + 1] = Math.min(255, Math.floor(g * 255));
      pixels[index + 2] = Math.min(255, Math.floor(b * 255));
      pixels[index + 3] = 255;
    }
  }
  return pixels;
}

// Обработчик сообщений
self.onmessage = (e) => {
  const { width, height } = e.data;
  const imageData = render(width, height);
  postMessage({ imageData: imageData.buffer }, [imageData.buffer]);
};