import { useState, useRef, useEffect } from "react";
import Draggable from "react-draggable";
import { Layout } from "@/components/layout";
import { useCadastros, useCreateOrganograma, useUpdateOrganograma, useOrganogramas, useDeleteOrganograma } from "@/hooks/use-cadastros";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowRight, Type, Download, Save, MousePointer2, User, Eye, FilePlus, FolderOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PasswordPrompt } from "@/components/password-prompt";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OrganogramaNode {
  id: string;
  type: 'person' | 'text';
  x: number;
  y: number;
  data: any;
}

interface Connection {
  id: string;
  from: string;
  to: string;
}

function DetailRow({ label, value }: { label: string, value: string | null }) {
  return (
    <div className="flex border-b border-slate-100 py-1">
      <span className="w-20 text-[9px] font-bold text-slate-400 uppercase self-center">{label}</span>
      <span className="flex-1 text-xs uppercase italic font-medium">{value || '-'}</span>
    </div>
  );
}

export default function Organogramas() {
  const { data: cadastros } = useCadastros();
  const { data: savedOrganogramas, isLoading: isLoadingList } = useOrganogramas();
  const createMutation = useCreateOrganograma();
  const updateMutation = useUpdateOrganograma();
  const deleteMutation = useDeleteOrganograma();
  
  const { toast } = useToast();
  const [nodes, setNodes] = useState<OrganogramaNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [organogramaNome, setOrganogramaNome] = useState("");
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  const novoOrganograma = () => {
    setNodes([]);
    setConnections([]);
    setOrganogramaNome("");
    setCurrentId(null);
    toast({ title: "Novo Organograma", description: "Área de trabalho limpa." });
  };

  const addPerson = (person: any) => {
    const newNode: OrganogramaNode = {
      id: `person-${person.id}-${Date.now()}`,
      type: 'person',
      x: 100,
      y: 100,
      data: person
    };
    setNodes([...nodes, newNode]);
  };

  const addText = () => {
    const newNode: OrganogramaNode = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 150,
      y: 150,
      data: { text: "Nova Caixa de Texto" }
    };
    setNodes([...nodes, newNode]);
  };

  const startConnection = (id: string) => {
    if (!isAddingConnection) return;
    if (!connectionStart) {
      setConnectionStart(id);
      toast({ title: "Conexão", description: "Selecione o segundo elemento para conectar." });
    } else if (connectionStart !== id) {
      setConnections([...connections, { id: `conn-${Date.now()}`, from: connectionStart, to: id }]);
      setConnectionStart(null);
      setIsAddingConnection(false);
      toast({ title: "Conectado", description: "Seta adicionada entre os elementos." });
    }
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    setConnections(connections.filter(c => c.from !== id && c.to !== id));
  };

  const removeConnection = (id: string) => {
    setConnections(connections.filter(c => c.id !== id));
  };

  const exportPDF = async () => {
    if (!canvasRef.current) return;
    const canvas = await html2canvas(canvasRef.current, { useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    pdf.addImage(imgData, 'PNG', 10, 10, 280, 190);
    pdf.save(`${organogramaNome || 'organograma'}.pdf`);
  };

  const handleSave = () => {
    if (!organogramaNome) {
      toast({ title: "Erro", description: "Insira um nome para o organograma.", variant: "destructive" });
      return;
    }
    
    const saveData = {
      nome: organogramaNome,
      data: { nodes, connections }
    };

    if (currentId) {
      updateMutation.mutate({ id: currentId, ...saveData }, {
        onSuccess: () => toast({ title: "Sucesso", description: "Organograma atualizado." })
      });
    } else {
      createMutation.mutate(saveData, {
        onSuccess: (data) => {
          setCurrentId(data.id);
          toast({ title: "Sucesso", description: "Organograma salvo com sucesso." });
        }
      });
    }
  };

  const handleOpen = (org: any) => {
    handleSecurityCheck(() => {
      setNodes(org.data.nodes || []);
      setConnections(org.data.connections || []);
      setOrganogramaNome(org.nome);
      setCurrentId(org.id);
      setOpenDialogOpen(false);
      toast({ title: "Carregado", description: `Organograma "${org.nome}" aberto.` });
    });
  };

  const handleDelete = (id: number) => {
    handleSecurityCheck(() => {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          if (currentId === id) novoOrganograma();
          toast({ title: "Excluído", description: "Organograma removido do sistema." });
        }
      });
    });
  };

  const handleSecurityCheck = (action: () => void) => {
    setPendingAction(() => action);
    setPromptOpen(true);
  };

  return (
    <Layout title="ORGANOGRAMAS">
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 p-3 bg-slate-100 border-b items-center shadow-sm">
          <Input
            placeholder="NOME DO ORGANOGRAMA"
            value={organogramaNome}
            onChange={(e) => setOrganogramaNome(e.target.value.toUpperCase())}
            className="w-64 h-9 text-sm font-bold bg-white"
          />
          <div className="w-px h-6 bg-slate-300 mx-1" />
          <Button onClick={novoOrganograma} variant="outline" size="sm" className="bg-white hover:bg-slate-50">
            <FilePlus className="w-4 h-4 mr-1 text-blue-600" /> NOVO
          </Button>
          <Button onClick={() => setOpenDialogOpen(true)} variant="outline" size="sm" className="bg-white">
            <FolderOpen className="w-4 h-4 mr-1 text-amber-600" /> ABRIR
          </Button>
          <Button onClick={handleSave} variant="outline" size="sm" className="bg-white border-green-200 hover:bg-green-50 text-green-700">
            <Save className="w-4 h-4 mr-1" /> SALVAR
          </Button>
          
          <div className="w-px h-6 bg-slate-300 mx-1" />
          <Button onClick={addText} variant="outline" size="sm" className="bg-white">
            <Type className="w-4 h-4 mr-1 text-slate-600" /> TEXTO
          </Button>
          <Button 
            onClick={() => setIsAddingConnection(!isAddingConnection)} 
            variant={isAddingConnection ? "default" : "outline"} 
            size="sm"
            className={!isAddingConnection ? "bg-white" : ""}
          >
            <ArrowRight className="w-4 h-4 mr-1" /> CONECTAR
          </Button>
          <div className="flex-1" />
          <Button onClick={exportPDF} variant="outline" size="sm" className="bg-white border-red-200 text-red-700 hover:bg-red-50">
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Person List */}
          <div className="w-72 bg-slate-50 border-r p-4 overflow-y-auto">
            <h3 className="font-bold text-xs mb-4 uppercase text-slate-500 tracking-wider">Banco de Dados</h3>
            <div className="space-y-2">
              {cadastros?.map(p => (
                <div 
                  key={p.id} 
                  className="p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group flex justify-between items-center"
                  onClick={() => addPerson(p)}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate uppercase text-slate-800">{p.nome}</p>
                    <p className="text-[10px] text-slate-500 truncate uppercase">{p.alcunha || 'Sem Alcunha'}</p>
                  </div>
                  <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Canvas Area */}
          <div 
            ref={canvasRef}
            className="flex-1 relative bg-slate-200 overflow-auto p-40"
            style={{ 
              backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
              backgroundSize: '30px 30px',
              cursor: isAddingConnection ? 'crosshair' : 'default'
            }}
          >
            {nodes.map(node => (
              <Draggable 
                key={node.id}
                defaultPosition={{ x: node.x, y: node.y }}
                onStop={(e, data) => {
                  setNodes(nodes.map(n => n.id === node.id ? { ...n, x: data.x, y: data.y } : n));
                }}
              >
                <div 
                  className={`absolute z-10 cursor-move group ${isAddingConnection ? 'ring-4 ring-blue-400 ring-offset-2 rounded-xl' : ''} ${connectionStart === node.id ? 'ring-4 ring-orange-400 ring-offset-2' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    startConnection(node.id);
                  }}
                >
                  {node.type === 'person' ? (
                    <Card className="w-44 bg-white border-2 border-slate-900 overflow-hidden shadow-2xl relative">
                      <div className="h-28 bg-slate-100 border-b relative">
                        {node.data.imageUrl ? (
                          <img src={node.data.imageUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-50"><User className="w-10 h-10 text-slate-300" /></div>
                        )}
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute top-1 right-1 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg bg-white/90 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPerson(node.data);
                          }}
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>
                      <div className="p-3 space-y-1 bg-white">
                        <p className="text-[11px] font-bold truncate uppercase leading-tight text-slate-900">{node.data.nome}</p>
                        <p className="text-[9px] italic truncate uppercase text-slate-500 font-medium">{node.data.alcunha || 'SEM ALCUNHA'}</p>
                        <div className="pt-2 mt-1 border-t border-slate-100 flex flex-col gap-0.5 text-[8px] font-bold">
                          <div className="flex justify-between">
                            <span className="text-slate-400">RG:</span>
                            <span>{node.data.rg}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">ORCRIM:</span>
                            <span className="text-blue-700">{node.data.orcrim}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div className="bg-yellow-50 border-2 border-yellow-300 p-3 shadow-xl min-w-[120px] rounded-sm relative">
                      <textarea 
                        className="bg-transparent border-none resize-none w-full text-xs uppercase italic font-bold focus:ring-0 p-0 text-slate-800"
                        defaultValue={node.data.text}
                        rows={2}
                      />
                    </div>
                  )}
                  <Button 
                    size="icon"
                    variant="destructive"
                    className="absolute -top-3 -right-3 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg border-2 border-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNode(node.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Draggable>
            ))}
            
            {/* SVG Layer for Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 3000, minHeight: 3000 }}>
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                  <path d="M0,0 L0,10 L10,5 z" fill="#ef4444" />
                </marker>
              </defs>
              {connections.map((conn) => {
                const from = nodes.find(n => n.id === conn.from);
                const to = nodes.find(n => n.id === conn.to);
                if (!from || !to) return null;
                
                // Connection calculation
                const x1 = from.x + 88;
                const y1 = from.y + (from.type === 'person' ? 150 : 45);
                const x2 = to.x + 88;
                const y2 = to.y - 10;

                return (
                  <g key={conn.id} className="pointer-events-auto cursor-pointer group/line" onClick={() => removeConnection(conn.id)}>
                    <title>Clique para excluir conexão</title>
                    <line 
                      x1={x1} y1={y1}
                      x2={x2} y2={y2}
                      stroke="#ef4444"
                      strokeWidth="4"
                      markerEnd="url(#arrow)"
                      className="group-hover/line:stroke-red-700 transition-colors drop-shadow-md"
                    />
                    <circle cx={(x1+x2)/2} cy={(y1+y2)/2} r="6" className="fill-red-600 opacity-0 group-hover/line:opacity-100" />
                    <text x={(x1+x2)/2} y={(y1+y2)/2 - 10} className="text-[10px] fill-red-700 font-bold opacity-0 group-hover/line:opacity-100 uppercase" textAnchor="middle">Remover</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
      
      {/* List Dialog */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-tight">Organogramas Salvos</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4 max-h-96 overflow-y-auto">
            {isLoadingList ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : savedOrganogramas?.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm">Nenhum organograma encontrado.</p>
            ) : (
              savedOrganogramas?.map((org: any) => (
                <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors group">
                  <div className="flex-1 cursor-pointer" onClick={() => handleOpen(org)}>
                    <p className="font-bold text-sm uppercase text-slate-800">{org.nome}</p>
                    <p className="text-[10px] text-slate-400">{new Date(org.createdAt).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(org.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Person Detail Dialog */}
      <Dialog open={!!selectedPerson} onOpenChange={() => setSelectedPerson(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="uppercase border-b pb-2 tracking-tight">Perfil Detalhado</DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4">
              <div className="md:col-span-4">
                <div className="aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner">
                  {selectedPerson.imageUrl ? (
                    <img src={selectedPerson.imageUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50"><User className="w-20 h-20 opacity-20" /></div>
                  )}
                </div>
              </div>
              <div className="md:col-span-8 space-y-3">
                <DetailRow label="NOME" value={selectedPerson.nome} />
                <DetailRow label="ALCUNHA" value={selectedPerson.alcunha} />
                <DetailRow label="RG" value={selectedPerson.rg} />
                <DetailRow label="CPF" value={selectedPerson.cpf} />
                <DetailRow label="ORCRIM" value={selectedPerson.orcrim} />
                <DetailRow label="SITUAÇÃO" value={selectedPerson.situacao} />
                <DetailRow label="PAI" value={selectedPerson.pai} />
                <DetailRow label="MÃE" value={selectedPerson.mae} />
                <DetailRow label="ENDEREÇO" value={selectedPerson.endereco} />
                <div className="pt-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">OBSERVAÇÕES</p>
                  <p className="text-xs p-3 bg-slate-50 rounded-lg border border-slate-100 uppercase italic leading-relaxed text-slate-600 mt-1">{selectedPerson.observacoes || 'NENHUMA OBSERVAÇÃO REGISTRADA'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PasswordPrompt 
        open={promptOpen} 
        onOpenChange={setPromptOpen} 
        onSuccess={() => {
          if (pendingAction) pendingAction();
          setPendingAction(null);
        }}
        actionName="Modificar Organograma"
      />
    </Layout>
  );
}
