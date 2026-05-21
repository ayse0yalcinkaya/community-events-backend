import { Platform } from '../platform.enum';

describe('Platform Enum', () => {
  it('should have correct integer values', () => {
    expect(Platform.iOS).toBe(0);
    expect(Platform.Android).toBe(1);
  });

  it('should have exactly 2 enum values', () => {
    const enumValues = Object.keys(Platform).filter((key) => !isNaN(Number(Platform[key as keyof typeof Platform])));
    expect(enumValues.length).toBe(2);
  });

  it('should have unique values', () => {
    expect(Platform.iOS).not.toBe(Platform.Android);
  });
});
