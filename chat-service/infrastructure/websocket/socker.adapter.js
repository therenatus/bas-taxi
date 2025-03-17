// файл: infrastructure/websocket/socket.adapter.js
import { Server } from 'socket.io';

export class SocketIOAdapter {
    constructor(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || '*',
                methods: ['GET', 'POST']
            }
        });
    }

    // Инициализация обработчиков для заданных пространств имён (namespaces)
    initializeHandlers(handlers) {
        handlers.forEach(({ path, handler }) => {
            const namespace = this.io.of(path);
            namespace.on('connection', handler);
        });
    }

    // Метод publish, который используется в ChatService для отправки событий
    publish(eventType, payload) {
        this.io.emit(eventType, payload);
        console.log(`SocketIOAdapter: Published event "${eventType}"`, payload);
    }

    // Отправка события в конкретную комнату
    emitToRoom(room, event, data) {
        this.io.to(room).emit(event, data);
    }
}
