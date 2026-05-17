export interface CustomerAddress {
  id: string;
  customer_id: string;
  tipo: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  store_id: string;
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  data_nascimento?: string;
  created_at: string;
  updated_at: string;
  customer_addresses?: CustomerAddress[];
}

export interface CustomerFormData {
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  data_nascimento?: string;
  // Endereço principal
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}
