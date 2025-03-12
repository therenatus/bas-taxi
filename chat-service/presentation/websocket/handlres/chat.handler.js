export class ChatHandler {
    #io;
    #chatService;

    constructor(io, chatService) {
        this.#io = io;
        this.#chatService = chatService;
    }

    initialize = () => {
        this.#io.use(this.#authenticate);
        this.#io.on("connection", this.#handleConnection);
    };

    #authenticate = async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            socket.user = await this.#chatService.verifyToken(token);
            next();
        } catch (error) {
            next(new Error("Authentication failed"));
        }
    };

    #handleConnection = (socket) => {
        socket.on("join_ride", this.#handleJoinRide(socket));
        socket.on("send_message", this.#handleSendMessage(socket));
        socket.on("disconnect", this.#handleDisconnect(socket));
    };

    #handleJoinRide = (socket) => async (rideId) => {
        try {
            const messages = await this.#chatService.getRideChat(
                rideId,
                socket.user
            );
            socket.join(`ride_${rideId}`);
            socket.emit("chat_history", messages);
        } catch (error) {
            socket.emit("error", {
                code: "JOIN_ERROR",
                message: error.message
            });
        }
    };

    #handleSendMessage = (socket) => async (message) => {
        try {
            const savedMessage = await this.#chatService.sendMessage({
                ...message,
                senderId: socket.user.id
            });

            this.#io.to(`ride_${message.rideId}`).emit("new_message", savedMessage);
        } catch (error) {
            socket.emit("error", {
                code: "MESSAGE_ERROR",
                message: error.message
            });
        }
    };
}