import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SizeGuideWithDetails } from '../hooks/useSizeGuides';
import { SizeGuideTable } from './SizeGuideTable';
import { Ruler } from 'lucide-react';

interface SizeGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guide: SizeGuideWithDetails | null;
}

export const SizeGuideDialog = ({ open, onOpenChange, guide }: SizeGuideDialogProps) => {
  if (!guide) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            {guide.name}
          </DialogTitle>
          {guide.description && (
            <p className="text-sm text-muted-foreground">{guide.description}</p>
          )}
        </DialogHeader>

        <SizeGuideTable guide={guide} />
      </DialogContent>
    </Dialog>
  );
};
