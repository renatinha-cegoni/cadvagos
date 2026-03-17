import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { insertCadastroSchema } from "@shared/schema";
import { useCreateCadastro, useUpdateCadastro, useCadastro, useUploadImage } from "@/hooks/use-cadastros";
import { Save, UploadCloud, UserX, Loader2 } from "lucide-react";

// The schema is extended here slightly just for frontend form specific needs (like making sure things are uppercase if needed, though we handle that in onChange)
type FormData = z.infer<typeof insertCadastroSchema>;

export default function CadastrosForm() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/cadastros/:id");
  const isEditing = match && params?.id !== "new";
  const idToEdit = isEditing ? parseInt(params.id) : null;
  
  const { data: existingData, isLoading: isLoadingData } = useCadastro(idToEdit);
  const createMutation = useCreateCadastro();
  const updateMutation = useUpdateCadastro();
  const uploadMutation = useUploadImage();
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(insertCadastroSchema),
    defaultValues: {
      nome: "",
      alcunha: "",
      rg: "",
      cpf: "",
      dataNascimento: "",
      orcrim: "",
      situacao: "",
      codigoPreso: "",
      pai: "",
      mae: "",
      endereco: "",
      antecedentes: "",
      observacoes: "",
      imageUrl: "",
    }
  });

  const currentImageUrl = watch("imageUrl");

  useEffect(() => {
    if (isEditing && existingData) {
      reset(existingData);
      if (existingData.imageUrl) {
        setImagePreview(existingData.imageUrl);
      }
    }
  }, [isEditing, existingData, reset]);

  const handleUppercaseChange = (field: keyof FormData, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let val = e.target.value.toUpperCase();
    if (field === "cpf") {
      val = val.replace(/\D/g, "").slice(0, 11);
      val = val.replace(/(\d{3})(\d)/, "$1.$2");
      val = val.replace(/(\d{3})(\d)/, "$1.$2");
      val = val.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    } else if (field === "dataNascimento") {
      val = val.replace(/\D/g, "").slice(0, 8);
      val = val.replace(/(\d{2})(\d)/, "$1/$2");
      val = val.replace(/(\d{2})(\d)/, "$1/$2");
    }
    setValue(field, val, { shouldValidate: true, shouldDirty: true });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    try {
      const res = await uploadMutation.mutateAsync(file);
      setValue("imageUrl", res.imageUrl, { shouldValidate: true });
    } catch (err) {
      console.error("Upload failed", err);
      // Revert preview on failure
      setImagePreview(currentImageUrl || null);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && idToEdit) {
        await updateMutation.mutateAsync({ id: idToEdit, ...data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setLocation("/banco-de-dados");
    } catch (err) {
      // Handled by mutation hook's toast
    }
  };

  if (isEditing && isLoadingData) {
    return (
      <Layout title="CARREGANDO...">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title={isEditing ? "EDITAR CADASTRO" : "NOVO CADASTRO"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Top Section: Photo & Primary Info */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Photo Column */}
          <div className="md:col-span-3 flex flex-col items-center space-y-4">
            <div className="w-full aspect-[3/4] bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden relative group">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <UserX className="w-12 h-12 mb-2 opacity-50" />
                  <span className="text-sm font-medium">Sem Foto</span>
                </div>
              )}
              
              {/* Upload Overlay */}
              <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity duration-200">
                <UploadCloud className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">{imagePreview ? "Trocar Foto" : "Fazer Upload"}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload}
                  disabled={uploadMutation.isPending}
                />
              </label>
              
              {uploadMutation.isPending && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 text-center">Clique na área para fazer upload da foto.</p>
          </div>

          {/* Primary Info Column */}
          <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nome">Nome Completo <span className="text-destructive">*</span></Label>
              <Input 
                id="nome" 
                placeholder="NOME DO INDIVÍDUO" 
                className="uppercase-input font-medium"
                {...register("nome")}
                onChange={(e) => handleUppercaseChange("nome", e)}
              />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alcunha">Alcunha / Apelido</Label>
              <Input 
                id="alcunha" 
                className="uppercase-input"
                {...register("alcunha")}
                onChange={(e) => handleUppercaseChange("alcunha", e)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataNascimento">Data de Nascimento</Label>
              <Input 
                id="dataNascimento" 
                placeholder="DD/MM/AAAA"
                className="uppercase-input"
                {...register("dataNascimento")}
                onChange={(e) => handleUppercaseChange("dataNascimento", e)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rg">RG</Label>
              <Input 
                id="rg" 
                className="uppercase-input"
                {...register("rg")}
                onChange={(e) => handleUppercaseChange("rg", e)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input 
                id="cpf" 
                className="uppercase-input"
                {...register("cpf")}
                onChange={(e) => handleUppercaseChange("cpf", e)}
              />
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-slate-200" />

        {/* Secondary Info Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="situacao">Situação</Label>
            <Input 
              id="situacao" 
              className="uppercase-input"
              {...register("situacao")}
              onChange={(e) => handleUppercaseChange("situacao", e)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orcrim">OrCrim (Organização)</Label>
            <Input 
              id="orcrim" 
              className="uppercase-input"
              {...register("orcrim")}
              onChange={(e) => handleUppercaseChange("orcrim", e)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigoPreso">Código de Preso</Label>
            <Input 
              id="codigoPreso" 
              className="uppercase-input"
              {...register("codigoPreso")}
              onChange={(e) => handleUppercaseChange("codigoPreso", e)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pai">Nome do Pai</Label>
            <Input 
              id="pai" 
              className="uppercase-input"
              {...register("pai")}
              onChange={(e) => handleUppercaseChange("pai", e)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mae">Nome da Mãe</Label>
            <Input 
              id="mae" 
              className="uppercase-input"
              {...register("mae")}
              onChange={(e) => handleUppercaseChange("mae", e)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="endereco">Endereço Completo</Label>
            <Input 
              id="endereco" 
              className="uppercase-input"
              {...register("endereco")}
              onChange={(e) => handleUppercaseChange("endereco", e)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="antecedentes">Antecedentes (OC)</Label>
            <Textarea 
              id="antecedentes" 
              className="uppercase-input min-h-[80px]"
              {...register("antecedentes")}
              onChange={(e) => handleUppercaseChange("antecedentes", e)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea 
              id="observacoes" 
              className="uppercase-input min-h-[80px]"
              {...register("observacoes")}
              onChange={(e) => handleUppercaseChange("observacoes", e)}
            />
          </div>
        </div>

        {/* Timestamps (somente em modo edição) */}
        {isEditing && existingData && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex gap-8">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">CRIADO EM</p>
              <p className="text-sm font-bold text-slate-700">
                {existingData.createdAt
                  ? new Date(existingData.createdAt).toLocaleDateString('pt-BR') + ' ' +
                    new Date(existingData.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  : '-'}
              </p>
            </div>
            {existingData.updatedAt && new Date(existingData.updatedAt).getTime() !== new Date(existingData.createdAt!).getTime() && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ÚLTIMA EDIÇÃO</p>
                <p className="text-sm font-bold text-slate-700">
                  {new Date(existingData.updatedAt).toLocaleDateString('pt-BR') + ' ' +
                   new Date(existingData.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-slate-200">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setLocation("/menu")}
            disabled={isPending}
            className="px-8"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isPending}
            className="px-8 bg-blue-700 hover:bg-blue-800 text-white font-bold tracking-wide"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            SALVAR CADASTRO
          </Button>
        </div>
      </form>
    </Layout>
  );
}
