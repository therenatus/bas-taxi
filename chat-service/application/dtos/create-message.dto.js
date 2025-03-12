export class CreateMessageDTO {
    constructor({ senderId, receiverId, text, file, rideId }) {
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.text = text;
        this.file = file;
        this.rideId = rideId;
        this.#validate();
    }

    #validate = () => {
        if (!this.senderId || !this.receiverId) {
            throw new Error('Missing participants');
        }

        if (!this.text && !this.file) {
            throw new Error('Message content required');
        }
    };
}