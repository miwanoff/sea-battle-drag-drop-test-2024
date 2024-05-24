const express = require("express");
const path = require("path");
const http = require("http");
const PORT = process.env.PORT || 3000;
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Приєднуємо статичні файли
app.use(express.static(path.join(__dirname, "public")));

// Запускаємо сервер
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Обробка запиту на підключення до сокета від веб-клієнта
let connections = [null, null];

io.on("connection", (socket) => {
  console.log("New WS Connection");
  // Знайдемо  номер для гравця
  let playerIndex = -1;
  for (const i in connections) {
    if (connections[i] == null) {
      playerIndex = i;
      break;
    }
  }

  // Ігноруємо третього гравця
  if (playerIndex === -1) return;

  // Сповіщаємо гравця, що приєднався, про його номер
  socket.emit("player-number", playerIndex);
  console.log(`player ${playerIndex} has connected`);

  connections[playerIndex] = false;

  // Оповістити всіх, який номер гравця щойно підключився
  socket.broadcast.emit("player-connection", playerIndex);

  // Підтримка роз'єднання
  socket.on("disconnect", () => {
    console.log(`Player ${playerIndex} disconnected`);
    connections[playerIndex] = null;
    // Оповістити всіх, який номер гравця щойно від'єднався
    socket.broadcast.emit("player-connection", playerIndex);
  });

  // Підтримка готовності гравця
  socket.on("player-ready", () => {
    socket.broadcast.emit("enemy-ready", playerIndex);
    connections[playerIndex] = true;
  });

  // Перевірка приєднання гравця
  socket.on("check-players", () => {
    const players = [];
    for (const i in connections) {
      connections[i] === null
        ? players.push({ connected: false, ready: false })
        : players.push({ connected: true, ready: connections[i] });
    }
    socket.emit("check-players", players);
  });

  // Обробка сповіщення про постріл
  socket.on("fire", (id) => {
    console.log(`Shot fired from ${playerIndex}`, id);

    // Emit the move to the other player
    socket.broadcast.emit("fire", id);
  });

  // on Fire Reply
  socket.on("fire-reply", (classList) => {
    console.log("fire-reply");
    console.log(classList);

    // Forward the reply to the other player
    socket.broadcast.emit("fire-reply", classList);
  });
});
