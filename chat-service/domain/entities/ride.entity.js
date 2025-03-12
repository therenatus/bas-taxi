import {DomainException} from "../exceptions/domain.exception.js";

export class RideEntity {
    #id;
    #externalId;
    #driverId;
    #passengerId;
    #status;
    #timestamps;
    #assignedAdminId;

    constructor({
                    id,
                    externalId,
                    driverId,
                    passengerId,
                    status,
                    timestamps,
                    assignedAdminId = null
                }) {
        this.#validate(status, externalId);

        this.#id = id;
        this.#externalId = externalId;
        this.#driverId = driverId;
        this.#passengerId = passengerId;
        this.#status = status;
        this.#timestamps = timestamps;
        this.#assignedAdminId = assignedAdminId;
    }

    get id() { return this.#id; }
    get externalId() { return this.#externalId; }
    get driverId() { return this.#driverId; }
    get passengerId() { return this.#passengerId; }
    get status() { return this.#status; }
    get timestamps() { return { ...this.#timestamps }; }
    get assignedAdminId() { return this.#assignedAdminId; }

    isActive() {
        return this.#status === 'in_progress';
    }

    hasParticipant(userId) {
        return [this.#driverId, this.#passengerId].includes(userId);
    }

    isAssignedToAdmin(adminId) {
        return this.#assignedAdminId === adminId;
    }

    canStartChat() {
        return ['pending', 'in_progress'].includes(this.#status);
    }

    static createFromRideServiceDTO(dto) {
        return new RideEntity({
            id: dto.local_id,
            externalId: dto.external_id,
            driverId: dto.driver_id,
            passengerId: dto.passenger_id,
            status: dto.status,
            timestamps: {
                created: new Date(dto.created_at),
                started: dto.started_at ? new Date(dto.started_at) : null,
                completed: dto.completed_at ? new Date(dto.completed_at) : null
            },
            assignedAdminId: dto.assigned_admin_id
        });
    }

    #validate(status, externalId) {
        const validStatuses = ['pending', 'in_progress', 'completed', 'canceled'];

        if (!validStatuses.includes(status)) {
            throw new DomainException(`Invalid ride status: ${status}`);
        }

        if (!externalId) {
            throw new DomainException("External ID is required");
        }
    }

    toJSON() {
        return {
            id: this.#id,
            externalId: this.#externalId,
            driverId: this.#driverId,
            passengerId: this.#passengerId,
            status: this.#status,
            timestamps: this.#timestamps,
            assignedAdminId: this.#assignedAdminId
        };
    }
}