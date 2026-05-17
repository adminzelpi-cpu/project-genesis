import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStorePath } from "@/contexts/StoreSlugContext";

interface UseCategoryBreadcrumbsResult {
  breadcrumbs: Array<{ label: string; href: string }>;
  isLoading: boolean;
}

/**
 * Fetches category hierarchy for breadcrumbs
 * Returns an array of breadcrumb items from root to current category
 */
export function useCategoryBreadcrumbs(
  categoryId: string | undefined | null,
  storeSlug: string
): UseCategoryBreadcrumbsResult {
  const { buildPath } = useStorePath();
  const { data: breadcrumbs = [], isLoading } = useQuery({
    queryKey: ["category-breadcrumbs", categoryId, storeSlug],
    queryFn: async () => {
      if (!categoryId) return [];

      const { data: category, error } = await supabase
        .from("product_categories")
        .select("id, name, slug, parent_id")
        .eq("id", categoryId)
        .maybeSingle();

      if (error || !category) return [];

      const breadcrumbItems: Array<{ label: string; href: string }> = [];

      if (category.parent_id) {
        const { data: parentCategory } = await supabase
          .from("product_categories")
          .select("id, name, slug, parent_id")
          .eq("id", category.parent_id)
          .maybeSingle();

        if (parentCategory) {
          if (parentCategory.parent_id) {
            const { data: grandparentCategory } = await supabase
              .from("product_categories")
              .select("id, name, slug")
              .eq("id", parentCategory.parent_id)
              .maybeSingle();

            if (grandparentCategory) {
              breadcrumbItems.push({
                label: grandparentCategory.name,
                href: buildPath(`/category/${grandparentCategory.slug}`),
              });
            }
          }

          breadcrumbItems.push({
            label: parentCategory.name,
            href: buildPath(`/category/${parentCategory.slug}`),
          });
        }
      }

      breadcrumbItems.push({
        label: category.name,
        href: buildPath(`/category/${category.slug}`),
      });

      return breadcrumbItems;
    },
    enabled: !!categoryId,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  return { breadcrumbs, isLoading };
}

/**
 * Fetches category info for a product to build breadcrumbs
 * Returns breadcrumb items for the product's primary category
 */
export function useProductCategoryBreadcrumbs(
  categoryIds: string[] | undefined | null,
  storeSlug: string
): UseCategoryBreadcrumbsResult {
  // Use the first category (primary) for breadcrumbs
  const primaryCategoryId = categoryIds?.[0];
  
  return useCategoryBreadcrumbs(primaryCategoryId, storeSlug);
}
