import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { useCustomerProfile } from "@/features/customers/hooks/useCustomerProfile";
import { toast } from "@/hooks/use-toast";

export default function Profile() {
  const { 
    profile, isLoading, 
    updateProfile, isUpdating, 
    updateEmail, isUpdatingEmail,
    updatePassword, isUpdatingPassword,
    uploadAvatar, isUploadingAvatar,
  } = useCustomerProfile();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  };

  const handleSaveProfile = () => {
    updateProfile({ full_name: fullName, phone: phone.replace(/\D/g, "") });
  };

  const handleChangeEmail = () => {
    if (!email || email === profile?.email) return;
    updateEmail({ newEmail: email });
  };

  const handleChangePassword = () => {
    if (!newPassword) {
      toast({ variant: "destructive", title: "Erro", description: "Digite a nova senha." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Erro", description: "As senhas não coincidem." });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Erro", description: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    updatePassword({ newPassword });
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "A imagem deve ter no máximo 2MB." });
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast({ variant: "destructive", title: "Formato inválido", description: "Use JPG, PNG, GIF ou WebP." });
      return;
    }

    uploadAvatar(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meus Dados</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profile Picture */}
        <Card className="shadow-soft">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile?.avatar_url || ""} alt={fullName} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute -bottom-1 -right-1 rounded-full h-7 w-7 shadow-lg"
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="flex-1">
              <CardTitle>Foto de Perfil</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                JPG, PNG ou GIF. Máximo 2MB.
              </p>
            </div>
          </CardHeader>
        </Card>

        {/* Personal Info */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input 
                id="fullName" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Celular / WhatsApp</Label>
              <Input 
                id="phone" 
                value={formatPhone(phone)}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setFullName(profile?.full_name || "");
                  setPhone(profile?.phone || "");
                }}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveProfile}
                disabled={isUpdating}
              >
                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Endereço de email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
              <p className="text-xs text-muted-foreground">
                Um email de confirmação será enviado para o novo endereço.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button 
                onClick={handleChangeEmail}
                disabled={isUpdatingEmail || email === profile?.email || !email}
              >
                {isUpdatingEmail && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Alterar Email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input 
                id="newPassword" 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input 
                id="confirmPassword" 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            A senha deve ter pelo menos 6 caracteres.
          </p>
          <div className="flex justify-end pt-4">
            <Button 
              onClick={handleChangePassword}
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Alterar Senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
