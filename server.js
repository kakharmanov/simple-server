const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const usersFile = './data/users.json'; // ✅ Добавь эту строку

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

let books = JSON.parse(fs.readFileSync('./data/books.json', 'utf-8'));
let comments = JSON.parse(fs.readFileSync('./data/comments.json', 'utf-8'));
let users = JSON.parse(fs.readFileSync(usersFile, 'utf-8')); // т

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    // Создаем копию объекта, чтобы не отдавать пароль
    const { password, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
    });
  } else {
    res.status(401).json({ message: 'Неверный логин или пароль' });
  }
});

app.get('/api/users', (req, res) => {
  res.json(users.map(({ password, ...user }) => user)); // не отдаём пароли
});

app.post('/api/create-user', (req, res) => {
  const { username, password, name, role = 'user' } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ message: 'Все поля обязательны' });
  }

  const existingUser = users.find((u) => u.username === username);
  if (existingUser) {
    return res
      .status(409)
      .json({ message: 'Пользователь с таким логином уже существует' });
  }

  const newUser = {
    id: Date.now(),
    username,
    password, // В продакшене ХЕШИРУЕМ
    name,
    role,
    preferredGenres: [],
    favorites: [],
    readLater: [],
    readBooks: [],
    readingProgress: [],
    ratings: [],
    stats: {
      totalBooksRead: 0,
      totalPagesRead: 0,
      pagesReadByGenre: {},
    },
  };

  users.push(newUser);
  saveUsers(users);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

app.delete('/api/users/:id', (req, res) => {
  const id = parseInt(req.params.id);

  const index = users.findIndex((u) => u.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'Пользователь не найден' });
  }

  users.splice(index, 1); // Удаляем пользователя из массива
  saveUsers(users); // Сохраняем изменения в файл

  res.json({ message: 'Пользователь удалён' });
});

function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8');
}

app.get('/api/books', (req, res) => {
  res.json(books);
});

app.get('/api/comments', (req, res) => {
  const { bookId } = req.query;

  if (!bookId) {
    return res.status(400).json({ message: 'Нужен bookId' });
  }

  const filtered = comments.filter((c) => c.bookId === Number(bookId));
  res.json(filtered);
});

app.post('/api/comments', (req, res) => {
  const { bookId, author, text, userId } = req.body;

  if (!bookId || !author || !text || !userId) {
    return res
      .status(400)
      .json({ message: 'Нужны bookId, author, text и userId' });
  }

  const comment = {
    id: Date.now(),
    bookId,
    userId,
    author,
    text,
    date: new Date().toISOString(),
  };

  comments.push(comment);
  saveComments();
  res.json(comment);
});

app.put('/api/comments/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = comments.findIndex((c) => c.id === id);
  if (index !== -1) {
    comments[index] = { ...comments[index], ...req.body };
    saveComments();
    res.json(comments[index]);
  } else {
    res.status(404).json({ message: 'Комментарий не найден' });
  }
});

app.delete('/api/comments/:id', (req, res) => {
  const id = parseInt(req.params.id);
  comments = comments.filter((c) => c.id !== id);
  saveComments();
  res.json({ message: 'Комментарий удалён' });
});

function saveComments() {
  fs.writeFileSync('./data/comments.json', JSON.stringify(comments, null, 2));
}

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
