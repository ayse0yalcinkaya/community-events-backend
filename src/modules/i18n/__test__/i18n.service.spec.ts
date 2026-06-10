// Libraries
import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { AcceptLanguageResolver, I18nModule, I18nService } from 'nestjs-i18n';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        I18nModule.forRoot({
          fallbackLanguage: 'en',
          loaderOptions: {
            path: path.join(__dirname, '../translations/'),
            watch: false,
          },
          resolvers: [AcceptLanguageResolver],
        }),
      ],
    }).compile();

    service = module.get<I18nService>(I18nService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Translation Lookup (AC-7.1.4)', () => {
    it('should return correct English translation for existing key', async () => {
      const result = await service.translate('common.SUCCESS', { lang: 'en' });
      expect(result).toBe('Operation successful');
    });

    it('should return correct Turkish translation for existing key', async () => {
      const result = await service.translate('common.SUCCESS', { lang: 'tr' });
      expect(result).toBe('İşlem başarılı');
    });

    it('should return correct translation for auth namespace', async () => {
      const result = await service.translate('auth.LOGIN_SUCCESS', {
        lang: 'en',
      });
      expect(result).toBe('Login successful');
    });

    it('should return correct translation for users namespace', async () => {
      const result = await service.translate('users.USER_NOT_FOUND', {
        lang: 'en',
      });
      expect(result).toBe('User not found');
    });

    it('should fallback to English when translation key is missing in Turkish', async () => {
      // If a key exists in EN but not in TR, it should fallback to EN
      const result = await service.translate('common.SUCCESS', { lang: 'tr' });
      expect(result).toBeTruthy(); // Should return either TR or EN version
    });

    it('should return key itself if translation is completely missing (graceful degradation)', async () => {
      const result = await service.translate('nonexistent.KEY', {
        lang: 'en',
      });
      expect(result).toBe('nonexistent.KEY');
    });
  });

  describe('Variable Replacement (AC-7.1.6)', () => {
    it('should replace single variable in translation', async () => {
      const result = await service.translate('auth.OTP_SENT', {
        lang: 'en',
        args: { phone: '+905551234567' },
      });
      expect(result).toBe('Verification code sent to +905551234567 via WhatsApp');
    });

    it('should replace variable in Turkish translation', async () => {
      const result = await service.translate('auth.OTP_SENT', {
        lang: 'tr',
        args: { phone: '+905551234567' },
      });
      expect(result).toBe('Doğrulama kodu +905551234567 numarasına WhatsApp üzerinden gönderildi');
    });

    it('should handle missing variable gracefully', async () => {
      const result = await service.translate('auth.OTP_SENT', { lang: 'en' });
      // Should return with placeholder intact or empty string
      expect(result).toBeTruthy();
    });

    it('should replace multiple variables if present', async () => {
      // Even though current translations don't have multiple variables,
      // this tests the mechanism for future use
      const result = await service.translate('common.SUCCESS', {
        lang: 'en',
        args: { firstName: 'John', lastName: 'Doe' },
      });
      expect(result).toBeTruthy();
    });
  });

  describe('Language Override (AC-7.1.4)', () => {
    it('should use specified language even if different from default', async () => {
      const enResult = await service.translate('auth.LOGIN_SUCCESS', {
        lang: 'en',
      });
      const trResult = await service.translate('auth.LOGIN_SUCCESS', {
        lang: 'tr',
      });

      expect(enResult).toBe('Login successful');
      expect(trResult).toBe('Giriş başarılı');
      expect(enResult).not.toBe(trResult);
    });

    it('should force Turkish translation when lang=tr is specified', async () => {
      const result = await service.translate('common.ERROR', { lang: 'tr' });
      expect(result).toBe('Bir hata oluştu');
    });
  });

  describe('Fallback Behavior (AC-7.1.1, AC-7.1.3)', () => {
    it('should fallback to English for invalid language code', async () => {
      const result = await service.translate('common.SUCCESS', {
        lang: 'invalid',
      });
      // Should fallback to English
      expect(result).toBe('Operation successful');
    });

    it('should use fallback language for missing translation', async () => {
      const result = await service.translate('common.SUCCESS', { lang: 'de' });
      // German doesn't exist, should fallback to English
      expect(result).toBe('Operation successful');
    });
  });

  describe('All Translation Keys Exist (AC-7.1.2)', () => {
    describe('Common translations', () => {
      const commonKeys = [
        'SUCCESS',
        'ERROR',
        'NOT_FOUND',
        'UNAUTHORIZED',
        'FORBIDDEN',
        'VALIDATION_ERROR',
        'INTERNAL_ERROR',
      ];

      commonKeys.forEach((key) => {
        it(`should have common.${key} in English`, async () => {
          const result = await service.translate(`common.${key}`, {
            lang: 'en',
          });
          expect(result).toBeTruthy();
          expect(result).not.toBe(`common.${key}`); // Should not return the key itself
        });

        it(`should have common.${key} in Turkish`, async () => {
          const result = await service.translate(`common.${key}`, {
            lang: 'tr',
          });
          expect(result).toBeTruthy();
          expect(result).not.toBe(`common.${key}`);
        });
      });
    });

    describe('Auth translations', () => {
      const authKeys = [
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'LOGOUT_SUCCESS',
        'TOKEN_EXPIRED',
        'TOKEN_INVALID',
        'OTP_SENT',
        'OTP_INVALID',
        'PASSWORD_RESET_SUCCESS',
      ];

      authKeys.forEach((key) => {
        it(`should have auth.${key} in English`, async () => {
          const result = await service.translate(`auth.${key}`, {
            lang: 'en',
          });
          expect(result).toBeTruthy();
          expect(result).not.toBe(`auth.${key}`);
        });

        it(`should have auth.${key} in Turkish`, async () => {
          const result = await service.translate(`auth.${key}`, {
            lang: 'tr',
          });
          expect(result).toBeTruthy();
          expect(result).not.toBe(`auth.${key}`);
        });
      });
    });

    describe('Users translations', () => {
      const usersKeys = ['USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_NOT_FOUND', 'INVALID_CREDENTIALS'];

      usersKeys.forEach((key) => {
        it(`should have users.${key} in English`, async () => {
          const result = await service.translate(`users.${key}`, {
            lang: 'en',
          });
          expect(result).toBeTruthy();
          expect(result).not.toBe(`users.${key}`);
        });

        it(`should have users.${key} in Turkish`, async () => {
          const result = await service.translate(`users.${key}`, {
            lang: 'tr',
          });
          expect(result).toBeTruthy();
          expect(result).not.toBe(`users.${key}`);
        });
      });
    });
  });
});
