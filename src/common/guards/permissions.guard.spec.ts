// Libraries
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';

// Interfaces
import { JwtPayload } from '../../modules/auth/interfaces/jwt-payload.interface';

// Enums
import { ActionEnum } from '../enums/action.enum';

// Guards
import { PermissionsGuard } from './permissions.guard';

// Decorators
import { PERMISSION_KEY, PermissionMetadata } from '../decorators/permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Services
import { AuthorizationService } from '../../modules/permissions/services/authorization.service';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let authorizationService: jest.Mocked<AuthorizationService>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;

  const mockUser: JwtPayload = {
    sub: 'user-123',
    phoneNumber: '+905551234567',
    roles: ['Admin'],
    userType: 'ADMIN',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const mockRequest = {
    user: mockUser,
  };

  beforeEach(async () => {
    // Create mock Reflector
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;

    // Create mock AuthorizationService
    const mockAuthorizationService = {
      hasPermission: jest.fn(),
    } as unknown as AuthorizationService;

    // Create mock I18nService
    const mockI18nService = {
      translate: jest.fn((key: string) => key),
    } as unknown as I18nService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: AuthorizationService,
          useValue: mockAuthorizationService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get(Reflector);
    authorizationService = module.get(AuthorizationService);

    // Setup mock ExecutionContext
    mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    describe('when route is marked as @Public()', () => {
      it('should return true and skip permission check', async () => {
        // Mock @Public() decorator metadata
        reflector.getAllAndOverride
          .mockReturnValueOnce(true) // IS_PUBLIC_KEY
          .mockReturnValueOnce(undefined); // PERMISSION_KEY (not called)

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
          mockExecutionContext.getHandler(),
          mockExecutionContext.getClass(),
        ]);
        expect(authorizationService.hasPermission).not.toHaveBeenCalled();
      });
    });

    describe('when no @Permission metadata present', () => {
      it('should return true (route has no permission requirement)', async () => {
        // Mock no @Public() and no @Permission metadata
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // IS_PUBLIC_KEY
          .mockReturnValueOnce(undefined); // PERMISSION_KEY

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSION_KEY, [
          mockExecutionContext.getHandler(),
          mockExecutionContext.getClass(),
        ]);
        expect(authorizationService.hasPermission).not.toHaveBeenCalled();
      });
    });

    describe('when @Permission metadata present and user has permission', () => {
      it('should return true when hasPermission returns true', async () => {
        const permissionMetadata: PermissionMetadata = {
          module: 'USERS',
          action: ActionEnum.CREATE,
        };

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // IS_PUBLIC_KEY
          .mockReturnValueOnce(permissionMetadata); // PERMISSION_KEY

        authorizationService.hasPermission.mockResolvedValue(true);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(authorizationService.hasPermission).toHaveBeenCalledWith(mockUser.sub, 'USERS.CREATE');
      });

      it('should correctly combine module and action as MODULE.ACTION string', async () => {
        const permissionMetadata: PermissionMetadata = {
          module: 'FILES',
          action: ActionEnum.DELETE,
        };

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // IS_PUBLIC_KEY
          .mockReturnValueOnce(permissionMetadata); // PERMISSION_KEY

        authorizationService.hasPermission.mockResolvedValue(true);

        await guard.canActivate(mockExecutionContext);

        expect(authorizationService.hasPermission).toHaveBeenCalledWith(mockUser.sub, 'FILES.DELETE');
      });

      it('should extract userID correctly from request.user', async () => {
        const permissionMetadata: PermissionMetadata = {
          module: 'PERMISSIONS',
          action: ActionEnum.ASSIGN,
        };

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // IS_PUBLIC_KEY
          .mockReturnValueOnce(permissionMetadata); // PERMISSION_KEY

        authorizationService.hasPermission.mockResolvedValue(true);

        await guard.canActivate(mockExecutionContext);

        expect(authorizationService.hasPermission).toHaveBeenCalledWith(
          'user-123', // mockUser.sub
          'PERMISSIONS.ASSIGN',
        );
      });
    });

    describe('when @Permission metadata present but user lacks permission', () => {
      it('should throw ForbiddenException when hasPermission returns false', async () => {
        const permissionMetadata: PermissionMetadata = {
          module: 'USERS',
          action: ActionEnum.DELETE,
        };

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // IS_PUBLIC_KEY
          .mockReturnValueOnce(permissionMetadata); // PERMISSION_KEY

        authorizationService.hasPermission.mockResolvedValue(false);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(ForbiddenException);

        // Setup mocks again for second assertion
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // IS_PUBLIC_KEY
          .mockReturnValueOnce(permissionMetadata); // PERMISSION_KEY

        authorizationService.hasPermission.mockResolvedValue(false);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('errors.PERMISSION_DENIED');
      });

      it('should include required permission in error message', async () => {
        const permissionMetadata: PermissionMetadata = {
          module: 'FILES',
          action: ActionEnum.VIEW,
        };

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // IS_PUBLIC_KEY
          .mockReturnValueOnce(permissionMetadata); // PERMISSION_KEY

        authorizationService.hasPermission.mockResolvedValue(false);

        await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('errors.PERMISSION_DENIED');
      });
    });

    describe('when user is not authenticated (missing request.user)', () => {
      it('should throw ForbiddenException with helpful message', async () => {
        const permissionMetadata: PermissionMetadata = {
          module: 'USERS',
          action: ActionEnum.CREATE,
        };

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // IS_PUBLIC_KEY
          .mockReturnValueOnce(permissionMetadata); // PERMISSION_KEY

        // Mock ExecutionContext with no user in request
        const mockContextNoUser = {
          getHandler: jest.fn(),
          getClass: jest.fn(),
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue({ user: undefined }),
          }),
        } as any;

        await expect(guard.canActivate(mockContextNoUser)).rejects.toThrow(ForbiddenException);

        // Setup mocks again for second assertion
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // IS_PUBLIC_KEY
          .mockReturnValueOnce(permissionMetadata); // PERMISSION_KEY

        await expect(guard.canActivate(mockContextNoUser)).rejects.toThrow('errors.INVALID_CREDENTIALS');

        expect(authorizationService.hasPermission).not.toHaveBeenCalled();
      });
    });

    describe('integration scenarios', () => {
      it('should handle all ActionEnum types correctly', async () => {
        const testCases: Array<{
          action: ActionEnum;
          expectedPermission: string;
        }> = [
          { action: ActionEnum.CREATE, expectedPermission: 'USERS.CREATE' },
          { action: ActionEnum.VIEW, expectedPermission: 'USERS.VIEW' },
          { action: ActionEnum.UPDATE, expectedPermission: 'USERS.UPDATE' },
          { action: ActionEnum.DELETE, expectedPermission: 'USERS.DELETE' },
          { action: ActionEnum.ASSIGN, expectedPermission: 'USERS.ASSIGN' },
          { action: ActionEnum.REVOKE, expectedPermission: 'USERS.REVOKE' },
        ];

        for (const testCase of testCases) {
          jest.clearAllMocks();

          const permissionMetadata: PermissionMetadata = {
            module: 'USERS',
            action: testCase.action,
          };

          reflector.getAllAndOverride
            .mockReturnValueOnce(false) // IS_PUBLIC_KEY
            .mockReturnValueOnce(permissionMetadata); // PERMISSION_KEY

          authorizationService.hasPermission.mockResolvedValue(true);

          await guard.canActivate(mockExecutionContext);

          expect(authorizationService.hasPermission).toHaveBeenCalledWith(mockUser.sub, testCase.expectedPermission);
        }
      });

      it('should prioritize @Public() over @Permission', async () => {
        // If both @Public() and @Permission are present, @Public() should win
        const permissionMetadata: PermissionMetadata = {
          module: 'USERS',
          action: ActionEnum.CREATE,
        };

        reflector.getAllAndOverride
          .mockReturnValueOnce(true) // IS_PUBLIC_KEY (returns true)
          .mockReturnValueOnce(permissionMetadata); // PERMISSION_KEY (not checked)

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        // Should not check permission since @Public() is present
        expect(authorizationService.hasPermission).not.toHaveBeenCalled();
        // Should only check IS_PUBLIC_KEY, not PERMISSION_KEY
        expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
      });
    });

    describe('execution order validation', () => {
      it('should work correctly when JwtAuthGuard has set request.user', async () => {
        const permissionMetadata: PermissionMetadata = {
          module: 'USERS',
          action: ActionEnum.VIEW,
        };

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // IS_PUBLIC_KEY
          .mockReturnValueOnce(permissionMetadata); // PERMISSION_KEY

        authorizationService.hasPermission.mockResolvedValue(true);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        // Verify it uses the user object set by JwtAuthGuard
        expect(authorizationService.hasPermission).toHaveBeenCalledWith(mockUser.sub, 'USERS.VIEW');
      });
    });
  });
});
