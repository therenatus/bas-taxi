import { DomainException } from "../exceptions/domain.exception.js";

export class UserEntity {
    #id; // Составной идентификатор (userType:userId)
    #userType; // Тип пользователя (driver, passenger, admin)
    #role; // Роль пользователя (driver, passenger, admin, superadmin)
    #profile; // Профиль пользователя
    #metadata; // Метаданные

    constructor({
                    id,
                    userType,
                    role,
                    profile = {},
                    metadata = {}
                }) {
        this.#validate(role, userType, id);

        this.#id = id; // Составной идентификатор
        this.#userType = userType; // Тип пользователя
        this.#role = role; // Роль
        this.#profile = profile; // Профиль
        this.#metadata = metadata; // Метаданные
    }

    get id() { return this.#id; }
    get userType() { return this.#userType; }
    get role() { return this.#role; }
    get profile() { return { ...this.#profile }; }
    get metadata() { return { ...this.#metadata }; }

    // Проверка, может ли пользователь общаться с другим пользователем
    canChatWith(targetUser) {
        const allowedPairs = {
            driver: ['passenger', 'admin'],
            passenger: ['driver', 'admin'],
            admin: ['driver', 'passenger', 'admin'],
            superadmin: ['*'] // Разрешить все типы
        };

        return allowedPairs[this.#role]?.includes(targetUser.role) ||
            (allowedPairs[this.#role] === '*' && targetUser.role);
    }


    // Проверка доступа к поездке
    canAccessRide(ride) {
        if (this.#role === 'superadmin') return true;
        if (this.#role === 'admin') return ride.isAssignedToAdmin(this.#id);
        return ride.hasParticipant(this.#id);
    }

    // Валидация данных
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

    // Преобразование в JSON
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