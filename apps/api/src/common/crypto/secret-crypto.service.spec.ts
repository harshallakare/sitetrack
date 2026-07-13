import { ConfigService } from "@nestjs/config";
import { SecretCryptoService } from "./secret-crypto.service";

function makeService(key: string) {
  return new SecretCryptoService({ get: () => key } as unknown as ConfigService);
}

// Arbitrary test-only key -- must never match any real ENCRYPTION_KEY.
const KEY = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";

describe("SecretCryptoService", () => {
  it("round-trips encrypt -> decrypt", () => {
    const svc = makeService(KEY);
    const plaintext = "super-secret-smtp-password";
    const encrypted = svc.encrypt(plaintext);
    expect(encrypted).not.toContain(plaintext);
    expect(svc.decrypt(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const svc = makeService(KEY);
    expect(svc.encrypt("x")).not.toBe(svc.encrypt("x"));
  });

  it("detects tampering via the GCM auth tag", () => {
    const svc = makeService(KEY);
    const enc = svc.encrypt("hello");
    const [iv, tag, cipher] = enc.split(":");
    const tampered = `${iv}:${tag}:${cipher.slice(0, -2)}00`;
    expect(() => svc.decrypt(tampered)).toThrow();
  });

  it("masks a secret to its last 4 chars", () => {
    const svc = makeService(KEY);
    const masked = svc.mask(svc.encrypt("rzp_secret_xyz789"));
    expect(masked).toMatch(/z789$/);
    expect(masked).toMatch(/^•+/);
  });

  it("returns null when masking an absent secret", () => {
    expect(makeService(KEY).mask(null)).toBeNull();
  });

  it("rejects a wrong-length key", () => {
    expect(() => makeService("tooshort")).toThrow();
  });
});
