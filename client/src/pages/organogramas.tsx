import { useState, useRef, useEffect } from "react";
import Draggable from "react-draggable";
import { Layout } from "@/components/layout";
import { useCadastros } from "@/hooks/use-cadastros";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowRight, Type, Download, Save, MousePointer2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PasswordPrompt } from "@/components/password-prompt";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface OrganogramaNode {
  id: string;
  type: 'person' | 'text';
  x: number;
  y: number;
  data: any;
}

interface Connection {
  from: string;
  to: string;
}

export default function Organogramas() {
  const { data: cadastros } = useCadastros();
  const { toast } = useToast();
  const [nodes, setNodes] = useState<OrganogramaNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

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
      toast({ title: "Conexão", description: "Selecione o destino" });
    } else if (connectionStart !== id) {
      setConnections([...connections, { from: connectionStart, to: id }]);
      setConnectionStart(null);
      setIsAddingConnection(false);
    }
  };

  const exportPDF = async () => {
    if (!canvasRef.current) return;
    const canvas = await html2canvas(canvasRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    pdf.addImage(imgData, 'PNG', 10, 10, 280, 190);
    pdf.save('organograma.pdf');
  };

  const handleSecurityCheck = (action: () => void) => {
    setPendingAction(() => action);
    setPromptOpen(true);
  };

  return (
    <Layout title="ORGANOGRAMAS">
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Toolbar */}
        <div className="flex gap-2 p-2 bg-slate-100 border-b">
          <Button onClick={addText} variant="outline" size="sm">
            <Type className="w-4 h-4 mr-2" /> TEXTO
          </Button>
          <Button 
            onClick={() => setIsAddingConnection(!isAddingConnection)} 
            variant={isAddingConnection ? "default" : "outline"} 
            size="sm"
          >
            <ArrowRight className="w-4 h-4 mr-2" /> CONECTAR
          </Button>
          <div className="flex-1" />
          <Button onClick={exportPDF} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" /> EXPORTAR PDF
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Person List */}
          <div className="w-64 bg-slate-50 border-r p-4 overflow-y-auto">
            <h3 className="font-bold text-sm mb-4 uppercase">Banco de Dados</h3>
            <div className="space-y-2">
              {cadastros?.map(p => (
                <div 
                  key={p.id} 
                  className="p-2 bg-white border rounded cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => addPerson(p)}
                >
                  <p className="text-xs font-bold truncate uppercase">{p.nome}</p>
                  <p className="text-[10px] text-slate-500 truncate uppercase">{p.alcunha || 'Sem Alcunha'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas Area */}
          <div 
            ref={canvasRef}
            className="flex-1 relative bg-slate-200 overflow-auto p-20"
            style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          >
            {nodes.map(node => (
              <Draggable 
                key={node.id}
                defaultPosition={{ x: node.x, y: node.y }}
                bounds="parent"
                onStop={(e, data) => {
                  setNodes(nodes.map(n => n.id === node.id ? { ...n, x: data.x, y: data.y } : n));
                }}
              >
                <div 
                  className={`absolute z-10 cursor-move ${isAddingConnection ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => startConnection(node.id)}
                >
                  {node.type === 'person' ? (
                    <Card className="w-40 bg-white border-2 border-slate-800 overflow-hidden shadow-lg">
                      <div className="h-24 bg-slate-100 border-b relative">
                        {node.data.imageUrl ? (
                          <img src={node.data.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><User className="text-slate-300" /></div>
                        )}
                      </div>
                      <div className="p-2 space-y-1">
                        <p className="text-[10px] font-bold truncate uppercase leading-tight">{node.data.nome}</p>
                        <p className="text-[8px] italic truncate uppercase text-slate-500">{node.data.alcunha}</p>
                        <div className="pt-1 border-t border-slate-100 flex justify-between text-[7px] font-mono">
                          <span>RG: {node.data.rg}</span>
                          <span className="text-blue-600 font-bold">{node.data.orcrim}</span>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div className="bg-yellow-50 border-2 border-yellow-200 p-2 shadow-sm min-w-[100px]">
                      <textarea 
                        className="bg-transparent border-none resize-none w-full text-xs uppercase italic focus:ring-0 p-0"
                        defaultValue={node.data.text}
                      />
                    </div>
                  )}
                  <button 
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                    onClick={() => setNodes(nodes.filter(n => n.id !== node.id))}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </Draggable>
            ))}
            
            {/* SVG Layer for Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 2000, minHeight: 2000 }}>
              <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                  <path d="M0,0 L0,10 L10,5 z" fill="#64748b" />
                </marker>
              </defs>
              {connections.map((conn, i) => {
                const from = nodes.find(n => n.id === conn.from);
                const to = nodes.find(n => n.id === conn.to);
                if (!from || !to) return null;
                return (
                  <line 
                    key={i}
                    x1={from.x + 80} y1={from.y + 60}
                    x2={to.x + 80} y2={to.y + 60}
                    stroke="#64748b"
                    strokeWidth="2"
                    markerEnd="url(#arrow)"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </div>
      
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
