import { blake3 } from "@noble/hashes/blake3.js";
import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";

export default class E2EEncryption {
  static async deriveKey(
    password: string,
    salt: Uint8Array,
  ): Promise<CryptoKey> {
    const keyMaterial = utf8ToBytes(password);
    const rawKey = pbkdf2(blake3, keyMaterial, salt, { c: 600_000, dkLen: 32 });

    return crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      false, // not extractable
      ["encrypt", "decrypt"],
    );
  }

  static async encrypt(data: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);

    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(data),
    );

    const combined = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength,
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  static async decrypt(
    encryptedData: string,
    password: string,
  ): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), (c) =>
      c.charCodeAt(0),
    );

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);

    const key = await this.deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}
