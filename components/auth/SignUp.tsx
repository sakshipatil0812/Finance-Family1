import React, { useState } from 'react';
import Button from '../common/Button';
import Card from '../common/Card';

interface SignUpProps {
    onSignUp: (name: string, pass: string) => Promise<boolean>;
}

const SignUp: React.FC<SignUpProps> = ({ onSignUp }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        setError('');
        setIsLoading(true);
        const success = await onSignUp(name, password);
        if (!success) {
            setError('An account might already exist. Try refreshing the page.');
        }
        setIsLoading(false);
    };

    return (
        <div className="flex justify-center items-center min-h-screen p-4">
            <Card className="w-full max-w-sm animate-fade-in-up">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-center">
                         <h1 className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Create Your Account</h1>
                        <p className="text-gray-400 mt-2">Welcome to FinancelyAI! Let's get you set up.</p>
                    </div>
                     <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">Your Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
                            placeholder="e.g., Priya"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-slate-700 border-slate-600 rounded-md shadow-sm mt-1"
                            required
                        />
                    </div>
                    {error && <p className="text-sm text-pink-400 text-center">{error}</p>}
                    <div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Creating Account...' : 'Sign Up'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default SignUp;
