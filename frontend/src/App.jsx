import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import AarohiChat from "./pages/AarohiChat";
import { LayoutDashboard, FileText, MessageSquare, LogOut, Compass, Sparkles } from "lucide-react";

// Route Guard for authenticated pages
function PrivateRoute({ children }) {
  const { currentUser, token } = useAuth();
  return currentUser && token ? children : <Navigate to="/login" replace />;
}

// Sidebar/Shell Layout
function NavigationShell({ children }) {
  const { logout } = useAuth();
  const location = useLocation();

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Journaling", path: "/journal", icon: FileText },
    { name: "Aarohi Chat", path: "/chat", icon: MessageSquare }
  ];

  return (
    <div className="min-h-screen bg-darkBg flex flex-col md:flex-row relative">
      
      {/* Premium Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-darkCard border-b md:border-b-0 md:border-r border-slate-800/80 p-6 flex flex-col justify-between flex-shrink-0 relative z-20">
        <div className="space-y-8">
          
          {/* Sidebar logo header */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-slate-100 text-lg block">AAROHAN</span>
              <span className="text-[10px] text-slate-400 block tracking-wider uppercase font-semibold">Intelligence</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-150 border ${
                    isActive
                      ? "bg-indigo-600/10 border-indigo-500/25 text-indigo-400 text-glow-indigo"
                      : "border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Logout */}
        <div className="mt-8 pt-6 border-t border-slate-800/60">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:bg-rose-500/5 hover:border-rose-500/25 border border-transparent hover:text-rose-400 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Primary viewport content */}
      <main className="flex-grow overflow-y-auto relative z-10">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Auth Path */}
          <Route path="/login" element={<Login />} />
          
          {/* Onboarding Wizard Path */}
          <Route 
            path="/onboarding" 
            element={
              <PrivateRoute>
                <Onboarding />
              </PrivateRoute>
            } 
          />

          {/* Protected Navigation shell routes */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <NavigationShell>
                  <Dashboard />
                </NavigationShell>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/journal" 
            element={
              <PrivateRoute>
                <NavigationShell>
                  <Journal />
                </NavigationShell>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/chat" 
            element={
              <PrivateRoute>
                <NavigationShell>
                  <AarohiChat />
                </NavigationShell>
              </PrivateRoute>
            } 
          />

          {/* Catch-all fallback redirects */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
