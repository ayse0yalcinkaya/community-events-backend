// Libraries
import { comparePassword, hashPassword } from '../hash.util';

describe('hash.util', () => {
  describe('hashPassword', () => {
    it('should produce valid AES-256-GCM hash', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      // AES-256-GCM hash format: iv:encrypted:authTag (all in hex)
      expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
      const parts = hash.split(':');
      expect(parts).toHaveLength(3);
      // IV should be 32 hex chars (16 bytes)
      expect(parts[0]).toHaveLength(32);
      // AuthTag should be 32 hex chars (16 bytes)
      expect(parts[2]).toHaveLength(32);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // AES-256-GCM uses random IV, so same password produces different hashes
      expect(hash1).not.toBe(hash2);
    });

    it('should hash empty string', async () => {
      const hash = await hashPassword('');
      // AES-256-GCM hash format: iv:encrypted:authTag (encrypted can be empty for empty password)
      expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]*:[a-f0-9]+$/);
      const parts = hash.split(':');
      expect(parts).toHaveLength(3);
      // IV should be 32 hex chars (16 bytes)
      expect(parts[0]).toHaveLength(32);
      // AuthTag should be 32 hex chars (16 bytes)
      expect(parts[2]).toHaveLength(32);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const isMatch = await comparePassword(password, hash);
      expect(isMatch).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const password = 'CorrectPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await hashPassword(password);

      const isMatch = await comparePassword(wrongPassword, hash);
      expect(isMatch).toBe(false);
    });

    it('should return false for case-sensitive mismatch', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      const isMatch = await comparePassword('testpassword123!', hash);
      expect(isMatch).toBe(false);
    });

    it('should handle empty password comparison', async () => {
      const hash = await hashPassword('');
      const isMatch = await comparePassword('', hash);
      expect(isMatch).toBe(true);
    });
  });
});
