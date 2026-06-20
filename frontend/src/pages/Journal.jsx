import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { Mic, Square, Send, AlertCircle, WifiOff, FileText, CheckCircle } from "lucide-react";

export default function Journal() {
  const [content, setContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [insight, setInsight] = useState(null);
  
  // Offline Sync Management
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      triggerOfflineSync();
    }
    function handleOffline() {
      setIsOnline(false);
    }
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    // Check pending count on load
    const pending = JSON.parse(localStorage.getItem("aar_offline_journals") || "[]");
    setPendingSync(pending.length);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  async function triggerOfflineSync() {
    const pending = JSON.parse(localStorage.getItem("aar_offline_journals") || "[]");
    if (pending.length === 0) return;
    
    console.log(`Attempting to sync ${pending.length} offline journal entries...`);
    let failed = [];
    
    for (const item of pending) {
      try {
        await api.post("/journals", { content: item.content });
      } catch (err) {
        console.error("Failed to sync offline item:", err);
        failed.push(item);
      }
    }
    
    localStorage.setItem("aar_offline_journals", JSON.stringify(failed));
    setPendingSync(failed.length);
  }

  // Recording Timer
  function startTimer() {
    setRecordingTime(0);
    timerIntervalRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerIntervalRef.current);
  }

  // Audio Recording handlers
  async function startRecording() {
    setError("");
    setInsight(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: "audio/webm" };
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // Get chunks every 250ms
      setIsRecording(true);
      startTimer();
    } catch (err) {
      console.error(err);
      setError("Microphone permission denied or device unavailable.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  }

  // Submit Text Entry
  async function handleTextSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    
    setError("");
    setInsight(null);
    setLoading(true);

    if (!isOnline) {
      // Store locally
      const pending = JSON.parse(localStorage.getItem("aar_offline_journals") || "[]");
      pending.push({ content, created_at: new Date().toISOString() });
      localStorage.setItem("aar_offline_journals", JSON.stringify(pending));
      setPendingSync(pending.length);
      setContent("");
      setLoading(false);
      return setError("Offline. Journal queued locally; will synchronize when internet connection is restored.");
    }

    try {
      const res = await api.post("/journals", { content });
      setInsight(res.data.analysis);
      setContent("");
    } catch (err) {
      console.error(err);
      setError("Failed to submit journal entry. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Submit Voice Entry
  async function handleVoiceSubmit() {
    if (!audioBlob) return;
    
    setError("");
    setInsight(null);
    setLoading(true);

    if (!isOnline) {
      setLoading(false);
      return setError("Voice uploads require an active internet connection.");
    }

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "voice_journal.webm");
      
      const res = await api.post("/journals/voice", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setInsight(res.data.analysis);
      setAudioBlob(null);
    } catch (err) {
      console.error(err);
      setError("Failed to upload and transcribe audio. Please speak clearly.");
    } finally {
      setLoading(false);
    }
  }

  function formatTime(secs) {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? "0" : ""}${remaining}`;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Offline Banner Alerts */}
      {!isOnline && (
        <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm flex items-center gap-3">
          <WifiOff className="w-5 h-5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Offline Mode active.</span> You can still compose text journals; they will auto-sync once connection returns.
          </div>
        </div>
      )}

      {pendingSync > 0 && isOnline && (
        <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm flex justify-between items-center">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>You have {pendingSync} pending offline entry/entries waiting to sync.</span>
          </div>
          <button
            onClick={triggerOfflineSync}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Sync Now
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Left Side Ingestion Forms */}
        <div className="md:col-span-3 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" /> Write Journal Entry
            </h2>
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <textarea
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What occurred today? How did you respond? Write freely..."
                className="w-full p-4 rounded-xl text-slate-200 glow-input text-sm resize-none"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{content.length} characters</span>
                <button
                  type="submit"
                  disabled={loading || !content.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> Send Entry
                </button>
              </div>
            </form>
          </div>

          {/* Voice recording Panel */}
          <div className="glass-panel p-6 rounded-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Mic className="w-5 h-5 text-indigo-400" /> Record Voice Journal
            </h2>
            
            <div className="flex flex-col items-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-900/10">
              {isRecording ? (
                <div className="text-center space-y-4">
                  {/* Waveform Mimic pulse */}
                  <div className="flex justify-center items-center gap-1.5 h-10">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-rose-500 rounded-full animate-bounce"
                        style={{
                          height: `${Math.random() * 30 + 10}px`,
                          animationDelay: `${i * 0.15}s`
                        }}
                      ></div>
                    ))}
                  </div>
                  <div className="text-2xl font-mono text-rose-400 font-bold">
                    {formatTime(recordingTime)}
                  </div>
                  <button
                    onClick={stopRecording}
                    className="p-4 bg-rose-600 hover:bg-rose-500 rounded-full text-white cursor-pointer shadow-lg shadow-rose-600/20"
                  >
                    <Square className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <p className="text-xs text-slate-400">
                    Aarohan converts audio directly to emotional data. Speak clearly.
                  </p>
                  
                  {audioBlob ? (
                    <div className="space-y-4">
                      <audio src={URL.createObjectURL(audioBlob)} controls className="mx-auto rounded-lg" />
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={() => setAudioBlob(null)}
                          className="px-4 py-2 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                        >
                          Discard
                        </button>
                        <button
                          onClick={handleVoiceSubmit}
                          disabled={loading}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" /> Analyze Voice
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={startRecording}
                      disabled={loading || !isOnline}
                      className="p-5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/25 rounded-full cursor-pointer transition disabled:opacity-50"
                    >
                      <Mic className="w-8 h-8" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side Analysis/Insights Display */}
        <div className="md:col-span-2 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-slate-400 font-semibold animate-pulse">
                Gemini extracting signals...
              </p>
            </div>
          )}

          {insight && !loading && (
            <div className="glass-panel p-6 rounded-2xl space-y-6 border-indigo-500/20 shadow-xl shadow-indigo-500/5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                <CheckCircle className="w-5 h-5" /> Analysis Completed
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Extracted Events
                </h4>
                <div className="space-y-1.5">
                  {insight.events.map((ev, index) => (
                    <div key={index} className="flex justify-between items-center text-sm bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-200 font-medium">{ev.event_name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-400 font-semibold uppercase tracking-wider">
                        {ev.taxonomy_category}
                      </span>
                    </div>
                  ))}
                  {insight.events.length === 0 && (
                    <div className="text-xs text-slate-500 italic">No events extracted.</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Detected Emotions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {insight.emotions.map((em, index) => (
                    <div key={index} className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-indigo-300 flex items-center gap-2">
                      <span>{em.emotion_name}</span>
                      <span className="text-[10px] text-slate-500">{(em.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                  {insight.emotions.length === 0 && (
                    <div className="text-xs text-slate-500 italic">No emotions detected.</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Explanation Summary
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/25 p-3 rounded-lg border border-slate-800/40">
                  {insight.summary}
                </p>
              </div>

              {insight.self_harm_flag && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-bold leading-relaxed animate-pulse">
                  CRITICAL DISTRESS SIGNAL DETECTED. Safety resources activated in chat dashboard.
                </div>
              )}
            </div>
          )}

          {!insight && !loading && (
            <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center py-24 text-slate-500">
              <FileText className="w-12 h-12 mb-3 stroke-[1.5]" />
              <p className="text-sm font-semibold">Ready for Entry</p>
              <p className="text-xs mt-1 max-w-[200px]">
                Submit a text journal or record a voice file to discover stress trigger vectors.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
