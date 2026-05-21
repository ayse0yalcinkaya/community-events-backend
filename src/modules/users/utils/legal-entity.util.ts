import { LegalEntityType } from '@prisma/client';

export const deriveLegalEntityType = (vkn?: string | null): LegalEntityType | undefined => {
  if (!vkn) {
    return undefined;
  }

  return vkn.length === 10 ? LegalEntityType.CORPORATE : LegalEntityType.INDIVIDUAL;
};
