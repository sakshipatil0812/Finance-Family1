import React, { useState, useEffect } from 'react';
import { Household, Member } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null; // null for a new member
  household: Household;
  onUpdate: (data: Partial<Omit<Household, 'id'>>) => Promise<void>;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({ isOpen, onClose, member, household, onUpdate }) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (member) {
      setName(member.name);
      setAvatarUrl(member.avatarUrl);
    } else {
      // Reset for new member and suggest a random avatar
      setName('');
      setAvatarUrl(`https://i.pravatar.cc/150?u=${Date.now()}`);
    }
  }, [member, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !avatarUrl.trim()) {
        alert("Please provide a name and avatar URL.");
        return;
    }
    
    let updatedMembers: Member[];

    if (member) {
      // Edit existing member
      updatedMembers = household.members.map(m => 
        m.id === member.id ? { ...m, name: name.trim(), avatarUrl: avatarUrl.trim() } : m
      );
    } else {
      // Add new member
      const newMember: Member = {
        id: `mem-${crypto.randomUUID()}`,
        name: name.trim(),
        avatarUrl: avatarUrl.trim(),
      };
      updatedMembers = [...household.members, newMember];
    }
    
    onUpdate({ members: updatedMembers });
    onClose();
  };
  
  const handleDelete = () => {
    if (!member) return;

    // Check for associated expenses
    const hasExpenses = household.expenses.some(exp => 
        exp.memberId === member.id || exp.splits.some(split => split.memberId === member.id)
    );

    if (hasExpenses) {
        alert(`Cannot delete ${member.name}. They are associated with existing expenses. Please re-assign their expenses before deleting.`);
        return;
    }

    if (window.confirm(`Are you sure you want to delete ${member.name}? This cannot be undone.`)) {
        const updatedMembers = household.members.filter(m => m.id !== member.id);
        onUpdate({ members: updatedMembers });
        onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={member ? 'Edit Member' : 'Add New Member'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <div className="flex items-center gap-4">
                <img src={avatarUrl || 'https://i.pravatar.cc/150'} alt="Avatar Preview" className="w-16 h-16 rounded-full bg-slate-700" />
                <div className="flex-1">
                    <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-300">Avatar URL</label>
                    <input
                        type="text"
                        id="avatarUrl"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
                        required
                    />
                </div>
            </div>
             <p className="text-xs text-gray-500 mt-2">You can use a service like <a href="https://pravatar.cc/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">pravatar.cc</a> for random avatars.</p>
        </div>
        
        <div>
          <label htmlFor="memberName" className="block text-sm font-medium text-gray-300">Member Name</label>
          <input
            type="text"
            id="memberName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Rohan"
            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
            required
          />
        </div>

        <div className="flex justify-between items-center pt-4">
            <div>
                {member && (
                    <Button type="button" variant="danger" onClick={handleDelete}>Delete Member</Button>
                )}
            </div>
            <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit">{member ? 'Save Changes' : 'Add Member'}</Button>
            </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditMemberModal;