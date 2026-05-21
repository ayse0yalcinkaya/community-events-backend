// Libraries
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Permission, Role } from '@prisma/client';

// DTOs
import { CreateRoleDto } from '../dto/request/create-role.dto';
import { UpdateRoleDto } from '../dto/request/update-role.dto';

// Services
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../../../database/prisma.service';
describe('PermissionsService', () => {
  let service: PermissionsService;
  let prismaService: any;

  const mockI18nService = {
    translate: jest.fn((key) => key),
  };

  beforeEach(async () => {
    const mockPrismaService: any = {
      role: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      permission: {
        findMany: jest.fn(),
      },
      module: {
        findMany: jest.fn(),
      },
      rolePermission: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };
    mockPrismaService.$transaction = jest.fn((callback) => callback(mockPrismaService));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRole', () => {
    const dto: CreateRoleDto = {
      name: 'New Role',
      description: 'Description',
      moduleIDs: ['uuid-module-1', 'uuid-module-2'],
    };

    it('should create a role with permissions from modules successfully', async () => {
      // Mock role name check (not exists)
      (prismaService.role.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock module validation
      const mockModules = [{ id: 'uuid-module-1' }, { id: 'uuid-module-2' }];
      (prismaService.module.findMany as jest.Mock).mockResolvedValue(mockModules);

      // Mock permissions lookup by module
      const mockPermissions = [
        { id: 'perm-1', moduleID: 'uuid-module-1', action: 'CREATE' },
        { id: 'perm-2', moduleID: 'uuid-module-1', action: 'VIEW' },
        { id: 'perm-3', moduleID: 'uuid-module-2', action: 'VIEW' },
      ];
      (prismaService.permission.findMany as jest.Mock).mockResolvedValue(mockPermissions);

      // Mock role creation
      const createdRole: Role = {
        id: 'role-1',
        name: dto.name,
        description: dto.description ?? null,
        parentType: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prismaService.role.create as jest.Mock).mockResolvedValue(createdRole);

      const result = await service.createRole(dto);

      expect(result).toEqual(createdRole);
      // Verify role name check
      expect(prismaService.role.findUnique).toHaveBeenCalledWith({
        where: { name: dto.name },
      });
      // Verify module validation
      expect(prismaService.module.findMany).toHaveBeenCalledWith({
        where: { id: { in: dto.moduleIDs } },
        select: { id: true },
      });
      // Verify permissions fetched by module
      expect(prismaService.permission.findMany).toHaveBeenCalledWith({
        where: { moduleID: { in: dto.moduleIDs } },
        select: { id: true },
      });
      // Verify role creation
      expect(prismaService.role.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          parentType: null,
          isDefault: false,
        },
      });
      // Verify permission assignment
      expect(prismaService.rolePermission.createMany).toHaveBeenCalledWith({
        data: [
          { roleID: 'role-1', permissionID: 'perm-1' },
          { roleID: 'role-1', permissionID: 'perm-2' },
          { roleID: 'role-1', permissionID: 'perm-3' },
        ],
      });
    });

    it('should throw BadRequestException if role name already exists', async () => {
      // Mock role name check (exists)
      (prismaService.role.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-role' });

      await expect(service.createRole(dto)).rejects.toThrow(BadRequestException);
      expect(prismaService.role.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if invalid module IDs provided', async () => {
      // Mock role name check (not exists)
      (prismaService.role.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock module validation (some missing)
      (prismaService.module.findMany as jest.Mock).mockResolvedValue([{ id: 'uuid-module-1' }]);

      await expect(service.createRole(dto)).rejects.toThrow(BadRequestException);
      expect(prismaService.role.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if no permissions found for modules', async () => {
      // Mock role name check (not exists)
      (prismaService.role.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock module validation (all valid)
      (prismaService.module.findMany as jest.Mock).mockResolvedValue([
        { id: 'uuid-module-1' },
        { id: 'uuid-module-2' },
      ]);

      // Mock permissions check (none found)
      (prismaService.permission.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.createRole(dto)).rejects.toThrow(BadRequestException);
      expect(prismaService.role.create).not.toHaveBeenCalled();
    });

    it('should create role without permissions if modules is empty', async () => {
      const dtoNoModules: CreateRoleDto = {
        name: 'Role No Modules',
        moduleIDs: [],
      };

      // Mock role name check (not exists)
      (prismaService.role.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock role creation
      const createdRole: Role = {
        id: 'role-2',
        name: dtoNoModules.name,
        description: null,
        parentType: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prismaService.role.create as jest.Mock).mockResolvedValue(createdRole);

      const result = await service.createRole(dtoNoModules);

      expect(result).toEqual(createdRole);
      expect(prismaService.permission.findMany).not.toHaveBeenCalled();
      expect(prismaService.rolePermission.createMany).not.toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    const roleId = 'role-1';
    const dto: UpdateRoleDto = {
      name: 'Updated Role',
      description: 'Updated Description',
      moduleIDs: ['uuid-module-3'],
    };

    it('should update role name, description and permissions successfully', async () => {
      // Mock role existence check (role exists)
      const existingRole: Role = {
        id: roleId,
        name: 'Old Role',
        description: null,
        parentType: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prismaService.role.findUnique as jest.Mock)
        .mockResolvedValueOnce(existingRole) // First call: check existence
        .mockResolvedValueOnce(null); // Second call: check name uniqueness

      // Mock module validation
      (prismaService.module.findMany as jest.Mock).mockResolvedValue([{ id: 'uuid-module-3' }]);

      // Mock permissions lookup by module
      const mockPermissions = [{ id: 'perm-4', moduleID: 'uuid-module-3', action: 'UPLOAD' }];
      (prismaService.permission.findMany as jest.Mock).mockResolvedValue(mockPermissions);

      // Mock role update
      const updatedRole: Role = { ...existingRole, name: dto.name!, createdAt: new Date(), updatedAt: new Date() };
      (prismaService.role.update as jest.Mock).mockResolvedValue(updatedRole);

      const result = await service.updateRole(roleId, dto);

      expect(result).toEqual(updatedRole);
      // Verify role existence check
      expect(prismaService.role.findUnique).toHaveBeenCalledWith({ where: { id: roleId } });
      // Verify name uniqueness check (should exclude current role)
      expect(prismaService.role.findFirst).toHaveBeenCalledWith({
        where: { name: dto.name, id: { not: roleId } },
      });
      // Verify module validation
      expect(prismaService.module.findMany).toHaveBeenCalledWith({
        where: { id: { in: dto.moduleIDs } },
        select: { id: true },
      });
      // Verify permissions fetched
      expect(prismaService.permission.findMany).toHaveBeenCalledWith({
        where: { moduleID: { in: dto.moduleIDs } },
        select: { id: true },
      });
      // Verify old permissions deletion
      expect(prismaService.rolePermission.deleteMany).toHaveBeenCalledWith({ where: { roleID: roleId } });
      // Verify new permissions assignment
      expect(prismaService.rolePermission.createMany).toHaveBeenCalledWith({
        data: [{ roleID: roleId, permissionID: 'perm-4' }],
      });
      // Verify role update
      expect(prismaService.role.update).toHaveBeenCalledWith({
        where: { id: roleId },
        data: { name: dto.name, description: dto.description },
      });
    });

    it('should throw NotFoundException if role not found', async () => {
      (prismaService.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateRole(roleId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if new role name conflicts with another role', async () => {
      // Mock role existence (exists)
      (prismaService.role.findUnique as jest.Mock).mockResolvedValue({ id: roleId });
      // Mock name unique check (another role exists with this name)
      (prismaService.role.findFirst as jest.Mock).mockResolvedValue({ id: 'other-role' });

      await expect(service.updateRole(roleId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteRole', () => {
    const roleId = 'role-1';

    it('should delete role successfully', async () => {
      // Mock role existence
      (prismaService.role.findUnique as jest.Mock).mockResolvedValue({ id: roleId });
      // Mock delete
      (prismaService.role.delete as jest.Mock).mockResolvedValue({ id: roleId });

      await service.deleteRole(roleId);

      expect(prismaService.role.findUnique).toHaveBeenCalledWith({ where: { id: roleId } });
      expect(prismaService.role.delete).toHaveBeenCalledWith({ where: { id: roleId } });
    });

    it('should throw NotFoundException if role not found', async () => {
      (prismaService.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteRole(roleId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRoleById', () => {
    const roleId = 'role-1';

    it('should return role with modules and permissions grouped', async () => {
      const mockRoleWithPermissions = {
        id: roleId,
        name: 'Admin',
        parentType: 'ADMIN',
        isDefault: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        rolePermissions: [
          {
            permission: {
              id: 'perm-1',
              action: 'VIEW',
              description: 'View users',
              module: {
                id: 'module-users',
                nameKey: 'modules.USERS.NAME',
                descriptionKey: 'modules.USERS.DESC',
              },
            },
          },
          {
            permission: {
              id: 'perm-2',
              action: 'CREATE',
              description: 'Create users',
              module: {
                id: 'module-users',
                nameKey: 'modules.USERS.NAME',
                descriptionKey: 'modules.USERS.DESC',
              },
            },
          },
          {
            permission: {
              id: 'perm-3',
              action: 'VIEW',
              description: 'View files',
              module: {
                id: 'module-files',
                nameKey: 'modules.FILES.NAME',
                descriptionKey: 'modules.FILES.DESC',
              },
            },
          },
        ],
      };

      (prismaService.role.findUnique as jest.Mock).mockResolvedValue(mockRoleWithPermissions);

      const result = await service.getRoleById(roleId);

      expect(prismaService.role.findUnique).toHaveBeenCalledWith({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: {
              permission: {
                include: { module: true },
              },
            },
          },
        },
      });

      expect(result.id).toBe(roleId);
      expect(result.name).toBe('Admin');
      expect(result.parentType).toBe('ADMIN');
      expect(result.isDefault).toBe(true);
      expect(result.modules).toHaveLength(2);

      // Modules should be sorted by nameKey
      expect(result.modules[0].nameKey).toBe('modules.FILES.NAME');
      expect(result.modules[1].nameKey).toBe('modules.USERS.NAME');

      // Check permissions grouped correctly
      const filesModule = result.modules.find((m) => m.id === 'module-files');
      expect(filesModule?.permissions).toHaveLength(1);
      expect(filesModule?.permissions[0].action).toBe('VIEW');

      const usersModule = result.modules.find((m) => m.id === 'module-users');
      expect(usersModule?.permissions).toHaveLength(2);
      // Permissions sorted by action
      expect(usersModule?.permissions[0].action).toBe('CREATE');
      expect(usersModule?.permissions[1].action).toBe('VIEW');
    });

    it('should throw NotFoundException if role not found', async () => {
      (prismaService.role.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getRoleById(roleId)).rejects.toThrow(NotFoundException);
    });

    it('should return empty modules array if role has no permissions', async () => {
      const mockRoleEmpty = {
        id: roleId,
        name: 'Empty Role',
        parentType: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        rolePermissions: [],
      };

      (prismaService.role.findUnique as jest.Mock).mockResolvedValue(mockRoleEmpty);

      const result = await service.getRoleById(roleId);

      expect(result.modules).toEqual([]);
    });
  });

  describe('getAllRoles', () => {
    it('should return roles ordered by name', async () => {
      const roles: Role[] = [
        {
          id: 'role-2',
          name: 'Editor',
          description: null,
          parentType: null,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'role-1',
          name: 'Admin',
          description: 'Admin role',
          parentType: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prismaService.role.findMany as jest.Mock).mockResolvedValue(roles);

      const result = await service.getAllRoles();

      expect(prismaService.role.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(roles);
    });
  });
  describe('getPermissionModules', () => {
    it('should return only visible modules', async () => {
      const modules = [
        { id: '1', nameKey: 'A', isVisible: true },
        { id: '2', nameKey: 'B', isVisible: false },
      ];
      // Mock findMany to return what we expect if filter worked (though mock return doesn't validate input, the expect checking call args does)
      (prismaService.module.findMany as jest.Mock).mockResolvedValue([modules[0]]);

      await service.getPermissionModules();

      expect(prismaService.module.findMany).toHaveBeenCalledWith({
        where: { isVisible: true },
        orderBy: { nameKey: 'asc' },
      });
    });
  });

  describe('getUserRolePermissionsSummary', () => {
    const userID = 'user-1';
    const mockRole = {
      id: 'role-1',
      name: 'Admin',
      parentType: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      rolePermissions: [] as any[],
    };

    const mockPermissions = [
      {
        id: 'perm-1',
        action: 'VIEW',
        description: 'View chat',
        createdAt: new Date('2024-01-03T00:00:00Z'),
        module: {
          id: 'module-1',
          nameKey: 'modules.CHAT.NAME',
          descriptionKey: 'modules.CHAT.DESC',
        },
      },
      {
        id: 'perm-2',
        action: 'CREATE',
        description: 'Create chat',
        createdAt: new Date('2024-01-04T00:00:00Z'),
        module: {
          id: 'module-1',
          nameKey: 'modules.CHAT.NAME',
          descriptionKey: 'modules.CHAT.DESC',
        },
      },
    ];

    it('should return role, permissions CSV, modules and permission list', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: userID,
        role: {
          ...mockRole,
          rolePermissions: mockPermissions.map((permission) => ({ permission })),
        },
      });

      const result = await service.getUserRolePermissionsSummary(userID);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userID },
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

      expect(result.role).toEqual({
        id: mockRole.id,
        name: mockRole.name,
        parentType: mockRole.parentType,
        createdAt: mockRole.createdAt,
        updatedAt: mockRole.updatedAt,
      });
      expect(result.permissionsCsv).toBe('CHAT.CREATE,CHAT.VIEW');
      expect(result.modules).toEqual(['CHAT']);
      expect(result.permissions).toEqual([
        {
          id: mockPermissions[1].id,
          module: 'CHAT',
          action: 'CREATE',
          description: mockPermissions[1].description,
          createdAt: mockPermissions[1].createdAt,
        },
        {
          id: mockPermissions[0].id,
          module: 'CHAT',
          action: 'VIEW',
          description: mockPermissions[0].description,
          createdAt: mockPermissions[0].createdAt,
        },
      ]);
    });

    it('should return empty role data when no role assigned', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: userID,
        role: null,
      });

      const result = await service.getUserRolePermissionsSummary(userID);

      expect(result).toEqual({
        role: null,
        permissionsCsv: '',
        modules: [],
        permissions: [],
      });
    });

    it('should throw NotFoundException when user missing', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getUserRolePermissionsSummary(userID)).rejects.toThrow(NotFoundException);
    });
  });
});
