import { useState, useRef, useEffect } from "react";
import Draggable from "react-draggable";
import { Layout } from "@/components/layout";
import { useCadastros, useCreateOrganograma, useUpdateOrganograma, useOrganogramas, useDeleteOrganograma } from "@/hooks/use-cadastros";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowRight, Type, Download, Save, User, Eye, FilePlus, FolderOpen, Loader2, ZoomIn, ZoomOut, Circle, Pencil } from "lucide-react";
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
  type: 'person' | 'text' | 'circle';
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
  const [zoom, setZoom] = useState(1);
  
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
    setNodes(prev => [...prev, newNode]);
    toast({ title: "Adicionado", description: `${person.nome} inserido no organograma.` });
  };

  const addText = () => {
    const newNode: OrganogramaNode = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 150,
      y: 150,
      data: { text: "NOVA CAIXA DE TEXTO" }
    };
    setNodes(prev => [...prev, newNode]);
  };

  const addCircle = () => {
    const newNode: OrganogramaNode = {
      id: `circle-${Date.now()}`,
      type: 'circle',
      x: 200,
      y: 200,
      data: {}
    };
    setNodes(prev => [...prev, newNode]);
  };

  const startConnection = (id: string) => {
    if (!isAddingConnection) return;
    if (!connectionStart) {
      setConnectionStart(id);
      toast({ title: "Conexão", description: "Selecione o segundo elemento para conectar." });
    } else if (connectionStart !== id) {
      setConnections(prev => [...prev, { id: `conn-${Date.now()}`, from: connectionStart, to: id }]);
      setConnectionStart(null);
      setIsAddingConnection(false);
      toast({ title: "Conectado", description: "Seta adicionada entre os elementos." });
    }
  };

  const removeNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
  };

  const removeConnection = (id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  const updateNodeText = (id: string, text: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, text: text.toUpperCase() } } : n));
  };

  const generatePDF = async (viewOnly = false) => {
    if (!canvasRef.current) return;
    
    const originalZoom = zoom;
    setZoom(1);
    await new Promise(r => setTimeout(r, 1000));

    try {
      const canvas = await html2canvas(canvasRef.current, { 
        useCORS: true,
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: true,
        windowWidth: 3000,
        windowHeight: 3000
      });
      
      setZoom(originalZoom);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight));
      
      if (viewOnly) {
        const blob = pdf.output('bloburl');
        window.open(blob, '_blank');
      } else {
        pdf.save(`${organogramaNome || 'organograma'}.pdf`);
      }
    } catch (err) {
      console.error(err);
      setZoom(originalZoom);
      toast({ title: "Erro", description: "Falha ao gerar PDF.", variant: "destructive" });
    }
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
      <div className="flex h-[calc(100vh-120px)] overflow-hidden">
        {/* Sidebar Esquerda Fixa */}
        <div className="w-72 bg-slate-50 border-r flex flex-col shadow-inner z-30">
          <div className="p-4 space-y-3 border-b bg-white">
            <Input
              placeholder="NOME DO ORGANOGRAMA"
              value={organogramaNome}
              onChange={(e) => setOrganogramaNome(e.target.value.toUpperCase())}
              className="h-9 text-sm font-bold border-slate-300"
            />
            <div className="flex flex-col gap-2">
              <Button onClick={novoOrganograma} variant="outline" size="sm" className="w-full bg-white hover:bg-slate-50 text-blue-600 border-blue-100 h-9">
                <FilePlus className="w-4 h-4 mr-1" /> NOVO
              </Button>
              <Button onClick={() => setOpenDialogOpen(true)} variant="outline" size="sm" className="w-full bg-white text-amber-600 border-amber-100 h-9">
                <Pencil className="w-4 h-4 mr-1" /> EDITAR
              </Button>
            </div>
            <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-10 shadow-sm">
              <Save className="w-4 h-4 mr-2" /> SALVAR ORGANOGRAMA
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <h3 className="font-bold text-[10px] mb-3 uppercase text-slate-400 tracking-widest border-b pb-1">Organogramas Salvos</h3>
              <div className="space-y-1.5">
                {isLoadingList ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin w-4 h-4 text-slate-300" /></div>
                ) : (
                  savedOrganogramas?.slice(0, 5).map((org: any) => (
                    <div key={org.id} onClick={() => handleOpen(org)} className="p-2 bg-white border border-slate-200 rounded cursor-pointer hover:border-blue-400 text-[10px] font-bold uppercase truncate transition-all">
                      {org.nome}
                    </div>
                  ))
                )}
                <Button variant="link" className="p-0 h-auto text-[10px] uppercase font-bold text-slate-500" onClick={() => setOpenDialogOpen(true)}>Ver todos...</Button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-[10px] mb-3 uppercase text-slate-400 tracking-widest border-b pb-1">Indivíduos no Banco</h3>
              <div className="space-y-2">
                {cadastros?.map(p => (
                  <div 
                    key={p.id} 
                    className="p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group flex justify-between items-center"
                    onClick={() => addPerson(p)}
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold truncate uppercase text-slate-800">{p.nome}</p>
                      <p className="text-[9px] text-slate-500 truncate uppercase">{p.alcunha || 'Sem Alcunha'}</p>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Área Principal */}
        <div className="flex-1 flex flex-col relative bg-slate-100">
          {/* Toolbar Superior */}
          <div className="h-14 bg-white border-b flex items-center px-4 gap-3 shadow-sm z-20">
            <div className="flex bg-slate-100 p-1 rounded-lg border gap-1">
              <Button onClick={addText} variant="ghost" size="sm" className="h-8 hover:bg-white hover:shadow-sm text-slate-600">
                <Type className="w-4 h-4 mr-1.5" /> TEXTO
              </Button>
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAddingConnection(!isAddingConnection);
                  setConnectionStart(null);
                }} 
                variant={isAddingConnection ? "secondary" : "ghost"} 
                size="sm"
                className={`h-8 ${isAddingConnection ? "bg-white shadow-sm" : "text-slate-600"}`}
              >
                <ArrowRight className="w-4 h-4 mr-1.5" /> SETA
              </Button>
              <Button onClick={addCircle} variant="ghost" size="sm" className="h-8 hover:bg-white hover:shadow-sm text-slate-600">
                <Circle className="w-4 h-4 mr-1.5" /> CÍRCULO
              </Button>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-2" />

            <div className="flex bg-slate-100 p-1 rounded-lg border gap-1">
              <Button onClick={() => setZoom(Math.min(zoom + 0.1, 2))} variant="ghost" size="icon" className="h-8 w-8 hover:bg-white">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <div className="flex items-center px-2 text-[10px] font-bold text-slate-500 w-12 justify-center">
                {Math.round(zoom * 100)}%
              </div>
              <Button onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))} variant="ghost" size="icon" className="h-8 w-8 hover:bg-white">
                <ZoomOut className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1" />
            
            <div className="flex gap-2">
              <Button onClick={() => generatePDF(true)} variant="outline" className="border-slate-300 text-slate-700 font-bold h-9">
                <Eye className="w-4 h-4 mr-2" /> VISUALIZAR PDF
              </Button>
              <Button onClick={() => generatePDF(false)} className="bg-slate-900 hover:bg-black text-white font-bold h-9">
                <Download className="w-4 h-4 mr-2" /> EXPORTAR PDF (A4)
              </Button>
            </div>
          </div>

          {/* Canvas Area Container */}
          <div className="flex-1 relative overflow-auto bg-slate-200">
            <div 
              ref={canvasRef}
              className="relative origin-top-left bg-white shadow-inner"
              style={{ 
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                backgroundSize: '20px 20px',
                cursor: isAddingConnection ? 'crosshair' : 'default',
                transform: `scale(${zoom})`,
                width: '3000px',
                height: '3000px',
              }}
              onClick={() => {
                if (isAddingConnection) {
                  setConnectionStart(null);
                  setIsAddingConnection(false);
                }
              }}
            >
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                <defs>
                  <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                    <path d="M0,0 L0,10 L10,5 z" fill="#ef4444" />
                  </marker>
                </defs>
                {connections.map((conn) => {
                  const from = nodes.find(n => n.id === conn.from);
                  const to = nodes.find(n => n.id === conn.to);
                  if (!from || !to) return null;
                  
                  const getCenter = (n: OrganogramaNode) => {
                    const w = n.type === 'person' ? 192 : n.type === 'text' ? 150 : 96;
                    const h = n.type === 'person' ? 220 : n.type === 'text' ? 60 : 96;
                    return { x: n.x + w/2, y: n.y + h/2 };
                  };

                  const c1 = getCenter(from);
                  const c2 = getCenter(to);

                  return (
                    <g key={conn.id} className="pointer-events-auto cursor-pointer group/line" onClick={() => removeConnection(conn.id)}>
                      <line 
                        x1={c1.x} y1={c1.y}
                        x2={c2.x} y2={c2.y}
                        stroke="#ef4444"
                        strokeWidth="5"
                        markerEnd="url(#arrow)"
                        className="group-hover/line:stroke-red-700 transition-colors drop-shadow-xl"
                      />
                      <circle cx={(c1.x+c2.x)/2} cy={(c1.y+c2.y)/2} r="8" className="fill-red-600 opacity-0 group-hover/line:opacity-100 shadow-lg" />
                    </g>
                  );
                })}
              </svg>

              {nodes.map(node => (
                <Draggable 
                  key={node.id}
                  position={{ x: node.x, y: node.y }}
                  scale={zoom}
                  onStop={(e, data) => {
                    setNodes(prev => prev.map(n => n.id === node.id ? { ...n, x: data.x, y: data.y } : n));
                  }}
                >
                  <div 
                    className={`absolute z-10 cursor-move group ${isAddingConnection ? 'ring-4 ring-blue-400 ring-offset-4 rounded-xl' : ''} ${connectionStart === node.id ? 'ring-4 ring-orange-400 ring-offset-4 rounded-xl' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startConnection(node.id);
                    }}
                  >
                    {node.type === 'person' ? (
                      <Card className="w-48 bg-white border-2 border-slate-900 overflow-hidden shadow-2xl relative">
                        <div className="h-32 bg-slate-100 border-b relative">
                          {node.data.imageUrl ? (
                            <img src={node.data.imageUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50"><User className="w-12 h-12 text-slate-300" /></div>
                          )}
                          <Button
                            size="icon"
                            variant="secondary"
                            className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg bg-white/90 hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPerson(node.data);
                            }}
                          >
                            <Eye className="h-5 w-5 text-blue-600" />
                          </Button>
                        </div>
                        <div className="p-3.5 space-y-1 bg-white">
                          <p className="text-[12px] font-bold truncate uppercase leading-tight text-slate-900">{node.data.nome}</p>
                          <p className="text-[10px] italic truncate uppercase text-slate-500 font-bold">{node.data.alcunha || 'SEM ALCUNHA'}</p>
                          <div className="pt-2 mt-2 border-t border-slate-100 flex flex-col gap-1 text-[9px] font-bold">
                            <div className="flex justify-between">
                              <span className="text-slate-400">RG:</span>
                              <span className="text-slate-700">{node.data.rg}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">ORCRIM:</span>
                              <span className="text-blue-800">{node.data.orcrim}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ) : node.type === 'text' ? (
                      <div className="bg-yellow-50 border-2 border-yellow-400 p-4 shadow-xl min-w-[150px] rounded-sm relative flex">
                        <textarea 
                          className="bg-transparent border-none resize-none w-full text-sm uppercase italic font-black focus:ring-0 p-0 text-slate-900 overflow-hidden"
                          value={node.data.text}
                          onChange={(e) => {
                            updateNodeText(node.id, e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          rows={1}
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 border-4 border-slate-900 rounded-full bg-white/20 shadow-xl backdrop-blur-sm" />
                    )}
                    <Button 
                      size="icon"
                      variant="destructive"
                      className="absolute -top-3 -right-3 h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg border-2 border-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNode(node.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Draggable>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* List Dialog */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-tight font-bold">Gerenciar Organogramas</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4 max-h-96 overflow-y-auto pr-2">
            {isLoadingList ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : savedOrganogramas?.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm italic">Nenhum organograma encontrado.</p>
            ) : (
              savedOrganogramas?.map((org: any) => (
                <div key={org.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all group">
                  <div className="flex-1 cursor-pointer" onClick={() => handleOpen(org)}>
                    <p className="font-bold text-sm uppercase text-slate-800 tracking-tight">{org.nome}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{new Date(org.createdAt).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDelete(org.id); }}>
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
        <DialogContent className="max-w-2xl bg-white border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="uppercase border-b pb-4 tracking-tighter text-xl font-black text-slate-900">Perfil Criminal Detalhado</DialogTitle>
          </DialogHeader>
          {selectedPerson && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4">
              <div className="md:col-span-4">
                <div className="aspect-[3/4] bg-slate-50 rounded-2xl overflow-hidden border-4 border-slate-100 shadow-inner flex items-center justify-center">
                  {selectedPerson.imageUrl ? (
                    <img src={selectedPerson.imageUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <User className="w-24 h-24 text-slate-200" />
                  )}
                </div>
              </div>
              <div className="md:col-span-8 space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <DetailRow label="NOME COMPLETO" value={selectedPerson.nome} />
                  <DetailRow label="ALCUNHA / VULGO" value={selectedPerson.alcunha} />
                  <div className="grid grid-cols-2 gap-4">
                    <DetailRow label="RG" value={selectedPerson.rg} />
                    <DetailRow label="CPF" value={selectedPerson.cpf} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailRow label="ORCRIM" value={selectedPerson.orcrim} />
                    <DetailRow label="SITUAÇÃO" value={selectedPerson.situacao} />
                  </div>
                  <DetailRow label="NOME DO PAI" value={selectedPerson.pai} />
                  <DetailRow label="NOME DA MÃE" value={selectedPerson.mae} />
                  <DetailRow label="ENDEREÇO" value={selectedPerson.endereco} />
                </div>
                <div className="pt-2">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">OBSERVAÇÕES E ANTECEDENTES</p>
                  <p className="text-[11px] p-4 bg-slate-50 rounded-xl border border-slate-100 uppercase italic leading-relaxed text-slate-700 shadow-inner min-h-[80px]">
                    {selectedPerson.observacoes || 'NADA CONSTA'}
                  </p>
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
