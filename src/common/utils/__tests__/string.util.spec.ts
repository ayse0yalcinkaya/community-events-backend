// Libraries
import { capitalize, removeSpecialChars, slugify, truncate } from '../string.util';

describe('string.util', () => {
  describe('slugify', () => {
    it('should convert to lowercase with hyphens', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello, World!')).toBe('hello-world');
      expect(slugify('Product @ $19.99')).toBe('product-1999');
    });

    it('should replace multiple spaces with single hyphen', () => {
      expect(slugify('Hello    World')).toBe('hello-world');
    });

    it('should replace underscores with hyphens', () => {
      expect(slugify('hello_world_test')).toBe('hello-world-test');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
      expect(slugify('---Hello World---')).toBe('hello-world');
    });

    it('should handle already slugified strings', () => {
      expect(slugify('hello-world')).toBe('hello-world');
    });

    it('should handle empty string', () => {
      expect(slugify('')).toBe('');
    });

    it('should handle strings with numbers', () => {
      expect(slugify('Product 2025')).toBe('product-2025');
    });

    it('should handle mixed special characters', () => {
      expect(slugify('Hello! @#$ World%^&*()')).toBe('hello-world');
    });
  });

  describe('truncate', () => {
    it('should add ellipsis when string too long', () => {
      const text = 'This is a very long text that needs truncation';
      const result = truncate(text, 20);
      expect(result).toBe('This is a very lo...');
      expect(result.length).toBe(20);
    });

    it('should return original if under max length', () => {
      const text = 'Short text';
      expect(truncate(text, 20)).toBe('Short text');
    });

    it('should return original if exactly max length', () => {
      const text = 'Exactly20chars!!!!!!'; // 20 characters
      expect(truncate(text, 20)).toBe('Exactly20chars!!!!!!');
      expect(text.length).toBe(20);
    });

    it('should handle very short max length', () => {
      const text = 'Hello World';
      const result = truncate(text, 5);
      expect(result).toBe('He...');
      expect(result.length).toBe(5);
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should handle max length of 3', () => {
      const text = 'Hello';
      const result = truncate(text, 3);
      expect(result).toBe('...');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter only', () => {
      expect(capitalize('hello world')).toBe('Hello world');
    });

    it('should not affect already capitalized string', () => {
      expect(capitalize('Hello World')).toBe('Hello World');
    });

    it('should not lowercase rest of string', () => {
      expect(capitalize('hELLO WORLD')).toBe('HELLO WORLD');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
      expect(capitalize('A')).toBe('A');
    });

    it('should handle string starting with number', () => {
      expect(capitalize('123abc')).toBe('123abc');
    });

    it('should handle string starting with special char', () => {
      expect(capitalize('!hello')).toBe('!hello');
    });
  });

  describe('removeSpecialChars', () => {
    it('should remove all non-alphanumeric characters', () => {
      expect(removeSpecialChars('Hello, World! 123')).toBe('HelloWorld123');
    });

    it('should remove email characters', () => {
      expect(removeSpecialChars('user@email.com')).toBe('useremailcom');
    });

    it('should remove currency symbols', () => {
      expect(removeSpecialChars('Price: $19.99')).toBe('Price1999');
    });

    it('should keep alphanumeric only', () => {
      expect(removeSpecialChars('abc123XYZ')).toBe('abc123XYZ');
    });

    it('should remove spaces', () => {
      expect(removeSpecialChars('Hello World')).toBe('HelloWorld');
    });

    it('should handle empty string', () => {
      expect(removeSpecialChars('')).toBe('');
    });

    it('should remove all special characters', () => {
      const special = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
      expect(removeSpecialChars(special)).toBe('');
    });

    it('should handle string with only numbers', () => {
      expect(removeSpecialChars('123456')).toBe('123456');
    });

    it('should handle mixed case with special chars', () => {
      expect(removeSpecialChars('Hello-World_Test.123')).toBe('HelloWorldTest123');
    });
  });
});
