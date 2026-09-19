import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = "WarungPOS-2026-Secure-Backup-Key-v1";

export function encrypt(data: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY);
    return encrypted.toString();
  } catch {
    throw new Error("Gagal mengenkripsi data");
  }
}

export function decrypt(encryptedData: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const original = decrypted.toString(CryptoJS.enc.Utf8);

    if (!original) {
      throw new Error("Decryption resulted in empty string");
    }

    return original;
  } catch {
    throw new Error(
      "Gagal mendekripsi data - file mungkin corrupt atau bukan backup WarungPOS",
    );
  }
}

