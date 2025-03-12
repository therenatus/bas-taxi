import {DomainException} from "../exceptions/domain.exception.js";

export class User {
    #id;
    #role;
    #permissions;

    constructor({ id, role, permissions = [] }) {
        this.#validate(id, role);

        this.#id = id;
        this.#role = role;
        this.#permissions = new Set(permissions);
    }

    get id() { return this.#id; }
    get role() { return this.#role; }
    get permissions() { return [...this.#permissions]; }

    hasPermission(permission) {
        return this.#permissions.has(permission);
    }

    #validate(id, role) {
        const validRoles = ['driver', 'passenger', 'admin', 'superadmin'];

        if (!id) throw new DomainException('User ID is required');
        if (!validRoles.includes(role)) {
            throw new DomainException(`Invalid role: ${role}`);
        }
    }

    static createFromAuthServiceDTO(dto) {
        return new User({
            id: dto.userId,
            role: dto.role,
            permissions: dto.scopes || []
        });
    }

    toJSON() {
        return {
            id: this.#id,
            role: this.#role,
            permissions: this.permissions
        };
    }
}