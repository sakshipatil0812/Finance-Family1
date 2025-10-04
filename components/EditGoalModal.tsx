import React, { useState, useEffect } from 'react';
import { Household, BucketGoal } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';

interface EditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: BucketGoal | null; // null for a new goal
  household: Household;
  onUpdate: (data: Partial<Omit<Household, 'id'>>) => Promise<void>;
}

const EditGoalModal: React.FC<EditGoalModalProps> = ({ isOpen, onClose, goal, household, onUpdate }) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTargetAmount((goal.targetAmount / 100).toString());
    } else {
      // Reset for new goal
      setName('');
      setTargetAmount('');
    }
  }, [goal, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount || parseFloat(targetAmount) <= 0) {
        alert("Please provide a valid name and target amount.");
        return;
    }
    
    let updatedGoals: BucketGoal[];

    if (goal) {
      // Edit existing goal
      const updatedGoal: BucketGoal = {
        ...goal,
        name: name.trim(),
        targetAmount: Math.round(parseFloat(targetAmount) * 100),
      };
      updatedGoals = household.bucketGoals.map(g => (g.id === goal.id ? updatedGoal : g));
    } else {
      // Add new goal
      const newGoal: BucketGoal = {
        id: `goal-${crypto.randomUUID()}`,
        name: name.trim(),
        targetAmount: Math.round(parseFloat(targetAmount) * 100),
        currentAmount: 0,
      };
      updatedGoals = [...household.bucketGoals, newGoal];
    }
    
    onUpdate({ bucketGoals: updatedGoals });
    onClose();
  };
  
  const handleDelete = () => {
    if (goal && window.confirm(`Are you sure you want to delete the goal "${goal.name}"? This cannot be undone.`)) {
        const updatedGoals = household.bucketGoals.filter(g => g.id !== goal.id);
        onUpdate({ bucketGoals: updatedGoals });
        onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={goal ? 'Edit Goal' : 'Create New Goal'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="goalName" className="block text-sm font-medium text-gray-300">Goal Name</label>
          <input
            type="text"
            id="goalName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Goa Vacation"
            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
            required
          />
        </div>
        
        <div>
          <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-300">Target Amount (INR)</label>
          <input
            type="number"
            id="targetAmount"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="50000"
            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
            required
            step="0.01"
            min="0.01"
          />
        </div>

        <div className="flex justify-between items-center pt-4">
            <div>
                {goal && (
                    <Button type="button" variant="danger" onClick={handleDelete}>Delete Goal</Button>
                )}
            </div>
            <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit">{goal ? 'Save Changes' : 'Create Goal'}</Button>
            </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditGoalModal;
