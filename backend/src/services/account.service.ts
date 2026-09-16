import { AccountRepository } from '../repositories/account.repository';
import { CreateAccountDto, UpdateAccountDto } from '../dtos/account.dto';
import { NotFoundError } from '../common/errors';
import { Account } from '@prisma/client';

export class AccountService {
  constructor(private accountRepo: AccountRepository = new AccountRepository()) {}

  async getAllAccounts(): Promise<Account[]> {
    return this.accountRepo.findAll();
  }

  async getAccountById(id: string): Promise<Account> {
    const account = await this.accountRepo.findById(id);
    if (!account || !account.isActive) {
      throw new NotFoundError(`Account with ID '${id}' not found`);
    }
    return account;
  }

  async createAccount(dto: CreateAccountDto): Promise<Account> {
    return this.accountRepo.create({
      name: dto.name,
      type: dto.type,
      institution: dto.institution,
      currentBalance: dto.initialBalance ?? 0.0,
      creditLimit: dto.creditLimit,
      lastFourDigits: dto.lastFourDigits,
      statementCycleDay: dto.statementCycleDay,
      paymentDueDay: dto.paymentDueDay,
      statementAmount: dto.statementAmount ?? 0.0,
      minimumPayment: dto.minimumPayment ?? 0.0,
    });
  }

  async updateAccount(id: string, dto: UpdateAccountDto): Promise<Account> {
    await this.getAccountById(id);
    return this.accountRepo.update(id, dto);
  }

  async deleteAccount(id: string): Promise<Account> {
    await this.getAccountById(id);
    return this.accountRepo.delete(id);
  }
}
