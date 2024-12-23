import crypto from 'crypto';


const algorithm = 'aes-256-cbc';
const secretKey = process.env.ENCRYPTION_KEY || 'your_secret_key_32_bytes';
const ivLength = 16;

export const encryptData = (data) => {
    const iv = crypto.randomBytes(ivLength);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
};

export const decryptData = (encryptedData) => {
    const [iv, encrypted] = encryptedData.split(':');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};