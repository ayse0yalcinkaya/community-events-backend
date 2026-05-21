import { NotificationChannel } from '../notification-channel.enum';

describe('NotificationChannel Enum', () => {
  it('should have correct integer values', () => {
    expect(NotificationChannel.EMAIL).toBe(0);
    expect(NotificationChannel.SMS).toBe(1);
    expect(NotificationChannel.PUSH).toBe(2);
  });

  it('should have exactly 3 enum values', () => {
    const enumValues = Object.keys(NotificationChannel).filter(
      (key) => !isNaN(Number(NotificationChannel[key as keyof typeof NotificationChannel])),
    );
    expect(enumValues.length).toBe(3);
  });

  it('should have unique values for all enum members', () => {
    const values = Object.values(NotificationChannel);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});
