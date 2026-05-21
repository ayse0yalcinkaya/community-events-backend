// Libraries
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createMockI18nService } from '../../../../../test/utils/mockI18nService';
import { createMockLogger } from '../../../../../test/utils/mockLogger';
import axios, { AxiosError } from 'axios';
import { I18nService } from 'nestjs-i18n';

// Enums
import { SmsType } from '../../enums/sms-type.enum';

// Services
import { FonivaService } from '../../services/foniva.service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const isAxiosErrorSpy = jest.spyOn(axios, 'isAxiosError');

describe('FonivaService', () => {
  let service: FonivaService;
  let configService: jest.Mocked<ConfigService>;
  let i18nService: any;

  const mockFonivaConfig = {
    apiUrl: 'https://test-foniva-api.example.com',
    username: 'test-username',
    password: 'test-password',
    apiKey: 'test-api-key',
    sender: 'TEST',
  };

  const mockAppConfig = {
    baseUrl: 'http://localhost:3000',
  };

  beforeEach(async () => {
    // Setup axios.create mock before creating service
    const mockPost = jest.fn();
    mockedAxios.create = jest.fn().mockReturnValue({
      post: mockPost,
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FonivaService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'foniva') return mockFonivaConfig;
              if (key === 'app') return mockAppConfig;
              return null;
            }),
          },
        },
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
        {
          provide: 'Logger',
          useValue: createMockLogger(),
        },
      ],
    }).compile();

    service = module.get<FonivaService>(FonivaService);
    configService = module.get(ConfigService);
    i18nService = module.get(I18nService);

    // Reset axios mocks
    jest.clearAllMocks();
  });

  describe('sendSms', () => {
    const phoneNumber = '+905551234567';
    const message = 'Test SMS message';
    const type = SmsType.OTP;
    const customId = 'test-custom-id';

    it('should send SMS successfully and return providerId', async () => {
      // Arrange
      const mockResponse = {
        data: {
          err: null,
          data: {
            pkgID: 42576396,
          },
        },
        status: 200,
        statusText: 'OK',
      };

      // Get the axios instance created in constructor and mock its post method
      const axiosInstance = (service as any).axiosInstance;
      jest.spyOn(axiosInstance, 'post').mockResolvedValue(mockResponse);

      // Act
      const result = await service.sendSms(phoneNumber, message, type, customId);

      // Assert
      expect(result).toEqual({
        providerId: '42576396',
        success: true,
      });
      expect(axiosInstance.post).toHaveBeenCalled();
    });

    it('should handle network failures and throw ServiceUnavailableException', async () => {
      // Arrange
      const networkError: AxiosError = {
        message: 'Network Error',
        name: 'AxiosError',
        code: 'ECONNREFUSED',
        isAxiosError: true,
        config: {} as any,
        response: undefined,
        toJSON: jest.fn(),
      };

      isAxiosErrorSpy.mockReturnValue(true);
      const axiosInstance = (service as any).axiosInstance;
      jest.spyOn(axiosInstance, 'post').mockRejectedValue(networkError);

      // Act & Assert
      await expect(service.sendSms(phoneNumber, message, type)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should handle invalid credentials (401) and throw BadRequestException', async () => {
      // Arrange
      const authError: AxiosError = {
        message: 'Unauthorized',
        name: 'AxiosError',
        code: '401',
        isAxiosError: true,
        config: {} as any,
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { error: 'Invalid credentials' },
          headers: {},
          config: {} as any,
        },
        toJSON: jest.fn(),
      };

      isAxiosErrorSpy.mockReturnValue(true);
      const axiosInstance = (service as any).axiosInstance;
      jest.spyOn(axiosInstance, 'post').mockRejectedValue(authError);

      // Act & Assert
      await expect(service.sendSms(phoneNumber, message, type)).rejects.toThrow(BadRequestException);
    });

    it('should handle other HTTP errors and throw ServiceUnavailableException', async () => {
      // Arrange
      const httpError: AxiosError = {
        message: 'Internal Server Error',
        name: 'AxiosError',
        code: '500',
        isAxiosError: true,
        config: {} as any,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Server error' },
          headers: {},
          config: {} as any,
        },
        toJSON: jest.fn(),
      };

      isAxiosErrorSpy.mockReturnValue(true);
      const axiosInstance = (service as any).axiosInstance;
      jest.spyOn(axiosInstance, 'post').mockRejectedValue(httpError);

      // Act & Assert
      await expect(service.sendSms(phoneNumber, message, type)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should handle missing providerId in response and throw ServiceUnavailableException', async () => {
      // Arrange
      const mockResponse = {
        data: {
          err: null,
          data: {},
        },
        status: 200,
        statusText: 'OK',
      };

      const axiosInstance = (service as any).axiosInstance;
      jest.spyOn(axiosInstance, 'post').mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(service.sendSms(phoneNumber, message, type)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should handle response with alternative providerId fields', async () => {
      // Arrange
      const mockResponse = {
        data: {
          id: 'alternative-id-123',
        },
        status: 200,
        statusText: 'OK',
      };

      const axiosInstance = (service as any).axiosInstance;
      jest.spyOn(axiosInstance, 'post').mockResolvedValue(mockResponse);

      // Act
      const result = await service.sendSms(phoneNumber, message, type);

      // Assert
      expect(result).toEqual({
        providerId: 'alternative-id-123',
        success: true,
      });
    });

    it('should include callback URL in payload', async () => {
      // Arrange
      const mockResponse = {
        data: {
          err: null,
          data: {
            pkgID: 42576396,
          },
        },
        status: 200,
        statusText: 'OK',
      };

      const axiosInstance = (service as any).axiosInstance;
      const postMock = jest.spyOn(axiosInstance, 'post').mockResolvedValue(mockResponse);

      // Act
      await service.sendSms(phoneNumber, message, type, customId);

      // Assert
      expect(postMock).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          pushSettings: {
            url: 'http://localhost:3000/api/sms/callback/delivery',
          },
          customID: customId,
        }),
      );
    });

    it('should handle non-axios errors and throw ServiceUnavailableException', async () => {
      // Arrange
      const genericError = new Error('Unexpected error');

      isAxiosErrorSpy.mockReturnValue(false);
      const axiosInstance = (service as any).axiosInstance;
      jest.spyOn(axiosInstance, 'post').mockRejectedValue(genericError);

      // Act & Assert
      await expect(service.sendSms(phoneNumber, message, type)).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
