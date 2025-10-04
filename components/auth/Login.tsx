import React, { useState } from 'react';
import Button from '../common/Button';
import Card from '../common/Card';

interface LoginProps {
    onLogin: (pass: string) => Promise<boolean>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const success = await onLogin(password);
        if (!success) {
            setError('Invalid password. Please try again.');
        }
        setIsLoading(false);
    };

    return (
        <div className="flex justify-center items-center min-h-screen p-4">
            <Card className="w-full max-w-sm animate-fade-in-up">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Welcome Back!</h1>
                        <p className="text-gray-400 mt-2">Enter your password to unlock your finances.</p>
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
                    {error && <p className="text-sm text-pink-400 text-center">{error}</p>}
                    <div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Unlocking...' : 'Login'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default Login;
