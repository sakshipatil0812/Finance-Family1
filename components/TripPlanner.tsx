import React, { useState } from 'react';
import { Household, Trip } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import { PlaneIcon, PlusIcon, PencilIcon } from './icons/Icons';
import EditTripModal from './EditTripModal';
import ProgressBar from './common/ProgressBar';

const formatCurrency = (amountInCents: number): string => {
  const amount = amountInCents / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

interface TripPlannerProps {
  household: Household;
  onUpdate: (data: Partial<Omit<Household, 'id'>>) => Promise<void>;
}

const TripPlanner: React.FC<TripPlannerProps> = ({ household, onUpdate }) => {
    const { trips } = household;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

    const handleOpenModal = (trip: Trip | null = null) => {
        setSelectedTrip(trip);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTrip(null);
    };

    return (
        <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Trip Planner</h2>
                <Button onClick={() => handleOpenModal(null)}>
                    <PlusIcon className="w-5 h-5" />
                    <span>Add New Trip</span>
                </Button>
            </div>

            {trips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trips.map((trip, index) => {
                        const totalSpent = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
                        const isOverBudget = totalSpent > trip.budget;
                        return (
                            <Card 
                                key={trip.id} 
                                className="flex flex-col justify-between animate-fade-in-up"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{trip.name}</h3>
                                            <p className="text-sm text-gray-400">{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</p>
                                        </div>
                                        <button onClick={() => handleOpenModal(trip)} className="text-gray-400 hover:text-white p-1">
                                            <PencilIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex justify-between items-baseline">
                                            <span className={`text-2xl font-bold ${isOverBudget ? 'text-pink-400' : 'text-white'}`}>{formatCurrency(totalSpent)}</span>
                                            <span className="text-sm text-gray-400">/ {formatCurrency(trip.budget)}</span>
                                        </div>
                                        <div className="mt-2">
                                            <ProgressBar 
                                                value={totalSpent}
                                                max={trip.budget}
                                                color={isOverBudget ? 'red' : 'indigo'}
                                            />
                                        </div>
                                        {isOverBudget && <p className="text-xs text-pink-400 text-right mt-1">Over budget!</p>}
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <h4 className="font-semibold text-gray-300 text-sm mb-2">Recent Trip Expenses:</h4>
                                    <div className="space-y-2 text-sm">
                                        {trip.expenses.slice(0, 2).map(exp => (
                                            <div key={exp.id} className="flex justify-between">
                                                <span className="text-gray-400">{exp.description}</span>
                                                <span className="font-mono text-gray-300">-{formatCurrency(exp.amount)}</span>
                                            </div>
                                        ))}
                                        {trip.expenses.length === 0 && <p className="text-xs text-gray-500">No expenses logged yet.</p>}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="text-center py-12">
                     <PlaneIcon className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-white">No Trips Planned</h3>
                    <p className="text-gray-400 mt-2">Start planning your next adventure by adding a new trip.</p>
                </Card>
            )}

            {isModalOpen && (
                <EditTripModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    trip={selectedTrip}
                    household={household}
                    onUpdate={onUpdate}
                />
            )}
        </div>
    );
};

export default TripPlanner;