# WebSocket API для чат-сервиса

Данная документация описывает интеграцию с WebSocket API чат-сервиса для обеспечения коммуникации в реальном времени.

## Подключение

Для подключения к WebSocket серверу используйте Socket.IO клиент:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3014", {
  auth: {
    token: "jwt_token_here" // JWT токен аутентификации
  }
});

// Обработка ошибки подключения
socket.on("connect_error", (error) => {
  console.error("Ошибка подключения:", error.message);
});

// Обработка успешного подключения
socket.on("connect", () => {
  console.log("Подключено к WebSocket серверу");
});
```

## События

### Событие: Присоединение к чату поездки

Используется для подключения к комнате чата конкретной поездки.

**Отправка события**:
```javascript
socket.emit("join_ride", "ride123"); // rideId поездки
```

**Получение истории сообщений**:
```javascript
socket.on("chat_history", (messages) => {
  console.log("История сообщений:", messages);
  // Пример структуры messages:
  // [
  //   {
  //     id: "msg123",
  //     content: "Здравствуйте, я буду у подъезда через 5 минут",
  //     sender_id: "driver:456",
  //     receiver_id: "passenger:789",
  //     status: "read",
  //     timestamp: "2023-01-01T12:00:00Z"
  //   },
  //   ...
  // ]
});
```

### Событие: Присоединение к чату водитель-администратор

**Отправка события**:
```javascript
socket.emit("join_driver_admin_chat", "chat456"); // ID чата
```

**Получение истории**:
```javascript
socket.on("chat_history", (messages) => {
  // Обработка истории сообщений
});
```

### Событие: Присоединение к чату пассажир-администратор

**Отправка события**:
```javascript
socket.emit("join_passenger_admin_chat", "chat789"); // ID чата
```

**Получение истории**:
```javascript
socket.on("chat_history", (messages) => {
  // Обработка истории сообщений
});
```

### Событие: Присоединение к групповому чату

**Отправка события**:
```javascript
socket.emit("join_group_chat", "chat101"); // ID группового чата
```

**Получение истории**:
```javascript
socket.on("chat_history", (messages) => {
  // Обработка истории сообщений
});
```

### Событие: Отправка сообщения

Используется для отправки нового сообщения.

**Отправка события**:
```javascript
// Сообщение в чате поездки
socket.emit("send_message", {
  receiverId: "passenger:123", // ID получателя
  rideId: "ride456",           // ID поездки
  text: "Я на месте!"          // Текст сообщения
});

// Сообщение в чате водитель-администратор
socket.emit("send_message", {
  receiverId: "admin:789",     // ID получателя
  text: "У меня технический вопрос"
});

// Сообщение в групповом чате
socket.emit("send_message", {
  chatId: "chat101",           // ID группового чата
  text: "Всем привет!"
});
```

**Получение нового сообщения**:
```javascript
socket.on("new_message", (message) => {
  console.log("Новое сообщение:", message);
  // Пример структуры message:
  // {
  //   id: "msg999",
  //   content: "Я на месте!",
  //   sender_id: "driver:456",
  //   receiver_id: "passenger:123",
  //   chat_id: "chat456",
  //   status: "sent",
  //   timestamp: "2023-01-01T12:10:00Z"
  // }
});
```

### Событие: Отметка о прочтении сообщения

Используется для уведомления о прочтении сообщения.

**Отправка события для одного сообщения**:
```javascript
socket.emit("mark_as_read", { messageId: "msg123" });
```

**Отправка события для всех сообщений в чате**:
```javascript
socket.emit("mark_as_read", { chatId: "chat456" });
```

**Получение уведомления о прочтении сообщения**:
```javascript
socket.on("message_read", (data) => {
  console.log("Сообщение прочитано:", data);
  // Пример структуры data:
  // {
  //   messageId: "msg123",
  //   senderId: "driver:456",
  //   receiverId: "passenger:123",
  //   chatId: "chat789",
  //   timestamp: "2023-01-01T12:15:00Z"
  // }
});
```

**Получение уведомления о прочтении всех сообщений**:
```javascript
socket.on("all_messages_read", (data) => {
  console.log("Все сообщения прочитаны:", data);
  // Пример структуры data:
  // {
  //   chatId: "chat456",
  //   userId: "passenger:123",
  //   timestamp: "2023-01-01T12:20:00Z"
  // }
});
```

### Событие: Индикатор "печатает"

Используется для уведомления о том, что пользователь печатает сообщение.

**Отправка события**:
```javascript
// Начало печати
socket.emit("typing", { 
  chatId: "chat456", 
  isTyping: true 
});

// Окончание печати
socket.emit("typing", { 
  chatId: "chat456", 
  isTyping: false 
});
```

**Получение уведомления**:
```javascript
socket.on("user_typing", (data) => {
  console.log("Пользователь печатает:", data);
  // Пример структуры data:
  // {
  //   userId: "driver:456",
  //   chatId: "chat789",
  //   isTyping: true,
  //   timestamp: "2023-01-01T12:25:00Z"
  // }
});
```

### Событие: Обработка ошибок

**Получение ошибок**:
```javascript
socket.on("error", (error) => {
  console.error("Ошибка:", error.code, error.message);
  // Пример структуры error:
  // {
  //   code: "PERMISSION_DENIED",
  //   message: "You are not a participant of this chat"
  // }
});
```

## Полный пример интеграции

```javascript
// Подключение к серверу
const socket = io("http://localhost:3014", {
  auth: { token: "jwt_token_here" }
});

// Обработка подключения
socket.on("connect", () => {
  console.log("Подключено к серверу");
  
  // Если пользователь - водитель поездки
  if (isDriver) {
    socket.emit("join_ride", currentRideId);
  }
});

// Получение истории сообщений
socket.on("chat_history", (messages) => {
  renderMessages(messages);
});

// Получение новых сообщений
socket.on("new_message", (message) => {
  addMessageToChat(message);
  
  // Автоматически отмечаем сообщение как прочитанное
  socket.emit("mark_as_read", { messageId: message.id });
});

// Отправка сообщения
function sendMessage(text) {
  socket.emit("send_message", {
    receiverId: counterpartId,
    rideId: currentRideId,
    text: text
  });
}

// Отслеживание печати
const messageInput = document.getElementById("message-input");
let typingTimeout;

messageInput.addEventListener("input", () => {
  clearTimeout(typingTimeout);
  
  // Отправляем событие о начале печати
  socket.emit("typing", { 
    chatId: currentChatId, 
    isTyping: true 
  });
  
  // Устанавливаем таймаут для окончания печати
  typingTimeout = setTimeout(() => {
    socket.emit("typing", { 
      chatId: currentChatId, 
      isTyping: false 
    });
  }, 2000);
});

// Отображение индикатора печати
socket.on("user_typing", (data) => {
  if (data.userId !== myUserId) {
    if (data.isTyping) {
      showTypingIndicator(data.userId);
    } else {
      hideTypingIndicator(data.userId);
    }
  }
});

// Обработка ошибок
socket.on("error", (error) => {
  showErrorNotification(error.message);
});

// Отключение от сервера
function disconnect() {
  socket.disconnect();
}
```
