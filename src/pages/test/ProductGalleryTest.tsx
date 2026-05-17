import { useState } from "react";
import { ProductGalleryCarousel } from "@/features/storefront/components/product/ProductGalleryCarousel";
import { ProductGalleryThumbnails } from "@/features/storefront/components/product/ProductGalleryThumbnails";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Import images for each color
import amarelaFrente from "@/assets/products/polos/amarela/frente.webp";
import amarelaLado from "@/assets/products/polos/amarela/lado.webp";
import amarelaCostas from "@/assets/products/polos/amarela/costas.webp";
import amarelaTorax from "@/assets/products/polos/amarela/torax.webp";

import azulClaroFrente from "@/assets/products/polos/azul-claro/frente.webp";
import azulClaroLado from "@/assets/products/polos/azul-claro/lado.webp";
import azulClaroCostas from "@/assets/products/polos/azul-claro/costas.webp";
import azulClaroTorax from "@/assets/products/polos/azul-claro/torax.webp";

import azulMarinhoFrente from "@/assets/products/polos/azul-marinho/frente.webp";
import azulMarinhoLado from "@/assets/products/polos/azul-marinho/lado.webp";
import azulMarinhoCostas from "@/assets/products/polos/azul-marinho/costas.webp";
import azulMarinhoTorax from "@/assets/products/polos/azul-marinho/torax.webp";

import begeFrente from "@/assets/products/polos/bege/frente.webp";
import begeLado from "@/assets/products/polos/bege/lado.webp";
import begeCostas from "@/assets/products/polos/bege/costas.webp";
import begeTorax from "@/assets/products/polos/bege/torax.webp";

import brancaFrente from "@/assets/products/polos/branca/frente.webp";
import brancaLado from "@/assets/products/polos/branca/lado.webp";
import brancaCostas from "@/assets/products/polos/branca/costas.webp";
import brancaTorax from "@/assets/products/polos/branca/torax.webp";

import cinzaMesclaFrente from "@/assets/products/polos/cinza-mescla/frente.webp";
import cinzaMesclaLado from "@/assets/products/polos/cinza-mescla/lado.webp";
import cinzaMesclaCostas from "@/assets/products/polos/cinza-mescla/costas.webp";
import cinzaMesclaTorax from "@/assets/products/polos/cinza-mescla/torax.webp";

import laranjaFrente from "@/assets/products/polos/laranja/frente.webp";
import laranjaLado from "@/assets/products/polos/laranja/lado.webp";
import laranjaCostas from "@/assets/products/polos/laranja/costas.webp";
import laranjaTorax from "@/assets/products/polos/laranja/torax.webp";

import lilasFrente from "@/assets/products/polos/lilas/frente.webp";
import lilasLado from "@/assets/products/polos/lilas/lado.webp";
import lilasCostas from "@/assets/products/polos/lilas/costas.webp";
import lilasTorax from "@/assets/products/polos/lilas/torax.webp";

import rosaPinkFrente from "@/assets/products/polos/rosa-pink/frente.webp";
import rosaPinkLado from "@/assets/products/polos/rosa-pink/lado.webp";
import rosaPinkCostas from "@/assets/products/polos/rosa-pink/costas.webp";
import rosaPinkTorax from "@/assets/products/polos/rosa-pink/torax.webp";

import verdeLimaoFrente from "@/assets/products/polos/verde-limao/frente.webp";
import verdeLimaoLado from "@/assets/products/polos/verde-limao/lado.webp";
import verdeLimaoCostas from "@/assets/products/polos/verde-limao/costas.webp";
import verdeLimaoTorax from "@/assets/products/polos/verde-limao/torax.webp";

const colorImages = {
  amarela: [amarelaFrente, amarelaLado, amarelaCostas, amarelaTorax],
  "azul-claro": [azulClaroFrente, azulClaroLado, azulClaroCostas, azulClaroTorax],
  "azul-marinho": [azulMarinhoFrente, azulMarinhoLado, azulMarinhoCostas, azulMarinhoTorax],
  bege: [begeFrente, begeLado, begeCostas, begeTorax],
  branca: [brancaFrente, brancaLado, brancaCostas, brancaTorax],
  "cinza-mescla": [cinzaMesclaFrente, cinzaMesclaLado, cinzaMesclaCostas, cinzaMesclaTorax],
  laranja: [laranjaFrente, laranjaLado, laranjaCostas, laranjaTorax],
  lilas: [lilasFrente, lilasLado, lilasCostas, lilasTorax],
  "rosa-pink": [rosaPinkFrente, rosaPinkLado, rosaPinkCostas, rosaPinkTorax],
  "verde-limao": [verdeLimaoFrente, verdeLimaoLado, verdeLimaoCostas, verdeLimaoTorax],
};

const colorNames = {
  amarela: "Amarela",
  "azul-claro": "Azul Claro",
  "azul-marinho": "Azul Marinho",
  bege: "Bege",
  branca: "Branca",
  "cinza-mescla": "Cinza Mescla",
  laranja: "Laranja",
  lilas: "Lilás",
  "rosa-pink": "Rosa/Pink",
  "verde-limao": "Verde Limão",
};

export default function ProductGalleryTest() {
  const [selectedColor, setSelectedColor] = useState<keyof typeof colorImages>("amarela");
  const [galleryType, setGalleryType] = useState<"carousel" | "thumbnails">("carousel");

  const currentImages = colorImages[selectedColor];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Teste de Galeria - Polo Masculina Básica em Piquet</h1>
          <p className="text-muted-foreground">
            Teste das galerias de produto com as imagens dos polos
          </p>
        </div>

        {/* Controles */}
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Galeria</label>
            <div className="flex gap-2">
              <Button
                variant={galleryType === "carousel" ? "default" : "outline"}
                onClick={() => setGalleryType("carousel")}
              >
                Carousel
              </Button>
              <Button
                variant={galleryType === "thumbnails" ? "default" : "outline"}
                onClick={() => setGalleryType("thumbnails")}
              >
                Thumbnails
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cor Selecionada: {colorNames[selectedColor]}</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(colorImages).map((color) => (
                <Button
                  key={color}
                  variant={selectedColor === color ? "default" : "outline"}
                  onClick={() => setSelectedColor(color as keyof typeof colorImages)}
                  size="sm"
                >
                  {colorNames[color as keyof typeof colorNames]}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Galeria */}
        <Card className="p-6">
          <div className="max-w-2xl mx-auto">
            {galleryType === "carousel" ? (
              <ProductGalleryCarousel
                images={currentImages}
                productName={`Polo Masculina - ${colorNames[selectedColor]}`}
              />
            ) : (
              <ProductGalleryThumbnails
                images={currentImages}
                productName={`Polo Masculina - ${colorNames[selectedColor]}`}
              />
            )}
          </div>
        </Card>

        {/* Info */}
        <Card className="p-6 bg-muted">
          <h3 className="font-semibold mb-2">Informações</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>✓ Total de cores: 10</li>
            <li>✓ Imagens por cor: 4 (frente, lado, costas, tórax)</li>
            <li>✓ Total de imagens: 40</li>
            <li>✓ Formato: WebP</li>
            <li>✓ Localização: src/assets/products/polos/</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
