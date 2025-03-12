export class IFileStorage {
    async upload(fileBuffer, fileName) {
        throw new Error('Not implemented');
    }

    async getUrl(fileKey) {
        throw new Error('Not implemented');
    }
}