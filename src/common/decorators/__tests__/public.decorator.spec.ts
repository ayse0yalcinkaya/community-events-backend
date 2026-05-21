// Libraries
import { SetMetadata } from '@nestjs/common';

// Decorators
import { IS_PUBLIC_KEY, Public } from '../public.decorator';

// Mock SetMetadata
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn((key, value) => {
    // Return a decorator function that marks the target with metadata
    return (target: any) => {
      target[key] = value;
      return target;
    };
  }),
}));

describe('Public Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export IS_PUBLIC_KEY constant', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });

  it('should call SetMetadata with correct parameters', () => {
    Public();

    expect(SetMetadata).toHaveBeenCalledWith(IS_PUBLIC_KEY, true);
  });

  it('should call SetMetadata with isPublic key', () => {
    Public();

    expect(SetMetadata).toHaveBeenCalledWith('isPublic', true);
  });

  it('should set metadata to true', () => {
    Public();

    // Verify SetMetadata was called with true value
    const calls = (SetMetadata as jest.Mock).mock.calls;
    expect(calls[0][1]).toBe(true);
  });

  it('should create a decorator function', () => {
    const decorator = Public();

    expect(typeof decorator).toBe('function');
  });

  it('should set metadata on target when applied', () => {
    const decorator = Public();
    const mockTarget = {} as any;

    decorator(mockTarget);

    expect(mockTarget).toHaveProperty(IS_PUBLIC_KEY, true);
  });
});
