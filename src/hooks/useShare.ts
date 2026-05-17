import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

export function useShare() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const { toast } = useToast();

  const share = (data: ShareData) => {
    setShareData(data);
    
    // Try native share first (mobile)
    if (navigator.share) {
      navigator.share(data).catch((err) => {
        // Only show fallback modal if it's NOT a user cancellation
        if (err?.name !== 'AbortError') {
          setIsModalOpen(true);
        }
      });
    } else {
      // Desktop: show modal
      setIsModalOpen(true);
    }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência",
      });
      setIsModalOpen(false);
    });
  };

  const shareVia = (platform: string, data: ShareData) => {
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${data.title}\n${data.url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.title)}`,
      email: `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent(`${data.text}\n\n${data.url}`)}`,
    };

    if (urls[platform]) {
      window.open(urls[platform], '_blank');
      setIsModalOpen(false);
    }
  };

  return {
    share,
    copyLink,
    shareVia,
    isModalOpen,
    setIsModalOpen,
    shareData,
  };
}
