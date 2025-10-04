import React, { useState, useEffect } from 'react';
import { Household, Trip } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null; // null for a new trip
  household: Household;
  onUpdate: (data: Partial<Omit<Household, 'id'>>) => Promise<void>;
}

const EditTripModal: React.FC<EditTripModalProps> = ({ isOpen, onClose, trip, household, onUpdate }) => {
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (trip) {
      setName(trip.name);
      setBudget((trip.budget / 100).toString());
      setStartDate(trip.startDate.split('T')[0]);
      setEndDate(trip.endDate.split('T')[0]);
    } else {
      // Reset for new trip
      setName('');
      setBudget('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
    }
  }, [trip, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !budget || !startDate || !endDate) return;
    
    let updatedTrips: Trip[];

    if (trip) {
      // Edit existing trip
      const updatedTrip: Trip = {
        ...trip,
        name: name.trim(),
        budget: Math.round(parseFloat(budget) * 100),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      };
      updatedTrips = household.trips.map(t => (t.id === trip.id ? updatedTrip : t));
    } else {
      // Add new trip
      const newTrip: Trip = {
        id: `trip-${crypto.randomUUID()}`,
        name: name.trim(),
        budget: Math.round(parseFloat(budget) * 100),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        expenses: [],
      };
      updatedTrips = [...household.trips, newTrip];
    }
    onUpdate({ trips: updatedTrips });
    onClose();
  };
  
  const handleDelete = () => {
    if (trip && window.confirm(`Are you sure you want to delete the trip "${trip.name}"? This cannot be undone.`)) {
        const updatedTrips = household.trips.filter(t => t.id !== trip.id);
        onUpdate({ trips: updatedTrips });
        onClose();
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={trip ? 'Edit Trip' : 'Add New Trip'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="tripName" className="block text-sm font-medium text-gray-300">Trip Name</label>
          <input
            type="text"
            id="tripName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Goa Getaway"
            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
            required
          />
        </div>
        
        <div>
          <label htmlFor="tripBudget" className="block text-sm font-medium text-gray-300">Budget (INR)</label>
          <input
            type="number"
            id="tripBudget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="0.00"
            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
            required
            step="0.01"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-300">Start Date</label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
                required
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-300">End Date</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
                required
              />
            </div>
        </div>

        <div className="flex justify-between items-center pt-4">
            <div>
                {trip && (
                    <Button type="button" variant="danger" onClick={handleDelete}>Delete Trip</Button>
                )}
            </div>
            <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit">{trip ? 'Save Changes' : 'Add Trip'}</Button>
            </div>
        </div>
      </form>
    </Modal>
  );
};

export default EditTripModal;
