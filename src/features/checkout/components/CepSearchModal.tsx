import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Loader2 } from "lucide-react";

interface CepResult {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

interface CepSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCep: (cep: string) => void;
}

// Mapa de estados brasileiros
const ESTADOS = {
  // Siglas para nomes
  AC: "acre",
  AL: "alagoas",
  AP: "amapa",
  AM: "amazonas",
  BA: "bahia",
  CE: "ceara",
  DF: "distritofederal",
  ES: "espiritosanto",
  GO: "goias",
  MA: "maranhao",
  MT: "matogrosso",
  MS: "matogrossodosul",
  MG: "minasgerais",
  PA: "para",
  PB: "paraiba",
  PR: "parana",
  PE: "pernambuco",
  PI: "piaui",
  RJ: "riodejaneiro",
  RN: "riograndedonorte",
  RS: "riograndedosul",
  RO: "rondonia",
  RR: "roraima",
  SC: "santacatarina",
  SP: "saopaulo",
  SE: "sergipe",
  TO: "tocantins",
};

// Abreviações de logradouros
const ABREVIACOES: Record<string, string> = {
  av: "avenida",
  r: "rua",
  trav: "travessa",
  pç: "praca",
  pc: "praca",
  rod: "rodovia",
  est: "estrada",
  al: "alameda",
  vl: "vila",
};

// Função para normalizar texto (remover acentos e pontuação)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^\w\s]/g, "") // Remove pontuação
    .replace(/\s+/g, " ") // Remove espaços múltiplos
    .trim();
}

// Função para identificar UF
function identificarUF(tokens: string[]): { uf: string; remainingTokens: string[] } | null {
  // Buscar da direita para esquerda
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    
    // Verificar sigla (2 letras)
    if (token.length === 2) {
      const ufUpper = token.toUpperCase();
      if (ESTADOS[ufUpper as keyof typeof ESTADOS]) {
        return {
          uf: ufUpper,
          remainingTokens: tokens.slice(0, i),
        };
      }
    }
    
    // Verificar nome completo do estado
    const estadoEntry = Object.entries(ESTADOS).find(([, nome]) => nome === token);
    if (estadoEntry) {
      return {
        uf: estadoEntry[0],
        remainingTokens: tokens.slice(0, i),
      };
    }
  }
  
  return null;
}

// Função para identificar cidade
function identificarCidade(tokens: string[]): { cidade: string; remainingTokens: string[] } | null {
  if (tokens.length === 0) return null;
  
  // Cidades conhecidas com múltiplas palavras (podem ser expandidas)
  const cidadesMultiplas = [
    ["belo", "horizonte"],
    ["rio", "de", "janeiro"],
    ["sao", "paulo"],
    ["campo", "grande"],
    ["porto", "alegre"],
    ["porto", "velho"],
    ["boa", "vista"],
  ];
  
  // Verificar cidades com múltiplas palavras (da maior para menor)
  for (let len = 3; len >= 2; len--) {
    if (tokens.length >= len) {
      const possibleCity = tokens.slice(-len);
      const normalized = possibleCity.join(" ");
      
      if (cidadesMultiplas.some(cidade => cidade.join(" ") === normalized)) {
        return {
          cidade: possibleCity.join(" "),
          remainingTokens: tokens.slice(0, -len),
        };
      }
    }
  }
  
  // Por padrão, última palavra é a cidade
  return {
    cidade: tokens[tokens.length - 1],
    remainingTokens: tokens.slice(0, -1),
  };
}

// Função para expandir abreviações de logradouro
function expandirAbreviacoes(tokens: string[]): string[] {
  return tokens.map(token => ABREVIACOES[token] || token);
}

// Função para fazer parse do endereço
function parseAddress(input: string): {
  uf: string;
  cidade: string;
  logradouro: string;
} | null {
  const normalized = normalizeText(input);
  const tokens = normalized.split(" ").filter(t => t.length > 0);
  
  if (tokens.length < 3) return null;
  
  // 1. Identificar UF
  const ufResult = identificarUF(tokens);
  if (!ufResult) return null;
  
  // 2. Identificar cidade
  const cidadeResult = identificarCidade(ufResult.remainingTokens);
  if (!cidadeResult) return null;
  
  // 3. Logradouro é o que sobrou
  if (cidadeResult.remainingTokens.length === 0) return null;
  
  const logradouroTokens = expandirAbreviacoes(cidadeResult.remainingTokens);
  
  return {
    uf: ufResult.uf,
    cidade: cidadeResult.cidade,
    logradouro: logradouroTokens.join(" "),
  };
}

export function CepSearchModal({ open, onOpenChange, onSelectCep }: CepSearchModalProps) {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<CepResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus ao abrir
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Limpar estados ao fechar
  useEffect(() => {
    if (!open) {
      setSearchText("");
      setResults([]);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  // Busca com debounce
  useEffect(() => {
    // Cancelar busca anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Limpar estados se texto for muito curto
    if (searchText.length < 3) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Iniciar novo timer
    debounceTimer.current = setTimeout(() => {
      performSearch(searchText);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchText]);

  async function performSearch(query: string) {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // Parse do endereço
      const parsed = parseAddress(query);
      
      if (!parsed) {
        setError("Não encontramos esse endereço. Dica: digite Rua + Cidade + UF. Você pode acrescentar o bairro para refinar.");
        setLoading(false);
        return;
      }

      const { uf, cidade, logradouro } = parsed;
      
      // Estratégia de busca inteligente
      const logradouroTokens = logradouro.split(" ");
      let foundResults: CepResult[] = [];
      let possibleBairro: string[] = [];

      // Tentar com todas as palavras primeiro, depois ir removendo
      for (let i = logradouroTokens.length; i >= 1; i--) {
        const currentLogradouro = logradouroTokens.slice(0, i).join(" ");
        possibleBairro = logradouroTokens.slice(i);

        try {
          const url = `https://viacep.com.br/ws/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(currentLogradouro)}/json/`;
          const response = await fetch(url);
          
          if (!response.ok) continue;
          
          const data = await response.json();
          
          if (Array.isArray(data) && data.length > 0) {
            foundResults = data;
            break;
          }
        } catch (err) {
          continue;
        }
      }

      // Filtrar por bairro se houver
      if (foundResults.length > 0 && possibleBairro.length > 0) {
        const bairroNormalized = normalizeText(possibleBairro.join(" "));
        foundResults = foundResults.filter(result => 
          normalizeText(result.bairro || "").includes(bairroNormalized)
        );
      }

      if (foundResults.length === 0) {
        setError("Não encontramos esse endereço. Dica: digite Rua + Cidade + UF. Você pode acrescentar o bairro para refinar.");
      } else {
        setResults(foundResults);
      }
    } catch (err) {
      setError("Erro na busca. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectCep(cep: string) {
    onSelectCep(cep);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto top-[5%] translate-y-0 md:top-[50%] md:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Buscar CEP por endereço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search">Digite o endereço</Label>
            <Input
              ref={inputRef}
              id="search"
              placeholder="Ex: Rua Barroso Teresina PI"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Digite: Rua + Bairro + Cidade + Estado (pode usar sigla ou nome completo)
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span>Buscando CEPs...</span>
            </div>
          )}

          {/* Erro */}
          {error && !loading && (
            <div className="text-sm text-destructive py-4">
              {error}
            </div>
          )}

          {/* Resultados */}
          {results.length > 0 && !loading && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {results.length} resultado(s) encontrado(s)
              </p>
              <ScrollArea className="h-[280px] border rounded-lg">
                <div className="space-y-2 p-2">
                  {results.map((result, index) => (
                    <button
                      key={`${result.cep}-${index}`}
                      onClick={() => handleSelectCep(result.cep)}
                      className="w-full text-left p-3 rounded-lg border hover:border-foreground hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground mb-1">
                            CEP: {result.cep}
                          </p>
                          <p className="text-sm text-foreground">
                            {result.logradouro}
                            {result.bairro && `, ${result.bairro}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {result.localidade} - {result.uf}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
