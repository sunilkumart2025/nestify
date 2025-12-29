import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

// Use a consistent key derived from the SUPABASE_SERVICE_ROLE_KEY or a specific ENCRYPTION_KEY
// For simplicity and robustness in this setup, we'll derive a key from the Service Role Key
// as it is available in all Edge Functions.
const MASTER_KEY_STRING = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'default-fallback-key-do-not-use-in-prod';

async function getCryptoKey() {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(MASTER_KEY_STRING.substring(0, 32)), // Ensure 32 bytes for AES-256
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: encoder.encode("nestify_salt"), // Fixed salt for deterministic key derivation
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function encrypt(text: string): Promise<string> {
    const key = await getCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoded
    );

    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const cipherHex = Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join('');

    return `${ivHex}:${cipherHex}`;
}

export async function decrypt(encryptedText: string): Promise<string> {
    const [ivHex, cipherHex] = encryptedText.split(':');
    if (!ivHex || !cipherHex) throw new Error('Invalid encrypted format');

    const key = await getCryptoKey();
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}
