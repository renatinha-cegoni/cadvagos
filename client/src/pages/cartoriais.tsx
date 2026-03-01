import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { useCadastros } from "@/hooks/use-cadastros";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, FileDown, FileText, UserX } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, VerticalAlign } from "docx";
import { saveAs } from "file-saver";

export default function Cartoriais() {
  const { data: cadastros, isLoading } = useCadastros();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
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
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(item => item.id)));
    }
  };

  const exportPDF = async () => {
    if (!reportRef.current || selectedData.length === 0) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('relatorio_cartorial.pdf');
    } catch (error) {
      console.error(error);
    }
  };

  const exportWord = async () => {
    if (selectedData.length === 0) return;
    try {
      const docChildren: any[] = [];
      for (const item of selectedData) {
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2 },
            bottom: { style: BorderStyle.SINGLE, size: 2 },
            left: { style: BorderStyle.SINGLE, size: 2 },
            right: { style: BorderStyle.SINGLE, size: 2 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 2 },
            insideVertical: { style: BorderStyle.SINGLE, size: 2 },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [new Paragraph({ text: "[ FOTO ]", alignment: AlignmentType.CENTER })]
                }),
                new TableCell({
                  width: { size: 70, type: WidthType.PERCENTAGE },
                  children: [
                    new Table({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      borders: {
                         top: { style: BorderStyle.NONE },
                         bottom: { style: BorderStyle.NONE },
                         left: { style: BorderStyle.NONE },
                         right: { style: BorderStyle.NONE },
                         insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                         insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                      },
                      rows: [
                        new TableRow({
                          children: [
                             new TableCell({ children: [createRow("NOME: ", item.nome)] }),
                             new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [createRow("RG: ", item.rg)] }),
                          ]
                        }),
                        new TableRow({
                          children: [
                             new TableCell({ children: [createRow("ALCUNHA: ", item.alcunha)] }),
                             new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [createRow("CPF: ", item.cpf)] }),
                          ]
                        }),
                        new TableRow({
                          children: [
                             new TableCell({ children: [createRow("OrCrim: ", item.orcrim)] }),
                             new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [createRow("DN: ", item.dataNascimento)] }),
                          ]
                        }),
                        new TableRow({
                          children: [
                             new TableCell({ children: [createRow("SITUAÇÃO: ", item.situacao)] }),
                             new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [createRow("CD: ", item.codigoPreso)] }),
                          ]
                        })
                      ]
                    })
                  ]
                })
              ]
            }),
            new TableRow({
               children: [
                  new TableCell({
                     columnSpan: 2,
                     children: [createRow("FILIAÇÃO: ", `${item.pai || ""} / ${item.mae || ""}`)]
                  })
               ]
            }),
            new TableRow({
               children: [
                  new TableCell({
                     columnSpan: 2,
                     children: [createRow("END.: ", item.endereco)]
                  })
               ]
            }),
            new TableRow({
               children: [
                  new TableCell({
                     columnSpan: 2,
                     children: [createRow("OC.: ", item.antecedentes)]
                  })
               ]
            }),
            new TableRow({
               children: [
                  new TableCell({
                     columnSpan: 2,
                     children: [createRow("OBS.: ", item.observacoes)]
                  })
               ]
            })
          ]
        });
        docChildren.push(table);
        docChildren.push(new Paragraph({ text: "" }));
      }
      const doc = new Document({ sections: [{ children: docChildren }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, "relatorio_cartorial.docx");
    } catch (error) {
      console.error(error);
    }
  };

  const createRow = (label: string, value: string | null) => {
    return new Paragraph({
      children: [
        new TextRun({ text: label, bold: true, font: "Times New Roman", size: 18 }),
        new TextRun({ text: (value || "").toUpperCase(), italics: true, font: "Times New Roman", size: 18 }),
      ]
    });
  };

  return (
    <Layout title="RELATÓRIOS CARTORIAIS">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
            <div className="flex items-center space-x-2 mb-4 pb-4 border-b">
              <Checkbox id="select-all" checked={filteredData.length > 0 && selectedIds.size === filteredData.length} onCheckedChange={toggleSelectAll} />
              <label htmlFor="select-all" className="text-sm font-medium">Selecionar Todos</label>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredData.map(item => (
                <div key={item.id} className="flex items-start space-x-3 p-2 hover:bg-white rounded-md">
                  <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                  <label className="text-sm cursor-pointer flex-1">
                    <span className="font-bold uppercase block">{item.nome}</span>
                    {item.alcunha && <span className="text-xs text-slate-500 uppercase block">Vulgo: {item.alcunha}</span>}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={exportPDF} disabled={selectedIds.size === 0}>
              <FileDown className="w-4 h-4 mr-2" /> GERAR PDF
            </Button>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={exportWord} disabled={selectedIds.size === 0}>
              <FileText className="w-4 h-4 mr-2" /> GERAR WORD (.docx)
            </Button>
          </div>
        </div>
        <div className="lg:col-span-8">
          <div ref={reportRef} className="bg-white shadow-xl p-8 space-y-6 w-full max-w-[210mm] mx-auto">
            {selectedData.map((item) => (
              <div key={item.id} className="border-2 border-black flex flex-col page-break-inside-avoid">
                <div className="flex border-b-2 border-black">
                  <div className="w-[30%] border-r-2 border-black p-2 flex items-center justify-center min-h-[150px]">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="Foto" className="max-w-full max-h-[180px] object-contain" />
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center"><UserX /><span className="text-[9pt] uppercase">Sem Foto</span></div>
                    )}
                  </div>
                  <div className="w-[70%] flex flex-col">
                    <div className="flex border-b-2 border-black h-1/4">
                      <div className="flex-1 p-1 border-r-2 border-black flex items-center overflow-hidden">
                        <span className="font-bold text-[9pt] font-['Times_New_Roman'] whitespace-nowrap">NOME:&nbsp;</span>
                        <span className="italic text-[9pt] font-['Times_New_Roman'] uppercase truncate">{item.nome}</span>
                      </div>
                      <div className="w-[35%] p-1 flex items-center">
                        <span className="font-bold text-[9pt] font-['Times_New_Roman'] whitespace-nowrap">RG:&nbsp;</span>
                        <span className="italic text-[9pt] font-['Times_New_Roman'] uppercase">{item.rg}</span>
                      </div>
                    </div>
                    <div className="flex border-b-2 border-black h-1/4">
                      <div className="flex-1 p-1 border-r-2 border-black flex items-center overflow-hidden">
                        <span className="font-bold text-[9pt] font-['Times_New_Roman'] whitespace-nowrap">ALCUNHA:&nbsp;</span>
                        <span className="italic text-[9pt] font-['Times_New_Roman'] uppercase truncate">{item.alcunha}</span>
                      </div>
                      <div className="w-[35%] p-1 flex items-center">
                        <span className="font-bold text-[9pt] font-['Times_New_Roman'] whitespace-nowrap">CPF:&nbsp;</span>
                        <span className="italic text-[9pt] font-['Times_New_Roman'] uppercase">{item.cpf}</span>
                      </div>
                    </div>
                    <div className="flex border-b-2 border-black h-1/4">
                      <div className="flex-1 p-1 border-r-2 border-black flex items-center overflow-hidden">
                        <span className="font-bold text-[9pt] font-['Times_New_Roman'] whitespace-nowrap">OrCrim:&nbsp;</span>
                        <span className="italic text-[9pt] font-['Times_New_Roman'] uppercase truncate">{item.orcrim}</span>
                      </div>
                      <div className="w-[35%] p-1 flex flex-col justify-center">
                        <div className="font-bold text-[7pt] font-['Times_New_Roman'] leading-none">DN:</div>
                        <div className="italic text-[9pt] font-['Times_New_Roman'] uppercase leading-none">{item.dataNascimento}</div>
                      </div>
                    </div>
                    <div className="flex h-1/4">
                      <div className="flex-1 p-1 border-r-2 border-black flex items-center overflow-hidden">
                        <span className="font-bold text-[9pt] font-['Times_New_Roman'] whitespace-nowrap">SITUAÇÃO:&nbsp;</span>
                        <span className="italic text-[9pt] font-['Times_New_Roman'] uppercase truncate">{item.situacao}</span>
                      </div>
                      <div className="w-[35%] p-1 flex items-center">
                        <span className="font-bold text-[9pt] font-['Times_New_Roman'] whitespace-nowrap">CD:&nbsp;</span>
                        <span className="italic text-[9pt] font-['Times_New_Roman'] uppercase">{item.codigoPreso}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-1 border-b-2 border-black">
                  <span className="font-bold text-[9pt] font-['Times_New_Roman']">FILIAÇÃO: </span>
                  <span className="italic text-[9pt] font-['Times_New_Roman'] uppercase">{item.pai} / {item.mae}</span>
                </div>
                <div className="p-1 border-b-2 border-black">
                  <span className="font-bold text-[9pt] font-['Times_New_Roman']">END.: </span>
                  <span className="italic text-[9pt] font-['Times_New_Roman'] uppercase">{item.endereco}</span>
                </div>
                <div className="p-1 min-h-[40px]">
                  <span className="font-bold text-[9pt] font-['Times_New_Roman']">OC.: </span>
                  <span className="italic text-[9pt] font-['Times_New_Roman'] uppercase">{item.antecedentes}</span>
                </div>
                <div className="border-t-2 border-black p-1 min-h-[40px]">
                  <span className="font-bold text-[9pt] font-['Times_New_Roman']">OBS.: </span>
                  <span className="italic text-[9pt] font-['Times_New_Roman'] uppercase">{item.observacoes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @media print {
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </Layout>
  );
}
