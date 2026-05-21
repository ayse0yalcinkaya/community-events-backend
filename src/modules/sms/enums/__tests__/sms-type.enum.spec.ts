import { SmsType } from '../sms-type.enum';

describe('SmsType Enum', () => {
  it('should have correct integer values', () => {
    expect(SmsType.OTP).toBe(0);
    expect(SmsType.NOTIFICATION).toBe(1);
    expect(SmsType.MARKETING).toBe(2);
    expect(SmsType.ALERT).toBe(3);
  });

  it('should have exactly 4 enum values', () => {
    const enumValues = Object.keys(SmsType).filter((key) => !isNaN(Number(SmsType[key as keyof typeof SmsType])));
    expect(enumValues.length).toBe(4);
  });

  it('should have unique values for all enum members', () => {
    const values = Object.values(SmsType);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});
