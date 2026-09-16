import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import GoalCard from './GoalCard';
import GoalForm from './GoalForm';
import { Flag, Plus } from 'lucide-react';

interface GoalsSectionProps {
  goals?: any[];
  onRefresh?: () => void;
}

const GoalsSection: React.FC<GoalsSectionProps> = ({ goals: parentGoals, onRefresh }) => {
  const [goals, setGoals] = useState<any[]>(parentGoals || []);
  const [loading, setLoading] = useState(!parentGoals);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [completedGoals, setCompletedGoals] = useState<any[]>([]);
  const [totalProgress, setTotalProgress] = useState(0);

  useEffect(() => {
    if (parentGoals) {
      setGoals(parentGoals);
      const completed = parentGoals.filter((g: any) => g.status === 'COMPLETED');
      setCompletedGoals(completed);

      if (parentGoals.length > 0) {
        const avgProgress =
          parentGoals.reduce((sum: number, g: any) => sum + (g.progressPercentage || 0), 0) /
          parentGoals.length;
        setTotalProgress(Math.round(avgProgress * 100) / 100);
      }
      setLoading(false);
    } else {
      fetchGoals();
    }
  }, [parentGoals]);

  const fetchGoals = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getGoals();
      setGoals(data);

      // Calculate metrics
      const completed = data.filter((g: any) => g.status === 'COMPLETED');
      setCompletedGoals(completed);

      if (data.length > 0) {
        const avgProgress =
          data.reduce((sum: number, g: any) => sum + g.progressPercentage, 0) /
          data.length;
        setTotalProgress(Math.round(avgProgress * 100) / 100);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (goalId: string) => {
    const goal = goals.find((g: any) => g.id === goalId);
    setEditingGoal(goal);
    setIsFormOpen(true);
  };

  const handleDelete = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await api.deleteGoal(goalId);
        if (onRefresh) onRefresh();
        fetchGoals();
      } catch (err: any) {
        setError('Failed to delete goal');
      }
    }
  };

  const handleIncrement = async (goalId: string, amount: number) => {
    try {
      await api.incrementGoalProgress(goalId, amount);
      if (onRefresh) onRefresh();
      fetchGoals();
    } catch (err: any) {
      setError('Failed to update goal progress');
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingGoal(null);
  };

  const handleFormSuccess = () => {
    if (onRefresh) onRefresh();
    fetchGoals();
  };

  // Separate active and completed goals
  const activeGoals = goals.filter((g: any) => g.status !== 'COMPLETED');
  const paused = goals.filter((g: any) => g.status === 'PAUSED');

  return (
    <div className="space-y-6">
      {/* Header bar matching theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Flag className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Financial Goals</h2>
          </div>
          <p className="text-xs text-slate-400">
            Average Progress: <strong className="text-purple-300 font-bold">{totalProgress.toFixed(1)}%</strong> across all active targets
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Goal
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Active Goals</span>
          <span className="text-xl font-bold text-cyan-400 mt-1 block">{activeGoals.length - paused.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Completed</span>
          <span className="text-xl font-bold text-emerald-400 mt-1 block">{completedGoals.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/90">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Paused</span>
          <span className="text-xl font-bold text-amber-400 mt-1 block">{paused.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-xs text-slate-500 rounded-2xl bg-slate-900/40 border border-slate-800">
          Loading goals...
        </div>
      ) : error ? (
        <div className="p-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
          {error}
        </div>
      ) : goals.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <Flag className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No goals created yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Set a savings goal to start tracking progress towards your financial milestones.
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-semibold hover:bg-purple-500/25 transition"
          >
            + Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-3 uppercase tracking-wider text-xs">
                Active Goals ({activeGoals.length - paused.length})
              </h3>
              <div className="space-y-4">
                {activeGoals
                  .filter((g: any) => g.status !== 'PAUSED')
                  .map((goal: any) => (
                    <GoalCard
                      key={goal.id}
                      id={goal.id}
                      name={goal.name}
                      type={goal.type}
                      targetAmount={goal.targetAmount}
                      currentAmount={goal.currentAmount}
                      progressPercentage={goal.progressPercentage}
                      daysRemaining={goal.daysRemaining}
                      monthlyProgressNeeded={goal.monthlyProgressNeeded}
                      status={goal.status}
                      priority={goal.priority}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onIncrement={handleIncrement}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Paused Goals */}
          {paused.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-amber-300 mb-3 uppercase tracking-wider text-xs">
                Paused Goals ({paused.length})
              </h3>
              <div className="space-y-4">
                {paused.map((goal: any) => (
                  <GoalCard
                    key={goal.id}
                    id={goal.id}
                    name={goal.name}
                    type={goal.type}
                    targetAmount={goal.targetAmount}
                    currentAmount={goal.currentAmount}
                    progressPercentage={goal.progressPercentage}
                    daysRemaining={goal.daysRemaining}
                    monthlyProgressNeeded={goal.monthlyProgressNeeded}
                    status={goal.status}
                    priority={goal.priority}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onIncrement={handleIncrement}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-emerald-300 mb-3 uppercase tracking-wider text-xs">
                Completed Goals ({completedGoals.length})
              </h3>
              <div className="space-y-4">
                {completedGoals.map((goal: any) => (
                  <GoalCard
                    key={goal.id}
                    id={goal.id}
                    name={goal.name}
                    type={goal.type}
                    targetAmount={goal.targetAmount}
                    currentAmount={goal.currentAmount}
                    progressPercentage={goal.progressPercentage}
                    daysRemaining={goal.daysRemaining}
                    monthlyProgressNeeded={goal.monthlyProgressNeeded}
                    status={goal.status}
                    priority={goal.priority}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onIncrement={handleIncrement}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <GoalForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        editingGoal={editingGoal}
      />
    </div>
  );
};

export { GoalsSection };
export default GoalsSection;
