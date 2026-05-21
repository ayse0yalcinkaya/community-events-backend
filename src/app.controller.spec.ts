// Libraries
import { Test, TestingModule } from '@nestjs/testing';

// Services
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';

// Controllers
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
