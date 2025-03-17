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

    publish(eventType, payload) {
        this.io.emit(eventType, payload);
        console.log(`SocketIOAdapter: Published event "${eventType}"`, payload);
    }

    emitToRoom(room, event, data) {
        this.io.to(room).emit(event, data);
    }

    initializeHandlers(handlers) {
        handlers.forEach(({ path, handler }) => {
            const namespace = this.io.of(path);
            namespace.on('connection', handler);
        });
    }
}
