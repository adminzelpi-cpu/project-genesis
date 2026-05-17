import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, FileText, CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface CustomerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
}

interface ParsedRow {
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  data_nascimento?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

interface ValidationResult {
  row: ParsedRow;
  lineNumber: number;
  errors: string[];
  warnings: string[];
  isDuplicate: boolean;
  duplicateField?: string;
}

type ImportStep = "upload" | "preview" | "importing" | "results";

const CSV_HEADERS = [
  "nome", "email", "telefone", "cpf", "data_nascimento",
  "rua", "numero", "complemento", "bairro", "cidade", "estado", "cep"
];

const CSV_TEMPLATE = `${CSV_HEADERS.join(",")}
"João Silva","joao@email.com","(11) 99999-0000","123.456.789-00","1990-01-15","Rua Exemplo","100","Apto 12","Centro","São Paulo","SP","01001-000"
"Maria Santos","maria@email.com","(21) 98888-0000","987.654.321-00","","","","","","","",""`;

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else if (ch === ";" && !inQuotes) {
        // Support semicolon-separated (common in BR Excel exports)
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function normalizeHeaders(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  const aliases: Record<string, string[]> = {
    nome: ["nome", "name", "nome completo", "nome_completo", "cliente"],
    email: ["email", "e-mail", "e_mail"],
    telefone: ["telefone", "phone", "tel", "celular", "whatsapp"],
    cpf: ["cpf", "documento", "doc"],
    data_nascimento: ["data_nascimento", "nascimento", "data de nascimento", "birthday", "aniversario"],
    rua: ["rua", "logradouro", "endereco", "endereço", "street"],
    numero: ["numero", "número", "num", "nro", "number"],
    complemento: ["complemento", "compl", "complement"],
    bairro: ["bairro", "neighborhood"],
    cidade: ["cidade", "city", "municipio"],
    estado: ["estado", "uf", "state"],
    cep: ["cep", "zip", "codigo_postal", "zip_code"],
  };
  for (const [field, names] of Object.entries(aliases)) {
    const idx = headers.findIndex(h => names.includes(h));
    if (idx !== -1) map.set(field, idx);
  }
  return map;
}

function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

/** Normalizes phone to (XX) XXXXX-XXXX or (XX) XXXX-XXXX format */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Remove country code 55 if present
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  // Return cleaned digits if can't normalize
  return local || phone;
}

/** Normalizes CEP to XXXXX-XXX format */
function normalizeCEP(cep: string): string {
  const digits = cep.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits || cep;
}

function validateCPF(cpf: string): boolean {
  const digits = cleanCPF(cpf);
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (parseInt(digits[9]) !== check) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return parseInt(digits[10]) === check;
}

function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
  return local.length === 10 || local.length === 11;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function CustomerImportDialog({ open, onOpenChange, storeId }: CustomerImportDialogProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ imported: 0, skipped: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const reset = () => {
    setStep("upload");
    setValidationResults([]);
    setImportProgress(0);
    setImportResults({ imported: 0, skipped: 0, errors: 0 });
  };

  const handleClose = (value: boolean) => {
    if (!value) reset();
    onOpenChange(value);
  };

  const downloadTemplate = () => {
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacao_clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const { headers, rows } = parseCSV(text);

    if (rows.length === 0) {
      toast({ variant: "destructive", title: "Arquivo vazio", description: "O arquivo não contém dados para importar." });
      return;
    }

    if (rows.length > 5000) {
      toast({ variant: "destructive", title: "Limite excedido", description: "O arquivo pode ter no máximo 5.000 clientes por importação." });
      return;
    }

    const colMap = normalizeHeaders(headers);

    if (!colMap.has("nome")) {
      toast({ variant: "destructive", title: "Coluna obrigatória", description: "A coluna 'nome' é obrigatória no arquivo CSV." });
      return;
    }

    // Fetch existing customers for duplicate detection
    const { data: existing } = await supabase
      .from("customers")
      .select("cpf, email")
      .eq("store_id", storeId);

    const existingCPFs = new Set((existing || []).map(c => c.cpf ? cleanCPF(c.cpf) : "").filter(Boolean));
    const existingEmails = new Set((existing || []).map(c => c.email?.toLowerCase() || "").filter(Boolean));

    const seenCPFs = new Set<string>();
    const seenEmails = new Set<string>();

    const results: ValidationResult[] = rows.map((row, idx) => {
      const get = (field: string) => {
        const i = colMap.get(field);
        return i !== undefined && i < row.length ? row[i].replace(/^["']|["']$/g, "").trim() : "";
      };

      const parsed: ParsedRow = {
        nome: get("nome"),
        email: get("email")?.toLowerCase() || undefined,
        telefone: get("telefone") ? normalizePhone(get("telefone")) : undefined,
        cpf: get("cpf") || undefined,
        data_nascimento: get("data_nascimento") || undefined,
        rua: get("rua") || undefined,
        numero: get("numero") || undefined,
        complemento: get("complemento") || undefined,
        bairro: get("bairro") || undefined,
        cidade: get("cidade") || undefined,
        estado: get("estado")?.toUpperCase().slice(0, 2) || undefined,
        cep: get("cep") ? normalizeCEP(get("cep")) : undefined,
      };

      const errors: string[] = [];
      const warnings: string[] = [];
      let isDuplicate = false;
      let duplicateField: string | undefined;

      // Validate
      if (!parsed.nome) errors.push("Nome é obrigatório");
      if (parsed.email && !validateEmail(parsed.email)) errors.push("Email inválido");
      if (parsed.cpf && !validateCPF(parsed.cpf)) errors.push("CPF inválido");
      if (parsed.telefone && !validatePhone(parsed.telefone)) warnings.push("Telefone com formato inusitado");

      // Check duplicates
      if (parsed.cpf) {
        const cleanedCPF = cleanCPF(parsed.cpf);
        if (existingCPFs.has(cleanedCPF) || seenCPFs.has(cleanedCPF)) {
          isDuplicate = true;
          duplicateField = "CPF";
        }
        seenCPFs.add(cleanedCPF);
      }

      if (!isDuplicate && parsed.email) {
        const lowerEmail = parsed.email.toLowerCase();
        if (existingEmails.has(lowerEmail) || seenEmails.has(lowerEmail)) {
          isDuplicate = true;
          duplicateField = "Email";
        }
        seenEmails.add(lowerEmail);
      }

      if (!parsed.email && !parsed.cpf) {
        warnings.push("Sem email nem CPF – não será possível identificar duplicatas");
      }

      return { row: parsed, lineNumber: idx + 2, errors, warnings, isDuplicate };
    });

    setValidationResults(results);
    setStep("preview");

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [storeId, toast]);

  const validRows = validationResults.filter(r => r.errors.length === 0 && !r.isDuplicate);
  const errorRows = validationResults.filter(r => r.errors.length > 0);
  const duplicateRows = validationResults.filter(r => r.isDuplicate && r.errors.length === 0);

  const handleImport = async () => {
    setStep("importing");
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const batchSize = 50;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);

      // Insert customers
      const customersToInsert = batch.map(r => ({
        store_id: storeId,
        nome: r.row.nome,
        email: r.row.email || null,
        telefone: r.row.telefone || null,
        cpf: r.row.cpf || null,
        data_nascimento: r.row.data_nascimento || null,
      }));

      const { data: insertedCustomers, error: insertError } = await supabase
        .from("customers")
        .insert(customersToInsert)
        .select("id");

      if (insertError) {
        errors += batch.length;
        console.error("Import batch error:", insertError);
      } else if (insertedCustomers) {
        imported += insertedCustomers.length;

        // Insert addresses for customers that have address data
        const addressesToInsert = batch
          .map((r, bIdx) => {
            if (!r.row.rua || !r.row.numero || !r.row.bairro || !r.row.cidade || !r.row.estado || !r.row.cep) return null;
            const customerId = insertedCustomers[bIdx]?.id;
            if (!customerId) return null;
            return {
              customer_id: customerId,
              tipo: "principal",
              rua: r.row.rua,
              numero: r.row.numero,
              complemento: r.row.complemento || null,
              bairro: r.row.bairro,
              cidade: r.row.cidade,
              estado: r.row.estado,
              cep: r.row.cep,
              is_default: true,
            };
          })
          .filter(Boolean);

        if (addressesToInsert.length > 0) {
          await supabase.from("customer_addresses").insert(addressesToInsert as any);
        }
      }

      setImportProgress(Math.round(((i + batch.length) / validRows.length) * 100));
    }

    skipped = duplicateRows.length + errorRows.length;
    setImportResults({ imported, skipped, errors });
    setStep("results");
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Importar Clientes"}
            {step === "preview" && "Pré-visualização"}
            {step === "importing" && "Importando..."}
            {step === "results" && "Resultado da Importação"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Faça upload de um arquivo CSV com os dados dos seus clientes."}
            {step === "preview" && `${validationResults.length} registros encontrados. Confira antes de importar.`}
            {step === "importing" && "Aguarde enquanto os clientes são importados."}
            {step === "results" && "Importação concluída."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* UPLOAD STEP */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Arraste um arquivo CSV ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">Máximo 5.000 clientes por importação</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <FileText className="h-4 w-4 mr-2" />
                  Selecionar arquivo
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Formato esperado</p>
                <p className="text-xs text-muted-foreground">
                  O arquivo deve ter cabeçalhos na primeira linha. A coluna <strong>nome</strong> é obrigatória.
                  Colunas opcionais: email, telefone, cpf, data_nascimento, rua, numero, complemento, bairro, cidade, estado, cep.
                </p>
                <p className="text-xs text-muted-foreground">
                  Suporta separador vírgula (,) ou ponto e vírgula (;). Duplicatas são identificadas por CPF ou email.
                </p>
                <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar modelo CSV
                </Button>
              </div>
            </div>
          )}

          {/* PREVIEW STEP */}
          {step === "preview" && (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {validRows.length} válidos
                </Badge>
                {duplicateRows.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> {duplicateRows.length} duplicados
                  </Badge>
                )}
                {errorRows.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" /> {errorRows.length} com erros
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[340px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResults.map((r, idx) => (
                      <TableRow key={idx} className={r.errors.length > 0 ? "bg-destructive/5" : r.isDuplicate ? "bg-yellow-500/5" : ""}>
                        <TableCell className="text-xs text-muted-foreground">{r.lineNumber}</TableCell>
                        <TableCell className="text-sm max-w-[140px] truncate">{r.row.nome || "—"}</TableCell>
                        <TableCell className="text-sm max-w-[160px] truncate">{r.row.email || "—"}</TableCell>
                        <TableCell className="text-sm">{r.row.cpf || "—"}</TableCell>
                        <TableCell className="text-sm">{r.row.telefone || "—"}</TableCell>
                        <TableCell>
                          {r.errors.length > 0 ? (
                            <span className="text-xs text-destructive" title={r.errors.join(", ")}>{r.errors[0]}</span>
                          ) : r.isDuplicate ? (
                            <span className="text-xs text-yellow-600">Duplicado ({r.duplicateField})</span>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* IMPORTING STEP */}
          {step === "importing" && (
            <div className="space-y-4 py-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <Progress value={importProgress} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">{importProgress}% concluído</p>
            </div>
          )}

          {/* RESULTS STEP */}
          {step === "results" && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-1" />
                  <div className="text-2xl font-bold">{importResults.imported}</div>
                  <p className="text-xs text-muted-foreground">Importados</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <AlertCircle className="h-6 w-6 mx-auto text-yellow-500 mb-1" />
                  <div className="text-2xl font-bold">{importResults.skipped}</div>
                  <p className="text-xs text-muted-foreground">Ignorados</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <XCircle className="h-6 w-6 mx-auto text-destructive mb-1" />
                  <div className="text-2xl font-bold">{importResults.errors}</div>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={handleImport} disabled={validRows.length === 0}>
                Importar {validRows.length} cliente{validRows.length !== 1 ? "s" : ""}
              </Button>
            </>
          )}
          {step === "results" && (
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
