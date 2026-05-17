import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { Product } from '../types';

export const useProductImportExport = () => {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportToCSV = (products: Product[], filename: string = 'produtos') => {
    setExporting(true);
    try {
      if (!products.length) {
        toast({
          variant: 'destructive',
          title: 'Nenhum produto para exportar',
        });
        return;
      }

      const headers = [
        'Nome',
        'Slug',
        'Descrição',
        'Preço',
        'Preço Promocional',
        'Estoque',
        'SKU',
        'Marca',
        'Categoria',
        'Status',
        'Peso (kg)',
        'Altura (cm)',
        'Largura (cm)',
        'Comprimento (cm)',
      ];

      const rows = products.map(p => [
        p.name,
        p.slug,
        p.description || '',
        p.price,
        p.sale_price || '',
        p.stock_quantity || 0,
        '', // SKU (será das variações)
        p.brand || '',
        p.category || '',
        p.is_active ? 'Ativo' : 'Inativo',
        p.weight || '',
        p.height || '',
        p.width || '',
        p.length || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: 'Exportação concluída',
        description: `${products.length} produto(s) exportado(s)`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao exportar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setExporting(false);
    }
  };

  // Parser CSV robusto que lida com campos entre aspas e vírgulas internas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const importFromCSV = (file: File, onComplete: (data: any[]) => void) => {
    setImporting(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          throw new Error('Arquivo vazio');
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV deve ter pelo menos um cabeçalho e uma linha de dados');
        }

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
        const products = [];

        // Mapeamento flexível de colunas (WooCommerce e formato próprio)
        const columnMap: Record<string, string[]> = {
          name: ['nome', 'name', 'título', 'title', 'produto'],
          slug: ['slug', 'url', 'permalink'],
          description: ['descrição', 'description', 'descrição curta', 'short description'],
          price: ['preço', 'price', 'preço normal', 'regular price', 'regular_price'],
          sale_price: ['preço promocional', 'sale price', 'sale_price', 'preço de venda'],
          stock_quantity: ['estoque', 'stock', 'stock quantity', 'stock_quantity', 'quantidade'],
          sku: ['sku', 'código'],
          brand: ['marca', 'brand'],
          category: ['categoria', 'category', 'categorias', 'categories'],
          weight: ['peso', 'weight', 'peso (kg)'],
          height: ['altura', 'height', 'altura (cm)'],
          width: ['largura', 'width', 'largura (cm)'],
          length: ['comprimento', 'length', 'comprimento (cm)'],
        };

        const findColumnIndex = (field: string): number => {
          const possibleNames = columnMap[field] || [field];
          return headers.findIndex(h => 
            possibleNames.some(name => h.includes(name))
          );
        };

        for (let i = 1; i < lines.length; i++) {
          try {
            const values = parseCSVLine(lines[i]);
            
            const getName = () => {
              const idx = findColumnIndex('name');
              return idx >= 0 ? values[idx] : '';
            };

            const name = getName();
            if (!name || name.trim() === '') continue; // Pula linhas sem nome

            const getPrice = () => {
              const idx = findColumnIndex('price');
              if (idx < 0) return 0;
              const priceStr = values[idx].replace(/[^\d,.-]/g, '').replace(',', '.');
              return parseFloat(priceStr) || 0;
            };

            const getSalePrice = () => {
              const idx = findColumnIndex('sale_price');
              if (idx < 0) return null;
              const priceStr = values[idx].replace(/[^\d,.-]/g, '').replace(',', '.');
              const price = parseFloat(priceStr);
              return price > 0 ? price : null;
            };

            const getSlug = () => {
              const idx = findColumnIndex('slug');
              if (idx >= 0 && values[idx]) return values[idx];
              return name.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            };

            const product: any = {
              name: name.trim(),
              slug: getSlug(),
              description: values[findColumnIndex('description')] || '',
              price: getPrice(),
              sale_price: getSalePrice(),
              stock_quantity: parseInt(values[findColumnIndex('stock_quantity')] || '0') || 0,
              brand: values[findColumnIndex('brand')] || null,
              category: values[findColumnIndex('category')] || null,
              is_active: true,
              weight: parseFloat(values[findColumnIndex('weight')] || '0') || null,
              height: parseFloat(values[findColumnIndex('height')] || '0') || null,
              width: parseFloat(values[findColumnIndex('width')] || '0') || null,
              length: parseFloat(values[findColumnIndex('length')] || '0') || null,
            };

            products.push(product);
          } catch (lineError) {
            console.warn(`Erro ao processar linha ${i + 1}:`, lineError);
            // Continua processando outras linhas
          }
        }

        if (products.length === 0) {
          throw new Error('Nenhum produto válido encontrado no arquivo');
        }

        toast({
          title: 'Importação concluída',
          description: `${products.length} produto(s) importado(s) com sucesso`,
        });

        onComplete(products);
      } catch (error) {
        console.error('Erro na importação:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao importar CSV',
          description: error instanceof Error ? error.message : 'Formato de arquivo inválido. Verifique se o CSV está correto.',
        });
      } finally {
        setImporting(false);
      }
    };

    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível ler o arquivo. Tente novamente.',
      });
      setImporting(false);
    };

    reader.readAsText(file, 'UTF-8');
  };

  return {
    exportToCSV,
    importFromCSV,
    importing,
    exporting,
  };
};
