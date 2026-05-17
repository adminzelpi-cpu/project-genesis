import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StoreMedia {
  id: string;
  store_id: string;
  file_name: string;
  original_name: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  mime_type: string | null;
  alt_text: string | null;
  width: number | null;
  height: number | null;
  folder: string | null;
  tags: string[] | null;
  used_in_products: number;
  created_at: string;
  updated_at: string;
}

interface UseStoreMediaOptions {
  storeId: string;
  folder?: string;
  search?: string;
  fileType?: string;
}

export function useStoreMedia({ storeId, folder, search, fileType }: UseStoreMediaOptions) {
  return useQuery({
    queryKey: ['store-media', storeId, folder, search, fileType],
    queryFn: async () => {
      let query = supabase
        .from('store_media')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (folder && folder !== 'all') {
        query = query.eq('folder', folder);
      }

      if (fileType && fileType !== 'all') {
        query = query.eq('file_type', fileType);
      }

      if (search) {
        query = query.or(`file_name.ilike.%${search}%,alt_text.ilike.%${search}%,original_name.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as StoreMedia[];
    },
    enabled: !!storeId,
  });
}

export function useUploadMedia(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      const uploadedMedia: StoreMedia[] = [];

      for (const file of files) {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `media/${storeId}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        // Get image dimensions if it's an image
        let width: number | null = null;
        let height: number | null = null;
        
        if (file.type.startsWith('image/')) {
          const dimensions = await getImageDimensions(file);
          width = dimensions.width;
          height = dimensions.height;
        }

        // Insert into store_media table
        const { data, error } = await supabase
          .from('store_media')
          .insert({
            store_id: storeId,
            file_name: fileName,
            original_name: file.name,
            file_url: publicUrl,
            file_type: file.type.startsWith('image/') ? 'image' : 'file',
            file_size: file.size,
            mime_type: file.type,
            width,
            height,
            folder: 'root',
          })
          .select()
          .single();

        if (error) throw error;
        uploadedMedia.push(data as StoreMedia);
      }

      return uploadedMedia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-media', storeId] });
      toast({
        title: 'Upload concluído',
        description: 'Arquivos enviados com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: 'Não foi possível enviar os arquivos.',
      });
    },
  });
}

export function useUpdateMedia(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StoreMedia> }) => {
      const { data, error } = await supabase
        .from('store_media')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-media', storeId] });
      toast({
        title: 'Mídia atualizada',
        description: 'As informações foram salvas.',
      });
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações.',
      });
    },
  });
}

export function useDeleteMedia(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // First get the file URLs to delete from storage
      const { data: mediaItems, error: fetchError } = await supabase
        .from('store_media')
        .select('id, file_url')
        .in('id', ids);

      if (fetchError) throw fetchError;

      // Delete from database
      const { error } = await supabase
        .from('store_media')
        .delete()
        .in('id', ids);

      if (error) throw error;

      // Try to delete from storage (optional, don't fail if storage delete fails)
      for (const item of mediaItems || []) {
        try {
          const urlPath = new URL(item.file_url).pathname;
          const storagePath = urlPath.replace('/storage/v1/object/public/product-images/', '');
          await supabase.storage.from('product-images').remove([storagePath]);
        } catch (e) {
          console.warn('Could not delete from storage:', e);
        }
      }

      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-media', storeId] });
      toast({
        title: 'Mídia excluída',
        description: 'Os arquivos foram removidos.',
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível remover os arquivos.',
      });
    },
  });
}

export function useSyncProductImages(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get all product images for this store
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name, images')
        .eq('store_id', storeId)
        .not('images', 'is', null);

      if (prodError) throw prodError;

      // Get all variation images
      const { data: variations, error: varError } = await supabase
        .from('product_variations_v2')
        .select('id, images, product_id')
        .in('product_id', (products || []).map(p => p.id))
        .not('images', 'is', null);

      if (varError) throw varError;

      // Get existing media URLs to avoid duplicates
      const { data: existingMedia } = await supabase
        .from('store_media')
        .select('file_url')
        .eq('store_id', storeId);

      const existingUrls = new Set((existingMedia || []).map(m => m.file_url));

      // Collect all image URLs
      const newEntries: Array<{
        store_id: string;
        file_name: string;
        original_name: string;
        file_url: string;
        file_type: string;
        folder: string;
      }> = [];

      const processImages = (images: any, sourceName: string) => {
        const imgArray = Array.isArray(images) ? images : 
          (typeof images === 'string' ? (() => { try { return JSON.parse(images); } catch { return []; } })() : []);
        
        for (const img of imgArray) {
          const url = typeof img === 'string' ? img : img?.url;
          if (url && !existingUrls.has(url)) {
            existingUrls.add(url);
            const fileName = url.split('/').pop() || 'image.jpg';
            newEntries.push({
              store_id: storeId,
              file_name: fileName,
              original_name: `${sourceName} - ${fileName}`,
              file_url: url,
              file_type: 'image',
              folder: 'root',
            });
          }
        }
      };

      for (const product of products || []) {
        processImages(product.images, product.name);
      }

      for (const variation of variations || []) {
        processImages(variation.images, `Variação`);
      }

      if (newEntries.length === 0) return 0;

      // Insert in batches of 50
      let inserted = 0;
      for (let i = 0; i < newEntries.length; i += 50) {
        const batch = newEntries.slice(i, i + 50);
        const { error } = await supabase.from('store_media').insert(batch);
        if (!error) inserted += batch.length;
      }

      return inserted;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['store-media', storeId] });
      if (count && count > 0) {
        toast({
          title: 'Sincronização concluída',
          description: `${count} imagem(ns) adicionada(s) à biblioteca.`,
        });
      } else {
        toast({
          title: 'Biblioteca atualizada',
          description: 'Todas as imagens já estão na biblioteca.',
        });
      }
    },
    onError: (error) => {
      console.error('Sync error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na sincronização',
        description: 'Não foi possível sincronizar as imagens.',
      });
    },
  });
}

// Helper function to get image dimensions
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}
