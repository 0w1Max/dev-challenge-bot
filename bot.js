const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();

// Замените 'YOUR_BOT_TOKEN' на свой токен бота
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Создаем или подключаемся к базе данных SQLite
const db = new sqlite3.Database('./database/challenge.db', (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('Подключено к базе данных.');
    // Создаем таблицу users, если она не существует
    db.run(`CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      username TEXT,
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Ошибка при создании таблицы users:', err.message);
        } else {
            console.log('Таблица users создана или уже существует.');
        }
    });
  }
});

// Функция для проверки, зарегистрирован ли пользователь
function isUserRegistered(telegramId, callback) {
    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
        if (err) {
            console.error('Ошибка при проверке регистрации пользователя:', err.message);
            return callback(err, null);
        }
        callback(null, !!row); // Возвращаем true, если пользователь найден, иначе false
    });
}

// Обработчик команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const username = msg.from.username;

  isUserRegistered(telegramId, (err, isRegistered) => {
        if (err) {
            return bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
        }
        if (isRegistered) {
            bot.sendMessage(chatId, `Привет, @${username}! Вы уже участвуете в челлендже!`);
        } else {
          const keyboard = {
              reply_markup: {
                  inline_keyboard: [[{
                      text: 'Участвовать в челлендже',
                      callback_data: 'register'
                  }]]
              }
          };

          bot.sendMessage(chatId, 'Привет! Хотите присоединиться к 100-дневному JavaScript челленджу?', keyboard);
        }
    });
});

// Обработчик нажатия на кнопку "Участвовать в челлендже"
bot.on('callback_query', (query) => {
    if (query.data === 'register') {
      const chatId = query.message.chat.id;
      const telegramId = query.from.id;
      const username = query.from.username;
      isUserRegistered(telegramId, (err, isRegistered) => {
          if(err) {
            return bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
          }
          if(isRegistered) {
              bot.sendMessage(chatId, 'Вы уже зарегистрированы!');
          } else {
              db.run('INSERT INTO users (telegram_id, username) VALUES (?, ?)', [telegramId, username], (err) => {
                  if (err) {
                      console.error('Ошибка при регистрации пользователя:', err.message);
                      bot.sendMessage(chatId, 'Произошла ошибка при регистрации. Попробуйте позже.');
                  } else {
                      bot.sendMessage(chatId, 'Отлично, вы зарегистрированы! Добро пожаловать в челлендж!');
                  }
              });
          }

        bot.answerCallbackQuery(query.id);
      });
  }
});

console.log('Бот запущен!');
