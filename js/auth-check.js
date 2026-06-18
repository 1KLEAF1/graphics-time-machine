// auth-check.js — проверка авторизации и отображение кнопок входа/админки
(async () => {
  const container = document.getElementById('auth-status');
  if (!container) return;

  // Проверяем, авторизован ли пользователь
  let user = null;
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      user = await res.json();
    }
  } catch (e) { /* сервер не доступен */ }

  if (user && user.username) {
    // Авторизован — показываем кнопки админки и выхода
    container.innerHTML = `
      <a href="/profile.html" style="color: var(--accent); margin-right: 1rem;">Личный кабинет</a>
      <a href="#" id="logout-link" style="color: var(--text);">Выйти</a>
    `;
    document.getElementById('logout-link').addEventListener('click', async (e) => {
      e.preventDefault();
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
    });
  } else {
    // Не авторизован — кнопка "Войти"
    container.innerHTML = `<a href="/login.html" style="color: var(--accent);">Войти</a>`;
  }
})();