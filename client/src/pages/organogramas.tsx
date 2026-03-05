import { useState, useRef, useEffect, useMemo } from "react";
import Draggable from "react-draggable";
import { Layout } from "@/components/layout";
import { useCadastros, useCreateOrganograma, useUpdateOrganograma, useOrganogramas, useDeleteOrganograma } from "@/hooks/use-cadastros";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowRight, Type, Download, Save, User, Eye, FilePlus, FolderOpen, Loader2, ZoomIn, ZoomOut, Circle, Pencil, Maximize } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PasswordPrompt } from "@/components/password-prompt";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [zoom, setZoom] = useState(1);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  const personCount = useMemo(() => nodes.filter(n => n.type === 'person').length, [nodes]);

  const [cardWidth, setCardWidth] = useState(120);
  const [cardHeight, setCardHeight] = useState(200);

  // Dynamic scaling configuration
  const cardScale = useMemo(() => ({
    w: cardWidth,
    h: cardHeight,
    fontSize: cardWidth > 100 ? 'text-[9px]' : 'text-[7px]',
    labelSize: cardWidth > 100 ? 'text-[7px]' : 'text-[5px]'
  }), [cardWidth, cardHeight]);

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
      x: 50 + (nodes.length * 20), 
      y: 50 + (nodes.length * 20),
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
    await new Promise(r => setTimeout(r, 1500)); // Increased wait for layout/images

    try {
      const canvas = await html2canvas(canvasRef.current, { 
        useCORS: true,
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: true,
        width: canvasRef.current.scrollWidth,
        height: canvasRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          // Ensure all images are loaded in the clone
          const images = clonedDoc.getElementsByTagName('img');
          for (let i = 0; i < images.length; i++) {
            images[i].src = images[i].src; 
          }
        }
      });
      
      setZoom(originalZoom);
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;
      
      // Center on page
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
      
      if (viewOnly) {
        const blob = pdf.output('bloburl');
        const x = window.open();
        if (x) {
          x.document.open();
          x.document.write(`<iframe width='100%' height='100%' src='${blob}' style='border:none'></iframe>`);
          x.document.close();
        }
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
    const saveData = { nome: organogramaNome, data: { nodes, connections } };
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

  const getDimensions = (n: OrganogramaNode) => {
    if (n.type === 'text') return { w: 150, h: 60 };
    return cardScale;
  };

  const renderPersonCard = (node: OrganogramaNode) => {
    const isLarge = cardScale.w > 200;
    const isSmall = cardScale.w < 140;

    return (
      <Card 
        style={{ width: `${cardScale.w}px`, height: `${cardScale.h}px` }}
        className="bg-white border-2 border-slate-900 overflow-hidden shadow-2xl relative flex flex-col transition-all duration-300"
      >
        <div className="flex-1 bg-slate-100 border-b relative overflow-hidden">
          {node.data.imageUrl ? (
            <img src={node.data.imageUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <User className={isLarge ? "w-16 h-16 text-slate-200" : "w-8 h-8 text-slate-300"} />
            </div>
          )}
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg bg-white/90 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPerson(node.data);
            }}
          >
            <Eye className="h-3 w-3 text-blue-600" />
          </Button>
        </div>
        <div className={isLarge ? "p-4 space-y-2 bg-white" : "p-1.5 space-y-0.5 bg-white overflow-hidden"}>
          <p className={`${cardScale.fontSize} font-black uppercase leading-tight text-slate-900 break-words whitespace-pre-wrap`}>
            {node.data.nome}
          </p>
          <p className={`${cardScale.labelSize} italic uppercase text-slate-500 font-bold break-words whitespace-pre-wrap`}>
            {node.data.alcunha || 'SEM ALCUNHA'}
          </p>
          
          <div className={`mt-auto pt-0.5 border-t border-slate-100 flex flex-col gap-0.5 ${cardScale.labelSize} font-bold`}>
            <div className="flex justify-between items-center gap-1">
              <span className="text-slate-400 shrink-0">RG:</span>
              <span className="text-slate-700 truncate">{node.data.rg}</span>
            </div>
            {isLarge && (
              <div className="flex justify-between items-center gap-1">
                <span className="text-slate-400 shrink-0">ORCRIM:</span>
                <span className="text-blue-800 truncate">{node.data.orcrim}</span>
              </div>
            )}
            {isLarge && (
              <div className="flex justify-between items-center gap-1">
                <span className="text-slate-400 shrink-0">SITUAÇÃO:</span>
                <span className="text-red-600 truncate">{node.data.situacao}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Layout title="ORGANOGRAMAS">
      <div className="flex h-[calc(100vh-120px)] overflow-hidden">
        {/* Sidebar Esquerda Fixa */}
        <div className="w-72 bg-slate-50 border-r flex flex-col shadow-inner z-30">
          <div className="p-4 space-y-3 border-b bg-white">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Largura (px)</label>
                <Input 
                  type="number" 
                  value={cardWidth} 
                  onChange={(e) => setCardWidth(Number(e.target.value))}
                  className="h-8 text-[10px] font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Altura (px)</label>
                <Input 
                  type="number" 
                  value={cardHeight} 
                  onChange={(e) => setCardHeight(Number(e.target.value))}
                  className="h-8 text-[10px] font-bold"
                />
              </div>
            </div>
            <Input
              placeholder="NOME DO ORGANOGRAMA"
              value={organogramaNome}
              onChange={(e) => setOrganogramaNome(e.target.value.toUpperCase())}
              className="h-9 text-sm font-bold border-slate-300"
            />
            <div className="flex flex-col gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full bg-white text-blue-600 border-blue-100 h-9 font-bold">
                    <FolderOpen className="w-4 h-4 mr-1" /> ORGANOGRAMAS
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
                  {savedOrganogramas?.length === 0 ? (
                    <DropdownMenuItem disabled>Nenhum salvo</DropdownMenuItem>
                  ) : (
                    savedOrganogramas?.map((org: any) => (
                      <DropdownMenuItem 
                        key={org.id} 
                        onClick={() => handleOpen(org)}
                        className="flex flex-col items-start gap-0.5 cursor-pointer"
                      >
                        <span className="font-bold uppercase text-[10px]">{org.nome}</span>
                        <span className="text-[8px] text-slate-400">{new Date(org.createdAt).toLocaleDateString()}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full bg-white text-slate-700 border-slate-200 h-9 font-bold">
                    <User className="w-4 h-4 mr-1" /> INDIVÍDUOS
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
                  {cadastros?.map(p => (
                    <DropdownMenuItem 
                      key={p.id} 
                      className="flex items-center justify-between gap-2 p-2 cursor-default"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold truncate uppercase">{p.nome}</p>
                        <p className="text-[8px] text-slate-400 truncate uppercase">{p.alcunha || 'Sem vulgo'}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 text-blue-500"
                          onClick={() => setSelectedPerson(p)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 text-green-500"
                          onClick={() => addPerson(p)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={novoOrganograma} variant="outline" size="sm" className="w-full bg-white hover:bg-slate-50 text-slate-400 border-slate-100 h-9">
                <FilePlus className="w-4 h-4 mr-1" /> NOVO
              </Button>
            </div>
            <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-10 shadow-sm">
              <Save className="w-4 h-4 mr-2" /> SALVAR ORGANOGRAMA
            </Button>
            <div className="flex flex-col gap-2">
              <Button onClick={() => generatePDF(true)} variant="outline" className="w-full border-slate-300 text-slate-700 font-bold h-9 bg-white">
                <Eye className="w-4 h-4 mr-2" /> VISUALIZAR PDF
              </Button>
              <Button onClick={() => generatePDF(false)} className="w-full bg-slate-900 hover:bg-black text-white font-bold h-9">
                <Download className="w-4 h-4 mr-2" /> GERAR PDF (A4)
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
        <div className="flex-1 flex flex-col relative bg-slate-100 h-full w-full">
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
          </div>

          {/* Canvas Area Container */}
          <div className="flex-1 relative overflow-auto bg-slate-200 p-4">
            <div 
              ref={canvasRef}
              className="relative origin-top-left bg-white shadow-inner mx-auto landscape-container flex flex-wrap content-start justify-center p-12 gap-12"
              style={{ 
                backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                backgroundSize: '20px 20px',
                cursor: isAddingConnection ? 'crosshair' : 'default',
                transform: `scale(${zoom})`,
                width: '100%',
                minHeight: '100%',
                aspectRatio: '297/210' // landscape A4 ratio
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
                  
                  const d1 = from.type === 'person' ? cardScale : { w: 150, h: 60 };
                  const d2 = to.type === 'person' ? cardScale : { w: 150, h: 60 };

                  const c1 = { x: from.x + d1.w / 2, y: from.y + d1.h / 2 };
                  const c2 = { x: to.x + d2.w / 2, y: to.y + d2.h / 2 };

                  const dx = c2.x - c1.x;
                  const dy = c2.y - c1.y;
                  const angle = Math.atan2(dy, dx);
                  
                  // Calculate intersection with target node boundary
                  const targetW = d2.w / 2;
                  const targetH = d2.h / 2;
                  
                  let edgeX, edgeY;
                  const absTan = Math.abs(Math.tan(angle));
                  const boxTan = targetH / targetW;

                  if (absTan < boxTan) {
                    edgeX = targetW * Math.sign(dx);
                    edgeY = targetW * Math.abs(Math.tan(angle)) * Math.sign(dy);
                  } else {
                    edgeX = (targetH / Math.abs(Math.tan(angle))) * Math.sign(dx);
                    edgeY = targetH * Math.sign(dy);
                  }

                  const targetX = c2.x - edgeX;
                  const targetY = c2.y - edgeY;

                  return (
                    <g key={conn.id} className="pointer-events-auto cursor-pointer group/line" onClick={() => removeConnection(conn.id)}>
                      <line 
                        x1={c1.x} y1={c1.y}
                        x2={targetX} y2={targetY}
                        stroke="#ef4444"
                        strokeWidth="5"
                        markerEnd="url(#arrow)"
                        className="group-hover/line:stroke-red-700 transition-colors drop-shadow-xl"
                      />
                      <circle cx={(c1.x + targetX) / 2} cy={(c1.y + targetY) / 2} r="8" className="fill-red-600 opacity-0 group-hover/line:opacity-100 shadow-lg" />
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
                    {node.type === 'person' ? renderPersonCard(node) : (
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
      
      {/* Dialogs remain same... */}
      <Dialog open={openDialogOpen} onOpenChange={setOpenDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="uppercase tracking-tight font-bold">Gerenciar Organogramas</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-4 max-h-96 overflow-y-auto pr-2">
            {isLoadingList ? (<div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>) : 
            savedOrganogramas?.length === 0 ? (<p className="text-center text-slate-500 py-8 text-sm italic">Nenhum organograma encontrado.</p>) : (
              savedOrganogramas?.map((org: any) => (
                <div key={org.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all group">
                  <div className="flex-1 cursor-pointer" onClick={() => handleOpen(org)}>
                    <p className="font-bold text-sm uppercase text-slate-800 tracking-tight">{org.nome}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{new Date(org.createdAt).toLocaleString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDelete(org.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPerson} onOpenChange={() => setSelectedPerson(null)}>
        <DialogContent className="max-w-2xl bg-white border-none shadow-2xl">
          <DialogHeader><DialogTitle className="uppercase border-b pb-4 tracking-tighter text-xl font-black text-slate-900">Perfil Criminal Detalhado</DialogTitle></DialogHeader>
          {selectedPerson && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4">
              <div className="md:col-span-4">
                <div className="aspect-[3/4] bg-slate-50 rounded-2xl overflow-hidden border-4 border-slate-100 shadow-inner flex items-center justify-center">
                  {selectedPerson.imageUrl ? (<img src={selectedPerson.imageUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />) : (<User className="w-24 h-24 text-slate-200" />)}
                </div>
              </div>
              <div className="md:col-span-8 space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <DetailRow label="NOME COMPLETO" value={selectedPerson.nome} /><DetailRow label="ALCUNHA / VULGO" value={selectedPerson.alcunha} />
                  <div className="grid grid-cols-2 gap-4"><DetailRow label="RG" value={selectedPerson.rg} /><DetailRow label="CPF" value={selectedPerson.cpf} /></div>
                  <div className="grid grid-cols-2 gap-4"><DetailRow label="ORCRIM" value={selectedPerson.orcrim} /><DetailRow label="SITUAÇÃO" value={selectedPerson.situacao} /></div>
                  <DetailRow label="NOME DO PAI" value={selectedPerson.pai} /><DetailRow label="NOME DA MÃE" value={selectedPerson.mae} /><DetailRow label="ENDEREÇO" value={selectedPerson.endereco} />
                </div>
                <div className="pt-2">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">OBSERVAÇÕES E ANTECEDENTES</p>
                  <p className="text-[11px] p-4 bg-slate-50 rounded-xl border border-slate-100 uppercase italic leading-relaxed text-slate-700 shadow-inner min-h-[80px]">{selectedPerson.observacoes || 'NADA CONSTA'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PasswordPrompt 
        open={promptOpen} onOpenChange={setPromptOpen} 
        onSuccess={() => { if (pendingAction) pendingAction(); setPendingAction(null); }}
        actionName="Modificar Organograma"
      />
    </Layout>
  );
}
