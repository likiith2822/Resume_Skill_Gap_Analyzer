import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, ApiResponse, AuthResponseData } from "../types";
import { 
  getCurrentUserApi, 
  loginApi, 
  registerApi, 
  logoutApi,
  getStoredToken
} from "../services/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await getCurrentUserApi();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await loginApi({ email, password });
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        setIsLoading(false);
        return { success: true, message: res.message || "Login successful." };
      }
      setIsLoading(false);
      return { 
        success: false, 
        error: res.error?.message || "Invalid email or password." 
      };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || "Login failed" };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await registerApi({ name, email, password });
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        setIsLoading(false);
        return { success: true, message: res.message || "Registration successful." };
      }
      setIsLoading(false);
      return { 
        success: false, 
        error: res.error?.message || "Registration failed. Please check inputs." 
      };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || "Registration error" };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
