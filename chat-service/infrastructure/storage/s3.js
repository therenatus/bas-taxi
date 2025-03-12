import AWS from "aws-sdk";

class S3FileStorage {
    constructor(config) {
        this.s3 = new AWS.S3(config);
        this.bucketName = config.bucketName;
    }

    async upload(fileBuffer, fileName) {
        const params = {
            Bucket: this.bucketName,
            Key: `uploads/${Date.now()}-${fileName}`,
            Body: fileBuffer
        };

        const result = await this.s3.upload(params).promise();
        return result.Location;
    }

    async getUrl(fileKey) {
        return this.s3.getSignedUrl('getObject', {
            Bucket: this.bucketName,
            Key: fileKey,
            Expires: 3600
        });
    }
}