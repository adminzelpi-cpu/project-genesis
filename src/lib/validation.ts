import { z } from 'zod';

// ==================== SCHEMAS ZOD ====================

export const personalDataSchema = z.object({
  email: z.string()
    .trim()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  fullName: z.string()
    .trim()
    .min(1, 'Nome completo é obrigatório')
    .max(100, 'Nome muito longo')
    .refine(name => name.split(' ').filter(n => n).length >= 2, {
      message: 'Digite nome e sobrenome'
    }),
  phone: z.string()
    .trim()
    .min(1, 'Telefone é obrigatório')
    .refine(phone => {
      const cleanPhone = phone.replace(/\D/g, '');
      return cleanPhone.length === 11;
    }, 'Telefone deve ter 11 dígitos (DDD + 9 dígitos)'),
  cpf: z.string()
    .trim()
    .min(1, 'CPF é obrigatório')
    .refine(validateCPF, 'CPF inválido')
});

export const deliveryAddressSchema = z.object({
  zipCode: z.string()
    .trim()
    .min(1, 'Preencha este campo')
    .refine(cep => {
      const cleanCep = cep.replace(/\D/g, '');
      return cleanCep.length === 8;
    }, 'CEP deve ter 8 dígitos'),
  street: z.string().trim().min(1, 'Preencha este campo').max(200, 'Endereço muito longo'),
  number: z.string().trim().max(20),
  complement: z.string().trim().max(100).optional(),
  neighborhood: z.string().trim().min(1, 'Preencha este campo').max(100, 'Bairro muito longo'),
  city: z.string().trim().min(1, 'Preencha este campo').max(100, 'Cidade muito longa'),
  state: z.string().trim().min(2, 'Preencha este campo').max(2),
  recipient: z.string().trim().min(1, 'Preencha este campo').max(100, 'Nome muito longo'),
  shippingMethod: z.string().optional(),
  observations: z.string().trim().max(500).optional(),
  orderNotes: z.string().trim().max(500).optional(),
  noNumber: z.boolean()
}).refine(data => {
  if (!data.noNumber && !data.number) {
    return false;
  }
  return true;
}, {
  message: 'Preencha este campo',
  path: ['number']
});

export const creditCardSchema = z.object({
  cardNumber: z.string()
    .trim()
    .min(1, 'Número do cartão é obrigatório')
    .refine(validateLuhn, 'Número do cartão inválido'),
  cardName: z.string()
    .trim()
    .min(1, 'Nome no cartão é obrigatório')
    .max(100, 'Nome muito longo')
    .refine(name => name.split(' ').length >= 2, {
      message: 'Digite nome e sobrenome como no cartão'
    }),
  cardExpiry: z.string()
    .trim()
    .min(1, 'Data de validade é obrigatória')
    .refine(expiry => {
      const [month, year] = expiry.split('/');
      if (!month || !year) return false;
      const monthNum = parseInt(month);
      const yearNum = parseInt('20' + year);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      if (monthNum < 1 || monthNum > 12) return false;
      if (yearNum < currentYear) return false;
      if (yearNum === currentYear && monthNum < currentMonth) return false;
      
      return true;
    }, 'Data de validade inválida ou cartão vencido'),
  cardCvv: z.string()
    .trim()
    .min(3, 'CVV deve ter 3 ou 4 dígitos')
    .max(4, 'CVV deve ter 3 ou 4 dígitos')
    .refine(cvv => /^\d{3,4}$/.test(cvv), 'CVV inválido'),
  installments: z.number().min(1).max(12)
});

// ==================== VALIDADORES ====================

/**
 * Valida CPF com dígitos verificadores
 */
export function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se não é sequência repetida (111.111.111-11, etc)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  
  // Verifica primeiro dígito
  if (digit1 !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  
  // Verifica segundo dígito
  return digit2 === parseInt(cleanCPF.charAt(10));
}

/**
 * Valida número de cartão usando algoritmo de Luhn
 */
export function validateLuhn(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  // Verifica se tem entre 13 e 19 dígitos
  if (cleanNumber.length < 13 || cleanNumber.length > 19) return false;
  
  let sum = 0;
  let isEven = false;
  
  // Loop do final para o início
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i));
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return (sum % 10) === 0;
}

/**
 * Valida email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;
  
  const parts = email.split('.');
  const lastPart = parts[parts.length - 1];
  return lastPart.length >= 2;
}

/**
 * Valida telefone brasileiro
 */
export function validatePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length === 11;
}

/**
 * Valida nome completo
 */
export function validateFullName(name: string): boolean {
  return name.trim().split(' ').filter(n => n).length >= 2 && name.trim().length >= 3;
}

/**
 * Valida CEP
 */
export function validateCEP(cep: string): boolean {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
}
