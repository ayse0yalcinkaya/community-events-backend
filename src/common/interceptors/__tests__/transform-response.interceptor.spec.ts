// Libraries
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { of } from 'rxjs';

// Interceptors
import { TransformResponseInterceptor } from '../transform-response.interceptor';

describe('TransformResponseInterceptor', () => {
  let interceptor: TransformResponseInterceptor;
  let i18nService: jest.Mocked<I18nService>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockResponse: any;

  beforeEach(async () => {
    // Mock I18nService
    i18nService = {
      t: jest.fn((key: string) => {
        const translations: Record<string, string> = {
          'success.OPERATION_SUCCESSFUL': 'Operation successful',
          'success.CREATED': 'Record created successfully',
          'success.NO_CONTENT': 'Operation completed successfully',
        };
        return translations[key] || key;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransformResponseInterceptor,
        {
          provide: I18nService,
          useValue: i18nService,
        },
      ],
    }).compile();

    interceptor = module.get<TransformResponseInterceptor>(TransformResponseInterceptor);

    // Mock response object
    mockResponse = {
      statusCode: 200,
    };

    // Mock ExecutionContext
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as any;

    // Mock CallHandler
    mockCallHandler = {
      handle: jest.fn(),
    } as any;
  });

  describe('Single Object Response', () => {
    it('should wrap single object response with success format', (done) => {
      const mockData = { id: '1', name: 'Test User' };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            status: 200,
            data: mockData,
            message: 'Operation successful',
          });
          expect(i18nService.t).toHaveBeenCalledWith('success.OPERATION_SUCCESSFUL');
          done();
        },
      });
    });

    it('should handle 201 Created status code', (done) => {
      mockResponse.statusCode = 201;
      const mockData = { id: '1', name: 'New User' };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            status: 201,
            data: mockData,
            message: 'Record created successfully',
          });
          expect(i18nService.t).toHaveBeenCalledWith('success.CREATED');
          done();
        },
      });
    });
  });

  describe('Array Response', () => {
    it('should wrap array response with success format', (done) => {
      const mockData = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ];
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            status: 200,
            data: mockData,
            message: 'Operation successful',
          });
          done();
        },
      });
    });

    it('should handle empty array response', (done) => {
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of([]));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            status: 200,
            data: [],
            message: 'Operation successful',
          });
          done();
        },
      });
    });
  });

  describe('Paginated Response', () => {
    it('should transform paginated response with items and count', (done) => {
      const mockData = {
        items: [
          { id: '1', name: 'User 1' },
          { id: '2', name: 'User 2' },
        ],
        count: 100,
      };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            status: 200,
            data: mockData.items,
            count: 100,
            message: 'Operation successful',
          });
          done();
        },
      });
    });

    it('should handle paginated response with empty items', (done) => {
      const mockData = {
        items: [],
        count: 0,
      };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            status: 200,
            data: [],
            count: 0,
            message: 'Operation successful',
          });
          done();
        },
      });
    });

    it('should transform paginated response with data and count (CLAUDE.md pattern)', (done) => {
      const mockData = {
        data: [
          { id: '1', name: 'Department 1' },
          { id: '2', name: 'Department 2' },
        ],
        count: 7,
      };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            status: 200,
            data: mockData.data,
            count: 7,
            message: 'Operation successful',
          });
          done();
        },
      });
    });

    it('should handle paginated response with empty data array', (done) => {
      const mockData = {
        data: [],
        count: 0,
      };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            status: 200,
            data: [],
            count: 0,
            message: 'Operation successful',
          });
          done();
        },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null data', (done) => {
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(null));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            status: 200,
            data: null,
            message: 'Operation successful',
          });
          done();
        },
      });
    });

    it('should handle undefined data', (done) => {
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(undefined));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            status: 200,
            data: null,
            message: 'Operation successful',
          });
          done();
        },
      });
    });

    it('should handle 204 No Content status', (done) => {
      mockResponse.statusCode = 204;
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(undefined));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            status: 204,
            data: null,
            message: 'Operation completed successfully',
          });
          expect(i18nService.t).toHaveBeenCalledWith('success.NO_CONTENT');
          done();
        },
      });
    });
  });

  describe('Already Wrapped Response', () => {
    it('should preserve already wrapped response format', (done) => {
      const mockData = {
        success: true,
        status: 200,
        data: { id: '1', name: 'User' },
        message: 'Custom message from service',
      };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({
            success: true,
            status: 200,
            data: { id: '1', name: 'User' },
            count: undefined,
            message: 'Custom message from service',
          });
          done();
        },
      });
    });

    it('should preserve custom message from wrapped response', (done) => {
      const mockData = {
        success: true,
        data: { token: 'abc123' },
        message: 'Login successful',
      };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.message).toBe('Login successful');
          expect(result.data).toEqual({ token: 'abc123' });
          done();
        },
      });
    });
  });

  describe('i18n Integration', () => {
    it('should call i18n service for message translation', (done) => {
      const mockData = { id: '1' };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(i18nService.t).toHaveBeenCalledWith('success.OPERATION_SUCCESSFUL');
          done();
        },
      });
    });

    it('should use correct message key based on status code', (done) => {
      mockResponse.statusCode = 201;
      const mockData = { id: '1' };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(mockData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(i18nService.t).toHaveBeenCalledWith('success.CREATED');
          done();
        },
      });
    });
  });

  describe('Response Type Detection', () => {
    it('should correctly detect paginated response pattern', (done) => {
      const paginatedData = {
        items: [{ id: '1' }],
        count: 1,
      };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(paginatedData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.data).toEqual(paginatedData.items);
          expect(result.count).toBe(1);
          expect(result).not.toHaveProperty('items');
          done();
        },
      });
    });

    it('should correctly detect array response (not paginated)', (done) => {
      const arrayData = [{ id: '1' }, { id: '2' }];
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(arrayData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.data).toEqual(arrayData);
          expect(result).not.toHaveProperty('count');
          expect(result).not.toHaveProperty('items');
          done();
        },
      });
    });

    it('should correctly detect single object response', (done) => {
      const objectData = { id: '1', name: 'Test' };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(objectData));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result.data).toEqual(objectData);
          expect(result).not.toHaveProperty('count');
          expect(result).not.toHaveProperty('items');
          done();
        },
      });
    });
  });
});
