import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { MessageSquare, ShieldAlert, HeartHandshake, Send, Brain, Sparkles, AlertTriangle } from "lucide-react";

export default function AarohiChat() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarContext, setSidebarContext] = useState(null);
  const [error, setError] = useState("");
  
  const chatBottomRef = useRef(null);

  useEffect(() => {
    fetchSessions();
    fetchDashboardContext();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
    }
  }, [currentSessionId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function fetchSessions() {
    try {
      const res = await api.get("/chat/sessions");
      if (res.data && Array.isArray(res.data)) {
        setSessions(res.data);
        if (res.data.length > 0) {
          setCurrentSessionId(res.data[0].id);
        }
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error("Failed to fetch chat sessions:", err);
      setSessions([]);
    }
  }

  async function fetchDashboardContext() {
    try {
      const res = await api.get("/dashboard");
      if (res.data && res.data.analytics) {
        setSidebarContext(res.data.analytics);
      } else {
        setSidebarContext(null);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard context:", err);
      setSidebarContext(null);
    }
  }

  async function fetchMessages(sessionId) {
    try {
      const res = await api.get(`/chat/sessions/${sessionId}/messages`);
      if (res.data && Array.isArray(res.data)) {
        setMessages(res.data);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
      setMessages([]);
      setError("Unauthorized access or failed to fetch message history.");
    }
  }

  async function startNewSession() {
    setCurrentSessionId(null);
    setMessages([]);
    setInput("");
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsgText = input;
    setInput("");
    setLoading(true);
    setError("");

    // Optimistically update local view first
    setMessages((prev) => [...prev, { sender: "user", text: userMsgText, timestamp: new Date().toISOString() }]);

    try {
      const res = await api.post("/chat", {
        text: userMsgText,
        session_id: currentSessionId
      });
      
      if (!currentSessionId) {
        // If it was a new session, session_id was returned
        setCurrentSessionId(res.data.session_id);
        fetchSessions();
      }
      
      setMessages((prev) => [...prev, { sender: "aarohi", text: res.data.response, timestamp: new Date().toISOString() }]);
      
      // Update context dynamically in case scores changed
      fetchDashboardContext();
    } catch (err) {
      console.error(err);
      setError("Aarohi has experienced a connectivity disruption. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Check crisis levels
  const crisisLevel = sidebarContext?.current_crisis_level ?? 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6">
      
      {/* Left Column - History Sessions & retrieved context */}
      <div className="w-full md:w-80 flex flex-col gap-6 flex-shrink-0">
        
        {/* Chat Sessions list */}
        <div className="glass-panel p-4 rounded-2xl flex-grow overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" /> Chat Sessions
            </h3>
            <button
              onClick={startNewSession}
              className="text-xs px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-semibold rounded-lg border border-indigo-500/20 cursor-pointer"
            >
              + New
            </button>
          </div>
          
          <div className="space-y-2 overflow-y-auto flex-grow pr-1">
            {Array.isArray(sessions) && sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => setCurrentSessionId(sess.id)}
                className={`w-full p-3 rounded-xl text-left text-xs transition duration-150 border cursor-pointer ${
                  currentSessionId === sess.id
                    ? "border-indigo-500 bg-indigo-500/5 text-indigo-300 font-semibold"
                    : "border-slate-800 bg-slate-900/30 hover:border-slate-700 text-slate-400"
                }`}
              >
                {sess.title}
              </button>
            ))}
            {(!Array.isArray(sessions) || sessions.length === 0) && (
              <div className="text-center text-xs text-slate-500 italic py-10">No sessions recorded yet.</div>
            )}
          </div>
        </div>

        {/* Digital Twin memory sidebar */}
        <div className="glass-panel p-4 rounded-2xl">
          <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-indigo-400" /> Digital Twin Context
          </h3>
          {sidebarContext ? (
            <div className="space-y-3.5 text-xs text-slate-400">
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span>Burnout Probability</span>
                <span className={`font-semibold text-glow-indigo text-slate-200`}>
                  {sidebarContext.current_burnout_score !== null && sidebarContext.current_burnout_score !== undefined
                    ? `${sidebarContext.current_burnout_score}%`
                    : "Nill"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span>Crisis Status</span>
                <span className={`font-semibold ${
                  crisisLevel === 4 ? "text-rose-400 text-glow-rose" : crisisLevel === 3 ? "text-orange-400" : "text-emerald-400"
                }`}>
                  {sidebarContext.current_crisis_level !== null && sidebarContext.current_crisis_level !== undefined && sidebarContext.current_crisis_level > 0
                    ? `Level ${crisisLevel}`
                    : "Nill"}
                </span>
              </div>
              <div>
                <span className="block mb-1">Top Active Triggers</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {Array.isArray(sidebarContext.top_triggers) && sidebarContext.top_triggers.map((t, idx) => (
                    <span key={idx} className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[10px] text-indigo-300 font-medium">
                      {t.trigger}
                    </span>
                  ))}
                  {(!Array.isArray(sidebarContext.top_triggers) || sidebarContext.top_triggers.length === 0) && (
                    <span className="text-[10px] text-slate-500 italic">None logged.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-500 italic">No wellness context compiled.</div>
          )}
        </div>
      </div>

      {/* Main chat column */}
      <div className="flex-grow glass-panel rounded-2xl overflow-hidden flex flex-col justify-between">
        
        {/* Chat header */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/20 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-200">Aarohi AI Companion</h2>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Wellness Coach Active
              </span>
            </div>
          </div>

          {/* Safety flag indicator */}
          {crisisLevel >= 3 && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 animate-pulse font-semibold">
              <ShieldAlert className="w-4 h-4" /> Safety Protocol Engaged
            </div>
          )}
        </div>

        {/* Message window */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-900/5">
          
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
              {error}
            </div>
          )}

          {/* Prompt warning disclaimer header */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/60 text-xs text-slate-500 leading-relaxed text-center">
            🧘 <strong>Aarohan Disclaimer:</strong> Aarohi is an AI wellness coach, not a therapist or medical device. If you are experiencing severe clinical distress, please reach out to professional services immediately.
          </div>

          {/* Safe-harm safety layout triggered */}
          {crisisLevel === 4 && (
            <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Crisis Helpline Resources Activated</h4>
                  <p className="text-xs text-rose-300/80 mt-1">
                    Severe emotional distress has been identified. Please consider contacting these professional organizations immediately:
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <div className="font-bold text-slate-200">AASRA Helpline (India)</div>
                  <div className="text-indigo-400 font-semibold mt-1">91-9820466726</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">24/7 Suicide Prevention Support</div>
                </div>
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <div className="font-bold text-slate-200">Vandrevala Foundation</div>
                  <div className="text-indigo-400 font-semibold mt-1">91-9999666555</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">24/7 Mental Health Counselling</div>
                </div>
              </div>
            </div>
          )}

          {Array.isArray(messages) && messages.map((msg, index) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={index}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed border ${
                    isUser
                      ? "bg-indigo-600 border-indigo-500 text-white rounded-br-none"
                      : "bg-darkCard border-slate-800/80 text-slate-200 rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-darkCard border border-slate-800 p-4 rounded-2xl rounded-bl-none flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: "0s" }}></span>
                <span className="w-2 h-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: "0.15s" }}></span>
                <span className="w-2 h-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: "0.3s" }}></span>
              </div>
            </div>
          )}
          
          <div ref={chatBottomRef} />
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800/80 bg-slate-900/10 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || crisisLevel === 4}
            placeholder={crisisLevel === 4 ? "Chat is locked due to safety protocol. Please use helpline resources." : "Type a message..."}
            className="flex-grow px-4 py-3 rounded-xl text-slate-200 glow-input text-sm"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || crisisLevel === 4}
            className="px-5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl flex items-center justify-center cursor-pointer transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
