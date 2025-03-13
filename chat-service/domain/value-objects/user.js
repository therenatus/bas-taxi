// file: value-objects/user.js

export class FileAttachment {
    #id;
    #url;
    #filename;
    #mimetype;

    constructor({ id, url, filename, mimetype }) {
        if (!id || !url || !filename || !mimetype) {
            throw new Error("Invalid file attachment data");
        }

        this.#id = id;
        this.#url = url;
        this.#filename = filename;
        this.#mimetype = mimetype;
    }

    get id() { return this.#id; }
    get url() { return this.#url; }
    get filename() { return this.#filename; }
    get mimetype() { return this.#mimetype; }

    toJSON() {
        return {
            id: this.#id,
            url: this.#url,
            filename: this.#filename,
            mimetype: this.#mimetype
        };
    }
}
