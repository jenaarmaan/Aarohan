import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { auth } from "../services/firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up
  function register(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  // Sign in
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Sign out
  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // Force refresh token to ensure it hasn't expired
          const jwtToken = await user.getIdToken(true);
          setToken(jwtToken);
          localStorage.setItem("aar_token", jwtToken);
        } catch (e) {
          console.error("Failed to fetch ID token:", e);
          setToken(null);
          localStorage.removeItem("aar_token");
        }
      } else {
        setCurrentUser(null);
        setToken(null);
        localStorage.removeItem("aar_token");
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    token,
    register,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
