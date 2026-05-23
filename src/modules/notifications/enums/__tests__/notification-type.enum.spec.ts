import { NotificationType } from '../notification-type.enum';

describe('NotificationType Enum', () => {
  it('should have correct integer values', () => {
    expect(NotificationType.VERIFICATION).toBe(0);
    expect(NotificationType.PASSWORD_RESET).toBe(1);
    expect(NotificationType.OTP).toBe(2);
    expect(NotificationType.GENERAL).toBe(3);
    expect(NotificationType.ALERT).toBe(4);
    expect(NotificationType.MARKETING).toBe(5);
    expect(NotificationType.EVENT_REMINDER).toBe(6);
    expect(NotificationType.EVENT_RECOMMENDATION).toBe(7);
    expect(NotificationType.COMMUNITY_ANNOUNCEMENT).toBe(8);
    expect(NotificationType.CONNECTION_REQUEST).toBe(9);
    expect(NotificationType.CONNECTION_ACCEPTED).toBe(10);
  });

  it('should have exactly 11 enum values', () => {
    const enumValues = Object.keys(NotificationType).filter(
      (key) => !isNaN(Number(NotificationType[key as keyof typeof NotificationType])),
    );
    expect(enumValues.length).toBe(11);
  });

  it('should have unique values for all enum members', () => {
    const values = Object.values(NotificationType);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});
