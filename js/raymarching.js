// ==================================================
//  Ray Marching с Three.js + пользовательский шейдер
//  Сцена: сфера, куб, плоскость, источник света, тени
// ==================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ----- Настройка Three.js -----
const container = document.getElementById('container');
const width = container.clientWidth;
const height = container.clientHeight;

// Рендерер WebGL
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
container.appendChild(renderer.domElement);

// Сцена (пустая, всё будет в шейдере)
const scene = new THREE.Scene();

// Камера — перспективная, позиция будет управляться OrbitControls
const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 50);
camera.position.set(0, 2, 6);

// OrbitControls для вращения сцены мышью
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // плавное движение
controls.target.set(0, 1, 0);

// ----- Создаём плоскость, которая занимает весь экран -----
// Она будет рисовать наш шейдер, как текстуру на весь экран
const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(width, height) },
    uCameraPos: { value: camera.position },
    uCameraMatrix: { value: camera.matrixWorldInverse },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv; // передаём текстурные координаты
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    // Здесь будет весь Ray Marching
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec3 uCameraPos;
    uniform mat4 uCameraMatrix; // обратная видовая матрица

    // ----- SDF функции (Signed Distance Functions) -----

    // Сфера: p - точка, центр в (0,1,0), радиус 0.5
    float sdSphere(vec3 p) {
      return length(p - vec3(0.0, 1.0, 0.0)) - 0.5;
    }

    // Куб: центр в (1, 0.5, 0), полустороны 0.3
    float sdBox(vec3 p, vec3 b) {
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    }

    // Плоскость (пол): бесконечная горизонтальная плоскость на уровне y = -0.5
    float sdPlane(vec3 p) {
      return p.y + 0.5;
    }

    // Объединение объектов (минимум расстояний)
    float map(vec3 p) {
      float sphere = sdSphere(p);
      float box = sdBox(p - vec3(1.0, 0.5, 0.0), vec3(0.3));
      float plane = sdPlane(p);
      return min(sphere, min(box, plane));
    }

    // Функция для вычисления нормали в точке поверхности
    vec3 calcNormal(vec3 p) {
      const vec2 e = vec2(0.001, 0.0); // маленький шаг
      return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
      ));
    }

    // Источник света: положение и цвет
    vec3 lightPos = vec3(2.0, 3.0, 2.0);
    vec3 lightColor = vec3(1.0, 0.95, 0.8);

    // Маршинг луча: возвращает точку столкновения и количество шагов
    float rayMarch(vec3 ro, vec3 rd, out vec3 hitPos) {
      float t = 0.0;
      for (int i = 0; i < 80; i++) {
        vec3 p = ro + rd * t;
        float d = map(p);
        if (d < 0.001) {
          hitPos = p;
          return t;
        }
        t += d;
        if (t > 20.0) break;
      }
      return -1.0; // не попали
    }

    // Проверка, освещена ли точка (луч от точки к источнику света)
    float shadow(vec3 pos, vec3 lightDir) {
      float t = 0.01; // стартуем чуть дальше, чтобы не пересечь самого себя
      for (int i = 0; i < 32; i++) {
        float d = map(pos + lightDir * t);
        if (d < 0.001) return 0.0; // в тени
        t += d;
        if (t > length(lightPos - pos)) break;
      }
      return 1.0; // свет достигает
    }

    void main() {
      // Нормализованные координаты пикселя (от -1 до 1 с учётом пропорций)
      vec2 uv = (vUv - 0.5) * 2.0;
      uv.x *= uResolution.x / uResolution.y;

      // Позиция камеры в мировом пространстве
      vec3 ro = uCameraPos;

      // Направление луча из камеры через пиксель
      // Умножаем направление из камеры (0,0,-1) на обратную видовую матрицу
      vec4 rayDirCam = vec4(uv.x, uv.y, -1.0, 0.0);
      vec4 rayDirWorld = uCameraMatrix * rayDirCam;
      vec3 rd = normalize(rayDirWorld.xyz);

      // Фон: небо
      vec3 bgColor = vec3(0.1, 0.1, 0.2);

      // Запускаем маршинг
      vec3 hitPos;
      float dist = rayMarch(ro, rd, hitPos);

      if (dist < 0.0) {
        // Луч ничего не задел — рисуем фон
        gl_FragColor = vec4(bgColor, 1.0);
        return;
      }

      // Получили точку пересечения
      vec3 pos = hitPos;
      vec3 normal = calcNormal(pos);

      // Направление к источнику света
      vec3 lightDir = normalize(lightPos - pos);

      // Проверяем тень
      float shadowFactor = shadow(pos, lightDir);

      // Освещение по Фонгу (простая версия)
      float diff = max(dot(normal, lightDir), 0.0);
      vec3 ambient = vec3(0.05);
      vec3 diffuse = lightColor * diff * shadowFactor;

      // Отражённый свет (specular)
      vec3 viewDir = normalize(ro - pos);
      vec3 reflectDir = reflect(-lightDir, normal);
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
      vec3 specular = lightColor * spec * shadowFactor;

      // Цвет объекта — зависит от того, какой объект мы задели
      // Определим грубо: если pos.y близко к плоскости, то серый пол,
      // иначе если расстояние до центра сферы мало — красный, иначе синий куб.
      vec3 col;
      if (pos.y < -0.4) {
        col = vec3(0.5, 0.5, 0.5); // пол
      } else if (length(pos - vec3(0.0, 1.0, 0.0)) < 0.6) {
        col = vec3(0.9, 0.2, 0.2); // сфера красная
      } else {
        col = vec3(0.2, 0.2, 0.9); // куб синий
      }

      // Собираем финальный цвет
      vec3 finalColor = col * (ambient + diffuse) + specular;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
});

const quad = new THREE.Mesh(geometry, material);
scene.add(quad);

// ----- Анимация -----
function animate() {
  requestAnimationFrame(animate);

  // Обновляем время (можно анимировать что-то)
  material.uniforms.uTime.value += 0.01;

  // Обновляем позицию камеры и матрицу для шейдера
  material.uniforms.uCameraPos.value.copy(camera.position);
  material.uniforms.uCameraMatrix.value.copy(camera.matrixWorldInverse);

  controls.update();

  // Рендерим плоскость (она покрывает весь экран и выполняет шейдер)
  renderer.render(scene, camera);
}

animate();

// Обработчик изменения размера окна
window.addEventListener('resize', () => {
  const newWidth = container.clientWidth;
  const newHeight = container.clientHeight;
  renderer.setSize(newWidth, newHeight);
  camera.aspect = newWidth / newHeight;
  camera.updateProjectionMatrix();
  material.uniforms.uResolution.value.set(newWidth, newHeight);
});