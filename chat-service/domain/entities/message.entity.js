import { DomainException } from "../exceptions/domain.exception.js";
import { FileAttachment } from "../value-objects/user.js";

export class MessageEntity {
    #id;
    #content;
    #senderId;
    #receiverId;
    #rideId;
    #attachments;
    #status;
    #timestamps;
    #edited = false;

    constructor({
                    id,
                    content,
                    senderId,
                    receiverId,
                    rideId = null,
                    attachments = [],
                    status = 'sent',
                    sentAt = new Date(),
                    deliveredAt = null,
                    readAt = null
                }) {
        this.#validateInput(id, content, senderId, receiverId);

        this.#id = id;
        this.#content = content;
        this.#senderId = senderId;
        this.#receiverId = receiverId;
        this.#rideId = rideId;
        this.#attachments = attachments.map(a => new FileAttachment(a));
        this.#status = status;
        this.#timestamps = {
            sent: sentAt,
            delivered: deliveredAt,
            read: readAt
        };
    }

    get id() { return this.#id; }
    get content() { return this.#content; }
    get senderId() { return this.#senderId; }
    get receiverId() { return this.#receiverId; }
    get rideId() { return this.#rideId; }
    get attachments() { return [...this.#attachments]; }
    get status() { return this.#status; }
    get timestamps() { return { ...this.#timestamps }; }
    get edited() { return this.#edited; }

    addAttachment(file) {
        const attachment = new FileAttachment(file);
        this.#attachments.push(attachment);
        this.#logAction('Attachment added');
    }

    removeAttachment(attachmentId) {
        const index = this.#attachments.findIndex(a => a.id === attachmentId);
        if (index === -1) throw new DomainException('Attachment not found');
        this.#attachments.splice(index, 1);
        this.#logAction('Attachment removed');
    }

    markDelivered() {
        if (this.#status !== 'sent') return;
        this.#status = 'delivered';
        this.#timestamps.delivered = new Date();
    }

    markRead() {
        if (this.#status !== 'delivered') return;
        this.#status = 'read';
        this.#timestamps.read = new Date();
    }

    editContent(newContent, editorId) {
        if (editorId !== this.#senderId) {
            throw new DomainException('Only sender can edit message');
        }
        this.#validateContent(newContent);
        this.#content = newContent;
        this.#edited = true;
        this.#logAction('Message edited');
    }

    #validateInput(id, content, senderId, receiverId) {
        const MAX_CONTENT_LENGTH = 2000;

        if (!id) throw new DomainException('Message ID is required');
        if (senderId === receiverId) throw new DomainException('Cannot send message to yourself');

        if (content.length > MAX_CONTENT_LENGTH) {
            throw new DomainException(`Message exceeds ${MAX_CONTENT_LENGTH} characters`);
        }
    }

    #validateContent(content) {
        if (content.trim().length === 0) {
            throw new DomainException('Message content cannot be empty');
        }
    }

    #logAction(message) {
        console.log(`[MESSAGE ${this.#id}] ${message}`);
    }

    toJSON() {
        return {
            id: this.#id,
            content: this.#content,
            senderId: this.#senderId,
            receiverId: this.#receiverId,
            rideId: this.#rideId,
            attachments: this.#attachments.map(a => a.toJSON()),
            status: this.#status,
            timestamps: this.#timestamps,
            edited: this.#edited
        };
    }
}