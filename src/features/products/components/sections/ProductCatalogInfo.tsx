import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Megaphone } from 'lucide-react';

interface ProductCatalogInfoProps {
  gender: string;
  ageGroup: string;
  material: string;
  onGenderChange: (value: string) => void;
  onAgeGroupChange: (value: string) => void;
  onMaterialChange: (value: string) => void;
}

const GENDER_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'unisex', label: 'Unissex' },
];

const AGE_GROUP_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'adult', label: 'Adulto' },
  { value: 'kids', label: 'Infantil' },
  { value: 'toddler', label: 'Bebê/Criança pequena' },
  { value: 'infant', label: 'Recém-nascido' },
  { value: 'newborn', label: 'Recém-nascido (0-3 meses)' },
];

export const ProductCatalogInfo = ({
  gender,
  ageGroup,
  material,
  onGenderChange,
  onAgeGroupChange,
  onMaterialChange,
}: ProductCatalogInfoProps) => {
  return (
    <div className="bg-card rounded-lg p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Informações para Catálogos de Anúncios</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Esses campos são usados nos feeds de catálogo (Meta, Google, Pinterest, TikTok) para melhorar a segmentação dos seus anúncios.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="gender">Gênero</Label>
          <Select value={gender} onValueChange={onGenderChange}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Selecione o gênero" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value || 'none'}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="age_group">Faixa Etária</Label>
          <Select value={ageGroup} onValueChange={onAgeGroupChange}>
            <SelectTrigger id="age_group">
              <SelectValue placeholder="Selecione a faixa etária" />
            </SelectTrigger>
            <SelectContent>
              {AGE_GROUP_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value || 'none'}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="material">Material</Label>
          <Input
            id="material"
            value={material}
            onChange={(e) => onMaterialChange(e.target.value)}
            placeholder="Ex: 100% Algodão"
          />
        </div>
      </div>
    </div>
  );
};
