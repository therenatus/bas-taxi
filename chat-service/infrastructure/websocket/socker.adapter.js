import socketio from 'socket.io';

class SocketIOAdapter {
    constructor(server) {
        this.io = socketio(server, {
            cors: {
                origin: process.env.CORS_ORIGIN,
                methods: ['GET', 'POST']
            }
        });
    }

    initializeHandlers(handlers) {
        handlers.forEach(({ path, handler }) => {
            const namespace = this.io.of(path);
            namespace.on('connection', handler);
        });
    }

    emitToRoom(room, event, data) {
        this.io.to(room).emit(event, data);
    }
}