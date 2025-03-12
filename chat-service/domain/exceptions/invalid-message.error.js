import {DomainException} from "./domain.exception.js";

export class InvalidMessageError extends DomainException {
    constructor(message) {
        super(message);
        this.name = 'InvalidMessageError';
    }
}