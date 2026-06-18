// server.js — Бэкенд для Graphics Time Machine
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Секретный ключ для JWT (в реальном проекте — из переменной окружения)
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

// Подключаем БД
const db = new Database('database.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page TEXT NOT NULL,
    ip TEXT NOT NULL,
    user_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
`);

// Добавим поле user_id, если его ещё нет (миграция)
try {
  db.exec(`ALTER TABLE visits ADD COLUMN user_id INTEGER REFERENCES users(id)`);
} catch (e) { /* поле уже существует */ }

// Middleware
app.use(express.json()); // парсить JSON
app.use(cookieParser()); // парсить куки
// Расшифровка JWT для всех запросов
app.use((req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) { /* невалидный токен — идём без пользователя */ }
  }
  next();
});

app.use(express.static(path.join(__dirname, 'dist'))); // раздача статики после сборки

// Для разработки: проксировать запросы с Vite (позже уберём)
// Но пока мы запускаем сервер отдельно, а Vite – отдельно. Настроим CORS? Нет, будем просто ходить на тот же порт.
// Уточнение: в разработке фронт на vite (5173), а бэк на 3000. Нужен прокси в vite.config.js.
// Пока оставим так: сервер отдаёт статику только в продакшене.

// ---------- API: Счётчик посещений ----------

// Защита от накрутки: не более одного посещения с одного IP за 10 секунд
app.post('/api/visit', (req, res) => {
  const page = req.body.page || 'unknown';
  const ip = req.ip || req.connection.remoteAddress;
  const userId = req.user ? req.user.id : null;

  // Защита от накрутки: не более одного визита с одного IP за 10 секунд
  const recent = db.prepare(`
    SELECT id FROM visits 
    WHERE ip = ? AND page = ? 
    AND timestamp > datetime('now', '-10 seconds')
  `).get(ip, page);
  if (recent) {
    return res.json({ message: 'already counted' });
  }

  db.prepare('INSERT INTO visits (page, ip, user_id) VALUES (?, ?, ?)').run(page, ip, userId);
  res.json({ message: 'counted' });
});

// Общее количество посещений
app.get('/api/visits/total', (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM visits').get();
  res.json({ total: row.count });
});

// ---------- API: Аутентификация ----------

// Регистрация
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 3) {
    return res.status(400).json({ error: 'Логин и пароль (мин. 3 символа) обязательны' });
  }
  // Проверим, нет ли такого пользователя
const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (exists) {
  return res.status(400).json({ error: 'Пользователь уже существует' });
}
const hash = bcrypt.hashSync(password, 10);
const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
const newUserId = info.lastInsertRowid; // получаем реальный id
const token = jwt.sign({ username, id: newUserId }, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 86400 * 1000 });
  res.json({ message: 'Регистрация успешна' });
});

// Вход
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Логин и пароль обязательны' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const token = jwt.sign({ username: user.username, id: user.id }, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 86400 * 1000 });
  res.json({ message: 'Вход выполнен' });
});

// Проверка токена (для админки)
app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Не авторизован' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ username: decoded.username });
  } catch (e) {
    res.status(401).json({ error: 'Токен недействителен' });
  }
});

// Выход
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Вы вышли' });
});

// ---------- API: Статистика (защищённая) ----------

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Не авторизован' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Не авторизован' });
  }
}

// Статистика по дням и страницам
app.get('/api/stats', authMiddleware, (req, res) => {
  // Общее количество
  const total = db.prepare('SELECT COUNT(*) as count FROM visits').get().count;
  // По страницам
  const byPage = db.prepare('SELECT page, COUNT(*) as count FROM visits GROUP BY page').all();
  // За последние 7 дней по дням
  const byDay = db.prepare(`
    SELECT date(timestamp) as day, COUNT(*) as count 
    FROM visits 
    WHERE timestamp > datetime('now', '-7 days')
    GROUP BY day ORDER BY day DESC
  `).all();

  res.json({ total, byPage, byDay });
});

app.get('/api/user/stats', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Не авторизован' });

  // Количество посещений пользователем
  const countRow = db.prepare('SELECT COUNT(*) as count FROM visits WHERE user_id = ?').get(req.user.id);
  // Последние 10 визитов
  const visits = db.prepare('SELECT page, timestamp FROM visits WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10').all(req.user.id);

  res.json({
    username: req.user.username,
    totalVisits: countRow.count,
    recentVisits: visits
  });
});

// ---------- Раздача статики для продакшена (если не через Vite) ----------
// В продакшене мы будем раздавать собранный фронт из папки dist
// Уже задано выше: app.use(express.static(path.join(__dirname, 'dist')));
// Но чтобы работали HTML страницы, нужно корректно отдавать index.html для SPA? У нас MPA.
// Для всех .html файлов, которые лежат в dist, express.static справится.
// Однако для админки и логина мы тоже должны их туда положить при сборке.

// Для разработки: запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});