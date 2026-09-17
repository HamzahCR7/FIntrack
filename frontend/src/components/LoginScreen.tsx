import React, { useState } from 'react';
import { Wallet, Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';
import { api } from '../api/client';

interface LoginScreenProps {
  onLoginSuccess: (user: { id: string; username: string; name?: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.login({ username, password });
      localStorage.setItem('fintrack_auth_token', res.token);
      localStorage.setItem('fintrack_user', JSON.stringify(res.user));
      onLoginSuccess(res.user);
    } catch (err: any) {
      setIsLoading(false);
      setError(
        err.response?.data?.message || err.message || 'Authentication failed. Please check your credentials.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      {/* Background Decorative Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -left-12 h-48 w-48 bg-blue-600/15 rounded-full blur-3xl sm:-top-40 sm:-left-40 sm:h-96 sm:w-96" />
        <div className="absolute top-1/2 -right-12 h-48 w-48 bg-purple-600/15 rounded-full blur-3xl sm:-right-40 sm:h-96 sm:w-96" />
        <div className="absolute -bottom-16 left-1/3 h-48 w-48 bg-indigo-600/15 rounded-full blur-3xl sm:-bottom-40 sm:h-96 sm:w-96" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Header & Logo */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-600/30">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                FinTrack Personal Ledger
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your username and password to unlock your tracker
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-medium text-xs text-center animate-in fade-in duration-200">
                {error}
              </div>
            )}

            {/* Username Input */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-10 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all transform active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-500 mt-4">
          FinTrack Confidential Personal Finance Vault
        </p>
      </div>
    </div>
  );
};
