import {DomainException} from "../exceptions/domain.exception.js";

export class UserEntity {
    #id;
    #externalId;
    #role;
    #profile;
    #metadata;

    constructor({
                    id,
                    externalId,
                    role,
                    profile = {},
                    metadata = {}
                }) {
        this.#validate(role, externalId);

        this.#id = id;
        this.#externalId = externalId;
        this.#role = role;
        this.#profile = profile;
        this.#metadata = metadata;
    }

    get id() { return this.#id; }
    get externalId() { return this.#externalId; }
    get role() { return this.#role; }
    get profile() { return { ...this.#profile }; }
    get metadata() { return { ...this.#metadata }; }

    canChatWith(targetUser) {
        const allowedPairs = {
            driver: ['passenger', 'admin'],
            passenger: ['driver', 'admin'],
            admin: ['driver', 'passenger', 'admin'],
            superadmin: ['driver', 'passenger', 'admin', 'superadmin']
        };

        return allowedPairs[this.#role]?.includes(targetUser.role);
    }

    canAccessRide(ride) {
        if (this.#role === 'superadmin') return true;
        if (this.#role === 'admin') return ride.isAssignedToAdmin(this.#id);
        return ride.hasParticipant(this.#id);
    }

    #validate(role, externalId) {
        const validRoles = ['driver', 'passenger', 'admin', 'superadmin'];

        if (!validRoles.includes(role)) {
            throw new DomainException(`Invalid user role: ${role}`);
        }

        if (!externalId) {
            throw new DomainException("External ID is required");
        }
    }

    static createFromAuthServiceDTO(dto) {
        return new UserEntity({
            id: dto.local_id,
            externalId: dto.external_id,
            role: dto.role,
            profile: {
                name: dto.name,
                email: dto.email,
                phone: dto.phone
            },
            metadata: dto.metadata
        });
    }

    toJSON() {
        return {
            id: this.#id,
            externalId: this.#externalId,
            role: this.#role,
            profile: this.#profile,
            metadata: this.#metadata
        };
    }
}