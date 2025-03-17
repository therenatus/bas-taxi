import { DomainException } from "../exceptions/domain.exception.js";

export class UserEntity {
    #id;
    #userType;
    #role;
    #profile;
    #metadata;

    constructor({
                    id,
                    userType,
                    role,
                    profile = {},
                    metadata = {}
                }) {
        this.#validate(role, userType, id);

        this.#id = id;
        this.#userType = userType;
        this.#role = role;
        this.#profile = profile;
        this.#metadata = metadata;
    }

    get id() { return this.#id; }
    get userType() { return this.#userType; }
    get role() { return this.#role; }
    get profile() { return { ...this.#profile }; }
    get metadata() { return { ...this.#metadata }; }

    canChatWith(targetUser) {
        const allowedPairs = {
            driver: ['passenger', 'admin'],
            passenger: ['driver', 'admin'],
            admin: ['driver', 'passenger', 'admin'],
            superadmin: ['*']
        };

        return allowedPairs[this.#role]?.includes(targetUser.role) ||
            (allowedPairs[this.#role] === '*' && targetUser.role);
    }


    canAccessRide(ride) {
        if (this.#role === 'superadmin') return true;
        if (this.#role === 'admin') return ride.isAssignedToAdmin(this.#id);
        return ride.hasParticipant(this.#id);
    }

    #validate(role, userType, id) {
        const validRoles = ['driver', 'passenger', 'admin', 'superadmin'];
        const validUserTypes = ['driver', 'passenger', 'admin'];

        if (!validRoles.includes(role)) {
            throw new DomainException(`Invalid user role: ${role}`);
        }

        if (!validUserTypes.includes(userType)) {
            throw new DomainException(`Invalid user type: ${userType}`);
        }

        if (!id || !id.includes(':')) {
            throw new DomainException("Invalid composite ID format");
        }
    }

    static createFromAuthServiceDTO(dto) {
        return new UserEntity({
            id: `${dto.userType}:${dto.id}`,
            userType: dto.userType,
            role: dto.userType,
            profile: {
                name: dto.fullName,
                phone: dto.phoneNumber
            },
            metadata: dto.metadata
        });
    }

    toJSON() {
        return {
            id: this.#id,
            userType: this.#userType,
            role: this.#role,
            profile: this.#profile,
            metadata: this.#metadata
        };
    }
}