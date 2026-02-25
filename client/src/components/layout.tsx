import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { LogOut, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
}

export function Layout({ children, title, showBack = true }: LayoutProps) {
  const { isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  if (!isAuthenticated && location !== "/") {
    // Prevent rendering layout content if not authenticated
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="w-8 h-8 text-blue-300" />
            <h1 className="text-xl font-bold tracking-wider uppercase">CADVAGOS</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {showBack && location !== "/menu" && (
              <Link href="/menu" className="hidden sm:block">
                <Button variant="secondary" size="sm" className="font-semibold gap-2 shadow-sm">
                  <ArrowLeft className="w-4 h-4" />
                  VOLTAR AO MENU
                </Button>
              </Link>
            )}
            
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={logout}
              className="font-semibold gap-2 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              SAIR
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{title}</h2>
          {showBack && location !== "/menu" && (
            <Link href="/menu" className="sm:hidden block">
              <Button variant="outline" size="sm" className="font-semibold">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          )}
        </div>
        
        <div className="bg-white rounded-xl shadow-lg border border-slate-200/60 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
