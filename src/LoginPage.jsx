import React, { useState } from 'react';
// I-adjust ang import dependencies o icons kung kinakailangan (hal. lucide-react)
import { ShieldCheck, User, Lock } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [chauffeurId, setChauffeurId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    // Panatilihin ang orihinal na function logic
    if (chauffeurId === 'CFR-2026-001' && password === '123') {
      onLogin({ id: chauffeurId, name: 'Chauffeur Juan' });
    } else {
      setError('Maling Chauffeur ID o Password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-4">
      {/* Login Card Container */}
      <div className="w-full max-w-md bg-[#0d1117] border border-[#1f2937] rounded-2xl shadow-2xl p-8 relative">
        
        {/* Top Icon / Logo Badge */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center text-blue-500 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
        </div>

        {/* Header Titles */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-wide">Chauffeur Portal</h1>
          <p className="text-sm text-gray-400 mt-1">Employee Login (Chauffeur Access)</p>
        </div>

        {/* Error Message kung sakali */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-200 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Chauffeur ID
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={chauffeurId}
                onChange={(e) => setChauffeurId(e.target.value)}
                placeholder="CFR-2026-001"
                required
                className="w-full bg-[#07090e] border border-[#30363d] rounded-xl px-4 py-3 pl-10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#07090e] border border-[#30363d] rounded-xl px-4 py-3 pl-10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-600/30 text-sm mt-2"
          >
            Sign In
          </button>
        </form>

        {/* Helper / Credentials Box sa Ibaba (Gaya ng sa reference) */}
        <div className="mt-8 bg-[#07090e] border border-[#1f2937] rounded-xl p-4 text-xs text-gray-400 space-y-1">
          <p className="font-semibold text-gray-300 mb-1">Database Accounts:</p>
          <p>👑 <span className="text-gray-300">Chauffeur:</span> CFR-2026-001 | pwd: 123</p>
        </div>

      </div>
    </div>
  );
}