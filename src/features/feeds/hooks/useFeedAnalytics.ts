import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeedAccessLog {
  platform: string;
  count: number;
  date: string;
}

interface FeedAnalytics {
  totalAccesses: Record<string, number>;
  dailyAccesses: FeedAccessLog[];
  loading: boolean;
}

export const useFeedAnalytics = (storeId: string | undefined): FeedAnalytics => {
  const [totalAccesses, setTotalAccesses] = useState<Record<string, number>>({});
  const [dailyAccesses, setDailyAccesses] = useState<FeedAccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!storeId) return;

      setLoading(true);
      try {
        // Fetch access logs for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: logs, error } = await supabase
          .from('feed_access_logs')
          .select('platform, accessed_at')
          .eq('store_id', storeId)
          .gte('accessed_at', sevenDaysAgo.toISOString());

        if (error) throw error;

        // Calculate total accesses per platform
        const totals: Record<string, number> = {};
        const dailyMap: Record<string, Record<string, number>> = {};

        (logs || []).forEach(log => {
          // Total by platform
          totals[log.platform] = (totals[log.platform] || 0) + 1;

          // Daily by platform
          const date = new Date(log.accessed_at).toISOString().split('T')[0];
          if (!dailyMap[date]) dailyMap[date] = {};
          dailyMap[date][log.platform] = (dailyMap[date][log.platform] || 0) + 1;
        });

        setTotalAccesses(totals);

        // Convert to array format
        const dailyArray: FeedAccessLog[] = [];
        Object.entries(dailyMap).forEach(([date, platforms]) => {
          Object.entries(platforms).forEach(([platform, count]) => {
            dailyArray.push({ date, platform, count });
          });
        });
        setDailyAccesses(dailyArray.sort((a, b) => a.date.localeCompare(b.date)));
      } catch (error) {
        console.error('Error fetching feed analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [storeId]);

  return { totalAccesses, dailyAccesses, loading };
};
