import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [password, setPassword] = useState("");
  const { login, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/menu");
    }
  }, [isAuthenticated, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(password);
    if (!success) {
      toast({
        title: "Acesso Negado",
        description: "Credenciais inválidas.",
        variant: "destructive",
      });
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-800/20 rounded-full blur-[120px]" />

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 sm:p-12 relative z-10 animate-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-blue-400/30">
            <ShieldAlert className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-widest uppercase mb-2">CADVAGOS</h1>
          <p className="text-slate-400 text-sm tracking-widest uppercase">Sistema de Registro</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="SENHA DE ACESSO"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 text-center tracking-[0.3em] h-14 text-lg focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-14 text-lg font-bold tracking-wider bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            ENTRAR
          </Button>
        </form>
        
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-xs">Acesso restrito a pessoal autorizado.</p>
        </div>
      </div>
    </div>
  );
}
