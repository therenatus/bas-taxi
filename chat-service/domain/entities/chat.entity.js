import {DomainException} from "../exceptions/domain.exception.js";

export class ChatEntity {
    #id;
    #participants;
    #rideId;
    #messages;
    #status;
    #createdAt;
    #updatedAt;

    constructor({
                    id,
                    participants,
                    rideId = null,
                    messages = [],
                    status = 'active',
                    createdAt = new Date(),
                    updatedAt = new Date()
                }) {
        this.#validateParticipants(participants);

        // Дополнительные проверки данных участников
        if (!Array.isArray(participants) || participants.some(p => !p.id)) {
            throw new DomainException("Each participant must have an 'id'");
        }

        this.#id = id;
        this.#participants = new Map(participants.map(p => [p.id, p]));
        this.#rideId = rideId;
        this.#messages = messages;
        this.#status = status;
        this.#createdAt = createdAt;
        this.#updatedAt = updatedAt;
    }

    get id() { return this.#id; }
    get participants() { return [...this.#participants.values()]; }
    get rideId() { return this.#rideId; }
    get messages() { return [...this.#messages]; }
    get status() { return this.#status; }
    get createdAt() { return this.#createdAt; }
    get updatedAt() { return this.#updatedAt; }

    addParticipant(user) {
        if (this.#participants.has(user.id)) {
            throw new DomainException("User already in chat");
        }

        if (this.#rideId && !user.canAccessRide(this.#rideId)) {
            throw new DomainException("User has no access to ride");
        }

        this.#participants.set(user.id, user);
        this.#updateTimestamp();
    }

    postMessage(message) {
        if (this.#status !== 'active') {
            throw new DomainException("Cannot post to archived chat");
        }

        if (!this.#participants.has(message.senderId)) {
            throw new DomainException("Sender not in chat");
        }

        this.#messages.push(message);
        this.#updateTimestamp();
    }

    archive() {
        this.#status = 'archived';
        this.#updateTimestamp();
    }

    linkToRide(ride) {
        if (this.#rideId) {
            throw new DomainException("Chat already linked to ride");
        }

        this.#rideId = ride.id;
        this.#updateTimestamp();
    }

    #validateParticipants(participants) {
        if (participants.length < 2) {
            throw new DomainException("Chat requires at least 2 participants");
        }

        const rolesCount = participants.reduce((acc, p) => {
            acc[p.role] = (acc[p.role] || 0) + 1;
            return acc;
        }, {});

        if (rolesCount.driver > 1) {
            throw new DomainException("Chat cannot have multiple drivers");
        }
    }

    #updateTimestamp() {
        this.#updatedAt = new Date();
    }

    toJSON() {
        return {
            id: this.#id,
            participants: this.participants,
            rideId: this.#rideId,
            messageCount: this.#messages.length,
            status: this.#status,
            createdAt: this.#createdAt,
            updatedAt: this.#updatedAt
        };
    }
}