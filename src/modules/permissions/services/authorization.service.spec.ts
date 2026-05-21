// Libraries
import { Test, TestingModule } from '@nestjs/testing';
import { Permission } from '@prisma/client';

// Services
import { PrismaService } from '../../../database/prisma.service';
import { AuthorizationService } from './authorization.service';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let prismaService: any;

  // Mock Permissions with Module relation
  const mockPermissionUsersCreate: any = {
    id: 'perm-1',
    moduleID: 'mod-1',
    action: 'CREATE',
    description: 'Create users',
    createdAt: new Date(),
    module: {
      id: 'mod-1',
      nameKey: 'modules.USERS.NAME',
      descriptionKey: 'modules.USERS.DESCRIPTION',
    },
  };

  const mockPermissionUsersView: any = {
    id: 'perm-2',
    moduleID: 'mod-1',
    action: 'VIEW',
    description: 'View users',
    createdAt: new Date(),
    module: {
      id: 'mod-1',
      nameKey: 'modules.USERS.NAME',
      descriptionKey: 'modules.USERS.DESCRIPTION',
    },
  };

  const mockPermissionUsersUpdate: any = {
    id: 'perm-3',
    moduleID: 'mod-1',
    action: 'UPDATE',
    description: 'Update users',
    createdAt: new Date(),
    module: {
      id: 'mod-1',
      nameKey: 'modules.USERS.NAME',
      descriptionKey: 'modules.USERS.DESCRIPTION',
    },
  };

  const mockPermissionFilesView: any = {
    id: 'perm-4',
    moduleID: 'mod-2',
    action: 'VIEW',
    description: 'View files',
    createdAt: new Date(),
    module: {
      id: 'mod-2',
      nameKey: 'modules.FILES.NAME',
      descriptionKey: 'modules.FILES.DESCRIPTION',
    },
  };

  beforeEach(async () => {
    const mockPrismaService = {
      userRole: {
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    } as unknown as PrismaService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hasPermission', () => {
    const userID = 'user-123';

    it('should return true when user has role-based permission', async () => {
      // Mock UserRole with nested RolePermission → Permission
      (prismaService.userRole.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ur-1',
          userID,
          roleID: 'role-1',
          createdAt: new Date(),
          role: {
            id: 'role-1',
            name: 'Admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            rolePermissions: [
              {
                id: 'rp-1',
                roleID: 'role-1',
                permissionID: mockPermissionUsersCreate.id,
                createdAt: new Date(),
                permission: mockPermissionUsersCreate,
              },
              {
                id: 'rp-2',
                roleID: 'role-1',
                permissionID: mockPermissionUsersView.id,
                createdAt: new Date(),
                permission: mockPermissionUsersView,
              },
            ],
          },
        },
      ] as any);

      const result = await service.hasPermission(userID, 'USERS.CREATE');

      expect(result).toBe(true);
      expect(prismaService.userRole.findMany).toHaveBeenCalledWith({
        where: { userID },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: {
                    include: { module: true },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should return false when user has no roles', async () => {
      // Mock empty arrays (no roles)
      (prismaService.userRole.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.hasPermission(userID, 'USERS.VIEW');

      expect(result).toBe(false);
    });

    it('should return false when user has no permission via roles', async () => {
      // Mock empty arrays (no roles)
      (prismaService.userRole.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.hasPermission(userID, 'USERS.DELETE');

      expect(result).toBe(false);
    });

    it('should correctly parse permission string (USERS.CREATE → module=USERS, action=CREATE)', async () => {
      (prismaService.userRole.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ur-1',
          userID,
          roleID: 'role-1',
          createdAt: new Date(),
          role: {
            id: 'role-1',
            name: 'Admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            rolePermissions: [
              {
                id: 'rp-1',
                roleID: 'role-1',
                permissionID: mockPermissionUsersCreate.id,
                createdAt: new Date(),
                permission: mockPermissionUsersCreate,
              },
            ],
          },
        },
      ] as any);

      const result = await service.hasPermission(userID, 'USERS.CREATE');

      expect(result).toBe(true);
    });

    it('should return false for invalid permission string format', async () => {
      (prismaService.userRole.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Invalid format (missing action)
      const result1 = await service.hasPermission(userID, 'USERS');
      expect(result1).toBe(false);

      // Invalid format (empty string)
      const result2 = await service.hasPermission(userID, '');
      expect(result2).toBe(false);

      // Invalid format (no module)
      const result3 = await service.hasPermission(userID, '.CREATE');
      expect(result3).toBe(false);
    });

    it('should return true when user has permission via any of multiple roles', async () => {
      // Mock two roles - user has USERS.CREATE via first role, USERS.VIEW via second
      (prismaService.userRole.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ur-1',
          userID,
          roleID: 'role-1',
          createdAt: new Date(),
          role: {
            id: 'role-1',
            name: 'Admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            rolePermissions: [
              {
                id: 'rp-1',
                roleID: 'role-1',
                permissionID: mockPermissionUsersCreate.id,
                createdAt: new Date(),
                permission: mockPermissionUsersCreate,
              },
            ],
          },
        },
        {
          id: 'ur-2',
          userID,
          roleID: 'role-2',
          createdAt: new Date(),
          role: {
            id: 'role-2',
            name: 'Viewer',
            createdAt: new Date(),
            updatedAt: new Date(),
            rolePermissions: [
              {
                id: 'rp-2',
                roleID: 'role-2',
                permissionID: mockPermissionUsersView.id,
                createdAt: new Date(),
                permission: mockPermissionUsersView,
              },
            ],
          },
        },
      ] as any);

      // Should have both permissions from different roles
      const result1 = await service.hasPermission(userID, 'USERS.CREATE');
      expect(result1).toBe(true);

      const result2 = await service.hasPermission(userID, 'USERS.VIEW');
      expect(result2).toBe(true);
    });
  });

  describe('getUserPermissions', () => {
    const userID = 'user-123';

    it('should return permissions from user roles', async () => {
      // Mock role permissions: USERS.CREATE, USERS.VIEW
      (prismaService.userRole.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ur-1',
          userID,
          roleID: 'role-1',
          createdAt: new Date(),
          role: {
            id: 'role-1',
            name: 'Admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            rolePermissions: [
              {
                id: 'rp-1',
                roleID: 'role-1',
                permissionID: mockPermissionUsersCreate.id,
                createdAt: new Date(),
                permission: mockPermissionUsersCreate,
              },
              {
                id: 'rp-2',
                roleID: 'role-1',
                permissionID: mockPermissionUsersView.id,
                createdAt: new Date(),
                permission: mockPermissionUsersView,
              },
            ],
          },
        },
      ] as any);

      const result = await service.getUserPermissions(userID);

      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([mockPermissionUsersCreate, mockPermissionUsersView]));
    });

    it('should return empty array when user has no roles', async () => {
      (prismaService.userRole.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getUserPermissions(userID);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should call userRole.findMany with correct parameters', async () => {
      (prismaService.userRole.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await service.getUserPermissions(userID);

      expect(prismaService.userRole.findMany).toHaveBeenCalledWith({
        where: { userID },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: {
                    include: { module: true },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should deduplicate permissions when user has multiple roles with overlapping permissions', async () => {
      // Mock two roles with some overlapping permissions
      (prismaService.userRole.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'ur-1',
          userID,
          roleID: 'role-1',
          createdAt: new Date(),
          role: {
            id: 'role-1',
            name: 'Admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            rolePermissions: [
              {
                id: 'rp-1',
                roleID: 'role-1',
                permissionID: mockPermissionUsersCreate.id,
                createdAt: new Date(),
                permission: mockPermissionUsersCreate,
              },
              {
                id: 'rp-2',
                roleID: 'role-1',
                permissionID: mockPermissionUsersView.id,
                createdAt: new Date(),
                permission: mockPermissionUsersView,
              },
            ],
          },
        },
        {
          id: 'ur-2',
          userID,
          roleID: 'role-2',
          createdAt: new Date(),
          role: {
            id: 'role-2',
            name: 'Editor',
            createdAt: new Date(),
            updatedAt: new Date(),
            rolePermissions: [
              {
                id: 'rp-3',
                roleID: 'role-2',
                permissionID: mockPermissionUsersView.id, // Duplicate from role-1
                createdAt: new Date(),
                permission: mockPermissionUsersView,
              },
              {
                id: 'rp-4',
                roleID: 'role-2',
                permissionID: mockPermissionUsersUpdate.id,
                createdAt: new Date(),
                permission: mockPermissionUsersUpdate,
              },
            ],
          },
        },
      ] as any);

      const result = await service.getUserPermissions(userID);

      // Should have 3 unique permissions (USERS.VIEW deduplicated)
      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([mockPermissionUsersCreate, mockPermissionUsersView, mockPermissionUsersUpdate]),
      );

      // Verify USERS.VIEW appears only once
      const usersViewCount = result.filter((p) => p.id === mockPermissionUsersView.id).length;
      expect(usersViewCount).toBe(1);
    });
  });
});
