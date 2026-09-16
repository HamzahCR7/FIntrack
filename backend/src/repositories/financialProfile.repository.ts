import { PrismaClient, FinancialProfile, Prisma } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';

export class FinancialProfileRepository {
  constructor(private db: PrismaClient = defaultPrisma) {}

  async getProfile(): Promise<FinancialProfile> {
    let profile = await this.db.financialProfile.findFirst();
    if (!profile) {
      profile = await this.db.financialProfile.create({
        data: {
          preferredSavingsRate: 20.0,
        },
      });
    }
    return profile;
  }

  async updateProfile(data: Prisma.FinancialProfileUpdateInput): Promise<FinancialProfile> {
    const profile = await this.getProfile();
    return this.db.financialProfile.update({
      where: { id: profile.id },
      data,
    });
  }
}
