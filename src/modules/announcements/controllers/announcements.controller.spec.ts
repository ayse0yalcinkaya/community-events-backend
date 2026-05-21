import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from '../services/announcements.service';
import { AnnouncementReqDto } from '../dto/request/announcement.dto';
import { UpdateAnnouncementDto } from '../dto/request/update-announcement.dto';
import { QueryAnnouncementDto } from '../dto/request/query-announcement.dto';
import { JwtPayload } from '@/modules/auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';

describe('AnnouncementsController', () => {
  let controller: AnnouncementsController;
  let service: jest.Mocked<AnnouncementsService>;

  const mockService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    getAnnouncementsForStaff: jest.fn(),
  } as unknown as jest.Mocked<AnnouncementsService>;

  const currentUser: JwtPayload = {
    sub: 'user-1',
    phoneNumber: '+900000000000',
    roles: ['admin'],
    userType: 'ADMIN',
    iat: 0,
    exp: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnouncementsController],
      providers: [
        {
          provide: AnnouncementsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnnouncementsController>(AnnouncementsController);
    service = module.get(AnnouncementsService) as jest.Mocked<AnnouncementsService>;
    Object.values(service).forEach((fn) => (fn as any).mockReset?.());
  });

  it('should create announcement', async () => {
    const dto = { title: 'Test' } as AnnouncementReqDto;
    const file = { originalname: 'img.png' } as Express.Multer.File;
    const created = { id: 'a-1', title: 'Test' };
    service.create.mockResolvedValue(created as any);

    const result = await controller.create(dto, currentUser, file);

    expect(service.create).toHaveBeenCalledWith(dto, currentUser, file);
    expect(result).toEqual(created);
  });

  it('should get announcement by id', async () => {
    const announcement = { id: 'a-1' };
    service.findOne.mockResolvedValue(announcement as any);

    const result = await controller.findOne('a-1');

    expect(service.findOne).toHaveBeenCalledWith('a-1');
    expect(result).toEqual(announcement);
  });

  it('should list announcements', async () => {
    const query = { page: 2, limit: 5 } as QueryAnnouncementDto;
    const data = { items: [{ id: 'a-1' }], count: 1 };
    service.findAll.mockResolvedValue(data as any);

    const result = await controller.findAll(query);

    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual({ items: data.items, count: data.count });
  });

  it('should update announcement', async () => {
    const dto = { title: 'Updated' } as UpdateAnnouncementDto;
    const file = { originalname: 'img.png' } as Express.Multer.File;
    const updated = { id: 'a-1', title: 'Updated' };
    service.update.mockResolvedValue(updated as any);

    const result = await controller.update('a-1', dto, currentUser, file);

    expect(service.update).toHaveBeenCalledWith('a-1', dto, currentUser, file);
    expect(result).toEqual(updated);
  });

  it('should delete announcement', async () => {
    service.softDelete.mockResolvedValue(undefined);

    const result = await controller.remove('a-1');

    expect(service.softDelete).toHaveBeenCalledWith('a-1');
    expect(result).toEqual({ success: true });
  });

  it('should get announcements for current staff', async () => {
    const data = { items: [{ id: 'a-1' }], count: 1 };
    service.getAnnouncementsForStaff.mockResolvedValue(data as any);

    const result = await controller.getMy(currentUser, '1', '20', 'hello');

    expect(service.getAnnouncementsForStaff).toHaveBeenCalledWith(currentUser, {
      page: 1,
      limit: 20,
      search: 'hello',
    });
    expect(result).toEqual({ items: data.items, count: data.count });
  });

  it('should throw on invalid pagination', async () => {
    await expect(controller.getMy(currentUser, 'abc', 'def')).rejects.toThrow(BadRequestException);
  });
});
