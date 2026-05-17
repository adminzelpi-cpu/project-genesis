import { ImageUploader } from '../ImageUploader';
import { Info } from 'lucide-react';

interface ProductImagesProps {
  images: any[];
  onImagesChange: (images: any[]) => void;
  storeId?: string;
  productName?: string;
  hasVariations?: boolean;
  categoryName?: string;
}

export const ProductImages = ({ images, onImagesChange, storeId, productName, hasVariations = false, categoryName }: ProductImagesProps) => {
  if (hasVariations) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-sm space-y-3">
        <h3 className="font-semibold">Imagens do produto</h3>
        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            As imagens são controladas individualmente em cada variação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm space-y-4">
      <h3 className="font-semibold">Imagens do produto</h3>
      <ImageUploader
        images={images}
        onChange={onImagesChange}
        storeId={storeId}
        productName={productName}
        categoryName={categoryName}
      />
    </div>
  );
};
