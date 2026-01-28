"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase";
import { recordAuditLog } from "@/lib/firestore";
import type { UserRole } from "@/types/guitars";

interface AuthContextType {
  currentUser: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Force refresh token to get latest custom claims
        try {
          const token = await user.getIdTokenResult(true); // Force refresh
          const role = token.claims.role as UserRole | undefined;
          setUserRole(role || null);
        } catch (error) {
          console.error("Error getting user role:", error);
          // Fallback: try without forcing refresh
          try {
            const token = await user.getIdTokenResult();
            const role = token.claims.role as UserRole | undefined;
            setUserRole(role || null);
          } catch (e) {
            setUserRole(null);
          }
        }
      } else {
        setUserRole(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    recordAuditLog("login", {}).catch(() => {});
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    // Create the user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update display name
    if (userCredential.user && displayName) {
      // Note: We'll set the role via Cloud Function after account creation
      // For now, just create the account
    }
    
    // Call Cloud Function to set client role
    try {
      const functions = getFunctions();
      const setClientRole = httpsCallable(functions, "setClientRole");
      await setClientRole({
        uid: userCredential.user.uid,
        displayName: displayName,
      });
      
      // Refresh token to get the new role
      await refreshToken();
    } catch (error) {
      console.error("Error setting client role:", error);
      // Don't throw - user is created, role will be set on next login
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    recordAuditLog("login", {}).catch(() => {});

    // Call Cloud Function to set client role if user is new
    try {
      const functions = getFunctions();
      const setClientRole = httpsCallable(functions, "setClientRole");
      await setClientRole({
        uid: userCredential.user.uid,
        displayName: userCredential.user.displayName || undefined,
      });

      // Refresh token to get the new role
      await refreshToken();
    } catch (error) {
      console.error("Error setting client role:", error);
      // Don't throw - user can sign in, role will be set on next login
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const refreshToken = async () => {
    if (currentUser) {
      // Force refresh the token to get updated claims
      await currentUser.getIdToken(true);
      const token = await currentUser.getIdTokenResult(true);
      const role = token.claims.role as UserRole | undefined;
      setUserRole(role || null);
    }
  };

  const value = {
    currentUser,
    userRole,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

