// js/auth.js — обработка логина/регистрации
const form = document.getElementById('loginForm');
const msg = document.getElementById('message');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  msg.textContent = data.message || data.error;
  if (res.ok) {
    sessionStorage.removeItem('visit_sent'); // сбросим флаг, чтобы следующий визит засчитался с авторизацией
    window.location.href = '/';
  }
});

document.getElementById('registerBtn').addEventListener('click', async () => {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  if (!username || password.length < 3) {
    msg.textContent = 'Пароль минимум 3 символа';
    return;
  }
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  msg.textContent = data.message || data.error;
  if (res.ok) {
    sessionStorage.removeItem('visit_sent'); // сбросим флаг, чтобы следующий визит засчитался с авторизацией
    window.location.href = '/';
  }
});