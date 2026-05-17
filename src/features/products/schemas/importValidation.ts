import { z } from 'zod';

// Schema de validação para produtos importados
export const importedProductSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome do produto é obrigatório')
    .max(200, 'Nome deve ter no máximo 200 caracteres')
    .refine(name => !/<script|javascript:/i.test(name), {
      message: 'Nome contém caracteres potencialmente perigosos'
    }),
  
  slug: z.string()
    .trim()
    .min(1, 'Slug é obrigatório')
    .max(200, 'Slug deve ter no máximo 200 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens')
    .refine(slug => !slug.startsWith('-') && !slug.endsWith('-'), {
      message: 'Slug não pode começar ou terminar com hífen'
    }),
  
  description: z.string()
    .max(5000, 'Descrição deve ter no máximo 5000 caracteres')
    .optional()
    .nullable()
    .transform(val => val || null),
  
  price: z.number()
    .min(0, 'Preço não pode ser negativo')
    .max(999999.99, 'Preço máximo excedido')
    .refine(price => Number.isFinite(price), {
      message: 'Preço deve ser um número válido'
    }),
  
  sale_price: z.number()
    .min(0, 'Preço promocional não pode ser negativo')
    .max(999999.99, 'Preço promocional máximo excedido')
    .optional()
    .nullable()
    .transform(val => val || null),
  
  stock_quantity: z.number()
    .int('Quantidade em estoque deve ser um número inteiro')
    .min(0, 'Estoque não pode ser negativo')
    .max(999999, 'Estoque máximo excedido')
    .optional()
    .default(0),
  
  brand: z.string()
    .trim()
    .max(100, 'Marca deve ter no máximo 100 caracteres')
    .optional()
    .nullable()
    .transform(val => val || null),
  
  category: z.string()
    .trim()
    .max(100, 'Categoria deve ter no máximo 100 caracteres')
    .optional()
    .nullable()
    .transform(val => val || null),
  
  weight: z.number()
    .min(0, 'Peso não pode ser negativo')
    .max(99999, 'Peso máximo excedido')
    .optional()
    .nullable()
    .transform(val => val || null),
  
  height: z.number()
    .min(0, 'Altura não pode ser negativa')
    .max(9999, 'Altura máxima excedida')
    .optional()
    .nullable()
    .transform(val => val || null),
  
  width: z.number()
    .min(0, 'Largura não pode ser negativa')
    .max(9999, 'Largura máxima excedida')
    .optional()
    .nullable()
    .transform(val => val || null),
  
  length: z.number()
    .min(0, 'Comprimento não pode ser negativo')
    .max(9999, 'Comprimento máximo excedido')
    .optional()
    .nullable()
    .transform(val => val || null),
  
  is_active: z.boolean()
    .optional()
    .default(true),

  images: z.array(z.string().url('URL de imagem inválida'))
    .optional()
    .nullable()
    .transform(val => val || null),
}).refine(data => {
  // Valida que preço promocional é menor que preço normal
  if (data.sale_price && data.sale_price >= data.price) {
    return false;
  }
  return true;
}, {
  message: 'Preço promocional deve ser menor que o preço normal',
  path: ['sale_price'],
});

export type ImportedProduct = z.infer<typeof importedProductSchema>;

export interface ValidationResult {
  valid: ImportedProduct[];
  invalid: {
    row: number;
    data: any;
    errors: string[];
  }[];
}

export const validateImportedProducts = (products: any[]): ValidationResult => {
  const result: ValidationResult = {
    valid: [],
    invalid: [],
  };

  products.forEach((product, index) => {
    try {
      const validated = importedProductSchema.parse(product);
      result.valid.push(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        result.invalid.push({
          row: index + 2, // +2 porque linha 1 é cabeçalho e arrays começam em 0
          data: product,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        });
      } else {
        result.invalid.push({
          row: index + 2,
          data: product,
          errors: ['Erro desconhecido ao validar produto'],
        });
      }
    }
  });

  return result;
};
