import { DomainStatus } from '../domain-status.enum';

describe('DomainStatus Enum', () => {
  it('should have correct integer values', () => {
    expect(DomainStatus.ACTIVE).toBe(0);
    expect(DomainStatus.PASSIVE).toBe(1);
  });

  it('should have exactly 2 enum values', () => {
    const enumValues = Object.keys(DomainStatus).filter(
      (key) => !isNaN(Number(DomainStatus[key as keyof typeof DomainStatus])),
    );
    expect(enumValues.length).toBe(2);
  });

  it('should have unique values', () => {
    expect(DomainStatus.ACTIVE).not.toBe(DomainStatus.PASSIVE);
  });
});
