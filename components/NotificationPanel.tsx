import React from 'react';
import { Notification } from '../types';
import { timeAgo } from '../utils/time';
import { XIcon } from './icons/Icons';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onClose }) => {
    
    const getTypeStyles = (type: Notification['type']) => {
        switch (type) {
            case 'success': return 'border-teal-500';
            case 'warning': return 'border-orange-500';
            case 'error': return 'border-pink-500';
            default: return 'border-purple-500';
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose}>
            <div 
                className="fixed top-0 right-0 h-full w-full max-w-sm bg-slate-900/70 backdrop-blur-2xl border-l border-slate-700/50 shadow-2xl animate-slide-in-right p-6 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Notifications</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-slate-700 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4">
                    {[...notifications].reverse().map((notif, index) => (
                        <div 
                            key={notif.id} 
                            className={`p-4 rounded-lg bg-slate-800/50 border-l-4 ${getTypeStyles(notif.type)} ${!notif.isRead ? 'opacity-100' : 'opacity-60'} animate-fade-in-up`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <p className="text-white">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-2">{timeAgo(notif.date)}</p>
                        </div>
                    ))}
                    {notifications.length === 0 && (
                        <div className="text-center text-gray-500 pt-20">
                            <p>You have no notifications.</p>
                        </div>
                    )}
                </div>
            </div>
             <style>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default NotificationPanel;