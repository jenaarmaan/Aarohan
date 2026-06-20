import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  Sparkles, Compass, Shield, Activity, LayoutDashboard, FileText, MessageSquare, LogOut, ArrowRight, Heart
} from "lucide-react";

export default function Home() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-slate-100 flex flex-col relative overflow-hidden">
      {/* Background radial glowing effects */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-950/20 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-purple-950/15 rounded-full blur-[130px] pointer-events-none"></div>

      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex justify-between items-center relative z-20 border-b border-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-slate-100 text-lg block">AAROHAN</span>
            <span className="text-[10px] text-slate-400 block tracking-wider uppercase font-semibold">Intelligence</span>
          </div>
        </div>

        <div>
          {currentUser ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 border border-slate-800 bg-slate-900/50 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-400 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-indigo-600/20"
            >
              Login
            </Link>
          )}
        </div>
      </header>

      {/* Main Hero & Content Section */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-16 flex flex-col items-center justify-center relative z-10 text-center space-y-12">
        
        {/* Welcome / Intro Text */}
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-semibold tracking-wide uppercase">
            <Activity className="w-3.5 h-3.5 animate-pulse" /> Predictive Wellness Intelligence
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent leading-tight sm:leading-none py-2">
            Calibrate Your Mind.
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Aarohan is a Universal Predictive Mental Wellness Platform that discovers hidden stress triggers, forecasts burnout risk, and creates a Wellness Digital Twin.
          </p>
        </div>

        {/* Dynamic content depending on auth state */}
        {!currentUser ? (
          <div className="space-y-12 w-full">
            {/* Get Started Button */}
            <div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl text-sm transition shadow-lg shadow-indigo-600/25 hover:scale-[1.02] transform duration-150"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* General Project Features grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto pt-10 border-t border-slate-800/40">
              <div className="glass-panel p-6 rounded-2xl text-left space-y-3">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl w-fit">
                  <Compass className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="font-bold text-slate-200 text-base">Burnout Risk Forecasts</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Deterministic scoring calculations predict wellness exhaustion using multi-factor sentiment and activity parameters.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-2xl text-left space-y-3">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl w-fit">
                  <Heart className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="font-bold text-slate-200 text-base">Wellness Digital Twin</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  A cognitive memory layer mapping causal stressors and logging effectiveness outcomes for customized coping interventions.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-2xl text-left space-y-3">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl w-fit">
                  <Shield className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="font-bold text-slate-200 text-base">Crisis Guardrails</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automatic safety intervention system that activates instantly to connect you to local mental health support networks.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Sections / Features grid */
          <div className="space-y-6 w-full max-w-4xl mx-auto">
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">Select a Wellness Feature to Begin</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {/* Dashboard Navigation Card */}
              <Link 
                to="/dashboard"
                className="group glass-panel p-6 rounded-2xl hover:border-indigo-500/40 hover:bg-indigo-500/[0.02] transition duration-200 flex flex-col justify-between h-52 cursor-pointer border border-slate-800"
              >
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 group-hover:border-indigo-500/40 rounded-xl w-fit transition duration-200">
                    <LayoutDashboard className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="font-extrabold text-slate-200 text-lg group-hover:text-indigo-400 transition duration-200">Dashboard</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    View wellness metrics, burnout forecast analytics, active triggers, and track intervention outcomes.
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">
                  Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              {/* Journaling Navigation Card */}
              <Link 
                to="/journal"
                className="group glass-panel p-6 rounded-2xl hover:border-purple-500/40 hover:bg-purple-500/[0.02] transition duration-200 flex flex-col justify-between h-52 cursor-pointer border border-slate-800"
              >
                <div className="space-y-3">
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 group-hover:border-purple-500/40 rounded-xl w-fit transition duration-200">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="font-extrabold text-slate-200 text-lg group-hover:text-purple-400 transition duration-200">Journaling</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Speak or write your daily journals. Native audio transcription and semantic analysis calibrate your Digital Twin.
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">
                  Open Journaling <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>

              {/* Aarohi Chat Navigation Card */}
              <Link 
                to="/chat"
                className="group glass-panel p-6 rounded-2xl hover:border-indigo-500/40 hover:bg-indigo-500/[0.02] transition duration-200 flex flex-col justify-between h-52 cursor-pointer border border-slate-800"
              >
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 group-hover:border-indigo-500/40 rounded-xl w-fit transition duration-200">
                    <MessageSquare className="w-5 h-5 text-indigo-400" />
                  </div>
                  <h3 className="font-extrabold text-slate-200 text-lg group-hover:text-indigo-400 transition duration-200">Aarohi Chat</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Connect with your wellness companion. Guided conversations with safety guardrails and memory personalization.
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-4">
                  Open Aarohi Chat <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-slate-500 text-xs z-10 border-t border-slate-800/40">
        &copy; {new Date().getFullYear()} Aarohan Platform. All rights reserved.
      </footer>
    </div>
  );
}
