import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area 
} from "recharts";
import { 
  ShieldAlert, Sparkles, TrendingUp, AlertCircle, RefreshCw, 
  HelpCircle, Compass, HeartHandshake, Eye, CheckCircle2, Trash2, LogOut
} from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [sessions, setSessions] = useState([]);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  const [resetting, setResetting] = useState(false);

  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    fetchChatSessions();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/dashboard");
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard metrics. Check server connection.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchChatSessions() {
    try {
      const res = await api.get("/chat/sessions");
      setSessions(res.data);
    } catch (err) {
      console.error("Failed to load chat sessions:", err);
    }
  }

  async function handleDeleteSession(sessionId) {
    if (!window.confirm("Are you sure you want to delete this chat session? This cannot be undone.")) return;
    setDeletingSessionId(sessionId);
    try {
      await api.delete(`/chat/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setSuccessMsg("Chat session deleted successfully.");
    } catch (err) {
      console.error(err);
      setError("Failed to delete chat session.");
    } finally {
      setDeletingSessionId(null);
    }
  }

  async function handleResetDashboard() {
    if (!window.confirm("WARNING: This will permanently delete all your check-ins, journal entries, active triggers, chat sessions, and memory data. This will reset your dashboard back to a fresh state. Are you sure you want to proceed?")) return;
    setResetting(true);
    setError("");
    setSuccessMsg("");
    try {
      await api.delete("/dashboard/reset");
      setSuccessMsg("Dashboard has been reset successfully. All logs deleted.");
      // Reload dashboard data (will compile empty state)
      await fetchDashboardData();
      // Reload sessions list
      await fetchChatSessions();
    } catch (err) {
      console.error(err);
      setError("Failed to reset dashboard data.");
    } finally {
      setResetting(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Failed to sign out.");
    }
  }

  async function handleFeedback(rec, outcomeText) {
    if (!data) return;
    const key = `${rec.title}-${outcomeText}`;
    setSubmittingFeedback((prev) => ({ ...prev, [key]: true }));
    setSuccessMsg("");
    try {
      // Find matching trigger for this recommendation
      const topTrigger = data.analytics.top_triggers?.[0]?.trigger || "General Stress";
      
      await api.post("/interventions/outcome", {
        event: topTrigger,
        emotion: "Stress",
        behavior: "Sleep Loss", // Sample context mapping
        intervention: rec.title,
        outcome: outcomeText
      });
      
      setSuccessMsg(`Logged: '${rec.title}' was marked as '${outcomeText}'. Digital Twin updated!`);
      // Reload analytics cache to reflect updates
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      setError("Failed to register outcome feedback.");
    } finally {
      setSubmittingFeedback((prev) => ({ ...prev, [key]: false }));
    }
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-slate-400 font-semibold animate-pulse">Compiling Wellness Twin Dashboard...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto animate-bounce" />
        <h2 className="text-xl font-bold text-slate-200">Dashboard Loading Disrupted</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold cursor-pointer"
        >
          Retry Load
        </button>
      </div>
    );
  }

  const analytics = data?.analytics;
  const recommendations = data?.recommendations;
  const crisisLevel = analytics?.current_crisis_level || 0;
  const hasLogs = analytics?.recent_timeline && Array.isArray(analytics.recent_timeline) && analytics.recent_timeline.length > 0;

  // Visual helper for BRS score styling
  const brs = analytics?.current_burnout_score || 0;
  const brsColor = !hasLogs ? "text-slate-400" : brs > 75 ? "text-rose-400" : brs > 40 ? "text-amber-400" : "text-emerald-400";
  const brsColorBg = !hasLogs ? "bg-slate-500/5 border-slate-500/10" : brs > 75 ? "bg-rose-500/10 border-rose-500/20" : brs > 40 ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20";

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Wellness Digital Twin</h1>
          <p className="text-slate-400 text-xs mt-1">Real-time mental wellness analytics updated asynchronously.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboardData}
            className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition cursor-pointer flex items-center gap-2 text-xs font-semibold text-slate-300"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button 
            onClick={handleLogout}
            className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-rose-500/5 hover:border-rose-500/20 hover:text-rose-400 transition cursor-pointer flex items-center gap-2 text-xs font-semibold text-slate-300"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5" /> {successMsg}
        </div>
      )}

      {/* Safety / Crisis alerts */}
      {hasLogs && crisisLevel >= 3 && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h3 className="font-bold text-rose-400">Severe Distress Guardrail Activated</h3>
            <p className="text-xs text-rose-300/80 leading-relaxed">
              Our forecasting models detect persistent high stress and potential burnout risks. Consider utilizing our crisis resources drawer located on the Chat screen or reaching out to a mentor or clinical counseling professional.
            </p>
          </div>
        </div>
      )}

      {/* Analytics stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Burnout Probability Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-44">
          <div>
            <div className="flex justify-between items-center text-xs text-slate-400 uppercase font-semibold tracking-wider">
              <span>Burnout Probability</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className={`text-4xl font-extrabold tracking-tight mt-3 ${brsColor}`}>
              {hasLogs && brs !== null && brs !== undefined ? `${brs}%` : "Nill"}
            </div>
          </div>
          <div className="text-xs text-slate-500 flex justify-between items-center">
            <span>Prediction Confidence</span>
            <span className="font-semibold text-slate-300">{hasLogs ? `${Math.round((analytics?.confidence || 0) * 100)}%` : "Nill"}</span>
          </div>
        </div>

        {/* Average Stress Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-44">
          <div>
            <div className="flex justify-between items-center text-xs text-slate-400 uppercase font-semibold tracking-wider">
              <span>Average Stress Level</span>
              <Compass className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-4xl font-extrabold tracking-tight mt-3 text-slate-200">
              {hasLogs && analytics?.avg_stress !== null && analytics?.avg_stress !== undefined ? `${analytics.avg_stress.toFixed(0)}%` : "Nill"}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Based on recent daily logs
          </div>
        </div>

        {/* Average Mood Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-44">
          <div>
            <div className="flex justify-between items-center text-xs text-slate-400 uppercase font-semibold tracking-wider">
              <span>Average Mood Rating</span>
              <HeartHandshake className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-4xl font-extrabold tracking-tight mt-3 text-slate-200">
              {hasLogs && analytics?.avg_mood !== null && analytics?.avg_mood !== undefined ? `${analytics.avg_mood.toFixed(1)}/10` : "Nill"}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Measured over 30 days
          </div>
        </div>

        {/* Current Crisis Level Card */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-44">
          <div>
            <div className="flex justify-between items-center text-xs text-slate-400 uppercase font-semibold tracking-wider">
              <span>Distress Level</span>
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
            </div>
            <div className={`text-4xl font-extrabold tracking-tight mt-3 ${hasLogs && crisisLevel > 2 ? 'text-rose-400 text-glow-rose' : 'text-slate-200'}`}>
              {hasLogs && crisisLevel !== null && crisisLevel !== undefined && crisisLevel > 0 ? `Level ${crisisLevel}` : "Nill"}
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Out of 4 severity stages
          </div>
        </div>
      </div>

      {/* Main dashboard content grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Timeline Chart Panel */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> 30-Day Wellness Timeline
            </h2>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Stress vs Burnout</span>
          </div>

          <div className="flex-grow w-full">
            {analytics?.recent_timeline && analytics.recent_timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.recent_timeline} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBurnout" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ background: "#0f0f16", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}
                    itemStyle={{ fontSize: "12px" }}
                    labelStyle={{ fontSize: "11px", color: "#64748b" }}
                  />
                  <Area type="monotone" dataKey="stress_score" name="Stress Level" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorStress)" />
                  <Area type="monotone" dataKey="burnout_score" name="Burnout Risk" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorBurnout)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                Insufficient timeline logs. Submit journals to populate.
              </div>
            )}
          </div>
        </div>

        {/* Triggers Panel */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-[400px]">
          <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" /> Active Stress Triggers
          </h2>

          <div className="space-y-4 overflow-y-auto pr-1 flex-grow">
            {analytics?.top_triggers?.map((t, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-200 text-sm">{t.trigger}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    t.risk_level === "High" ? "bg-rose-500/15 text-rose-400" : "bg-amber-500/15 text-amber-400"
                  }`}>
                    {t.risk_level} Risk
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500">
                  <span>Trigger Status</span>
                  <span className="text-slate-400">Stable Evolution</span>
                </div>
              </div>
            ))}
            {(!analytics?.top_triggers || analytics.top_triggers.length === 0) && (
              <div className="text-center py-20 text-xs text-slate-500 italic">
                No active stress triggers discovered yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Intervention Learning recommendations list */}
      <div className="glass-panel p-6 rounded-2xl">
        <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
          <HeartHandshake className="w-4 h-4 text-indigo-400" /> Dynamic Intervention Recommendations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendations?.map((rec, idx) => (
            <div key={idx} className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/30 flex flex-col justify-between gap-5 relative overflow-hidden">
              
              {/* Highlight personalized ones */}
              {rec.is_highly_effective && (
                <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-indigo-500/15 text-indigo-400 border-l border-b border-indigo-500/25 rounded-bl text-[9px] font-bold uppercase tracking-wider">
                  Personalized
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold uppercase tracking-wider inline-block">
                  {rec.category}
                </span>
                <h3 className="font-bold text-sm text-slate-200">{rec.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{rec.description}</p>
              </div>

              {/* Feedback Loop Controls */}
              <div className="border-t border-slate-800/60 pt-4 mt-2">
                <span className="block text-[10px] text-slate-500 font-semibold mb-2">Mark Outcome Effectiveness:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFeedback(rec, "Stress Reduced")}
                    disabled={submittingFeedback[`${rec.title}-Stress Reduced`]}
                    className="flex-grow py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-bold text-[10px] rounded-lg border border-indigo-500/25 cursor-pointer disabled:opacity-40"
                  >
                    Reduced Stress
                  </button>
                  <button
                    onClick={() => handleFeedback(rec, "No Change")}
                    disabled={submittingFeedback[`${rec.title}-No Change`]}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] rounded-lg border border-slate-700/50 cursor-pointer disabled:opacity-40"
                  >
                    No Change
                  </button>
                </div>
              </div>
            </div>
          ))}

          {(!recommendations || recommendations.length === 0) && (
            <div className="md:col-span-3 text-center py-10 text-xs text-slate-500 italic">
              No recommendations generated. Complete onboarding and submit journal entries to populate.
            </div>
          )}
        </div>
      </div>

      {/* Manage Sessions & Account Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        
        {/* Previous Chat Sessions list */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col h-[320px]">
          <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" /> Chat History Sessions
          </h2>
          
          <div className="flex-grow overflow-y-auto pr-1 space-y-3">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex justify-between items-center hover:border-slate-700 transition"
              >
                <div>
                  <div className="font-semibold text-slate-200 text-sm">{session.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Created: {new Date(session.created_at).toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  disabled={deletingSessionId === session.id}
                  className="p-2 bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/25 rounded-lg transition disabled:opacity-40 cursor-pointer"
                  title="Delete Session"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                No active chat sessions found. Start a conversation in Aarohi Chat to log history.
              </div>
            )}
          </div>
        </div>

        {/* Account controls & Dashboard Reset */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-[320px]">
          <div>
            <h2 className="text-lg font-bold text-slate-200 mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-400" /> Platform Operations
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Wipe all compiled metrics, historical journal entries, check-ins, active triggers, and conversational memories to restore your wellness center to its fresh, default state.
            </p>
          </div>

          <div className="space-y-3.5">
            <button
              onClick={handleResetDashboard}
              disabled={resetting}
              className="w-full py-3 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/25 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
              {resetting ? "Resetting Logs..." : "Reset Dashboard"}
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full py-3 bg-slate-900 border border-slate-800 hover:bg-rose-500/5 hover:border-rose-500/20 text-slate-300 hover:text-rose-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out of Platform
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
