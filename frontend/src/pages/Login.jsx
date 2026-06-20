import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, UserPlus, LogIn, Activity } from "lucide-react";

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      return setError("Please fill in all fields");
    }

    if (isRegister && password !== confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      setLoading(true);
      if (isRegister) {
        await register(email, password);
        navigate("/onboarding"); // Direct to onboarding wizard first
      } else {
        await login(email, password);
        navigate("/dashboard"); // Direct to wellness dashboard
      }
    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase:", "").trim() || "Authentication failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-darkBg px-4 relative overflow-hidden">
      {/* Background radial glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-950/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-950/20 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-500/10 rounded-xl mb-3 border border-indigo-500/20 animate-pulse">
            <Activity className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            AAROHAN
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Predictive Mental Wellness Intelligence
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                id="email"
                type="email"
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl text-slate-200 glow-input text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
              <input
                id="password"
                type="password"
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl text-slate-200 glow-input text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5" htmlFor="confirm-password">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  id="confirm-password"
                  type="password"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-slate-200 glow-input text-sm"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition duration-200 shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" /> Sign Up
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setIsRegister(false)}
                className="text-indigo-400 hover:underline font-medium cursor-pointer"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              New to Aarohan?{" "}
              <button
                onClick={() => setIsRegister(true)}
                className="text-indigo-400 hover:underline font-medium cursor-pointer"
              >
                Create Account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
