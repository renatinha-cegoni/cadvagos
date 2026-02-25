import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { PasswordPrompt } from "@/components/password-prompt";
import { useCadastros, useDeleteCadastro } from "@/hooks/use-cadastros";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Edit, Trash2, User, Database as DbIcon, X } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function BancoDeDados() {
  const [, setLocation] = useLocation();
  const { data: cadastros, isLoading } = useCadastros();
  const deleteMutation = useDeleteCadastro();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  // Security prompt state
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: 'edit' | 'delete', id: number} | null>(null);
  
  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);

  const filteredData = cadastros?.filter(c => {
    const term = searchTerm.toLowerCase();
    return c.nome.toLowerCase().includes(term) || (c.alcunha && c.alcunha.toLowerCase().includes(term));
  }).sort((a, b) => a.nome.localeCompare(b.nome)) || [];

  const requestAction = (type: 'edit' | 'delete', id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            placeholder="Buscar por Nome ou Alcunha..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 text-lg bg-slate-50 border-slate-200 focus:bg-white transition-colors"
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="divide-y">
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
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {filteredData.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedItem(item)}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200 overflow-hidden">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-slate-800 truncate uppercase group-hover:text-blue-700 underline-offset-4 decoration-blue-700 transition-all">
                        {item.nome}
                      </h3>
                      {item.alcunha && <p className="text-sm text-slate-500 font-medium truncate uppercase">VULGO: {item.alcunha}</p>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={(e) => requestAction('edit', item.id, e)}>
                      <Edit className="w-4 h-4 mr-2" /> EDITAR
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={(e) => requestAction('delete', item.id, e)}>
                      <Trash2 className="w-4 h-4 mr-2" /> EXCLUIR
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase border-b pb-2">Perfil do Indivíduo</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
              <div className="md:col-span-4">
                <div className="aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden border">
                  {selectedItem.imageUrl ? <img src={selectedItem.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User className="w-16 h-16" /></div>}
                </div>
              </div>
              <div className="md:col-span-8 space-y-3">
                <DetailRow label="NOME" value={selectedItem.nome} />
                <DetailRow label="ALCUNHA" value={selectedItem.alcunha} />
                <DetailRow label="DATA NASC." value={selectedItem.dataNascimento} />
                <DetailRow label="RG" value={selectedItem.rg} />
                <DetailRow label="CPF" value={selectedItem.cpf} />
                <DetailRow label="SITUAÇÃO" value={selectedItem.situacao} />
                <DetailRow label="ORCRIM" value={selectedItem.orcrim} />
                <DetailRow label="CÓD. PRESO" value={selectedItem.codigoPreso} />
                <DetailRow label="PAI" value={selectedItem.pai} />
                <DetailRow label="MÃE" value={selectedItem.mae} />
                <DetailRow label="ENDEREÇO" value={selectedItem.endereco} />
                <div className="pt-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">ANTECEDENTES (OC)</p>
                  <p className="text-sm p-2 bg-slate-50 rounded border uppercase italic">{selectedItem.antecedentes || 'NADA CONSTA'}</p>
                </div>
                <div className="pt-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">OBSERVAÇÕES</p>
                  <p className="text-sm p-2 bg-slate-50 rounded border uppercase italic">{selectedItem.observacoes || 'NENHUMA'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PasswordPrompt open={promptOpen} onOpenChange={setPromptOpen} onSuccess={onPasswordSuccess} actionName={pendingAction?.type === 'edit' ? 'Editar' : 'Excluir'} />
      
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function DetailRow({ label, value }: { label: string, value: string | null }) {
  return (
    <div className="flex border-b pb-1">
      <span className="w-24 text-[10px] font-bold text-slate-500 uppercase self-center">{label}</span>
      <span className="flex-1 text-sm uppercase italic font-medium">{value || '-'}</span>
    </div>
  );
}
