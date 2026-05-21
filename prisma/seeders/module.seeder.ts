// Libraries
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_ADMIN_MODULES,
  DEFAULT_USER_MODULES,
} from '../../src/modules/permissions/constants/default-permissions.constant';

export class ModuleSeeder {
  static async seed(prisma: PrismaClient): Promise<void> {
    const modules = [
      {
        nameKey: 'modules.USERS.NAME',
        descriptionKey: 'modules.USERS.DESCRIPTION',
        key: 'USERS',
      },
      {
        nameKey: 'modules.ROLES.NAME',
        descriptionKey: 'modules.ROLES.DESCRIPTION',
        key: 'ROLES',
      },
      {
        nameKey: 'modules.PERMISSIONS.NAME',
        descriptionKey: 'modules.PERMISSIONS.DESCRIPTION',
        key: 'PERMISSIONS',
      },
      {
        nameKey: 'modules.FILES.NAME',
        descriptionKey: 'modules.FILES.DESCRIPTION',
        key: 'FILES',
      },
      {
        nameKey: 'modules.NOTIFICATIONS.NAME',
        descriptionKey: 'modules.NOTIFICATIONS.DESCRIPTION',
        key: 'NOTIFICATIONS',
      },
      {
        nameKey: 'modules.NOTIFICATION_PREFERENCES.NAME',
        descriptionKey: 'modules.NOTIFICATION_PREFERENCES.DESCRIPTION',
        key: 'NOTIFICATION_PREFERENCES',
      },
      {
        nameKey: 'modules.OTP_VERIFICATIONS.NAME',
        descriptionKey: 'modules.OTP_VERIFICATIONS.DESCRIPTION',
        key: 'OTP_VERIFICATIONS',
      },
      {
        nameKey: 'modules.DEVICE_TOKENS.NAME',
        descriptionKey: 'modules.DEVICE_TOKENS.DESCRIPTION',
        key: 'DEVICE_TOKENS',
      },
      {
        nameKey: 'modules.REFRESH_TOKENS.NAME',
        descriptionKey: 'modules.REFRESH_TOKENS.DESCRIPTION',
        key: 'REFRESH_TOKENS',
      },
      {
        nameKey: 'modules.SMS.NAME',
        descriptionKey: 'modules.SMS.DESCRIPTION',
        key: 'SMS',
      },
      {
        nameKey: 'modules.DOMAINS.NAME',
        descriptionKey: 'modules.DOMAINS.DESCRIPTION',
        key: 'DOMAINS',
      },
      {
        nameKey: 'modules.ANNOUNCEMENTS.NAME',
        descriptionKey: 'modules.ANNOUNCEMENTS.DESCRIPTION',
        key: 'ANNOUNCEMENTS',
      },
      {
        nameKey: 'modules.CHAT.NAME',
        descriptionKey: 'modules.CHAT.DESCRIPTION',
        key: 'CHAT',
      },
      {
        nameKey: 'modules.LOGS.NAME',
        descriptionKey: 'modules.LOGS.DESCRIPTION',
        key: 'LOGS',
      },
    ];

    for (const module of modules) {
      // Get default permissions for this module
      const defaultAdminActions = DEFAULT_ADMIN_MODULES[module.key] ?? [];
      const defaultUserActions = DEFAULT_USER_MODULES[module.key] ?? [];

      await prisma.module.upsert({
        where: { nameKey: module.nameKey },
        update: {
          descriptionKey: module.descriptionKey,
          defaultAdminActions,
          defaultUserActions,
        },
        create: {
          nameKey: module.nameKey,
          descriptionKey: module.descriptionKey,
          defaultAdminActions,
          defaultUserActions,
        },
      });
    }
  }
}
