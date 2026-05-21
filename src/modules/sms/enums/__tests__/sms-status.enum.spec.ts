import { SmsStatus } from '../sms-status.enum';

describe('SmsStatus Enum', () => {
  it('should have correct integer values', () => {
    expect(SmsStatus.PENDING).toBe(0);
    expect(SmsStatus.SENT).toBe(1);
    expect(SmsStatus.DELIVERED).toBe(2);
    expect(SmsStatus.FAILED).toBe(3);
  });

  it('should have exactly 4 enum values', () => {
    const enumValues = Object.keys(SmsStatus).filter((key) => !isNaN(Number(SmsStatus[key as keyof typeof SmsStatus])));
    expect(enumValues.length).toBe(4);
  });

  it('should have unique values for all enum members', () => {
    const values = Object.values(SmsStatus);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});
