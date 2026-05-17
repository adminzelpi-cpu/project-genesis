import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useProducts } from '../hooks/useProducts';
import { useProductVariantsMutation, useLoadProductVariants } from '../hooks/useProductVariantsMutation';
import { ProductInitialDialog, type GenerationMode } from './ProductInitialDialog';
import { ProductVariationsManager } from './variations/ProductVariationsManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import type { Product } from '../types';
import { ProductVariation, useProductVariationsV2 } from '@/features/attributes';
import { useAttributes } from '@/features/attributes/hooks/useAttributes';
import type { ProductVariantForm } from './VariantManager';
import { useStore as useStoreHook } from '@/features/stores/hooks/useStore';
import { useCategories } from '@/features/categories/hooks/useCategories';

// Section Components
import { ProductBasicInfo } from './sections/ProductBasicInfo';
import { ProductImages } from './sections/ProductImages';
import { ProductPricing } from './sections/ProductPricing';
import { ProductInventory } from './sections/ProductInventory';
import { ProductCodes } from './sections/ProductCodes';
import { ProductDimensions } from './sections/ProductDimensions';
import { ProductSEO } from './sections/ProductSEO';
import { ProductStatus } from './sections/ProductStatus';
import { ProductCategories } from './sections/ProductCategories';
import { ProductBrand } from './sections/ProductBrand';
import { ProductSizeGuide } from './sections/ProductSizeGuide';
import { ProductVariationDisplay } from './sections/ProductVariationDisplay';
import { ProductCatalogInfo } from './sections/ProductCatalogInfo';

interface ProductFormProps {
  storeId: string;
  product?: Product;
  onSuccess?: (productId?: string) => void;
}

export const ProductForm = ({ storeId, product, onSuccess }: ProductFormProps) => {
  const navigate = useNavigate();
  const { createProduct, updateProduct, loading } = useProducts();
  const { saveVariants, loading: savingVariants } = useProductVariantsMutation();
  const { data: existingVariants = [] } = useLoadProductVariants(product?.id);
  const { 
    variations: existingVariationsV2 = [], 
    saveVariations: saveVariationsV2,
    isSaving: savingVariationsV2 
  } = useProductVariationsV2(product?.id);
  const { attributes } = useAttributes(storeId);
  
  const [showInitialDialog, setShowInitialDialog] = useState(!product);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [generationTarget, setGenerationTarget] = useState<GenerationMode | null>(null);
  const [contentGenerated, setContentGenerated] = useState(!!product);
  const [sizeGuideId, setSizeGuideId] = useState<string | null>(product?.size_guide_id || null);
  const [store, setStore] = useState<any>(null);
  const [categoryValidationError, setCategoryValidationError] = useState(false);
  const [priceValidationError, setPriceValidationError] = useState(false);
  const [variationPriceError, setVariationPriceError] = useState(false);
  const categorySectionRef = useRef<HTMLDivElement>(null);
  const priceSectionRef = useRef<HTMLDivElement>(null);
  const variationsSectionRef = useRef<HTMLDivElement>(null);
  const [storeCategories, setStoreCategories] = useState<{ id: string; name: string }[]>([]);
  const { getStoreCategories, createCategory: createCategoryFn } = useCategories();
  
  // Find color attribute ID
  const colorAttributeId = useMemo(() => {
    return attributes?.find(a => a.type === 'color')?.id;
  }, [attributes]);


  const [formData, setFormData] = useState({
    name: product?.name || '',
    slug: product?.slug || '',
    description: product?.description || '',
    price: product && product.price ? product.price : '',
    sale_price: (product as any)?.sale_price ? (product as any).sale_price : '',
    stock_quantity: product && product.stock_quantity ? product.stock_quantity : '',
    weight: (product as any)?.weight ? (product as any).weight : '',
    length: (product as any)?.length ? (product as any).length : '',
    width: (product as any)?.width ? (product as any).width : '',
    height: (product as any)?.height ? (product as any).height : '',
    category_ids: (product as any)?.category_ids || [],
    brand: (product as any)?.brand || '',
    tags: (product as any)?.tags || [],
    images: product?.images || [],
    meta_title: (product as any)?.meta_title || '',
    meta_description: (product as any)?.meta_description || '',
    structured_data: (product as any)?.structured_data || {},
    ai_generated_description: product?.ai_generated_description || false,
    is_active: product?.is_active ?? true,
    display_variations_separately: (product as any)?.display_variations_separately ?? false,
    hide_parent_product: (product as any)?.hide_parent_product ?? true,
    gender: (product as any)?.gender || '',
    age_group: (product as any)?.age_group || '',
    material: (product as any)?.material || '',
  });

  const [variants, setVariants] = useState<ProductVariantForm[]>([]);
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [simpleSku, setSimpleSku] = useState((product as any)?.sku || '');
  const [simpleBarcode, setSimpleBarcode] = useState((product as any)?.barcode || '');

  // Derive first category name for image standardization suggestion
  const primaryCategoryName = useMemo(() => {
    if (formData.category_ids.length === 0 || storeCategories.length === 0) return undefined;
    const cat = storeCategories.find(c => c.id === formData.category_ids[0]);
    return cat?.name;
  }, [formData.category_ids, storeCategories]);

  useEffect(() => {
    if (existingVariants.length > 0) {
      setVariants(existingVariants.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type as "color" | "size" | "style",
        value: v.value,
        image_url: v.image_url || undefined,
        price_adjustment: Number(v.price_adjustment),
        stock_quantity: v.stock_quantity,
        is_active: v.is_active,
      })));
    }
  }, [existingVariants]);

  useEffect(() => {
    if (existingVariationsV2.length > 0) {
      setProductVariations(existingVariationsV2);
    }
  }, [existingVariationsV2]);

  const [storeBaseUrl, setStoreBaseUrl] = useState<string>('');

  useEffect(() => {
    const loadStore = async () => {
      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();
      if (storeData) {
        setStore(storeData);

        // Check for custom domain first, then fall back to subdomain
        const { data: customDomain } = await supabase
          .from('custom_domains')
          .select('domain')
          .eq('store_id', storeId)
          .eq('is_verified', true)
          .eq('is_primary', true)
          .maybeSingle();

        if (customDomain?.domain) {
          setStoreBaseUrl(`https://${customDomain.domain}`);
        } else if (storeData.slug) {
          setStoreBaseUrl(`https://${storeData.slug}.zelpi.com.br`);
        }
      }
    };
    const loadCategories = async () => {
      const cats = await getStoreCategories(storeId);
      setStoreCategories(cats.map(c => ({ id: c.id, name: c.name })));
    };
    loadStore();
    loadCategories();
  }, [storeId]);

   // Convert AI-generated content to properly formatted HTML
  const convertToFormattedHTML = (text: string): string => {
    // Se já tiver tags HTML bem formatadas, retorna como está
    if (text.includes('<p>') || text.includes('<ul>') || text.includes('<h3>')) {
      return text;
    }
    
    let html = text;
    
    // Identifica e converte títulos de seção (linhas que terminam com ":" e estão sozinhas ou em negrito)
    // Ex: "Principais Características:", "**Benefícios:**", "Especificações Técnicas:"
    html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^\*\*(.+:)\*\*\s*$/gm, '<h3>$1</h3>');
    html = html.replace(/^([A-Z][^:\n]{10,50}:)\s*$/gm, '<h3>$1</h3>');
    
    // Converte listas com labels em negrito
    // Ex: "* **Material:** Algodão" -> <li><strong>Material:</strong> Algodão</li>
    html = html.replace(/[*•]\s+\*\*([^*:]+:)\*\*\s+([^\n]+)/g, '<li><strong>$1</strong> $2</li>');
    
    // Converte listas simples
    html = html.replace(/[*•]\s+([^\n]+)/g, '<li>$1</li>');
    
    // Agrupa listas consecutivas em <ul>
    html = html.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)+/gs, (match) => {
      return '<ul>' + match + '</ul>';
    });
    
    // Converte negrito restante
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Converte parágrafos (texto que não é h3, ul ou li)
    html = html.split('\n\n').map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.includes('<h3>') || trimmed.includes('<ul>') || trimmed.includes('<li>')) {
        return trimmed;
      }
      return '<p>' + trimmed + '</p>';
    }).filter(Boolean).join('\n');
    
    return html;
  };

  const getPlainTextDescription = (html: string) => {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getInitialGenerationContext = () => {
    return getPlainTextDescription(formData.description).slice(0, 300);
  };

  const handleGenerateWithAI = async (productName: string, shortDescription: string, descriptionStyle: any) => {
    setIsGenerating(true);
    try {
      // Get last created product for pattern matching
      const lastProductStr = localStorage.getItem('lastCreatedProduct');
      const lastProduct = lastProductStr ? JSON.parse(lastProductStr) : null;

      // Get existing categories to pass to AI
      const existingCategories = await getStoreCategories(storeId);

      const { data, error } = await supabase.functions.invoke('generate-product-content', {
        body: { 
          productName, 
          shortDescription,
          descriptionStyle,
          lastProduct,
          existingCategories: existingCategories.map(c => ({ id: c.id, name: c.name }))
        }
      });

      if (error) throw error;

      // Keep the original name the user typed — AI only generates description + SEO
      const slug = productName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents properly
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Handle suggested category
      let categoryIds: string[] = [];
      if (data.suggestedCategory) {
        if (data.suggestedCategory.existingId) {
          // AI matched an existing category
          const exists = existingCategories.some(c => c.id === data.suggestedCategory.existingId);
          if (exists) {
            categoryIds = [data.suggestedCategory.existingId];
          }
        }
        
        if (categoryIds.length === 0 && data.suggestedCategory.name) {
          // Create a new category
          try {
            const newCat = await createCategoryFn({
              store_id: storeId,
              name: data.suggestedCategory.name,
              slug: data.suggestedCategory.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
              is_active: true,
            });
            if (newCat?.id) {
              categoryIds = [newCat.id];
            }
          } catch (err) {
            console.error('Erro ao criar categoria sugerida:', err);
          }
        }
      }

      setFormData(prev => ({
        ...prev,
        name: productName,
        slug,
        description: convertToFormattedHTML(data.fullDescription),
        meta_title: data.metaTitle,
        meta_description: data.metaDescription,
        structured_data: data.structuredData,
        ai_generated_description: true,
        category_ids: categoryIds.length > 0 ? categoryIds : prev.category_ids,
      }));


      setShowInitialDialog(false);
      setContentGenerated(true);

      toast({
        title: "Conteúdo gerado com sucesso!",
        description: categoryIds.length > 0 
          ? "Revise o conteúdo e a categoria sugerida antes de salvar."
          : "Revise e edite conforme necessário antes de salvar.",
      });
    } catch (error) {
      console.error('Erro ao gerar conteúdo:', error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar conteúdo",
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFieldWithAI = async (field: 'meta_title' | 'meta_description') => {
    if (!formData.name.trim()) {
      // Open modal in SEO mode to collect product info first
      setGenerationTarget('seo');
      return;
    }

    const productContext = getInitialGenerationContext();

    if (!productContext) {
      setGenerationTarget('seo');
      return;
    }

    setGeneratingField(field);
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-content', {
        body: { 
          productName: formData.name,
          shortDescription: productContext,
          descriptionStyle: JSON.parse(localStorage.getItem('productDescriptionStyle') || '{"length":"medium","format":"mixed","focus":"benefits","tone":"persuasive","includeCTA":true}')
        }
      });

      if (error) throw error;

      if (data) {
        const fieldMap = {
          meta_title: data.metaTitle,
          meta_description: data.metaDescription
        };
        
        setFormData(prev => ({ ...prev, [field]: fieldMap[field] || '' }));
        toast({
          title: "Campo gerado com sucesso!",
        });
      }
    } catch (error) {
      console.error("Erro ao gerar campo:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar campo. Tente novamente.",
      });
    } finally {
      setGeneratingField(null);
    }
  };

  const handleGenerateDescription = async () => {
    setGenerationTarget('description');
  };

  const handleContextualGenerate = async (productName: string, shortDescription: string, descriptionStyle: any) => {
    const target = generationTarget;
    setIsGenerating(true);
    try {
      const lastProductStr = localStorage.getItem('lastCreatedProduct');
      const lastProduct = lastProductStr ? JSON.parse(lastProductStr) : null;
      const existingCategories = await getStoreCategories(storeId);

      const { data, error } = await supabase.functions.invoke('generate-product-content', {
        body: { 
          productName, 
          shortDescription,
          descriptionStyle,
          lastProduct,
          existingCategories: existingCategories.map(c => ({ id: c.id, name: c.name }))
        }
      });

      if (error) throw error;

      if (target === 'seo') {
        // Only apply SEO fields
        setFormData(prev => ({
          ...prev,
          // Keep existing name, don't replace with AI title
          meta_title: data.metaTitle,
          meta_description: data.metaDescription,
          structured_data: data.structuredData,
        }));
        toast({ title: "SEO gerado com sucesso!" });
      } else if (target === 'description') {
        // Apply description + SEO
        setFormData(prev => ({
          ...prev,
          // Keep existing name, don't replace with AI title
          description: convertToFormattedHTML(data.fullDescription),
          meta_title: prev.meta_title || data.metaTitle,
          meta_description: prev.meta_description || data.metaDescription,
          structured_data: data.structuredData,
          ai_generated_description: true,
        }));
        toast({ title: "Descrição gerada com sucesso!", description: "Revise e edite conforme necessário." });
      }
    } catch (error) {
      console.error('Erro ao gerar conteúdo:', error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar conteúdo",
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setIsGenerating(false);
      setGenerationTarget(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Collect all validation errors first, then scroll to the first one
    const hasVariations = productVariations.length > 0;
    const missingCategory = formData.category_ids.length === 0;
    const missingPrice = !hasVariations && (formData.price === '' || Number(formData.price) <= 0);
    const variationsWithoutPrice = hasVariations 
      ? productVariations.filter(v => !v.price || v.price <= 0) 
      : [];
    const missingVariationPrices = variationsWithoutPrice.length > 0;

    // Reset errors
    setCategoryValidationError(missingCategory);
    setPriceValidationError(missingPrice);
    setVariationPriceError(missingVariationPrices);

    // Scroll to the first error found (priority: category > price/variations)
    if (missingCategory) {
      toast({
        variant: "destructive",
        title: "Categoria obrigatória",
        description: "Selecione pelo menos uma categoria para salvar o produto.",
      });
      categorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (missingPrice) {
      toast({
        variant: "destructive",
        title: "Preço obrigatório",
        description: "Informe o preço do produto antes de salvar.",
      });
      priceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (missingVariationPrices) {
      toast({
        variant: "destructive",
        title: "Variações sem preço",
        description: `${variationsWithoutPrice.length} variação(ões) estão sem preço. Defina o preço de todas as variações.`,
      });
      variationsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Validate sale price < price (main product)
    const numPrice = Number(formData.price);
    const numSalePrice = Number(formData.sale_price);
    if (!hasVariations && numSalePrice > 0 && numPrice > 0 && numSalePrice >= numPrice) {
      toast({
        variant: "destructive",
        title: "Preço promocional inválido",
        description: "O preço promocional deve ser menor que o preço normal.",
      });
      priceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Validate sale price < price in variations
    if (hasVariations) {
      const invalidVariations = productVariations.filter(v => {
        const sp = (v as any).sale_price;
        return sp != null && sp > 0 && v.price > 0 && sp >= v.price;
      });
      if (invalidVariations.length > 0) {
        toast({
          variant: "destructive",
          title: "Preço promocional inválido",
          description: `${invalidVariations.length} variação(ões) têm preço promocional maior ou igual ao preço normal.`,
        });
        variationsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    // Gerar slug único se não existir
    let slug = formData.slug;
    if (!slug || slug.trim() === '') {
      slug = formData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Verificar se slug já existe e adicionar sufixo numérico se necessário
      let finalSlug = slug;
      let counter = 1;
      let slugExists = true;
      
      while (slugExists) {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('store_id', storeId)
          .eq('slug', finalSlug)
          .neq('id', product?.id || '')
          .maybeSingle();
        
        if (!existingProduct) {
          slugExists = false;
          slug = finalSlug;
        } else {
          finalSlug = `${slug}-${counter}`;
          counter++;
        }
      }
    }
    
    const productData = {
      ...formData,
      slug,
      price: formData.price === '' ? 0 : Number(formData.price),
      sale_price: formData.sale_price === '' ? 0 : Number(formData.sale_price),
      stock_quantity: formData.stock_quantity === '' ? 0 : Number(formData.stock_quantity),
      weight: formData.weight === '' ? 0 : Number(formData.weight),
      length: formData.length === '' ? 0 : Number(formData.length),
      width: formData.width === '' ? 0 : Number(formData.width),
      height: formData.height === '' ? 0 : Number(formData.height),
      display_variations_separately: formData.display_variations_separately,
      hide_parent_product: formData.hide_parent_product,
      // Produto simples: salva o SKU/barcode digitado.
      // Produto com variações: limpa pra evitar dado órfão (códigos vivem em product_variations_v2).
      sku: hasVariations ? null : (simpleSku.trim() || null),
      barcode: hasVariations ? null : (simpleBarcode.trim() || null),
    };

    try {
      let productId: string;

      if (product) {
        await updateProduct(product.id, productData);
        productId = product.id;
      } else {
        const newProduct = await createProduct({
          ...productData,
          store_id: storeId,
          is_active: true,
        });
        productId = newProduct.id;
      }

      if (variants.length > 0) {
        await saveVariants({ productId, variants });
      }

      if (productVariations.length > 0) {
        await saveVariationsV2({ productId, variations: productVariations });
      }

      // Save last created product for pattern matching
      if (!product) {
        localStorage.setItem('lastCreatedProduct', JSON.stringify({
          name: formData.name,
          description: formData.description
        }));
      }

      onSuccess?.(productId);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    }
  };

  return (
    <>
      {!product && (
        <ProductInitialDialog
          open={showInitialDialog}
          onClose={() => {
            setShowInitialDialog(false);
            setContentGenerated(true);
          }}
          onGenerate={handleGenerateWithAI}
        />
      )}

      {/* Contextual dialog for description/SEO generation */}
      {generationTarget && (
        <ProductInitialDialog
          open={!!generationTarget}
          onClose={() => setGenerationTarget(null)}
          onGenerate={handleContextualGenerate}
          initialName={formData.name}
          initialShortDescription={getInitialGenerationContext()}
          mode={generationTarget === 'seo' ? 'seo' : 'description'}
        />
      )}
      
      {(contentGenerated || product) && (
        <form onSubmit={handleSubmit} className="pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-6 max-w-[1600px] mx-auto">
            {/* COLUNA PRINCIPAL - 75% */}
            <div className="space-y-6 min-w-0">
              {/* Informações Básicas */}
              <ProductBasicInfo
                name={formData.name}
                slug={formData.slug}
                description={formData.description}
                onNameChange={(value) => {
                  const newData = { ...formData, name: value };
                  // Auto-generate slug from name if slug is empty or matches auto-generated from old name
                  const autoSlugFromOld = formData.name
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
                  if (!formData.slug || formData.slug === autoSlugFromOld) {
                    newData.slug = value
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '');
                  }
                  setFormData(newData);
                }}
                onSlugChange={(value) => setFormData({ ...formData, slug: value })}
                onDescriptionChange={(value) => setFormData({ ...formData, description: value })}
                onGenerateDescription={handleGenerateDescription}
                isGenerating={isGenerating}
                productId={product?.id}
                storeBaseUrl={storeBaseUrl}
              />

              {/* Imagens */}
              <ProductImages
                images={formData.images}
                onImagesChange={(images) => setFormData({ ...formData, images })}
                storeId={storeId}
                productName={formData.name}
                hasVariations={productVariations.length > 0}
                categoryName={primaryCategoryName}
              />

              {/* Preço */}
              <div ref={priceSectionRef}>
                <ProductPricing
                  price={formData.price}
                  hasVariations={productVariations.length > 0}
                  variations={productVariations}
                  salePrice={formData.sale_price}
                  onPriceChange={(value) => {
                    setFormData({ ...formData, price: value });
                    if (value && Number(value) > 0) setPriceValidationError(false);
                  }}
                  onSalePriceChange={(value) => setFormData({ ...formData, sale_price: value })}
                  validationError={priceValidationError}
                />
              </div>

              {/* Inventário */}
              <ProductInventory
                stockQuantity={formData.stock_quantity}
                onStockChange={(value) => setFormData({ ...formData, stock_quantity: value })}
                hasVariations={productVariations.length > 0}
              />

              {/* Códigos */}
              <ProductCodes
                hasVariations={productVariations.length > 0}
                productCode={(product as any)?.product_code}
                sku={simpleSku}
                barcode={simpleBarcode}
                onSkuChange={setSimpleSku}
                onBarcodeChange={setSimpleBarcode}
              />

              {/* Peso e Dimensões */}
              <ProductDimensions
                weight={formData.weight}
                length={formData.length}
                width={formData.width}
                height={formData.height}
                onWeightChange={(value) => setFormData({ ...formData, weight: value })}
                onLengthChange={(value) => setFormData({ ...formData, length: value })}
                onWidthChange={(value) => setFormData({ ...formData, width: value })}
                onHeightChange={(value) => setFormData({ ...formData, height: value })}
                hasVariations={productVariations.length > 0}
              />

              {/* Atributos e Variações */}
              <div ref={variationsSectionRef} className={`bg-card rounded-lg p-6 shadow-sm ${variationPriceError ? 'ring-2 ring-destructive' : ''}`}>
                <h3 className="font-semibold mb-4">Atributos e variações</h3>
                {variationPriceError && (
                  <p className="text-sm text-destructive mb-4">
                    Defina o preço de todas as variações antes de salvar.
                  </p>
                )}
                <ProductVariationsManager
                  storeId={storeId}
                  productId={product?.id}
                  productCode={(product as any)?.product_code}
                  variations={productVariations}
                  onChange={(v) => {
                    setProductVariations(v);
                    if (v.every(variation => variation.price && variation.price > 0)) {
                      setVariationPriceError(false);
                    }
                  }}
                  basePrice={Number(formData.price || 0)}
                  productName={formData.name}
                />
              </div>

              {/* Configuração de exibição de variações */}
              <ProductVariationDisplay
                displaySeparately={formData.display_variations_separately}
                onDisplaySeparatelyChange={(value) => setFormData({ ...formData, display_variations_separately: value })}
                hideParentProduct={formData.hide_parent_product}
                onHideParentProductChange={(value) => setFormData({ ...formData, hide_parent_product: value })}
                hasColorVariations={colorAttributeId ? new Set(productVariations.filter(v => v.attributes?.[colorAttributeId]).map(v => v.attributes[colorAttributeId])).size > 1 : false}
              />

              {/* Informações para Catálogos de Anúncios */}
              <ProductCatalogInfo
                gender={formData.gender}
                ageGroup={formData.age_group}
                material={formData.material}
                onGenderChange={(value) => setFormData({ ...formData, gender: value === 'none' ? '' : value })}
                onAgeGroupChange={(value) => setFormData({ ...formData, age_group: value === 'none' ? '' : value })}
                onMaterialChange={(value) => setFormData({ ...formData, material: value })}
              />

              {/* SEO */}
              <ProductSEO
                metaTitle={formData.meta_title}
                metaDescription={formData.meta_description}
                slug={formData.slug}
                productImage={(() => {
                  if (formData.images?.[0]?.url) {
                    return formData.images[0].url;
                  }
                  if (productVariations.length > 0) {
                    const firstVariation = productVariations[0];
                    if (firstVariation.images && Array.isArray(firstVariation.images) && firstVariation.images.length > 0) {
                      return firstVariation.images[0]?.url;
                    } else if (firstVariation.image_url) {
                      return firstVariation.image_url;
                    }
                  }
                  return undefined;
                })()}
                storeName={store?.name}
                storeBaseUrl={storeBaseUrl}
                onMetaTitleChange={(value) => setFormData({ ...formData, meta_title: value })}
                onMetaDescriptionChange={(value) => setFormData({ ...formData, meta_description: value })}
                onSlugChange={(value) => setFormData({ ...formData, slug: value })}
                onGenerateField={generateFieldWithAI}
                generatingField={generatingField}
              />
            </div>

            {/* COLUNA LATERAL - 25% */}
            <div className="space-y-6 min-w-0">
              {/* Status */}
              <ProductStatus
                isActive={formData.is_active}
                onStatusChange={(value) => setFormData({ ...formData, is_active: value })}
              />

              {/* Categorias */}
              <div ref={categorySectionRef}>
                <ProductCategories
                  storeId={storeId}
                  selectedCategoryIds={formData.category_ids}
                  onCategoriesChange={(categoryIds) => {
                    setFormData({ ...formData, category_ids: categoryIds });
                    if (categoryIds.length > 0) setCategoryValidationError(false);
                  }}
                  validationError={categoryValidationError}
                />
              </div>

              {/* Marca */}
              <ProductBrand
                storeId={storeId}
                brand={formData.brand}
                onBrandChange={(brand) => setFormData({ ...formData, brand })}
              />

              {/* Guia de Tamanhos */}
              <ProductSizeGuide
                sizeGuideId={sizeGuideId}
                onSizeGuideChange={setSizeGuideId}
                storeId={storeId}
              />
            </div>
          </div>

          {/* Botão Fixo de Salvar */}
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t z-50">
            <div className="max-w-[1400px] mx-auto px-6 py-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard/products')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || savingVariants || savingVariationsV2}
                className="min-w-[120px]"
              >
                {(loading || savingVariants || savingVariationsV2) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar produto
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </>
  );
};
