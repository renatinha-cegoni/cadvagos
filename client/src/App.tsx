import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import MainMenu from "@/pages/main-menu";
import CadastrosForm from "@/pages/cadastros-form";
import BancoDeDados from "@/pages/banco-de-dados";
import Cartoriais from "@/pages/cartoriais";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/menu" component={MainMenu} />
      <Route path="/cadastros" component={CadastrosForm} />
      <Route path="/cadastros/:id" component={CadastrosForm} />
      <Route path="/banco-de-dados" component={BancoDeDados} />
      <Route path="/cartoriais" component={Cartoriais} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
