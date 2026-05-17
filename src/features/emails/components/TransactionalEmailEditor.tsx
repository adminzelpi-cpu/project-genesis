import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Mail, Save, RotateCcw, Tag, Monitor, Smartphone, 
  Eye, ChevronDown, ChevronUp, Loader2, Package,
  CheckCircle2, Truck, XCircle, CreditCard, AlertCircle,
  Clock, FileText, Receipt, UserPlus, Barcode
} from "lucide-react";
import { PixIcon } from "@/components/icons/PixIcon";
import { cn } from "@/lib/utils";
import { 
  EmailType, 
  EmailTemplate, 
  defaultTemplates, 
  emailTypesMeta,
  emailVariables 
} from "../hooks/useEmailTemplates";
import { TransactionalEmailPreview } from "./TransactionalEmailPreview";

interface TransactionalEmailEditorProps {
  emailType: EmailType;
  template: EmailTemplate;
  onSave: (template: Omit<EmailTemplate, "id">) => void;
  isSaving: boolean;
  onReset: () => void;
  storeName?: string;
  primaryColor?: string;
  logoUrl?: string | null;
}

const emailTypeIconMap: Record<EmailType, { icon: React.ComponentType<any> | null; customIcon?: "pix"; colorClass: string }> = {
  order_confirmed: { icon: CheckCircle2, colorClass: "text-primary bg-primary/10" },
  order_preparing: { icon: Package, colorClass: "text-accent bg-accent/10" },
  order_shipped: { icon: Truck, colorClass: "text-primary bg-primary/10" },
  order_delivered: { icon: CheckCircle2, colorClass: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950" },
  order_cancelled: { icon: XCircle, colorClass: "text-destructive bg-destructive/10" },
  payment_confirmed: { icon: CheckCircle2, colorClass: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950" },
  payment_failed: { icon: AlertCircle, colorClass: "text-destructive bg-destructive/10" },
  boleto_generated: { icon: Barcode, colorClass: "text-muted-foreground bg-muted" },
  pix_generated: { icon: null, customIcon: "pix", colorClass: "bg-[#32BCAD]/10" },
  pix_expired: { icon: Clock, colorClass: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950" },
  welcome: { icon: UserPlus, colorClass: "text-primary bg-primary/10" },
  tracking_code: { icon: Truck, colorClass: "text-primary bg-primary/10" },
  refund_processed: { icon: Receipt, colorClass: "text-muted-foreground bg-muted" },
  invoice_generated: { icon: FileText, colorClass: "text-muted-foreground bg-muted" },
};

export function TransactionalEmailEditor({
  emailType,
  template,
  onSave,
  isSaving,
  onReset,
  storeName = "Sua Loja",
  primaryColor = "#4F46E5",
  logoUrl,
}: TransactionalEmailEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [subject, setSubject] = useState(template.subject);
  const [preheader, setPreheader] = useState(template.preheader || "");
  const [body, setBody] = useState(template.body || "");
  const [includeOrderSummary, setIncludeOrderSummary] = useState(template.include_order_summary);
  const [ctaText, setCtaText] = useState(template.cta_text || "");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [hasChanges, setHasChanges] = useState(false);

  const subjectRef = useRef<HTMLInputElement>(null);
  const preheaderRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<"subject" | "preheader" | "body" | null>(null);

  const meta = emailTypesMeta[emailType];
  const defaultTemplate = defaultTemplates[emailType];

  // Track changes
  useEffect(() => {
    const changed =
      subject !== template.subject ||
      preheader !== (template.preheader || "") ||
      body !== (template.body || "") ||
      includeOrderSummary !== template.include_order_summary ||
      ctaText !== (template.cta_text || "");
    setHasChanges(changed);
  }, [subject, preheader, body, includeOrderSummary, ctaText, template]);

  // Update local state when template changes
  useEffect(() => {
    setSubject(template.subject);
    setPreheader(template.preheader || "");
    setBody(template.body || "");
    setIncludeOrderSummary(template.include_order_summary);
    setCtaText(template.cta_text || "");
  }, [template]);

  // Get available variables for this email type
  const getAvailableVariables = () => {
    const vars = [...emailVariables.all];
    if (meta.category === "order" || meta.category === "payment" || meta.category === "logistics") {
      vars.push(...emailVariables.order);
    }
    if (emailType === "tracking_code" || emailType === "order_shipped") {
      vars.push(...emailVariables.tracking);
    }
    if (meta.category === "payment") {
      vars.push(...emailVariables.payment);
    }
    return vars;
  };

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

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSave = () => {
    onSave({
      store_id: template.store_id,
      email_type: emailType,
      subject,
      preheader,
      body,
      include_order_summary: includeOrderSummary,
      cta_text: ctaText,
      cta_url: template.cta_url,
    });
  };

  const handleReset = () => {
    setSubject(defaultTemplate.subject);
    setPreheader(defaultTemplate.preheader || "");
    setBody(defaultTemplate.body || "");
    setIncludeOrderSummary(defaultTemplate.include_order_summary);
    setCtaText(defaultTemplate.cta_text || "");
    onReset();
  };

  // Check if current values differ from defaults
  const isCustomized = 
    subject !== defaultTemplate.subject ||
    preheader !== (defaultTemplate.preheader || "") ||
    body !== (defaultTemplate.body || "") ||
    ctaText !== (defaultTemplate.cta_text || "");

  return (
    <Card className="transition-all duration-200">
      {/* Header - Always visible */}
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(() => {
                const iconConfig = emailTypeIconMap[emailType];
                return (
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${iconConfig.colorClass}`}>
                    {iconConfig.customIcon === "pix" ? (
                      <PixIcon size={20} color="#32BCAD" />
                    ) : iconConfig.icon ? (
                      <iconConfig.icon className="w-5 h-5" />
                    ) : (
                      <Mail className="w-5 h-5" />
                    )}
                  </div>
                );
              })()}
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {meta.label}
                {isCustomized && (
                  <Badge variant="secondary" className="font-normal text-xs">
                    Personalizado
                  </Badge>
                )}
                {hasChanges && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                    Não salvo
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {meta.description}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <>Fechar <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Editar <ChevronDown className="w-4 h-4" /></>
            )}
          </Button>
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="pt-0 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Conteúdo do E-mail
              </h4>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  <Eye className="w-4 h-4" />
                  Prévia
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Tag className="w-4 h-4 mr-1" />
                      Inserir variável
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="end">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Variáveis disponíveis</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Clique em um campo e depois em uma variável para inserir.
                      </p>
                      {getAvailableVariables().map((v) => (
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
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Preheader (pré-visualização)</Label>
                <Input
                  ref={preheaderRef}
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  onFocus={() => setActiveField("preheader")}
                  placeholder="Texto que aparece ao lado do assunto"
                />
                <p className="text-xs text-muted-foreground">
                  Aparece na pré-visualização da caixa de entrada
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
                />
              </div>

              {defaultTemplate.cta_text && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Texto do botão</Label>
                  <Input
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="Ex: Acompanhar Pedido"
                  />
                </div>
              )}

              {emailType !== "welcome" && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">Incluir resumo do pedido</Label>
                      <p className="text-xs text-muted-foreground">
                        Mostra produtos, valores e endereço
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={includeOrderSummary}
                    onCheckedChange={setIncludeOrderSummary}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar
              </Button>
              {isCustomized && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurar padrão
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      )}

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Prévia: {meta.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-end">
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
            
            <TransactionalEmailPreview
              emailType={emailType}
              subject={subject}
              preheader={preheader}
              body={body}
              includeOrderSummary={includeOrderSummary}
              ctaText={ctaText}
              storeName={storeName}
              primaryColor={primaryColor}
              logoUrl={logoUrl}
              mode={previewMode}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
