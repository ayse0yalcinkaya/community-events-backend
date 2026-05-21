// Libraries
import { I18nService } from 'nestjs-i18n';

export type OtpPurpose = 'phone-verification' | 'login' | 'password-reset';

/**
 * Get OTP message template by purpose using i18n
 * @param i18n I18nService instance
 * @param purpose OTP purpose (phone-verification, login, password-reset)
 * @param code OTP code
 * @returns Formatted SMS message in current language
 */
export function getOtpMessage(i18n: I18nService, purpose: OtpPurpose, code: string): string {
  const translationKeys = {
    'phone-verification': 'auth.OTP_MESSAGE_PHONE_VERIFICATION',
    login: 'auth.OTP_MESSAGE_LOGIN',
    'password-reset': 'auth.OTP_MESSAGE_PASSWORD_RESET',
  };

  const key = translationKeys[purpose];
  return i18n.t(key, { args: { code } });
}
