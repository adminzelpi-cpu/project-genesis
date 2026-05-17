import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

interface ProductSizeGuideProps {
  sizeGuideId: string | null;
  onSizeGuideChange: (value: string | null) => void;
  storeId: string | undefined;
}

export const ProductSizeGuide = ({ sizeGuideId, onSizeGuideChange, storeId }: ProductSizeGuideProps) => {
  const { data: guides = [], isLoading } = useQuery({
    queryKey: ['size-guides-select', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data } = await supabase
        .from('size_guides')
        .select('id, name')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!storeId,
  });

  const handleChange = (value: string) => {
    onSizeGuideChange(value === 'none' ? null : value);
  };

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Guia de Medidas</h3>
        <Link 
          to="/dashboard/size-guides" 
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Gerenciar guias
        </Link>
      </div>
      
      <div>
        <Label htmlFor="size-guide">Guia</Label>
        {isLoading ? (
          <Skeleton className="h-10 w-full mt-1.5" />
        ) : (
          <Select value={sizeGuideId || 'none'} onValueChange={handleChange}>
            <SelectTrigger id="size-guide" className="mt-1.5">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {guides.map((guide) => (
                <SelectItem key={guide.id} value={guide.id}>
                  {guide.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          O guia será exibido na página do produto para ajudar o cliente a escolher o tamanho correto.
        </p>
      </div>
    </div>
  );
};
