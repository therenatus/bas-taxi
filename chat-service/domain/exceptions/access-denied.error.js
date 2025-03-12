import {DomainException} from "./domain.exception.js";

export class AccessDeniedError extends DomainException {
    constructor(message) {
        super(message);
        this.name = 'AccessDeniedError';
    }
}