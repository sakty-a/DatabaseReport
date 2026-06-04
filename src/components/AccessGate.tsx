import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AccessGateProps {
  onSuccess: () => void;
  title: string;
}

export default function AccessGate({ onSuccess, title }: AccessGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'saktyaay1119') {
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div id="access-gate-container" className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-slate-200 rounded-3xl shadow-xs">
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Lock Animation Node */}
        <div className="flex justify-center">
          <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 ring-8 ring-indigo-25/50">
            <Lock className="w-8 h-8" />
          </div>
        </div>

        {/* Informative Header */}
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">Locked Content</h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            The data for <span className="text-indigo-600 font-bold">{title}</span> is locked. Please enter your authorization key to unlock and access the dynamic tracking tables.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              id="gate-passcode-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              placeholder="Enter Access Key..."
              className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl text-sm font-semibold tracking-wide text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all ${
                error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-indigo-500'
              }`}
            />
            <button
              id="gate-toggle-visibility-btn"
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div id="gate-error-banner" className="flex items-center gap-2 p-3 bg-rose-50 text-rose-800 rounded-2xl text-xs font-semibold justify-center animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Incorrect key. Please check and try again!</span>
            </div>
          )}

          <button
            id="gate-submit-btn"
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold tracking-wide shadow-sm hover:shadow-md transition-all cursor-pointer font-sans"
          >
            Unlock Tracker
          </button>
        </form>
      </div>
    </div>
  );
}
