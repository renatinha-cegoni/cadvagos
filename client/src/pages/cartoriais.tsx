import { useState, useRef } from "react";
import { Layout } from "@/components/layout";
import { useCadastros } from "@/hooks/use-cadastros";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, FileDown, FileText, UserX, Image as ImageIcon } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun } from "docx";
import { saveAs } from "file-saver";

// User-provided reference image
import tableRef from "@assets/image_1772032687674.png";

export default function Cartoriais() {
  const { data: cadastros, isLoading } = useCadastros();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showReference, setShowReference] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);

  const filteredData = cadastros?.filter(c => {
    const term = searchTerm.toLowerCase();
    return c.nome.toLowerCase().includes(term) || (c.alcunha && c.alcunha.toLowerCase().includes(term));
  }).sort((a, b) => a.nome.localeCompare(b.nome)) || [];

  const selectedData = cadastros?.filter(c => selectedIds.has(c.id)) || [];

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(newSet => {
        filteredData.forEach(item => newSet.delete(item.id));
        return new Set(newSet);
      });
    } else {
      setSelectedIds(newSet => {
        filteredData.forEach(item => newSet.add(item.id));
        return new Set(newSet);
      });
    }
  };

  // --- PDF EXPORT ---
  const exportPDF = async () => {
    if (!reportRef.current || selectedData.length === 0) return;
    
    try {
      // Temporarily ensure the element is visible and properly sized for canvas capture
      const originalStyle = reportRef.current.style.cssText;
      reportRef.current.style.width = '210mm'; // A4 width approx
      reportRef.current.style.display = 'block';
      
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Higher quality
        useCORS: true, // For images
        logging: false
      });
      
      reportRef.current.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('relatorio_cartorial.pdf');
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Erro ao gerar PDF. Verifique se as imagens estão acessíveis.");
    }
  };

  // --- DOCX EXPORT (Simplified programmatic structure mimicking the layout) ---
  const exportWord = async () => {
    if (selectedData.length === 0) return;

    try {
      const docChildren: any[] = [];

      for (const item of selectedData) {
        // Create table for each item
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
            left: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
            right: { style: BorderStyle.SINGLE, size: 2, color: "000000" },
          },
          rows: [
            new TableRow({
              children: [
                // Left column: Photo placeholder (Word requires actual image buffers, so we put text placeholder if no image buffer is available synchronously. For full image support in Word from URLs, we'd need to fetch them as arraybuffers first. Doing text placeholder for simplicity unless robust fetch is implemented).
                new TableCell({
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  borders: { right: { style: BorderStyle.SINGLE, size: 2, color: "000000" } },
                  children: [
                    new Paragraph({ text: "[ FOTO ]", alignment: "center" })
                  ]
                }),
                // Right column: Data
                new TableCell({
                  width: { size: 70, type: WidthType.PERCENTAGE },
                  margins: { left: 100, right: 100, top: 100, bottom: 100 },
                  children: [
                    createDataParagraph("NOME: ", item.nome),
                    createDataParagraph("ALCUNHA: ", item.alcunha),
                    createDataParagraph("RG: ", item.rg),
                    createDataParagraph("CPF: ", item.cpf),
                    createDataParagraph("DN: ", item.dataNascimento),
                    createDataParagraph("CD: ", item.codigoPreso),
                    createDataParagraph("ORCRIM: ", item.orcrim),
                    createDataParagraph("SITUAÇÃO: ", item.situacao),
                    createDataParagraph("FILIAÇÃO: ", `${item.pai || ''} / ${item.mae || ''}`),
                    createDataParagraph("END.: ", item.endereco),
                    createDataParagraph("OC.: ", item.antecedentes),
                    createDataParagraph("OBS.: ", item.observacoes),
                  ]
                })
              ]
            })
          ]
        });

        docChildren.push(table);
        // Add spacing between tables
        docChildren.push(new Paragraph({ text: "" }));
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: docChildren
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "relatorio_cartorial.docx");

    } catch (error) {
      console.error("Error generating Word:", error);
      alert("Erro ao gerar documento Word.");
    }
  };

  const createDataParagraph = (label: string, value: string | null) => {
    return new Paragraph({
      children: [
        new TextRun({ text: label, bold: true, font: "Times New Roman", size: 18 }), // 18 half-points = 9pt
        new TextRun({ text: value || "", italics: true, font: "Times New Roman", size: 18 }),
      ]
    });
  };

  return (
    <Layout title="RELATÓRIOS CARTORIAIS">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Selection Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 uppercase">1. Selecionar Indivíduos</h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            <div className="flex items-center space-x-2 mb-4 pb-4 border-b border-slate-200">
              <Checkbox 
                id="select-all" 
                checked={filteredData.length > 0 && selectedIds.size === filteredData.length}
                onCheckedChange={toggleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Selecionar Todos
              </label>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {isLoading ? (
                <p className="text-sm text-slate-500 text-center py-4">Carregando...</p>
              ) : filteredData.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum registro.</p>
              ) : (
                filteredData.map(item => (
                  <div key={item.id} className="flex items-start space-x-3 p-2 hover:bg-white rounded-md transition-colors">
                    <Checkbox 
                      id={`check-${item.id}`} 
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      className="mt-1"
                    />
                    <label htmlFor={`check-${item.id}`} className="text-sm cursor-pointer flex-1">
                      <span className="font-bold uppercase block">{item.nome}</span>
                      {item.alcunha && <span className="text-xs text-slate-500 uppercase block">Vulgo: {item.alcunha}</span>}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4 uppercase">2. Opções</h3>
             <Button 
                variant="outline" 
                className="w-full mb-4"
                onClick={() => setShowReference(!showReference)}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                {showReference ? "Ocultar Referência" : "Ver Imagem de Referência"}
              </Button>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 uppercase">3. Exportar</h3>
            <div className="space-y-3">
              <Button 
                className="w-full bg-red-600 hover:bg-red-700" 
                disabled={selectedIds.size === 0}
                onClick={exportPDF}
              >
                <FileDown className="w-4 h-4 mr-2" />
                GERAR PDF
              </Button>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={selectedIds.size === 0}
                onClick={exportWord}
              >
                <FileText className="w-4 h-4 mr-2" />
                GERAR WORD (.docx)
              </Button>
              {selectedIds.size === 0 && (
                <p className="text-xs text-center text-slate-500">Selecione ao menos um registro para exportar.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Preview Panel */}
        <div className="lg:col-span-8">
          <div className="bg-slate-200/50 p-6 rounded-xl border border-slate-300 min-h-[600px] flex justify-center overflow-x-auto">
            
            {showReference ? (
              <div className="bg-white p-4 shadow-xl">
                <img src={tableRef} alt="Referência Visual" className="max-w-full h-auto" />
              </div>
            ) : selectedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 h-full">
                <FileText className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Pré-visualização do Relatório</p>
                <p className="text-sm">Selecione registros ao lado para visualizar.</p>
              </div>
            ) : (
              // This container is what html2canvas will capture
              <div 
                ref={reportRef} 
                className="bg-white shadow-xl p-8 space-y-6 w-full max-w-[210mm] mx-auto"
                style={{ backgroundColor: 'white' }}
              >
                {selectedData.map((item, index) => (
                  <div key={item.id} className="border-2 border-black flex break-inside-avoid">
                    {/* Left Column: Photo */}
                    <div className="w-[30%] border-r-2 border-black p-2 flex items-center justify-center bg-gray-50/50">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="Foto" className="max-w-full max-h-[200px] object-contain border border-gray-300" crossOrigin="anonymous" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 py-10">
                          <UserX className="w-12 h-12 mb-2" />
                          <span className="text-xs report-text uppercase">Sem Foto</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Right Column: Data fields */}
                    <div className="w-[70%] p-3 space-y-1">
                      <div className="report-text">
                        <span className="report-title">NOME: </span>
                        <span className="report-value">{item.nome}</span>
                      </div>
                      <div className="report-text">
                        <span className="report-title">ALCUNHA: </span>
                        <span className="report-value">{item.alcunha}</span>
                      </div>
                      <div className="report-text">
                        <span className="report-title">RG: </span>
                        <span className="report-value">{item.rg}</span>
                      </div>
                      <div className="report-text">
                        <span className="report-title">CPF: </span>
                        <span className="report-value">{item.cpf}</span>
                      </div>
                      <div className="report-text">
                        <span className="report-title">DN: </span>
                        <span className="report-value">{item.dataNascimento}</span>
                      </div>
                      <div className="report-text">
                        <span className="report-title">CD: </span>
                        <span className="report-value">{item.codigoPreso}</span>
                      </div>
                      <div className="report-text">
                        <span className="report-title">ORCRIM: </span>
                        <span className="report-value">{item.orcrim}</span>
                      </div>
                      <div className="report-text">
                        <span className="report-title">SITUAÇÃO: </span>
                        <span className="report-value">{item.situacao}</span>
                      </div>
                      <div className="report-text">
                        <span className="report-title">FILIAÇÃO: </span>
                        <span className="report-value">{item.pai ? `${item.pai} / ` : ''}{item.mae || ''}</span>
                      </div>
                      <div className="report-text">
                        <span className="report-title">END.: </span>
                        <span className="report-value">{item.endereco}</span>
                      </div>
                      <div className="report-text">
                        <span className="report-title">OC.: </span>
                        <span className="report-value">{item.antecedentes}</span>
                      </div>
                      <div className="report-text">
                        <span className="report-title">OBS.: </span>
                        <span className="report-value">{item.observacoes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
          </div>
        </div>

      </div>

    </Layout>
  );
}
