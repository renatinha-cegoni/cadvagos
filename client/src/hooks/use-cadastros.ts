import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CadastroInput } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// Fetch all cadastros
export function useCadastros() {
  return useQuery({
    queryKey: [api.cadastros.list.path],
    queryFn: async () => {
      const res = await fetch(api.cadastros.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch cadastros");
      const data = await res.json();
      return api.cadastros.list.responses[200].parse(data);
    },
  });
}

// Fetch single cadastro
export function useCadastro(id: number | null) {
  return useQuery({
    queryKey: [api.cadastros.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.cadastros.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch cadastro");
      const data = await res.json();
      return api.cadastros.get.responses[200].parse(data);
    },
    enabled: id !== null,
  });
}

// Create new cadastro
export function useCreateCadastro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: CadastroInput) => {
      const res = await fetch(api.cadastros.create.path, {
        method: api.cadastros.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create cadastro");
      }
      return api.cadastros.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cadastros.list.path] });
      toast({ title: "Sucesso", description: "Cadastro criado com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });
}

// Update existing cadastro
export function useUpdateCadastro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<CadastroInput>) => {
      const url = buildUrl(api.cadastros.update.path, { id });
      const res = await fetch(url, {
        method: api.cadastros.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update cadastro");
      }
      return api.cadastros.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.cadastros.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.cadastros.get.path, variables.id] });
      toast({ title: "Sucesso", description: "Cadastro atualizado com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });
}

// Delete cadastro
export function useDeleteCadastro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.cadastros.delete.path, { id });
      const res = await fetch(url, { 
        method: api.cadastros.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete cadastro");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cadastros.list.path] });
      toast({ title: "Sucesso", description: "Cadastro excluído com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });
}

// Upload Image
export function useUploadImage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(api.upload.create.path, {
        method: api.upload.create.method,
        body: formData,
        // Don't set Content-Type, browser sets it with boundary for FormData
      });
      
      if (!res.ok) throw new Error("Failed to upload image");
      const data = await res.json();
      return api.upload.create.responses[200].parse(data);
    },
    onError: (error) => {
      toast({ title: "Erro no Upload", description: error.message, variant: "destructive" });
    }
  });
}

// Organogramas Hooks
export function useOrganogramas() {
  return useQuery({
    queryKey: [api.organogramas.list.path],
    queryFn: async () => {
      const res = await fetch(api.organogramas.list.path);
      if (!res.ok) throw new Error("Erro ao buscar organogramas");
      return api.organogramas.list.responses[200].parse(await res.json());
    }
  });
}

export function useCreateOrganograma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.organogramas.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Erro ao salvar organograma");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.organogramas.list.path] });
    }
  });
}

export function useUpdateOrganograma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await fetch(buildUrl(api.organogramas.update.path, { id }), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Erro ao atualizar organograma");
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.organogramas.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.organogramas.get.path, variables.id] });
    }
  });
}

export function useDeleteOrganograma() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.organogramas.delete.path, { id }), {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Erro ao excluir organograma");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.organogramas.list.path] });
    }
  });
}
