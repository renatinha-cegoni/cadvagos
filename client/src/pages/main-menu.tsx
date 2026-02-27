import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { FileEdit, Database, FileText, Network } from "lucide-react";

export default function MainMenu() {
  const menuItems = [
    {
      title: "CADASTROS",
      description: "Inserir ou atualizar registros no sistema",
      icon: <FileEdit className="w-12 h-12 mb-4 text-blue-600" />,
      href: "/cadastros",
      color: "border-blue-200 hover:border-blue-500 hover:bg-blue-50",
    },
    {
      title: "BANCO DE DADOS",
      description: "Consultar, editar ou remover registros existentes",
      icon: <Database className="w-12 h-12 mb-4 text-emerald-600" />,
      href: "/banco-de-dados",
      color: "border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50",
    },
    {
      title: "CARTORIAIS",
      description: "Gerar e exportar relatórios visuais",
      icon: <FileText className="w-12 h-12 mb-4 text-purple-600" />,
      href: "/cartoriais",
      color: "border-purple-200 hover:border-purple-500 hover:bg-purple-50",
    },
    {
      title: "ORGANOGRAMAS",
      description: "Criar diagramas visuais e conexões",
      icon: <Network className="w-12 h-12 mb-4 text-orange-600" />,
      href: "/organogramas",
      color: "border-orange-200 hover:border-orange-500 hover:bg-orange-50",
    }
  ];

  return (
    <Layout title="MENU PRINCIPAL" showBack={false}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto py-8">
        {menuItems.map((item, index) => (
          <Link key={index} href={item.href} className={`
            flex flex-col items-center justify-center p-10 
            bg-white rounded-2xl border-2 shadow-sm
            transition-all duration-300 ease-out
            hover:shadow-xl hover:-translate-y-2 cursor-pointer
            ${item.color}
          `}>
            {item.icon}
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight mb-2 uppercase text-center">
              {item.title}
            </h3>
            <p className="text-slate-500 text-center text-sm">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
