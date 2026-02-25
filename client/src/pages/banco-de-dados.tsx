import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { PasswordPrompt } from "@/components/password-prompt";
import { useCadastros, useDeleteCadastro } from "@/hooks/use-cadastros";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Edit, Trash2, User, Database as DbIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BancoDeDados() {
  const [, setLocation] = useLocation();
  const { data: cadastros, isLoading } = useCadastros();
  const deleteMutation = useDeleteCadastro();
  
  const [searchTerm, setSearchTerm] = useState("");
  
  // Security prompt state
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: 'edit' | 'delete', id: number} | null>(null);
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);

  // Filter and sort
  const filteredData = cadastros?.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.nome.toLowerCase().includes(term) || 
      (c.alcunha && c.alcunha.toLowerCase().includes(term))
    );
  }).sort((a, b) => a.nome.localeCompare(b.nome)) || [];

  // Handlers
  const requestAction = (type: 'edit' | 'delete', id: number) => {
    setPendingAction({ type, id });
    setPromptOpen(true);
  };

  const onPasswordSuccess = () => {
    if (!pendingAction) return;
    
    if (pendingAction.type === 'edit') {
      setLocation(`/cadastros/${pendingAction.id}`);
    } else if (pendingAction.type === 'delete') {
      setIdToDelete(pendingAction.id);
      setDeleteConfirmOpen(true);
    }
    setPendingAction(null);
  };

  const confirmDelete = async () => {
    if (idToDelete) {
      await deleteMutation.mutateAsync(idToDelete);
      setIdToDelete(null);
    }
  };

  return (
    <Layout title="BANCO DE DADOS">
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            placeholder="Buscar por Nome ou Alcunha..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 text-lg bg-slate-50 border-slate-200 focus:bg-white transition-colors uppercase-input"
          />
        </div>

        {/* Results List */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="divide-y divide-slate-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center text-slate-500">
              <DbIcon className="w-16 h-16 mb-4 text-slate-300" />
              <p className="text-lg font-medium">Nenhum registro encontrado.</p>
              {searchTerm && <p className="text-sm mt-1">Tente ajustar sua busca.</p>}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-2">
              {filteredData.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-slate-800 truncate uppercase">
                        {item.nome}
                      </h3>
                      {item.alcunha && (
                        <p className="text-sm text-slate-500 font-medium truncate uppercase">
                          VULGO: {item.alcunha}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                      onClick={() => requestAction('edit', item.id)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      EDITAR
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-destructive"
                      onClick={() => requestAction('delete', item.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      EXCLUIR
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Security Prompt */}
      <PasswordPrompt 
        open={promptOpen} 
        onOpenChange={setPromptOpen}
        onSuccess={onPasswordSuccess}
        actionName={pendingAction?.type === 'edit' ? 'Editar Registro' : 'Excluir Registro'}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Layout>
  );
}
