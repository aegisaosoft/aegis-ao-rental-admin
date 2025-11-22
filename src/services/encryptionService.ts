/**
 * Encryption service for frontend
 * Uses AES-256-CBC encryption compatible with backend EncryptionService
 * 
 * Encryption key from backend: "66RpzpirgyomCMNKw7Jt7sVKjQdO2Uur5AQ0Lb5nWWc="
 */

// Encryption key (base64-encoded 32-byte key)
// This should match the backend Encryption:Key from appsettings.json
const ENCRYPTION_KEY_BASE64 = process.env.REACT_APP_ENCRYPTION_KEY || '66RpzpirgyomCMNKw7Jt7sVKjQdO2Uur5AQ0Lb5nWWc=';

// Convert base64 key to CryptoKey
async function getEncryptionKey(): Promise<CryptoKey> {
  try {
    const keyBytes = Uint8Array.from(atob(ENCRYPTION_KEY_BASE64), c => c.charCodeAt(0));
    
    return await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-CBC' },
      false,
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    console.error('Failed to import encryption key:', error);
    throw new Error('Failed to initialize encryption key');
  }
}

/**
 * Encrypt a plaintext string using AES-256-CBC
 * Compatible with backend EncryptionService
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) {
    return plaintext;
  }

  try {
    const key = await getEncryptionKey();
    
    // Generate random IV (16 bytes for AES)
    const iv = crypto.getRandomValues(new Uint8Array(16));
    
    // Convert plaintext to bytes
    const plaintextBytes = new TextEncoder().encode(plaintext);
    
    // Encrypt
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-CBC',
        iv: iv
      },
      key,
      plaintextBytes
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Convert to base64 (handle large arrays)
    const binaryString = Array.from(combined, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a ciphertext string using AES-256-CBC
 * Compatible with backend EncryptionService
 */
export async function decrypt(ciphertext: string): Promise<string> {
  if (!ciphertext) {
    return ciphertext;
  }

  try {
    const key = await getEncryptionKey();
    
    // Decode from base64
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    
    // Extract IV (first 16 bytes)
    const iv = combined.slice(0, 16);
    
    // Extract encrypted data (rest of bytes)
    const encryptedData = combined.slice(16);
    
    // Decrypt
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-CBC',
        iv: iv
      },
      key,
      encryptedData
    );
    
    // Convert bytes to string
    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    // If decryption fails, it might be plaintext (backward compatibility)
    return ciphertext;
  }
}

