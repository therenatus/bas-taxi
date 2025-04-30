export class ChatHandler {
  #io;
  #chatService;
  #authService;

  constructor(io, chatService, authService) {
    this.#io = io;
    this.#chatService = chatService;
    this.#authService = authService;
  }

  initialize = () => {
    this.#io.use(this.#authenticate);
    this.#io.on("connection", this.#handleConnection);
  };

  #authenticate = async (socket, next) => {
    try {
      console.log("=== Начало аутентификации WebSocket ===");
      const token = socket.handshake.auth.token;
      console.log("Полученный токен:", token);

      if (!token) {
        console.log("Токен не предоставлен");
        return next(new Error("Токен не предоставлен"));
      }

      socket.user = await this.#authService.verifyToken(token);
      console.log("Пользователь аутентифицирован:", socket.user);
      next();
    } catch (error) {
      console.error("Ошибка аутентификации:", error.message);
      next(new Error("Authentication failed"));
    }
  };

  #handleConnection = (socket) => {
    socket.on("join_ride", this.#handleJoinRide(socket));
    socket.on("send_message", this.#handleSendMessage(socket));
    socket.on("disconnect", this.#handleDisconnect(socket));
    socket.on(
      "join_driver_admin_chat",
      this.#handleJoinDriverAdminChat(socket)
    );
    socket.on(
      "join_passenger_admin_chat",
      this.#handleJoinPassengerAdminChat(socket)
    );
    socket.on("join_group_chat", this.#handleJoinGroupChat(socket));
    socket.on("mark_as_read", this.#handleMarkAsRead(socket));
    socket.on("typing", this.#handleTyping(socket));
  };

  #handleJoinRide = (socket) => async (rideId) => {
    try {
      const messages = await this.#chatService.getRideChat(rideId, socket.user);
      socket.join(`ride_${rideId}`);
      socket.emit("chat_history", messages);
    } catch (error) {
      socket.emit("error", {
        code: "JOIN_ERROR",
        message: error.message,
      });
    }
  };

  #handleJoinDriverAdminChat = (socket) => async (chatId) => {
    try {
      // Проверяем, является ли пользователь участником этого чата
      const chats = await this.#chatService.getDriverAdminChats(socket.user.id);
      const isParticipant = chats.some((chat) => chat.id === chatId);

      if (!isParticipant) {
        throw new Error("Вы не являетесь участником этого чата");
      }

      // Получаем историю сообщений
      const messages = await this.#chatService.getChatHistory({
        chatId,
        userId: socket.user.id,
      });

      // Подписываемся на канал чата
      socket.join(`driver_admin_chat_${chatId}`);

      // Отправляем историю сообщений
      socket.emit("chat_history", messages);
    } catch (error) {
      socket.emit("error", {
        code: "JOIN_ERROR",
        message: error.message,
      });
    }
  };

  #handleJoinPassengerAdminChat = (socket) => async (chatId) => {
    try {
      // Проверяем, является ли пользователь участником этого чата
      const chats = await this.#chatService.getChatsByType(
        "passenger_admin",
        socket.user.id
      );
      const isParticipant = chats.some((chat) => chat.id === chatId);

      if (!isParticipant) {
        throw new Error("Вы не являетесь участником этого чата");
      }

      // Получаем историю сообщений
      const messages = await this.#chatService.getChatHistory({
        chatId,
        userId: socket.user.id,
      });

      // Подписываемся на канал чата
      socket.join(`passenger_admin_chat_${chatId}`);

      // Отправляем историю сообщений
      socket.emit("chat_history", messages);
    } catch (error) {
      socket.emit("error", {
        code: "JOIN_ERROR",
        message: error.message,
      });
    }
  };

  #handleJoinGroupChat = (socket) => async (chatId) => {
    try {
      // Проверяем, является ли пользователь участником этого чата
      const chats = await this.#chatService.getChatsByType(
        "group",
        socket.user.id
      );
      const isParticipant = chats.some((chat) => chat.id === chatId);

      if (!isParticipant) {
        throw new Error("Вы не являетесь участником этого чата");
      }

      // Получаем историю сообщений
      const messages = await this.#chatService.getChatHistory({
        chatId,
        userId: socket.user.id,
      });

      // Подписываемся на канал чата
      socket.join(`group_chat_${chatId}`);

      // Отправляем историю сообщений
      socket.emit("chat_history", messages);
    } catch (error) {
      socket.emit("error", {
        code: "JOIN_ERROR",
        message: error.message,
      });
    }
  };

  #handleMarkAsRead = (socket) => async (data) => {
    try {
      const { messageId, chatId } = data;

      if (!messageId && !chatId) {
        throw new Error("Необходимо указать ID сообщения или чата");
      }

      if (messageId) {
        // Отмечаем конкретное сообщение как прочитанное
        await this.#chatService.markMessageAsRead(messageId, socket.user.id);
      } else if (chatId) {
        // Отмечаем все сообщения в чате как прочитанные
        await this.#chatService.markAllMessagesAsRead(chatId, socket.user.id);
      }

      // Отправляем подтверждение клиенту
      socket.emit("messages_read", { success: true, messageId, chatId });
    } catch (error) {
      socket.emit("error", {
        code: "READ_ERROR",
        message: error.message,
      });
    }
  };

  #handleTyping = (socket) => async (data) => {
    try {
      const { chatId, isTyping } = data;

      if (!chatId) {
        throw new Error("Необходимо указать ID чата");
      }

      // Получаем информацию о чате
      const chat = await this.#chatService.getChatById(chatId);

      if (!chat) {
        throw new Error("Чат не найден");
      }

      // Проверяем, что пользователь является участником чата
      if (!chat.participantIds.includes(socket.user.id)) {
        throw new Error("Вы не являетесь участником этого чата");
      }

      // Отправляем всем участникам чата уведомление о печати
      const eventName =
        chat.type === "ride"
          ? `ride_${chat.ride_id}`
          : `${chat.type}_chat_${chat.id}`;

      this.#io.to(eventName).emit("user_typing", {
        userId: socket.user.id,
        chatId,
        isTyping,
        timestamp: new Date(),
      });
    } catch (error) {
      socket.emit("error", {
        code: "TYPING_ERROR",
        message: error.message,
      });
    }
  };

  #handleSendMessage = (socket) => async (message) => {
    try {
      const savedMessage = await this.#chatService.sendMessage({
        ...message,
        senderId: socket.user.id,
      });

      this.#io.to(`ride_${message.rideId}`).emit("new_message", savedMessage);
    } catch (error) {
      socket.emit("error", {
        code: "MESSAGE_ERROR",
        message: error.message,
      });
    }
  };

  #handleDisconnect = (socket) => () => {
    console.log(`User ${socket.user.id} disconnected`);
  };
}
