import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Facebook, Twitter, Mail, Copy } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyLink: () => void;
  onShareVia: (platform: string) => void;
}

export function ShareModal({ isOpen, onClose, onCopyLink, onShareVia }: ShareModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar produto</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => onShareVia('whatsapp')}
          >
            <WhatsAppIcon className="h-6 w-6" />
            <span className="text-sm">WhatsApp</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => onShareVia('facebook')}
          >
            <Facebook className="h-6 w-6 text-blue-600" />
            <span className="text-sm">Facebook</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => onShareVia('twitter')}
          >
            <Twitter className="h-6 w-6" />
            <span className="text-sm">X (Twitter)</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => onShareVia('email')}
          >
            <Mail className="h-6 w-6" />
            <span className="text-sm">E-mail</span>
          </Button>
          
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4 col-span-2"
            onClick={onCopyLink}
          >
            <Copy className="h-6 w-6" />
            <span className="text-sm">Copiar link</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

