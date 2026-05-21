// Libraries
import { isStrongPassword, isValidPhone, sanitizeInput } from '../validation.util';

describe('validation.util', () => {
  describe('isValidPhone', () => {
    it('should accept valid Turkish phone format', () => {
      expect(isValidPhone('+905551234567')).toBe(true);
      expect(isValidPhone('+905321234567')).toBe(true);
      expect(isValidPhone('+905001234567')).toBe(true);
    });

    it('should reject phone without country code', () => {
      expect(isValidPhone('05551234567')).toBe(false);
      expect(isValidPhone('5551234567')).toBe(false);
    });

    it('should reject phone with wrong country code', () => {
      expect(isValidPhone('+15551234567')).toBe(false); // US country code
      expect(isValidPhone('+445551234567')).toBe(false); // UK country code
    });

    it('should reject phone with too few digits', () => {
      expect(isValidPhone('+90555123456')).toBe(false); // 9 digits
      expect(isValidPhone('+9055512345')).toBe(false); // 8 digits
    });

    it('should reject phone with too many digits', () => {
      expect(isValidPhone('+9055512345678')).toBe(false); // 11 digits
      expect(isValidPhone('+90555123456789')).toBe(false); // 12 digits
    });

    it('should reject phone with letters', () => {
      expect(isValidPhone('+9055512345ab')).toBe(false);
      expect(isValidPhone('+90ABC1234567')).toBe(false);
    });

    it('should reject phone with spaces', () => {
      expect(isValidPhone('+90 555 123 4567')).toBe(false);
      expect(isValidPhone('+90 555 1234567')).toBe(false);
    });

    it('should reject phone with special characters', () => {
      expect(isValidPhone('+90-555-123-4567')).toBe(false);
      expect(isValidPhone('+90(555)1234567')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidPhone('')).toBe(false);
    });

    it('should use default country code +90', () => {
      expect(isValidPhone('+905551234567', '+90')).toBe(true);
    });
  });

  describe('isStrongPassword', () => {
    it('should accept strong passwords', () => {
      expect(isStrongPassword('Test1234!')).toBe(true);
      expect(isStrongPassword('Str0ng!Pass')).toBe(true);
      expect(isStrongPassword('MyP@ssw0rd')).toBe(true);
      expect(isStrongPassword('Complex#Pass1')).toBe(true);
    });

    it('should reject passwords too short', () => {
      expect(isStrongPassword('Tst1!')).toBe(false); // 5 chars
      expect(isStrongPassword('Test1!')).toBe(false); // 6 chars
      expect(isStrongPassword('Test12!')).toBe(false); // 7 chars
    });

    it('should reject passwords without uppercase', () => {
      expect(isStrongPassword('test1234!')).toBe(false);
      expect(isStrongPassword('password123!')).toBe(false);
    });

    it('should reject passwords without lowercase', () => {
      expect(isStrongPassword('TEST1234!')).toBe(false);
      expect(isStrongPassword('PASSWORD123!')).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      expect(isStrongPassword('TestPassword!')).toBe(false);
      expect(isStrongPassword('NoNumbers!')).toBe(false);
    });

    it('should reject passwords without special characters', () => {
      expect(isStrongPassword('TestPassword123')).toBe(false);
      expect(isStrongPassword('NoSpecialChar123')).toBe(false);
    });

    it('should reject weak common passwords', () => {
      expect(isStrongPassword('weak')).toBe(false);
      expect(isStrongPassword('password')).toBe(false);
      expect(isStrongPassword('12345678')).toBe(false);
    });

    it('should accept various special characters', () => {
      expect(isStrongPassword('Test1234!')).toBe(true);
      expect(isStrongPassword('Test1234@')).toBe(true);
      expect(isStrongPassword('Test1234#')).toBe(true);
      expect(isStrongPassword('Test1234$')).toBe(true);
      expect(isStrongPassword('Test1234%')).toBe(true);
      expect(isStrongPassword('Test1234^')).toBe(true);
      expect(isStrongPassword('Test1234&')).toBe(true);
      expect(isStrongPassword('Test1234*')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(isStrongPassword('')).toBe(false);
    });

    it('should accept password with exactly 8 characters', () => {
      expect(isStrongPassword('Test123!')).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      expect(sanitizeInput('<script>alert("XSS")</script>Hello')).toBe('Hello');
      expect(sanitizeInput('<script type="text/javascript">alert(1)</script>Content')).toBe('Content');
    });

    it('should remove script tags with content', () => {
      expect(sanitizeInput('Before<script>malicious code</script>After')).toBe('BeforeAfter');
    });

    it('should remove img tags with onerror', () => {
      expect(sanitizeInput('<img src=x onerror="alert(1)">')).toBe('');
      expect(sanitizeInput('Text<img src=x onerror="alert(1)">More text')).toBe('TextMore text');
    });

    it('should remove all HTML tags', () => {
      expect(sanitizeInput('<b>Bold</b> text')).toBe('Bold text');
      expect(sanitizeInput('<div>Content</div>')).toBe('Content');
      expect(sanitizeInput('<p>Paragraph</p>')).toBe('Paragraph');
    });

    it('should remove multiple HTML tags', () => {
      expect(sanitizeInput('<div><p>Text</p><span>More</span></div>')).toBe('TextMore');
    });

    it('should remove nested tags', () => {
      expect(sanitizeInput('<div><b><i>Nested</i></b></div>')).toBe('Nested');
    });

    it('should handle XSS with multiple script tags', () => {
      expect(sanitizeInput('<script>alert(1)</script>Text<script>alert(2)</script>')).toBe('Text');
    });

    it('should return safe text unchanged', () => {
      expect(sanitizeInput('Safe text without tags')).toBe('Safe text without tags');
      expect(sanitizeInput('Normal text 123')).toBe('Normal text 123');
    });

    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('should remove self-closing tags', () => {
      expect(sanitizeInput('<br/> Text <hr/>')).toBe(' Text ');
      expect(sanitizeInput('<input type="text" />')).toBe('');
    });

    it('should handle mixed content', () => {
      expect(sanitizeInput('Normal <b>bold</b> text <script>alert(1)</script> more text')).toBe(
        'Normal bold text  more text',
      );
    });

    it('should remove tags with attributes', () => {
      expect(sanitizeInput('<div class="test" id="123">Content</div>')).toBe('Content');
      expect(sanitizeInput('<a href="http://evil.com">Link</a>')).toBe('Link');
    });

    it('should handle case-insensitive script tags', () => {
      expect(sanitizeInput('<SCRIPT>alert(1)</SCRIPT>')).toBe('');
      expect(sanitizeInput('<ScRiPt>alert(1)</ScRiPt>')).toBe('');
    });
  });
});
