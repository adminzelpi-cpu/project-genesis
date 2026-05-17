import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Crop, Square, AlertTriangle, Wand2, Check } from 'lucide-react';
import {
  type ImageAnalysis,
  type AspectRatioKey,
  type StandardizationMethod,
  type StandardizationConfig,
  type StandardizedResult,
  ASPECT_RATIOS,
  suggestAspectRatio,
  generatePreview,
  standardizeImages,
  loadPreference,
  savePreference,
} from '@/lib/imageStandardization';

interface ImageStandardizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analyses: ImageAnalysis[];
  categoryName?: string;
  storeId?: string;
  onConfirm: (results: StandardizedResult[]) => void;
  onSkip: () => void;
}

export const ImageStandardizationModal = ({
  open,
  onOpenChange,
  analyses,
  categoryName,
  storeId,
  onConfirm,
  onSkip,
}: ImageStandardizationModalProps) => {
  const savedPref = storeId ? loadPreference(storeId) : null;
  const suggested = suggestAspectRatio(categoryName);

  const [aspectRatio, setAspectRatio] = useState<AspectRatioKey>(
    savedPref?.aspectRatio || suggested
  );
  const [globalMethod, setGlobalMethod] = useState<StandardizationMethod>(
    savedPref?.method || 'smart-crop'
  );
  const [perImageMethod, setPerImageMethod] = useState<Map<number, StandardizationMethod>>(new Map());
  const [previews, setPreviews] = useState<Map<number, string>>(new Map());
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [individualMode, setIndividualMode] = useState(false);

  const getMethod = (index: number): StandardizationMethod =>
    perImageMethod.get(index) ?? globalMethod;

  // Generate previews when config changes
  const generatePreviews = useCallback(async () => {
    if (analyses.length === 0) return;
    setLoadingPreviews(true);
    const newPreviews = new Map<number, string>();

    try {
      await Promise.all(
        analyses.map(async (analysis, i) => {
          const config: StandardizationConfig = {
            aspectRatio,
            method: getMethod(i),
          };
          const preview = await generatePreview(analysis, config);
          newPreviews.set(i, preview);
        })
      );
      setPreviews(newPreviews);
    } catch (err) {
      console.warn('Error generating previews:', err);
    } finally {
      setLoadingPreviews(false);
    }
  }, [analyses, aspectRatio, globalMethod, perImageMethod]);

  useEffect(() => {
    if (open && analyses.length > 0) {
      generatePreviews();
    }
  }, [open, generatePreviews]);

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      // Build per-image configs
      const configs = analyses.map((_, i) => ({
        aspectRatio,
        method: getMethod(i),
      }));

      // Standardize all images
      const results = await Promise.all(
        analyses.map((analysis, i) =>
          standardizeImages([analysis], configs[i]).then(r => r[0])
        )
      );

      // Save preference
      if (storeId) {
        savePreference(storeId, { aspectRatio, method: globalMethod });
      }

      onConfirm(results);
      onOpenChange(false);
    } catch (err) {
      console.error('Error standardizing images:', err);
    } finally {
      setProcessing(false);
    }
  };

  const toggleImageMethod = (index: number) => {
    const current = getMethod(index);
    const newMethod: StandardizationMethod = current === 'smart-crop' ? 'white-padding' : 'smart-crop';
    setPerImageMethod(prev => {
      const next = new Map(prev);
      next.set(index, newMethod);
      return next;
    });
  };

  // Dimensions info
  const dimSizes = analyses.map(a => `${a.width}×${a.height}`);
  const uniqueSizes = [...new Set(dimSizes)];
  const hasMismatch = uniqueSizes.length > 1;

  const selectedRatio = ASPECT_RATIOS.find(r => r.key === aspectRatio)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Padronização de Imagens
          </DialogTitle>
          <DialogDescription>
            Padronize as dimensões das suas imagens para uma apresentação profissional e consistente.
          </DialogDescription>
        </DialogHeader>

        {/* Mismatch warning */}
        {hasMismatch && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Imagens com dimensões diferentes detectadas
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {uniqueSizes.join(', ')} — Padronizar garante uma apresentação uniforme na loja.
              </p>
            </div>
          </div>
        )}

        {/* Aspect Ratio Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Proporção</Label>
          <RadioGroup
            value={aspectRatio}
            onValueChange={(v) => {
              setAspectRatio(v as AspectRatioKey);
              setPerImageMethod(new Map());
            }}
            className="grid grid-cols-2 gap-3"
          >
            {ASPECT_RATIOS.map((opt) => (
              <label
                key={opt.key}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  aspectRatio === opt.key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                <RadioGroupItem value={opt.key} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{opt.label}</span>
                    {opt.key === suggested && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Sugerido
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </div>
                {/* Visual ratio preview */}
                <div
                  className="border border-muted-foreground/30 rounded-sm bg-muted shrink-0"
                  style={{
                    width: opt.ratio >= 1 ? 32 : Math.round(32 * opt.ratio),
                    height: opt.ratio >= 1 ? Math.round(32 / opt.ratio) : 32,
                  }}
                />
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Method Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Método de padronização</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setGlobalMethod('smart-crop');
                setPerImageMethod(new Map());
              }}
              className={`flex items-start gap-3 p-3 border rounded-lg text-left transition-colors ${
                globalMethod === 'smart-crop'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <Crop className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium">Recorte inteligente</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Centraliza no objeto principal da imagem
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setGlobalMethod('white-padding');
                setPerImageMethod(new Map());
              }}
              className={`flex items-start gap-3 p-3 border rounded-lg text-left transition-colors ${
                globalMethod === 'white-padding'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <Square className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span className="text-sm font-medium">Fundo branco</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adiciona padding sem cortar nada
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Preview Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">
              Prévia ({analyses.length} {analyses.length === 1 ? 'imagem' : 'imagens'})
            </Label>
            {analyses.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIndividualMode(!individualMode)}
              >
                {individualMode ? 'Modo lote' : 'Ajustar individualmente'}
              </Button>
            )}
          </div>

          <div className={`grid gap-4 ${analyses.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {analyses.map((analysis, i) => (
              <div key={i} className="space-y-2">
                <div className="relative border rounded-lg overflow-hidden bg-muted">
                  {loadingPreviews || !previews.has(i) ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={previews.get(i)}
                      alt={`Preview ${i + 1}`}
                      className="w-full h-auto"
                    />
                  )}
                  {/* Original dimensions badge */}
                  <Badge
                    variant="secondary"
                    className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0 opacity-80"
                  >
                    {analysis.width}×{analysis.height}
                  </Badge>
                </div>

                {individualMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => toggleImageMethod(i)}
                  >
                    {getMethod(i) === 'smart-crop' ? (
                      <>
                        <Crop className="h-3 w-3 mr-1" />
                        Recorte → Trocar pra fundo branco
                      </>
                    ) : (
                      <>
                        <Square className="h-3 w-3 mr-1" />
                        Fundo branco → Trocar pra recorte
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Target info */}
        <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded">
          As imagens serão padronizadas para <strong>{selectedRatio.label}</strong>,
          comprimidas e convertidas para WebP automaticamente.
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onSkip();
              onOpenChange(false);
            }}
            disabled={processing}
          >
            Pular padronização
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={processing || loadingPreviews}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Padronizar {analyses.length > 1 ? 'todas' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
