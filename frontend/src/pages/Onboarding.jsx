import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { User, Shield, Compass, ArrowRight, CheckCircle2 } from "lucide-react";

const PERSONAS = [
  { id: "Student", label: "Student", desc: "Aspirants preparing for JEE, NEET, UPSC, etc." },
  { id: "Professional", label: "Working Professional", desc: "Navigating corporate workload or job tasks" },
  { id: "Entrepreneur", label: "Entrepreneur / Founder", desc: "Building startups and managing teams" },
  { id: "Freelancer", label: "Freelancer / Independent", desc: "Balancing client gigs and flexible schedules" },
  { id: "Parent", label: "Parent / Homemaker", desc: "Managing household duties and family support" },
  { id: "Athlete", label: "Athlete / Competitor", desc: "Focused on training and sports performance" },
  { id: "Creator", label: "Creator / Artist", desc: "Producing content, design, or writing portfolio" },
  { id: "Other", label: "Other Persona", desc: "Navigating general life challenges" }
];

const FEELINGS = [
  { id: "Calm", label: "Calm & Stable", color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" },
  { id: "Anxious", label: "Anxious / Uneasy", color: "border-amber-500/30 text-amber-400 bg-amber-500/5" },
  { id: "Overwhelmed", label: "Overwhelmed", color: "border-orange-500/30 text-orange-400 bg-orange-500/5" },
  { id: "Burned Out", label: "Burned Out", color: "border-rose-500/30 text-rose-400 bg-rose-500/5" },
  { id: "Unmotivated", label: "Unmotivated / Fatigued", color: "border-indigo-500/30 text-indigo-400 bg-indigo-500/5" }
];

const DYNAMIC_CONCERNS = {
  Student: ["Mock Exams", "Ranks & Grades", "Time Management", "Competition", "Parental Expectations"],
  Professional: ["Project Deadlines", "Workload Volume", "Office Politics", "Career Growth", "Salary Stability"],
  Entrepreneur: ["Funding & Cashflow", "Burn Rate", "Product-Market Fit", "Team Management", "Execution Proximity"],
  Freelancer: ["Client Acquisition", "Revenue Instability", "Isolation", "Scope Creep", "Taxes & Planning"],
  Parent: ["Family Health", "Household Expenses", "Time for Self", "Relationship Tension", "Child Welfare"],
  Athlete: ["Competition Pressure", "Injury Recovery", "Rigid Schedules", "Performance Slumps", "Nutrition"],
  Creator: ["Creative Block", "Engagement Metrics", "Burnout", "Imposter Syndrome", "Algorithm Anxiety"],
  Other: ["Health Issues", "Financial Stress", "Sleep Consistency", "Isolation", "Future Uncertainty"]
};

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [selectedPersona, setSelectedPersona] = useState("");
  const [selectedFeeling, setSelectedFeeling] = useState("");
  const [selectedConcerns, setSelectedConcerns] = useState([]);
  const [allowAi, setAllowAi] = useState(true);
  const [allowRetention, setAllowRetention] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  function toggleConcern(concern) {
    if (selectedConcerns.includes(concern)) {
      setSelectedConcerns(selectedConcerns.filter((c) => c !== concern));
    } else {
      setSelectedConcerns([...selectedConcerns, concern]);
    }
  }

  async function handleComplete() {
    setLoading(true);
    setError("");
    try {
      await api.post("/onboarding", {
        persona_type: selectedPersona,
        life_context: selectedPersona === "Student" ? "Competitive Exams" : selectedPersona === "Entrepreneur" ? "Startup Building" : "General Life",
        baseline_feeling: selectedFeeling,
        top_concerns: selectedConcerns,
        allow_ai_analysis: allowAi,
        allow_data_retention: allowRetention
      });
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Failed to initialize profile. Please check credentials and connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-darkBg text-slate-100 flex flex-col justify-between py-12 px-6 relative overflow-hidden">
      {/* Glow graphics */}
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-indigo-950/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-10 w-[350px] h-[350px] bg-purple-950/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-2xl w-full mx-auto relative z-10 my-auto">
        {/* Step Indicator Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-8 h-1.5 rounded-full transition-all duration-300 ${
                  step >= s ? "bg-indigo-500" : "bg-slate-800"
                }`}
              ></div>
            ))}
          </div>
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Step {step} of 4
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* STEP 1: Persona */}
        {step === 1 && (
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">What best describes you?</h1>
            <p className="text-slate-400 mb-8 text-sm">Select your profile to customize your digital twin engine.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  className={`p-4 rounded-xl text-left border transition-all duration-200 cursor-pointer ${
                    selectedPersona === p.id
                      ? "border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/5"
                      : "border-slate-800 bg-darkCard/40 hover:border-slate-700"
                  }`}
                >
                  <User className={`w-5 h-5 mb-2 ${selectedPersona === p.id ? "text-indigo-400" : "text-slate-400"}`} />
                  <div className="font-semibold text-slate-200">{p.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Current feeling */}
        {step === 2 && (
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">How have you been feeling lately?</h1>
            <p className="text-slate-400 mb-8 text-sm">This establishes your baseline stress calibration.</p>
            <div className="space-y-3">
              {FEELINGS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFeeling(f.id)}
                  className={`w-full p-4 rounded-xl text-left border flex justify-between items-center transition-all duration-200 cursor-pointer ${
                    selectedFeeling === f.id
                      ? `${f.color} border-indigo-500 shadow-md`
                      : "border-slate-800 bg-darkCard/40 hover:border-slate-700"
                  }`}
                >
                  <span className="font-semibold">{f.label}</span>
                  {selectedFeeling === f.id && <CheckCircle2 className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Concerns */}
        {step === 3 && (
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">What concerns you most?</h1>
            <p className="text-slate-400 mb-8 text-sm">Select all topics that affect your wellness patterns.</p>
            <div className="flex flex-wrap gap-3">
              {(DYNAMIC_CONCERNS[selectedPersona] || DYNAMIC_CONCERNS["Other"]).map((concern) => {
                const isSelected = selectedConcerns.includes(concern);
                return (
                  <button
                    key={concern}
                    onClick={() => toggleConcern(concern)}
                    className={`px-4 py-3 rounded-full text-sm font-medium border transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                        : "border-slate-800 bg-darkCard/30 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    {concern}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: Privacy Settings */}
        {step === 4 && (
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Configure Privacy Controls</h1>
            <p className="text-slate-400 mb-8 text-sm">Aarohan is privacy-first. Manage your emotional intelligence configuration.</p>
            
            <div className="space-y-6 glass-panel p-6 rounded-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-400" /> Enable AI Sentiment Ingestion
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Allows the local engine and Gemini to process journal statements to discover stress patterns.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={allowAi}
                  onChange={(e) => setAllowAi(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" /> Allow Memory Retention
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Permits the Wellness Digital Twin to store successful intervention outcomes over time.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={allowRetention}
                  onChange={(e) => setAllowRetention(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-800/60">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="text-slate-400 hover:text-white text-sm font-semibold transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !selectedPersona) ||
                (step === 2 && !selectedFeeling) ||
                (step === 3 && selectedConcerns.length === 0)
              }
              className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? "Initializing..." : "Get Started"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
