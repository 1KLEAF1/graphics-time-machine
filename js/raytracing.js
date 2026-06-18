// raytracing.js
const canvas = document.getElementById('rtCanvas');
const ctx = canvas.getContext('2d');
const button = document.getElementById('renderBtn');
const statusDiv = document.getElementById('status');

button.addEventListener('click', () => {
  button.disabled = true;
  statusDiv.textContent = 'Рендеринг... (подожди 2-3 секунды)';

  // Создаём Worker (отдельный поток)
  const worker = new Worker(
    new URL('./raytracer.worker.js', import.meta.url),
    { type: 'module' }
  );

  // Отправляем размеры и параметры (можно расширить)
  worker.postMessage({
    width: canvas.width,
    height: canvas.height
  });

  // Получаем изображение
  worker.onmessage = (e) => {
    const { imageData } = e.data;
    // imageData — Uint8ClampedArray, превращаем в ImageData и рисуем
    const img = new ImageData(
      new Uint8ClampedArray(imageData),
      canvas.width,
      canvas.height
    );
    ctx.putImageData(img, 0, 0);
    statusDiv.textContent = 'Готово!';
    button.disabled = false;
    worker.terminate();
  };

  worker.onerror = (err) => {
    statusDiv.textContent = 'Ошибка рендеринга. Проверь консоль.';
    button.disabled = false;
    console.error(err);
    worker.terminate();
  };
});