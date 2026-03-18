import { useState, useRef, useEffect, useMemo } from "react";
import Draggable from "react-draggable";
import { Layout } from "@/components/layout";
import { useCadastros, useCreateOrganograma, useUpdateOrganograma, useOrganogramas, useDeleteOrganograma } from "@/hooks/use-cadastros";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowRight, Type, Download, Save, User, Eye, FilePlus, FolderOpen, Loader2, ZoomIn, ZoomOut, Pencil, FileText, MapPin, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PasswordPrompt } from "@/components/password-prompt";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph as DocxParagraph, ImageRun } from "docx";
import { saveAs } from "file-saver";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  x1Override?: number;
  y1Override?: number;
  x2Override?: number;
  y2Override?: number;
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
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  const [dragHandle, setDragHandle] = useState<{ connId: string; which: 'start' | 'end' } | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [organogramaNome, setOrganogramaNome] = useState("");
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [cidadeFilter, setCidadeFilter] = useState<string>("TODAS AS CIDADES");
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const personCount = useMemo(() => nodes.filter(n => n.type === 'person').length, [nodes]);

  const cidades = useMemo(() => 
    Array.from(new Set((cadastros || []).map(c => c.cidade).filter(Boolean) as string[])).sort()
  , [cadastros]);

  const filteredCadastros = useMemo(() => {
    if (!cadastros) return [];
    if (cidadeFilter === "TODAS AS CIDADES") return cadastros;
    return cadastros.filter(c => c.cidade === cidadeFilter);
  }, [cadastros, cidadeFilter]);

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
    setSelectedConnId(null);
  };

  const updateNodeText = (id: string, text: string) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, text: text.toUpperCase() } } : n));
  };

  const updateNodeFontSize = (id: string, size: number) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, fontSize: size } } : n));
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragHandle || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    setConnections(prev => prev.map(c => {
      if (c.id !== dragHandle.connId) return c;
      if (dragHandle.which === 'start') return { ...c, x1Override: x, y1Override: y };
      return { ...c, x2Override: x, y2Override: y };
    }));
  };

  const handleSvgMouseUp = () => {
    setDragHandle(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnId) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
        removeConnection(selectedConnId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConnId]);

  const generatePDF = async () => {
    if (!canvasRef.current) return;
    
    const originalZoom = zoom;
    setZoom(1);
    await new Promise(r => setTimeout(r, 1500));

    // Auto-redimensionar todas as textareas para que o conteúdo apareça completo
    const textareas = canvasRef.current.querySelectorAll('textarea');
    textareas.forEach(ta => {
      (ta as HTMLTextAreaElement).style.height = 'auto';
      (ta as HTMLTextAreaElement).style.height = (ta as HTMLTextAreaElement).scrollHeight + 'px';
    });
    await new Promise(r => setTimeout(r, 100));

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
          const tas = clonedDoc.querySelectorAll('textarea');
          tas.forEach(ta => {
            (ta as HTMLTextAreaElement).style.height = 'auto';
            (ta as HTMLTextAreaElement).style.height = (ta as HTMLTextAreaElement).scrollHeight + 'px';
            (ta as HTMLTextAreaElement).style.overflow = 'visible';
          });
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
      
      const x = (pdfWidth - imgWidth) / 2;
      const y = (pdfHeight - imgHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(`${organogramaNome || 'organograma'}.pdf`);
    } catch (err) {
      console.error(err);
      setZoom(originalZoom);
      toast({ title: "Erro", description: "Falha ao gerar PDF.", variant: "destructive" });
    }
  };

  const generateWord = async () => {
    if (!canvasRef.current) return;

    const originalZoom = zoom;
    setZoom(1);
    await new Promise(r => setTimeout(r, 1500));

    try {
      const canvas = await html2canvas(canvasRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: true,
        width: canvasRef.current.scrollWidth,
        height: canvasRef.current.scrollHeight,
      });

      setZoom(originalZoom);

      const imgBlob: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b!), 'image/png'));
      const imgBuffer = await imgBlob.arrayBuffer();
      const imgUint8 = new Uint8Array(imgBuffer);

      const canvasW = canvas.width;
      const canvasH = canvas.height;
      const maxW = 700;
      const ratio = Math.min(maxW / canvasW, 520 / canvasH);
      const imgW = Math.round(canvasW * ratio);
      const imgH = Math.round(canvasH * ratio);

      const doc = new Document({
        sections: [{
          children: [
            new DocxParagraph({
              children: [
                new ImageRun({
                  data: imgUint8,
                  transformation: { width: imgW, height: imgH },
                  type: 'png',
                }),
              ],
            }),
          ],
        }],
      });

      const wordBlob = await Packer.toBlob(doc);
      saveAs(wordBlob, `${organogramaNome || 'organograma'}.docx`);
      toast({ title: "Sucesso", description: "Organograma exportado em Word." });
    } catch (err) {
      console.error(err);
      setZoom(originalZoom);
      toast({ title: "Erro", description: "Falha ao gerar Word.", variant: "destructive" });
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
    const labelSz = cardScale.w > 150 ? 'text-[7px]' : 'text-[5px]';
    const nameSz = cardScale.w > 150 ? 'text-[8px]' : 'text-[6px]';
    const photoH = Math.floor(cardScale.h * 0.58);

    return (
      <Card 
        style={{ width: `${cardScale.w}px`, height: `${cardScale.h}px` }}
        className="bg-white border-2 border-slate-900 overflow-hidden shadow-2xl relative flex flex-col"
      >
        <div 
          className="bg-slate-100 border-b relative overflow-hidden shrink-0"
          style={{ height: `${photoH}px` }}
        >
          {node.data.imageUrl ? (
            <img src={node.data.imageUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <User className="w-8 h-8 text-slate-300" />
            </div>
          )}
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-1 right-1 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg bg-white/90 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPerson(node.data);
            }}
          >
            <Eye className="h-2.5 w-2.5 text-blue-600" />
          </Button>
        </div>
        <div className="flex-1 p-1 space-y-0.5 bg-white overflow-hidden flex flex-col">
          <p className={`${nameSz} font-black uppercase leading-tight text-slate-900 break-words`}>
            {node.data.nome}
          </p>
          <p className={`${labelSz} italic uppercase text-slate-500 font-bold break-words`}>
            {node.data.alcunha || 'SEM ALCUNHA'}
          </p>
          <div className={`pt-0.5 border-t border-slate-100 flex flex-col gap-0.5 ${labelSz} font-bold`}>
            <div className="flex gap-0.5 leading-tight">
              <span className="text-slate-400 shrink-0">RG:</span>
              <span className="text-slate-700 break-all">{node.data.rg}</span>
            </div>
            <div className="flex gap-0.5 leading-tight">
              <span className="text-slate-400 shrink-0">ORCRIM:</span>
              <span className="text-blue-800 break-words">{node.data.orcrim}</span>
            </div>
            <div className="flex gap-0.5 leading-tight">
              <span className="text-slate-400 shrink-0">SIT.:</span>
              <span className="text-red-600 break-words">{node.data.situacao}</span>
            </div>
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
            {/* BOTÃO NOVO - BOTÃO SALVAR */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={novoOrganograma} variant="outline" size="sm" className="bg-white text-blue-600 border-blue-100 font-bold h-9">
                <FilePlus className="w-4 h-4 mr-1" /> NOVO
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold h-9">
                <Save className="w-4 h-4 mr-1" /> SALVAR
              </Button>
            </div>

            {/* NOME DO ORGANOGRAMA */}
            <Input
              placeholder="NOME DO ORGANOGRAMA"
              value={organogramaNome}
              onChange={(e) => setOrganogramaNome(e.target.value.toUpperCase())}
              className="h-9 text-sm font-bold border-slate-300"
            />

            {/* LARGURA - ALTURA */}
            <div className="grid grid-cols-2 gap-2">
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

            {/* ORGANOGRAMAS - INDIVÍDUOS */}
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

              {/* Filtro CIDADE */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full bg-white border-slate-200 h-9 font-bold justify-between">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {cidadeFilter.length > 18 ? cidadeFilter.slice(0,18)+'...' : cidadeFilter}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-64 overflow-y-auto">
                  <DropdownMenuItem onClick={() => setCidadeFilter("TODAS AS CIDADES")}>TODAS AS CIDADES</DropdownMenuItem>
                  {cidades.map(cidade => (
                    <DropdownMenuItem key={cidade} onClick={() => setCidadeFilter(cidade)}>{cidade}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full bg-white text-slate-700 border-slate-200 h-9 font-bold">
                    <User className="w-4 h-4 mr-1" /> INDIVÍDUOS ({filteredCadastros.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto">
                  {filteredCadastros.length === 0 ? (
                    <DropdownMenuItem disabled>Nenhum resultado</DropdownMenuItem>
                  ) : filteredCadastros.map(p => (
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
            </div>

            {/* GERAR PDF - GERAR WORD */}
            <div className="flex flex-col gap-2">
              <Button onClick={generatePDF} className="w-full bg-slate-900 hover:bg-black text-white font-bold h-9">
                <Download className="w-4 h-4 mr-2" /> GERAR PDF
              </Button>
              <Button onClick={generateWord} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-9">
                <FileText className="w-4 h-4 mr-2" /> GERAR WORD
              </Button>
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
              <svg 
                ref={svgRef}
                className="absolute inset-0 w-full h-full"
                style={{ zIndex: 5, pointerEvents: dragHandle ? 'all' : 'none' }}
                onMouseMove={handleSvgMouseMove}
                onMouseUp={handleSvgMouseUp}
                onClick={() => setSelectedConnId(null)}
              >
                <defs>
                  <marker id="arrowBlack" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                    <path d="M0,0 L0,10 L10,5 z" fill="#000000" />
                  </marker>
                  <marker id="arrowSelected" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                    <path d="M0,0 L0,10 L10,5 z" fill="#2563eb" />
                  </marker>
                </defs>
                {connections.map((conn) => {
                  const from = nodes.find(n => n.id === conn.from);
                  const to = nodes.find(n => n.id === conn.to);
                  if (!from || !to) return null;
                  
                  const d1 = from.type === 'person' ? cardScale : { w: 150, h: 60 };
                  const d2 = to.type === 'person' ? cardScale : { w: 150, h: 60 };

                  const c1raw = { x: from.x + d1.w / 2, y: from.y + d1.h / 2 };
                  const c2raw = { x: to.x + d2.w / 2, y: to.y + d2.h / 2 };

                  const dx = c2raw.x - c1raw.x;
                  const dy = c2raw.y - c1raw.y;
                  const angle = Math.atan2(dy, dx);
                  
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

                  const autoX1 = c1raw.x;
                  const autoY1 = c1raw.y;
                  const autoX2 = c2raw.x - edgeX;
                  const autoY2 = c2raw.y - edgeY;

                  const x1 = conn.x1Override !== undefined ? conn.x1Override : autoX1;
                  const y1 = conn.y1Override !== undefined ? conn.y1Override : autoY1;
                  const x2 = conn.x2Override !== undefined ? conn.x2Override : autoX2;
                  const y2 = conn.y2Override !== undefined ? conn.y2Override : autoY2;

                  const isSelected = selectedConnId === conn.id;
                  const midX = (x1 + x2) / 2;
                  const midY = (y1 + y2) / 2;

                  return (
                    <g key={conn.id} style={{ pointerEvents: 'all' }}>
                      {/* Linha invisível mais grossa para facilitar o clique */}
                      <line 
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="transparent"
                        strokeWidth="12"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); setSelectedConnId(isSelected ? null : conn.id); }}
                      />
                      {/* Linha visível */}
                      <line 
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={isSelected ? "#2563eb" : "#000000"}
                        strokeWidth={isSelected ? 2.5 : 2}
                        markerEnd={isSelected ? "url(#arrowSelected)" : "url(#arrowBlack)"}
                        style={{ pointerEvents: 'none' }}
                      />
                      {/* Handles quando selecionada */}
                      {isSelected && (
                        <>
                          <circle cx={x1} cy={y1} r="8" fill="#2563eb" stroke="white" strokeWidth="2"
                            style={{ cursor: 'move', pointerEvents: 'all' }}
                            onMouseDown={(e) => { e.stopPropagation(); setDragHandle({ connId: conn.id, which: 'start' }); }}
                          />
                          <circle cx={x2} cy={y2} r="8" fill="#2563eb" stroke="white" strokeWidth="2"
                            style={{ cursor: 'move', pointerEvents: 'all' }}
                            onMouseDown={(e) => { e.stopPropagation(); setDragHandle({ connId: conn.id, which: 'end' }); }}
                          />
                          {/* Botão X para deletar */}
                          <g
                            style={{ cursor: 'pointer', pointerEvents: 'all' }}
                            onClick={(e) => { e.stopPropagation(); removeConnection(conn.id); }}
                          >
                            <circle cx={midX} cy={midY} r="11" fill="#ef4444" stroke="white" strokeWidth="2" />
                            <text x={midX} y={midY + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" style={{ userSelect: 'none' }}>×</text>
                          </g>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>

              {nodes.map(node => (
                <Draggable 
                  key={node.id}
                  position={{ x: node.x, y: node.y }}
                  scale={zoom}
                  disabled={isAddingConnection}
                  onStop={(e, data) => {
                    setNodes(prev => prev.map(n => n.id === node.id ? { ...n, x: data.x, y: data.y } : n));
                  }}
                >
                  <div 
                    className={`absolute z-10 ${isAddingConnection ? 'cursor-pointer' : 'cursor-move'} group ${isAddingConnection ? 'ring-4 ring-blue-400 ring-offset-4 rounded-xl' : ''} ${connectionStart === node.id ? 'ring-4 ring-orange-400 ring-offset-4 rounded-xl' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startConnection(node.id);
                    }}
                  >
                    {node.type === 'person' ? renderPersonCard(node) : (
                      <div style={{ width: `${cardScale.w}px` }} className="bg-yellow-50 border-2 border-yellow-400 shadow-xl rounded-sm relative flex flex-col">
                        {/* Controle de tamanho de fonte */}
                        <div 
                          className="flex items-center gap-1 px-1.5 pt-1 pb-0.5 border-b border-yellow-300"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <span className="text-[8px] text-yellow-700 font-bold shrink-0">Pt:</span>
                          <input
                            type="number"
                            value={node.data.fontSize || 12}
                            onChange={(e) => updateNodeFontSize(node.id, Number(e.target.value))}
                            className="w-10 text-[8px] bg-yellow-100 border border-yellow-300 rounded text-center outline-none font-bold"
                            min={6}
                            max={72}
                          />
                        </div>
                        <textarea 
                          className="bg-transparent border-none resize-none w-full uppercase italic font-black focus:ring-0 p-1.5 text-slate-900 overflow-hidden break-words"
                          style={{ 
                            wordWrap: 'break-word', 
                            whiteSpace: 'pre-wrap',
                            fontSize: `${node.data.fontSize || 12}px`
                          }}
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
                          rows={2}
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
