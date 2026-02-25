import { createContext, useContext, useState, ReactNode } from "react";
import { useLocation } from "wouter";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  verifyAction: (password: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [, setLocation] = useLocation();

  const login = (password: string) => {
    if (password === "ari") {
      setIsAuthenticated(true);
      setLocation("/menu");
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setLocation("/");
  };

  const verifyAction = (password: string) => {
    return password === "1837";
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, verifyAction }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
