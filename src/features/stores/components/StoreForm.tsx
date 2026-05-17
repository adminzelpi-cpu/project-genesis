import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '../hooks/useStore';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { Store } from '../types';

interface StoreFormProps {
  store?: Store;
  onSuccess?: () => void;
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken';

export const StoreForm = ({ store, onSuccess }: StoreFormProps) => {
  const { createStore, updateStore, loading } = useStore();
  const [formData, setFormData] = useState({
    name: store?.name || '',
    slug: store?.slug || '',
    description: store?.description || '',
  });
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!store);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Generate slug from name (client-side preview)
  const nameToSlug = (name: string) => {
    let slug = name.toLowerCase().trim();
    // Remove accents
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Replace non-alphanumeric with hyphens
    slug = slug.replace(/[^a-z0-9]+/g, '-');
    // Remove leading/trailing hyphens
    slug = slug.replace(/^-+|-+$/g, '');
    // Remove consecutive hyphens
    slug = slug.replace(/-+/g, '-');
    // Truncate
    slug = slug.substring(0, 50).replace(/-+$/, '');
    return slug;
  };

  // Check slug availability via DB function
  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 2) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');

    try {
      const { data, error } = await supabase
        .rpc('generate_unique_store_slug', {
          store_name: slug, // We pass slug itself to check exact match
          exclude_store_id: store?.id || null,
        });

      if (error) {
        setSlugStatus('idle');
        return;
      }

      // If the returned slug equals what we typed, it's available
      // If it returned something different (with suffix), the original is taken
      setSlugStatus(data === slug ? 'available' : 'taken');
    } catch {
      setSlugStatus('idle');
    }
  }, [store?.id]);

  // Auto-generate slug when name changes (if not manually edited)
  useEffect(() => {
    if (!slugManuallyEdited && formData.name) {
      const newSlug = nameToSlug(formData.name);
      setFormData(prev => ({ ...prev, slug: newSlug }));
    }
  }, [formData.name, slugManuallyEdited]);

  // Debounced slug availability check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (formData.slug && formData.slug.length >= 2) {
      debounceRef.current = setTimeout(() => {
        checkSlugAvailability(formData.slug);
      }, 500);
    } else {
      setSlugStatus('idle');
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData.slug, checkSlugAvailability]);

  const handleSlugChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setSlugManuallyEdited(true);
    setFormData(prev => ({ ...prev, slug: sanitized }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For new stores, use DB function to ensure unique slug
    let finalSlug = formData.slug;

    try {
      if (store) {
        const { store: updated, error } = await updateStore(store.id, { ...formData, slug: finalSlug });
        if (!error && updated) onSuccess?.();
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Ensure merchant role
      const { error: roleError } = await supabase.functions.invoke('ensure-merchant-role');
      if (roleError) return;

      // Generate guaranteed unique slug via DB
      const { data: uniqueSlug } = await supabase.rpc('generate_unique_store_slug', {
        store_name: formData.name,
        exclude_store_id: null,
      });

      if (uniqueSlug) finalSlug = uniqueSlug;

      const { store: created, error } = await createStore({
        ...formData,
        slug: finalSlug,
        merchant_id: user.id,
        is_active: true,
      });
      if (!error && created) onSuccess?.();
    } catch (err) {
      console.error('Falha ao salvar loja', err);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{store ? 'Editar Loja' : 'Criar Nova Loja'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Loja</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Moda Fashion"
              required
            />
          </div>

          <div>
            <Label htmlFor="slug">URL da Loja</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="minha-loja"
                  required
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {slugStatus === 'available' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {slugStatus === 'taken' && <XCircle className="h-4 w-4 text-destructive" />}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formData.slug ? (
                <>Sua loja: <span className="font-medium text-foreground">{formData.slug}.zelpi.com.br</span></>
              ) : (
                'Digite o nome da loja para gerar a URL automaticamente'
              )}
            </p>
            {slugStatus === 'taken' && (
              <p className="text-sm text-destructive mt-1">
                Esta URL já está em uso. Tente outra ou ajuste o nome.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Descreva brevemente sua loja"
            />
          </div>

          <Button 
            type="submit" 
            disabled={loading || slugStatus === 'taken'} 
            className="w-full"
          >
            {loading ? 'Salvando...' : (store ? 'Atualizar Loja' : 'Criar Loja')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
