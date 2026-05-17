import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type FeedPlatform = 'meta' | 'google' | 'pinterest' | 'tiktok' | 'custom';

export interface FeedConfiguration {
  id: string;
  store_id: string;
  platform: string;
  is_active: boolean;
  feed_url_slug: string | null;
  custom_settings: Record<string, any> | null;
  last_accessed_at: string | null;
  access_count: number;
  created_at: string;
  updated_at: string;
}

export interface FeedPlatformTemplate {
  id: string;
  platform_name: string;
  platform_icon: string;
  platform_color: string;
  xml_template: string;
  required_fields: string[];
  optional_fields: string[];
  documentation_url: string | null;
  is_system: boolean;
}

export const useFeedConfigurations = (storeId: string | undefined) => {
  const [configurations, setConfigurations] = useState<FeedConfiguration[]>([]);
  const [templates, setTemplates] = useState<FeedPlatformTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    if (!storeId) return;

    setLoading(true);
    try {
      // Fetch configurations
      const { data: configs, error: configsError } = await supabase
        .from('feed_configurations')
        .select('*')
        .eq('store_id', storeId);

      if (configsError) throw configsError;

      // Fetch templates
      const { data: templ, error: templError } = await supabase
        .from('feed_platform_templates')
        .select('*')
        .eq('is_system', true);

      if (templError) throw templError;

      setConfigurations((configs || []).map(c => ({
        ...c,
        custom_settings: c.custom_settings as Record<string, any> | null
      })));
      setTemplates((templ || []).map(t => ({
        ...t,
        required_fields: Array.isArray(t.required_fields) ? t.required_fields.map(String) : [],
        optional_fields: Array.isArray(t.optional_fields) ? t.optional_fields.map(String) : []
      })));
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar feeds',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [storeId]);

  const toggleFeed = async (platform: string, isActive: boolean) => {
    if (!storeId) return;

    try {
      const existingConfig = configurations.find(c => c.platform === platform);

      if (existingConfig) {
        // Update existing
        const { error } = await supabase
          .from('feed_configurations')
          .update({ is_active: isActive })
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('feed_configurations')
          .insert({
            store_id: storeId,
            platform,
            is_active: isActive,
          });

        if (error) throw error;
      }

      await fetchData();
      
      toast({
        title: isActive ? 'Feed ativado' : 'Feed desativado',
        description: `O feed ${platform.toUpperCase()} foi ${isActive ? 'ativado' : 'desativado'}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar feed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateSettings = async (platform: string, settings: Record<string, any>) => {
    if (!storeId) return;

    try {
      const existingConfig = configurations.find(c => c.platform === platform);

      if (existingConfig) {
        const { error } = await supabase
          .from('feed_configurations')
          .update({ 
            custom_settings: { ...existingConfig.custom_settings, ...settings } 
          })
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('feed_configurations')
          .insert({
            store_id: storeId,
            platform,
            is_active: true,
            custom_settings: settings,
          });

        if (error) throw error;
      }

      await fetchData();
      
      toast({
        title: 'Configurações salvas',
        description: 'As configurações do feed foram atualizadas.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar configurações',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    configurations,
    templates,
    loading,
    toggleFeed,
    updateSettings,
    refetch: fetchData,
  };
};
