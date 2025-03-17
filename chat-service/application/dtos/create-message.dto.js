export class CreateMessageDTO {
    constructor({ senderId, receiverId, text, rideId }) {
        if (!senderId || !receiverId || !rideId) {
            throw new Error('Sender, Receiver, and RideId are required');
        }

        this.senderId = senderId;
        this.receiverId = receiverId;
        this.text = text;
        this.rideId = rideId;
    }
}
