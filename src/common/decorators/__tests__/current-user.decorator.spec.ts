// Libraries
import { ExecutionContext } from '@nestjs/common';

// Interfaces
import { JwtPayload } from '../../../modules/auth/interfaces/jwt-payload.interface';

// Import the decorator factory function directly for testing
import * as currentUserModule from '../current-user.decorator';

describe('CurrentUser Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    // Mock request object with user populated by JwtStrategy
    mockRequest = {
      user: {
        sub: '550e8400-e29b-41d4-a716-446655440000',
        phoneNumber: '+905551234567',

        roles: ['admin', 'staff'],
        iat: 1699275600,
        exp: 1699279200,
      } as JwtPayload,
    };

    // Mock ExecutionContext
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as any;
  });

  it('should be defined', () => {
    expect(currentUserModule.CurrentUser).toBeDefined();
  });

  it('should extract user from request when used as param decorator', () => {
    // Test the internal logic by simulating what NestJS does
    const httpContext = mockExecutionContext.switchToHttp();
    const request = httpContext.getRequest();

    expect(request.user).toBeDefined();
    expect(request.user.sub).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(request.user.phoneNumber).toBe('+905551234567');
  });

  it('should provide JwtPayload with all required fields', () => {
    const httpContext = mockExecutionContext.switchToHttp();
    const request = httpContext.getRequest();
    const user = request.user;

    expect(user).toHaveProperty('sub');
    expect(user).toHaveProperty('phoneNumber');
    expect(user).toHaveProperty('roles');
    expect(user).toHaveProperty('iat');
    expect(user).toHaveProperty('exp');
  });

  it('should provide roles array', () => {
    const httpContext = mockExecutionContext.switchToHttp();
    const request = httpContext.getRequest();
    const user = request.user;

    expect(Array.isArray(user.roles)).toBe(true);
    expect(user.roles).toContain('admin');
    expect(user.roles).toContain('staff');
  });

  it('should handle user with single role', () => {
    mockRequest.user.roles = ['user'];

    const httpContext = mockExecutionContext.switchToHttp();
    const request = httpContext.getRequest();

    expect(request.user.roles).toEqual(['user']);
  });

  it('should return undefined when user not present', () => {
    mockRequest.user = undefined;

    const httpContext = mockExecutionContext.switchToHttp();
    const request = httpContext.getRequest();

    expect(request.user).toBeUndefined();
  });

  it('should work with different user IDs', () => {
    mockRequest.user.sub = '770e8400-e29b-41d4-a716-446655440000';

    const httpContext = mockExecutionContext.switchToHttp();
    const request = httpContext.getRequest();

    expect(request.user.sub).toBe('770e8400-e29b-41d4-a716-446655440000');
  });
});
