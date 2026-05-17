import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { invokeCustomerFn, hasCustomerToken } from "@/features/customers/lib/customerApi";
import { getStoredCustomerSession } from "@/features/auth";

export interface CustomerProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface CustomerRecord {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  store_id: string;
}

function customerToProfile(c: CustomerRecord): CustomerProfile {
  return {
    id: c.id,
    email: c.email || "",
    full_name: c.nome,
    avatar_url: null, // avatar not yet supported in custom auth flow
    phone: c.telefone,
  };
}

export function useCustomerProfile() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["customer-profile", getStoredCustomerSession()?.customer_id ?? "anon"],
    queryFn: async () => {
      if (!hasCustomerToken()) return null;
      const res = await invokeCustomerFn<{ profile: CustomerRecord }>("customer-profile", {
        body: { action: "get" },
      });
      return res.profile ? customerToProfile(res.profile) : null;
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<CustomerProfile>) => {
      if (!hasCustomerToken()) throw new Error("Usuário não autenticado");
      await invokeCustomerFn("customer-profile", {
        body: {
          action: "update",
          nome: updates.full_name ?? undefined,
          telefone: updates.phone ?? undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível salvar suas informações.",
      });
    },
  });

  const updateEmail = useMutation({
    mutationFn: async (_: { newEmail: string }) => {
      // Email change in custom auth flow not yet supported (requires verification flow)
      throw new Error("Alteração de email ainda não disponível. Em breve!");
    },
    onSuccess: () => {
      toast({
        title: "Confirmação enviada",
        description: "Verifique seu novo email para confirmar a alteração.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating email:", error);
      toast({
        variant: "destructive",
        title: "Erro ao alterar email",
        description: error.message || "Não foi possível alterar seu email.",
      });
    },
  });

  const updatePassword = useMutation({
    mutationFn: async ({ newPassword, currentPassword }: { newPassword: string; currentPassword?: string }) => {
      if (!hasCustomerToken()) throw new Error("Usuário não autenticado");
      if (!currentPassword) {
        throw new Error("Por segurança, informe sua senha atual.");
      }
      await invokeCustomerFn("customer-profile", {
        body: {
          action: "change_password",
          current_password: currentPassword,
          new_password: newPassword,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating password:", error);
      toast({
        variant: "destructive",
        title: "Erro ao alterar senha",
        description: error.message || "Não foi possível alterar sua senha.",
      });
    },
  });

  const uploadAvatar = useMutation({
    mutationFn: async (_file: File) => {
      throw new Error("Upload de avatar ainda não disponível.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi alterada com sucesso.",
      });
    },
    onError: (error: any) => {
      console.error("Error uploading avatar:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar foto",
        description: error.message || "Não foi possível enviar sua foto.",
      });
    },
  });

  return {
    profile,
    isLoading,
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
    updateEmail: updateEmail.mutate,
    isUpdatingEmail: updateEmail.isPending,
    updatePassword: updatePassword.mutate,
    isUpdatingPassword: updatePassword.isPending,
    uploadAvatar: uploadAvatar.mutate,
    isUploadingAvatar: uploadAvatar.isPending,
  };
}
