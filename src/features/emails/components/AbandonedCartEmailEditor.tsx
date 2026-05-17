import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Mail, Clock, Save, RotateCcw, Tag, Monitor, Smartphone, 
  Eye, ChevronDown, ChevronUp, Loader2, Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { AbandonedCartEmailPreview } from "./AbandonedCartEmailPreview";

interface AbandonedCartEmailEditorProps {
  number: 1 | 2 | 3;
  enabled: boolean;
  delay: number;
  subject: string;
  preheader: string;
  body: string;
  onSave: (data: {
    enabled: boolean;
    delay: number;
    subject: string;
    preheader: string;
    body: string;
  }) => void;
  isUpdating: boolean;
  storeName?: string;
  primaryColor?: string;
  logoUrl?: string | null;
}

const availableVariables = [
  { tag: "{{customer_name}}", label: "Nome do cliente", example: "João" },
  { tag: "{{store_name}}", label: "Nome da loja", example: "Minha Loja" },
  { tag: "{{cart_total}}", label: "Total do carrinho", example: "R$ 299,90" },
  { tag: "{{products_count}}", label: "Quantidade de produtos", example: "3" },
];

const defaultContent = {
  1: {
    subject: "🛒 Você esqueceu algo no carrinho, {{customer_name}}!",
    preheader: "Os itens que você escolheu ainda estão aqui esperando por você.",
    body: "Olá {{customer_name}}, notamos que você deixou alguns itens no seu carrinho. Sabemos que às vezes a vida acontece - por isso guardamos tudo pra você!",
  },
  2: {
    subject: "⏰ Seus produtos ainda estão esperando por você",
    preheader: "Não deixe escapar! Seus itens estão reservados por tempo limitado.",
    body: "Ei {{customer_name}}, os produtos que você selecionou continuam disponíveis. Muitos clientes estão de olho nesses mesmos itens - garanta o seu antes que acabe!",
  },
  3: {
    subject: "🔥 Última chance! Seu carrinho vai expirar",
    preheader: "Esta é sua última chance de garantir os produtos do seu carrinho.",
    body: "{{customer_name}}, esta é nossa última tentativa de te lembrar. Os itens do seu carrinho estão prestes a expirar. Finalize agora e receba em poucos dias!",
  },
};

const delayOptions = {
  1: { min: 30, max: 1440, label: "1ª mensagem", suggestions: [30, 60, 120] },
  2: { min: 60, max: 4320, label: "2ª mensagem", suggestions: [1440, 2880] },
  3: { min: 1440, max: 10080, label: "3ª mensagem", suggestions: [4320, 7200] },
};

const formatDelay = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
};

const formatDelayFull = (minutes: number) => {
  if (minutes < 60) return `${minutes} minutos`;
  if (minutes < 1440) {
    const hours = Math.round(minutes / 60);
    return `${hours} hora${hours !== 1 ? 's' : ''}`;
  }
  const days = Math.round(minutes / 1440);
  return `${days} dia${days !== 1 ? 's' : ''}`;
};

export function AbandonedCartEmailEditor({
  number,
  enabled: initialEnabled,
  delay: initialDelay,
  subject: initialSubject,
  preheader: initialPreheader,
  body: initialBody,
  onSave,
  isUpdating,
  storeName = "Sua Loja",
  primaryColor = "#4F46E5",
  logoUrl,
}: AbandonedCartEmailEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [delay, setDelay] = useState(initialDelay);
  const [subject, setSubject] = useState(initialSubject || defaultContent[number].subject);
  const [preheader, setPreheader] = useState(initialPreheader || defaultContent[number].preheader);
  const [body, setBody] = useState(initialBody || defaultContent[number].body);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [hasChanges, setHasChanges] = useState(false);
  
  const subjectRef = useRef<HTMLInputElement>(null);
  const preheaderRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<"subject" | "preheader" | "body" | null>(null);

  // Track changes
  useEffect(() => {
    const changed =
      enabled !== initialEnabled ||
      delay !== initialDelay ||
      subject !== (initialSubject || defaultContent[number].subject) ||
      preheader !== (initialPreheader || defaultContent[number].preheader) ||
      body !== (initialBody || defaultContent[number].body);
    setHasChanges(changed);
  }, [enabled, delay, subject, preheader, body, initialEnabled, initialDelay, initialSubject, initialPreheader, initialBody, number]);

  const insertVariable = (tag: string) => {
    const refs = {
      subject: subjectRef,
      preheader: preheaderRef,
      body: bodyRef,
    };

    const ref = activeField ? refs[activeField] : null;
    if (!ref?.current) return;

    const input = ref.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const value = activeField === "subject" ? subject : activeField === "preheader" ? preheader : body;
    const newValue = value.substring(0, start) + tag + value.substring(end);

    if (activeField === "subject") setSubject(newValue);
    else if (activeField === "preheader") setPreheader(newValue);
    else if (activeField === "body") setBody(newValue);

    // Restore focus
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSave = () => {
    onSave({ enabled, delay, subject, preheader, body });
    toast({
      title: "E-mail salvo",
      description: `As configurações do ${number}º e-mail foram atualizadas.`,
    });
  };

  const handleResetDefaults = () => {
    setSubject(defaultContent[number].subject);
    setPreheader(defaultContent[number].preheader);
    setBody(defaultContent[number].body);
    setDelay(number === 1 ? 60 : number === 2 ? 1440 : 4320);
    toast({
      title: "Valores restaurados",
      description: "Os textos padrão foram restaurados. Clique em Salvar para aplicar.",
    });
  };

  const labels = {
    1: { title: "1º E-mail - Lembrete", description: "Lembrete gentil sobre o carrinho abandonado" },
    2: { title: "2º E-mail - Reforço", description: "Destaque o valor e urgência moderada" },
    3: { title: "3º E-mail - Urgência", description: "Última tentativa com senso de urgência" },
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      enabled ? "border-border" : "border-muted bg-muted/30"
    )}>
      {/* Header - Always visible */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold",
              enabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {number}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {labels[number].title}
                {enabled && (
                  <Badge variant="secondary" className="font-normal">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDelayFull(delay)}
                  </Badge>
                )}
                {hasChanges && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Não salvo
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {labels[number].description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={isUpdating}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-1"
            >
              {isExpanded ? (
                <>Fechar <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Editar <ChevronDown className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="pt-0 space-y-6">
          {/* Timing */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <Label className="text-sm font-medium mb-2 block">Tempo após abandono</Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={delayOptions[number].min}
                  max={delayOptions[number].max}
                  value={delay}
                  onChange={(e) => setDelay(Number(e.target.value))}
                  className="w-24"
                  disabled={!enabled}
                />
                <span className="text-sm text-muted-foreground">minutos</span>
              </div>
              <span className="text-sm text-muted-foreground">=</span>
              <span className="text-sm font-medium">{formatDelayFull(delay)}</span>
              <div className="flex gap-1 ml-4">
                {delayOptions[number].suggestions.map((s) => (
                  <Button
                    key={s}
                    variant={delay === s ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setDelay(s)}
                    disabled={!enabled}
                    className="h-7 px-2 text-xs"
                  >
                    {formatDelay(s)}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Conteúdo do E-mail
                </h4>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!enabled}>
                      <Tag className="w-4 h-4 mr-1" />
                      Inserir variável
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="end">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Variáveis disponíveis</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Clique em um campo de texto e depois em uma variável para inserir.
                      </p>
                      {availableVariables.map((v) => (
                        <button
                          key={v.tag}
                          onClick={() => insertVariable(v.tag)}
                          disabled={!activeField}
                          className={cn(
                            "w-full text-left p-2 rounded-md text-sm transition-colors",
                            activeField
                              ? "hover:bg-muted cursor-pointer"
                              : "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <code className="bg-muted px-1 py-0.5 rounded text-xs">{v.tag}</code>
                          <span className="ml-2 text-muted-foreground">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Assunto</Label>
                  <Input
                    ref={subjectRef}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    onFocus={() => setActiveField("subject")}
                    placeholder="Assunto do e-mail"
                    disabled={!enabled}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Preheader (pré-visualização)</Label>
                  <Input
                    ref={preheaderRef}
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    onFocus={() => setActiveField("preheader")}
                    placeholder="Texto que aparece ao lado do assunto na caixa de entrada"
                    disabled={!enabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    Texto que aparece na pré-visualização da caixa de entrada
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Mensagem principal</Label>
                  <Textarea
                    ref={bodyRef}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onFocus={() => setActiveField("body")}
                    placeholder="Mensagem do corpo do e-mail"
                    rows={4}
                    disabled={!enabled}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isUpdating || !hasChanges}
                  className="gap-2"
                >
                  {isUpdating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetDefaults}
                  disabled={!enabled}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurar padrão
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div className="flex justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="w-4 h-4" />
                    Prévia do E-mail
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Eye className="w-5 h-5" />
                      Prévia – E-mail {number} de Carrinho Abandonado
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex items-center justify-end">
                    <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "desktop" | "mobile")}>
                      <TabsList className="h-8">
                        <TabsTrigger value="desktop" className="h-6 px-2 text-xs gap-1">
                          <Monitor className="w-3 h-3" />
                          Desktop
                        </TabsTrigger>
                        <TabsTrigger value="mobile" className="h-6 px-2 text-xs gap-1">
                          <Smartphone className="w-3 h-3" />
                          Mobile
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <div className="overflow-auto flex-1">
                    <AbandonedCartEmailPreview
                      subject={subject}
                      preheader={preheader}
                      body={body}
                      storeName={storeName}
                      primaryColor={primaryColor}
                      logoUrl={logoUrl}
                      emailNumber={number}
                      mode={previewMode}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
