export class TOTPManager {
    // Utilities for TOTP (Time-Based One-Time Password)
    // RFC 6238 COMPLIANT IMPLEMENTATION

    // Convert Base32 string to Uint8Array
    private static base32ToBuffer(base32: string): Uint8Array {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let length = base32.length;
        let bits = 0;
        let value = 0;
        let index = 0;
        const result = new Uint8Array(Math.ceil(length * 5 / 8));

        for (let i = 0; i < length; i++) {
            value = (value << 5) | alphabet.indexOf(base32[i].toUpperCase());
            bits += 5;

            if (bits >= 8) {
                result[index++] = (value >>> (bits - 8)) & 0xFF;
                bits -= 8;
            }
        }
        return result;
    }

    // Generate a random Base32 Secret
    static generateSecret(length: number = 20): string {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        const randomValues = new Uint8Array(length);
        crypto.getRandomValues(randomValues);

        let secret = "";
        for (let i = 0; i < length; i++) {
            secret += alphabet[randomValues[i] % 32];
        }
        return secret;
    }

    // Generate random 10-char alphanumeric backup codes
    static generateBackupCodes(count: number = 10): string[] {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 1, 0 to avoid confusion
        const codes: string[] = [];

        for (let i = 0; i < count; i++) {
            let code = "";
            const randomValues = new Uint8Array(10);
            crypto.getRandomValues(randomValues);

            for (let j = 0; j < 10; j++) {
                // Add hyphen in middle for readability: XXXXX-XXXXX
                if (j === 5) code += "-";
                code += chars[randomValues[j] % chars.length];
            }
            codes.push(code);
        }
        return codes;
    }

    // Generate HOTP (HMAC-Based One-Time Password)
    private static async generateHOTP(secret: string, counter: number): Promise<string> {
        const keyData = this.base32ToBuffer(secret);

        // Counter as 8-byte buffer
        const counterBuffer = new ArrayBuffer(8);
        const counterView = new DataView(counterBuffer);
        counterView.setBigUint64(0, BigInt(counter), false); // Big-endian

        // Import Key
        const key = await crypto.subtle.importKey(
            "raw",
            keyData,
            { name: "HMAC", hash: "SHA-1" },
            false,
            ["sign"]
        );

        // Sign (HMAC-SHA1)
        const signature = await crypto.subtle.sign("HMAC", key, counterBuffer);
        const signatureArray = new Uint8Array(signature);

        // Dynamic Truncation
        const offset = signatureArray[signatureArray.length - 1] & 0xf;
        const binary =
            ((signatureArray[offset] & 0x7f) << 24) |
            ((signatureArray[offset + 1] & 0xff) << 16) |
            ((signatureArray[offset + 2] & 0xff) << 8) |
            (signatureArray[offset + 3] & 0xff);

        const otp = binary % 1000000;
        return otp.toString().padStart(6, "0");
    }

    // Generate current TOTP
    static async generateTOTP(secret: string, windowSeconds: number = 30): Promise<string> {
        const counter = Math.floor(Date.now() / 1000 / windowSeconds);
        return await this.generateHOTP(secret, counter);
    }

    // Verify TOTP
    static async verifyTOTP(token: string, secret: string, window: number = 1): Promise<boolean> {
        const currentCounter = Math.floor(Date.now() / 1000 / 30);

        // Check current, previous, and next windows (allow slight drift)
        for (let i = -window; i <= window; i++) {
            const generated = await this.generateHOTP(secret, currentCounter + i);
            if (generated === token) {
                return true;
            }
        }
        return false;
    }

    // Generate otpauth URI for QR Code
    static generateURI(secret: string, accountName: string, issuer: string = "Nestify"): string {
        return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    }
}
