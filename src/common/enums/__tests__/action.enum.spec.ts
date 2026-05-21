import { ActionEnum } from '../action.enum';

describe('ActionEnum', () => {
  it('should have correct integer values for all actions', () => {
    // Standard CRUD
    expect(ActionEnum.CREATE).toBe(0);
    expect(ActionEnum.VIEW).toBe(1);
    expect(ActionEnum.UPDATE).toBe(2);
    expect(ActionEnum.DELETE).toBe(3);

    // Permission management
    expect(ActionEnum.ASSIGN).toBe(4);
    expect(ActionEnum.REVOKE).toBe(5);

    // User management
    expect(ActionEnum.ACTIVATE).toBe(6);

    // File management
    expect(ActionEnum.VIEW_ALL).toBe(7);

    // Notification management
    expect(ActionEnum.MARK_READ).toBe(8);
    expect(ActionEnum.SEND).toBe(9);

    // Preference management
    expect(ActionEnum.MANAGE).toBe(10);

    // Device management
    expect(ActionEnum.REGISTER).toBe(11);

    // OTP verification
    expect(ActionEnum.VERIFY).toBe(12);

    // SMS management
    expect(ActionEnum.RESEND).toBe(13);

    // Ticket approval
    expect(ActionEnum.APPROVE).toBe(14);
  });

  it('should have exactly 16 enum values', () => {
    const enumValues = Object.keys(ActionEnum).filter(
      (key) => !isNaN(Number(ActionEnum[key as keyof typeof ActionEnum])),
    );
    expect(enumValues.length).toBe(17);
  });

  it('should have unique values for all enum members', () => {
    const values = Object.values(ActionEnum);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});
