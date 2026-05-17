import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { SizeGuideContent } from './SizeGuideContent';

interface SizeGuideData {
  id: string;
  name: string;
  description: string | null;
  dimensions: { id: string; name: string; measurement_type: string | null; position: number | null; image_url?: string | null; description?: string | null }[];
  sizes: { id: string; name: string; position: number | null }[];
  values: { dimension_id: string; size_id: string; value: string }[];
}

interface SizeGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guide: SizeGuideData | null | undefined;
  productId?: string;
}

export const SizeGuideModal = ({ open, onOpenChange, guide, productId }: SizeGuideModalProps) => {
  if (!guide) return null;

  const handleDiscoverSize = () => {
    onOpenChange(false);
    window.dispatchEvent(new CustomEvent('open-chat-size-help', { detail: { productId } }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 flex-shrink-0">
          <DialogTitle className="text-lg text-center">
            Guia de medidas
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-4 pb-4 sm:px-6 sm:pb-6">
          <SizeGuideContent guide={guide} />
        </div>

        <div className="flex-shrink-0 border-t px-4 py-3 sm:px-6">
          <Button
            onClick={handleDiscoverSize}
            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            Descubra seu tamanho ideal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
