import React from 'react';
import { View } from '../App';
import { DashboardIcon, MoneyIcon, PlusIcon, LightBulbIcon, ArrowPathIcon } from './icons/Icons';

interface BottomNavBarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onAddExpenseClick: () => void;
  className?: string;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'expenses', label: 'Expenses', icon: MoneyIcon },
  { id: 'add', label: 'Add', icon: PlusIcon, isCentral: true },
  { id: 'subscriptions', label: 'Bills', icon: ArrowPathIcon },
  { id: 'savings', label: 'Tips', icon: LightBulbIcon },
];

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, setCurrentView, onAddExpenseClick, className = '' }) => {
  return (
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/50 backdrop-blur-lg border-t border-slate-700/50 z-20 ${className}`}>
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => {
          if (item.isCentral) {
            return (
              <div key={item.id} className="flex-1 flex justify-center">
                <button
                  onClick={onAddExpenseClick}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full p-3.5 text-white shadow-lg shadow-purple-500/30 hover:shadow-pink-500/40 transition-all duration-200 hover:scale-110 -mt-6 border-4 border-indigo-950"
                  aria-label="Add Expense"
                >
                  <PlusIcon className="w-7 h-7" />
                </button>
              </div>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`flex flex-col items-center justify-center space-y-1 p-2 flex-1 transition-colors duration-200 ${
                currentView === item.id ? 'text-pink-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;