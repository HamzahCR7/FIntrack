import { GoalRepository } from '../repositories/goal.repository';
import { CreateGoalDto, UpdateGoalDto, GoalResponseDto } from '../dtos/goal.dto';
import { NotFoundError } from '../common/errors';
import { Goal } from '@prisma/client';

export class GoalService {
  constructor(private goalRepo: GoalRepository = new GoalRepository()) {}

  async getAllGoals(): Promise<GoalResponseDto[]> {
    const goals = await this.goalRepo.findAll();
    return goals.map((goal) => this.enrichGoal(goal));
  }

  async getGoalById(id: string): Promise<GoalResponseDto> {
    const goal = await this.goalRepo.findById(id);
    if (!goal) {
      throw new NotFoundError(`Goal with ID '${id}' not found`);
    }
    return this.enrichGoal(goal);
  }

  async getActiveGoals(): Promise<GoalResponseDto[]> {
    const goals = await this.goalRepo.findActive();
    return goals.map((goal) => this.enrichGoal(goal));
  }

  async createGoal(data: CreateGoalDto): Promise<GoalResponseDto> {
    const deadline = new Date(data.deadline);

    const goal = await this.goalRepo.create({
      name: data.name,
      description: data.description || null,
      type: data.type,
      targetAmount: data.targetAmount,
      currentAmount: 0,
      deadline,
      priority: data.priority || 'MEDIUM',
      category: data.category || null,
      autoContribute: data.autoContribute || false,
      monthlyTarget: data.monthlyTarget || null,
      emiMonths: data.type === 'EMI' ? data.emiMonths ?? null : null,
      emiAmount: data.type === 'EMI' ? data.emiAmount ?? null : null,
      downPayment: data.type === 'EMI' ? data.downPayment ?? null : null,
      isActive: true,
      status: 'ACTIVE',
    });

    return this.enrichGoal(goal);
  }

  async updateGoal(id: string, data: UpdateGoalDto): Promise<GoalResponseDto> {
    await this.getGoalById(id); // Verify exists

    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.targetAmount !== undefined) updateData.targetAmount = data.targetAmount;
    if (data.deadline !== undefined) updateData.deadline = new Date(data.deadline);
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.autoContribute !== undefined) updateData.autoContribute = data.autoContribute;
    if (data.monthlyTarget !== undefined) updateData.monthlyTarget = data.monthlyTarget;
    if (data.emiMonths !== undefined) updateData.emiMonths = data.emiMonths;
    if (data.emiAmount !== undefined) updateData.emiAmount = data.emiAmount;
    if (data.downPayment !== undefined) updateData.downPayment = data.downPayment;

    const goal = await this.goalRepo.update(id, updateData);
    return this.enrichGoal(goal);
  }

  async updateGoalProgress(id: string, currentAmount: number): Promise<GoalResponseDto> {
    const goal = await this.goalRepo.findById(id);
    if (!goal) {
      throw new NotFoundError(`Goal with ID '${id}' not found`);
    }

    // Check if goal is completed
    let status = goal.status;
    if (currentAmount >= goal.targetAmount && goal.status === 'ACTIVE') {
      status = 'COMPLETED';
    } else if (currentAmount < goal.targetAmount && goal.status === 'COMPLETED') {
      status = 'ACTIVE';
    }

    const updated = await this.goalRepo.update(id, {
      currentAmount,
      status,
    });

    return this.enrichGoal(updated);
  }

  async incrementGoalProgress(id: string, amount: number): Promise<GoalResponseDto> {
    const goal = await this.goalRepo.findById(id);
    if (!goal) {
      throw new NotFoundError(`Goal with ID '${id}' not found`);
    }

    const newAmount = goal.currentAmount + amount;
    return this.updateGoalProgress(id, newAmount);
  }

  async completeGoal(id: string): Promise<GoalResponseDto> {
    const goal = await this.goalRepo.findById(id);
    if (!goal) {
      throw new NotFoundError(`Goal with ID '${id}' not found`);
    }

    const updated = await this.goalRepo.update(id, {
      status: 'COMPLETED',
      currentAmount: goal.targetAmount,
    });

    return this.enrichGoal(updated);
  }

  async pauseGoal(id: string): Promise<GoalResponseDto> {
    await this.getGoalById(id); // Verify exists
    const goal = await this.goalRepo.update(id, { status: 'PAUSED' });
    return this.enrichGoal(goal);
  }

  async resumeGoal(id: string): Promise<GoalResponseDto> {
    await this.getGoalById(id); // Verify exists
    const goal = await this.goalRepo.update(id, { status: 'ACTIVE' });
    return this.enrichGoal(goal);
  }

  async deleteGoal(id: string): Promise<void> {
    await this.getGoalById(id); // Verify exists
    await this.goalRepo.delete(id);
  }

  private enrichGoal(goal: Goal): GoalResponseDto {
    const progressPercentage = (goal.currentAmount / goal.targetAmount) * 100;
    
    const now = new Date();
    const daysRemaining = Math.ceil(
      (goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate how much needs to be saved per month
    const totalMonths = Math.ceil(
      (goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    const fallbackMonthlyProgressNeeded = totalMonths > 0 ? remainingAmount / totalMonths : 0;
    const monthlyProgressNeeded =
      goal.type === 'EMI' && goal.emiAmount !== null && goal.emiAmount !== undefined
        ? goal.emiAmount
        : fallbackMonthlyProgressNeeded;

    return {
      id: goal.id,
      name: goal.name,
      description: goal.description,
      type: goal.type,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      deadline: goal.deadline.toISOString(),
      priority: goal.priority,
      category: goal.category,
      autoContribute: goal.autoContribute,
      monthlyTarget: goal.monthlyTarget,
      emiMonths: goal.emiMonths,
      emiAmount: goal.emiAmount,
      downPayment: goal.downPayment,
      isActive: goal.isActive,
      status: goal.status as 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'PAUSED',
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      daysRemaining,
      monthlyProgressNeeded: Math.round(monthlyProgressNeeded * 100) / 100,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }
}
