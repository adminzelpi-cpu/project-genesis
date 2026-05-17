import { ProductVariation } from "@/features/attributes/types";

/**
 * Hook/utility para gerenciar lógica de variações hierárquicas
 */

/**
 * Organiza variações flat em estrutura hierárquica pai-filho
 */
export const organizeHierarchicalVariations = (
  variations: ProductVariation[]
): ProductVariation[] => {
  // Separar pais e filhos
  const parents = variations.filter(v => v.is_parent || !v.parent_id);
  const children = variations.filter(v => !v.is_parent && v.parent_id);

  // Associar filhos aos pais
  return parents.map(parent => ({
    ...parent,
    _children: children.filter(child => child.parent_id === parent.id),
    _isExpanded: true, // Por padrão, todos vêm expandidos
  }));
};

/**
 * Duplica uma variação (pai duplica todas as filhas)
 */
export const duplicateVariation = (
  variation: ProductVariation,
  allVariations: ProductVariation[]
): ProductVariation[] => {
  const newVariations: ProductVariation[] = [];
  
  // Criar cópia do pai sem o ID
  const parentCopy: ProductVariation = {
    ...variation,
    id: undefined, // Novo ID será gerado ao salvar
    sku: variation.sku ? `${variation.sku}-copy` : undefined,
  };
  
  newVariations.push(parentCopy);

  // Se é pai, duplicar todas as filhas também
  if (variation.is_parent && variation.id) {
    const children = allVariations.filter(v => v.parent_id === variation.id);
    children.forEach(child => {
      newVariations.push({
        ...child,
        id: undefined, // Novo ID será gerado
        parent_id: undefined, // Será associado ao novo pai após salvar
        sku: child.sku ? `${child.sku}-copy` : undefined,
      });
    });
  }

  return newVariations;
};

/**
 * Deleta uma variação (pai deleta todas as filhas em cascata)
 */
export const getVariationsToDelete = (
  variation: ProductVariation,
  allVariations: ProductVariation[]
): string[] => {
  const idsToDelete: string[] = [];
  
  if (variation.id) {
    idsToDelete.push(variation.id);
  }

  // Se é pai, incluir todas as filhas
  if (variation.is_parent && variation.id) {
    const children = allVariations.filter(v => v.parent_id === variation.id);
    children.forEach(child => {
      if (child.id) {
        idsToDelete.push(child.id);
      }
    });
  }

  return idsToDelete;
};

/**
 * Aplica herança de campos do pai para filhas que não têm override
 */
export const applyParentInheritance = (
  parent: ProductVariation,
  children: ProductVariation[]
): ProductVariation[] => {
  return children.map(child => {
    const overrides = child.override_fields || {};
    
    return {
      ...child,
      // Herdar campos do pai se não houver override
      price: overrides.price ? child.price : parent.price,
      sale_price: overrides.sale_price ? child.sale_price : parent.sale_price,
      stock_quantity: overrides.stock_quantity ? child.stock_quantity : parent.stock_quantity,
      weight: overrides.weight ? child.weight : parent.weight,
      height: overrides.height ? child.height : parent.height,
      width: overrides.width ? child.width : parent.width,
      length: overrides.length ? child.length : parent.length,
      sku: overrides.sku ? child.sku : parent.sku,
      gtin: overrides.gtin ? child.gtin : parent.gtin,
      ean: overrides.ean ? child.ean : parent.ean,
      upc: overrides.upc ? child.upc : parent.upc,
      mpn: overrides.mpn ? child.mpn : parent.mpn,
      images: overrides.images ? child.images : parent.images,
    };
  });
};
