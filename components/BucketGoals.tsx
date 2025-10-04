import React, { useState } from 'react';
import { Household, BucketGoal as BucketGoalType } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import ProgressBar from './common/ProgressBar';
import { PiggyBankIcon, SparklesIcon, PlusIcon, PencilIcon } from './icons/Icons';
import SmartTransferModal from './SmartTransferModal';
import EditGoalModal from './EditGoalModal';

const formatCurrency = (amountInCents: number): string => {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

interface BucketGoalsProps {
  household: Household;
  onUpdate: (data: Partial<Omit<Household, 'id'>>) => Promise<void>;
}

const BucketGoals: React.FC<BucketGoalsProps> = ({ household, onUpdate }) => {
    const { bucketGoals } = household;
    const [smartTransferGoal, setSmartTransferGoal] = useState<BucketGoalType | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<BucketGoalType | null>(null);

    const handleOpenSmartTransfer = (goal: BucketGoalType) => {
        setSmartTransferGoal(goal);
    };

    const handleOpenEditModal = (goal: BucketGoalType | null) => {
        setSelectedGoal(goal);
        setIsEditModalOpen(true);
    };

    const handleCloseModals = () => {
        setSmartTransferGoal(null);
        setIsEditModalOpen(false);
        setSelectedGoal(null);
    };

  return (
    <div className="animate-fade-in-up">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Bucket Goals</h2>
            <Button onClick={() => handleOpenEditModal(null)}>
                <PlusIcon className="w-5 h-5" />
                <span>Create New Goal</span>
            </Button>
        </div>

        {bucketGoals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bucketGoals.map((goal, index) => {
                    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                    return (
                        <Card 
                            key={goal.id} 
                            className="flex flex-col justify-between animate-fade-in-up"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <PiggyBankIcon className="w-8 h-8 text-purple-400" />
                                        <h3 className="text-xl font-bold text-white truncate pr-2">{goal.name}</h3>
                                    </div>
                                    <button onClick={() => handleOpenEditModal(goal)} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0">
                                        <PencilIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                                <div className="mt-4">
                                    <p className="text-gray-300">
                                        <span className="text-xl font-bold text-white">{formatCurrency(goal.currentAmount)}</span>
                                        <span className="text-sm text-gray-500"> of {formatCurrency(goal.targetAmount)}</span>
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <ProgressBar value={goal.currentAmount} max={goal.targetAmount} color="green" />
                                        <span className="font-bold text-teal-400 text-sm flex-shrink-0">{Math.floor(progress)}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6">
                                <Button size="sm" className="w-full" onClick={() => handleOpenSmartTransfer(goal)}>
                                    <SparklesIcon className="w-4 h-4" />
                                    <span>Smart Transfer</span>
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>
        ) : (
            <Card className="text-center py-12">
                <PiggyBankIcon className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                <h3 className="text-lg font-semibold text-white">No Savings Goals Yet</h3>
                <p className="text-gray-400 mt-2">Create your first goal to start tracking your savings progress!</p>
            </Card>
        )}

        {smartTransferGoal && (
            <SmartTransferModal
                isOpen={!!smartTransferGoal}
                onClose={handleCloseModals}
                goal={smartTransferGoal}
                household={household}
                onUpdate={onUpdate}
            />
        )}

        {isEditModalOpen && (
            <EditGoalModal
                isOpen={isEditModalOpen}
                onClose={handleCloseModals}
                goal={selectedGoal}
                household={household}
                onUpdate={onUpdate}
            />
        )}
    </div>
  );
};

export default BucketGoals;