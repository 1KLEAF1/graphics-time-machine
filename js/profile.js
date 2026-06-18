// js/profile.js — личный кабинет пользователя
(async () => {
  // Проверка авторизации и получение имени
  const meRes = await fetch('/api/auth/me');
  if (!meRes.ok) {
    window.location.href = '/login.html';
    return;
  }
  const meData = await meRes.json();
  document.getElementById('username-display').textContent = meData.username;

  // Загрузка персональной статистики
  const statsRes = await fetch('/api/user/stats');
  if (statsRes.status === 401) {
    window.location.href = '/login.html';
    return;
  }
  const data = await statsRes.json();

  let html = `<p>Всего ваших посещений: <strong>${data.totalVisits}</strong></p>`;
  if (data.recentVisits.length > 0) {
    html += '<h3>Последние визиты</h3><ul>';
    data.recentVisits.forEach(v => {
      const date = new Date(v.timestamp + 'Z').toLocaleString('ru-RU');
      html += `<li>${date} — страница «${v.page}»</li>`;
    });
    html += '</ul>';
  } else {
    html += '<p>У вас пока нет записанных посещений.</p>';
  }
  document.getElementById('stats').innerHTML = html;

  // Обработчик выхода
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });
})();