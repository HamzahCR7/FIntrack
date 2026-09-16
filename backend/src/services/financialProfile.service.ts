import { PrismaClient, FinancialProfile } from '@prisma/client';
import { prisma as defaultPrisma } from '../config/prisma';
import { FinancialProfileRepository } from '../repositories/financialProfile.repository';
import { UpdateFinancialProfileDto, UpdateFinancialProfileSchema } from '../dtos/financialProfile.dto';

export class FinancialProfileService {
  constructor(
    private db: PrismaClient = defaultPrisma,
    private profileRepo: FinancialProfileRepository = new FinancialProfileRepository(db)
  ) {}

  async getProfile(): Promise<FinancialProfile> {
    return this.profileRepo.getProfile();
  }

  async updateProfile(input: UpdateFinancialProfileDto): Promise<FinancialProfile> {
    const dto = UpdateFinancialProfileSchema.parse(input);
    return this.profileRepo.updateProfile(dto);
  }
}
