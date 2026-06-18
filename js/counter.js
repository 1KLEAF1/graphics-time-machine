// js/counter.js — обновляет счётчик на всех страницах
(async () => {
  // Отправляем посещение (один раз за сессию)
  if (!sessionStorage.getItem('visit_sent')) {
    const page = document.location.pathname.replace('/', '') || 'index';
    try {
      await fetch('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page })
      });
      sessionStorage.setItem('visit_sent', '1');
    } catch (e) { /* сервер не доступен */ }
  }

  // Показываем общее количество
  const counterEl = document.getElementById('visit-counter');
  if (counterEl) {
    try {
      const res = await fetch('/api/visits/total');
      const data = await res.json();
      counterEl.textContent = data.total;
    } catch (e) {
      counterEl.textContent = '...';
    }
  }
})();