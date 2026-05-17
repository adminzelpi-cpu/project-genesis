import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface ProductImageLightboxProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  /** Callback to open add-to-cart modal (mobile/tablet only) */
  onAddToCartClick?: () => void;
}

export function ProductImageLightbox({ 
  images, 
  initialIndex, 
  isOpen, 
  onClose, 
  productName,
  onAddToCartClick
}: ProductImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mobileScale, setMobileScale] = useState(1);
  const [mobileTranslate, setMobileTranslate] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const touchStartRef = useRef<{ distance: number; scale: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const clickPositionRef = useRef<{ percentX: number; percentY: number } | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swipeOffsetRef = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Reset state when opening/closing or changing images
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsZoomed(false);
    setMobileScale(1);
    setMobileTranslate({ x: 0, y: 0 });
    clickPositionRef.current = null;
  }, [initialIndex, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const prevImage = useCallback(() => {
    setIsZoomed(false);
    setMobileScale(1);
    setMobileTranslate({ x: 0, y: 0 });
    clickPositionRef.current = null;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const nextImage = useCallback(() => {
    setIsZoomed(false);
    setMobileScale(1);
    setMobileTranslate({ x: 0, y: 0 });
    clickPositionRef.current = null;
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  // Handle desktop image click for zoom
  const handleDesktopImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    
    // Calculate click position as percentage (0 to 1)
    const percentX = (e.clientX - rect.left) / rect.width;
    const percentY = (e.clientY - rect.top) / rect.height;
    
    if (!isZoomed) {
      // Store click position for scrolling after zoom
      clickPositionRef.current = { percentX, percentY };
      setIsZoomed(true);
    } else {
      // Zoom out
      setIsZoomed(false);
      clickPositionRef.current = null;
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, left: 0 });
      }
    }
  };

  // Scroll to click position after zoom
  useEffect(() => {
    if (isZoomed && clickPositionRef.current && containerRef.current && imageRef.current) {
      // Wait for image to render with new dimensions
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = containerRef.current;
          const img = imageRef.current;
          if (!container || !img) return;

          const { percentX, percentY } = clickPositionRef.current!;
          
          // Get the actual rendered dimensions of the zoomed image
          const imgWidth = img.offsetWidth;
          const imgHeight = img.offsetHeight;
          
          // Calculate scroll position to center on click point
          const scrollLeft = (imgWidth * percentX) - (container.clientWidth / 2);
          const scrollTop = (imgHeight * percentY) - (container.clientHeight / 2);
          
          container.scrollTo({
            left: Math.max(0, scrollLeft),
            top: Math.max(0, scrollTop),
            behavior: 'instant'
          });
        });
      });
    }
  }, [isZoomed]);

  const toggleZoom = () => {
    if (isZoomed) {
      setIsZoomed(false);
      clickPositionRef.current = null;
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, left: 0 });
      }
    } else {
      // Center zoom when using button
      clickPositionRef.current = { percentX: 0.5, percentY: 0.5 };
      setIsZoomed(true);
    }
  };

  // Touch handlers for mobile pinch-to-zoom
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      touchStartRef.current = { distance, scale: mobileScale };
      swipeStartRef.current = null;
    } else if (e.touches.length === 1) {
      if (mobileScale > 1) {
        lastTouchRef.current = { 
          x: e.touches[0].clientX, 
          y: e.touches[0].clientY 
        };
      } else {
        // Start tracking swipe
        swipeStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now()
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartRef.current) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const scaleDelta = distance / touchStartRef.current.distance;
      const newScale = Math.min(Math.max(touchStartRef.current.scale * scaleDelta, 1), 3);
      setMobileScale(newScale);
      
      if (newScale === 1) {
        setMobileTranslate({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && mobileScale > 1 && lastTouchRef.current) {
      const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
      const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
      
      setMobileTranslate(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      lastTouchRef.current = { 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY 
      };
    } else if (e.touches.length === 1 && mobileScale === 1 && swipeStartRef.current) {
      const deltaX = e.touches[0].clientX - swipeStartRef.current.x;
      swipeOffsetRef.current = deltaX;
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    // Check for swipe gesture
    if (swipeStartRef.current && mobileScale === 1) {
      const deltaX = swipeOffsetRef.current;
      const elapsed = Date.now() - swipeStartRef.current.time;
      const velocity = Math.abs(deltaX) / elapsed;
      
      // Swipe threshold: 50px or fast flick
      if (Math.abs(deltaX) > 50 || velocity > 0.5) {
        if (deltaX < 0) {
          nextImage();
        } else {
          prevImage();
        }
      }
    }
    
    touchStartRef.current = null;
    lastTouchRef.current = null;
    swipeStartRef.current = null;
    swipeOffsetRef.current = 0;
    setSwipeOffset(0);
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay - clicking closes lightbox */}
      <div 
        className="absolute inset-0 bg-black/90"
        onClick={onClose}
      />

      {/* Close button (X) - always visible */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
        aria-label="Fechar"
      >
        <X className="w-5 h-5 text-white drop-shadow-md" />
      </button>

      {/* Previous arrow - always visible */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prevImage(); }}
          className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 lg:w-14 lg:h-14 bg-white/20 hover:bg-white/30 lg:bg-white/10 lg:hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
          aria-label="Imagem anterior"
        >
          <ChevronLeft className="w-5 h-5 lg:w-7 lg:h-7 text-white drop-shadow-md" />
        </button>
      )}

      {/* Next arrow - always visible */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); nextImage(); }}
          className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 w-10 h-10 lg:w-14 lg:h-14 bg-white/20 hover:bg-white/30 lg:bg-white/10 lg:hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
          aria-label="Próxima imagem"
        >
          <ChevronRight className="w-5 h-5 lg:w-7 lg:h-7 text-white drop-shadow-md" />
        </button>
      )}

      {/* Image container - z-10 to be above overlay */}
      <div
        ref={containerRef}
        className={`relative z-10 w-full h-full ${isZoomed ? 'overflow-auto' : 'overflow-hidden flex items-center justify-center'}`}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Desktop image */}
        <div className={`hidden lg:flex ${isZoomed ? 'w-max min-w-full min-h-full' : 'w-full h-full items-center justify-center p-16'}`}>
          <img
            ref={imageRef}
            src={currentImage}
            alt={`${productName} - Imagem ${currentIndex + 1}`}
            className={`
              select-none
              ${isZoomed 
                ? 'cursor-zoom-out w-[90vw] h-auto' 
                : 'cursor-zoom-in max-w-full max-h-full object-contain'
              }
            `}
            onClick={handleDesktopImageClick}
            draggable={false}
          />
        </div>

      {/* Mobile/Tablet image with pinch-to-zoom and swipe - fullscreen */}
        <div className="lg:hidden flex items-center justify-center w-full h-full">
          <img
            src={currentImage}
            alt={`${productName} - Imagem ${currentIndex + 1}`}
            className={`w-full h-full object-contain select-none ${swipeOffset === 0 ? 'transition-transform duration-200' : ''}`}
            style={{
              transform: `translateX(${swipeOffset}px) scale(${mobileScale}) translate(${mobileTranslate.x / mobileScale}px, ${mobileTranslate.y / mobileScale}px)`,
            }}
            draggable={false}
          />
        </div>
      </div>

      {/* Zoom button - desktop only */}
      <button
        onClick={toggleZoom}
        className="hidden lg:flex absolute bottom-6 right-6 z-20 items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full transition-colors"
        aria-label={isZoomed ? "Diminuir" : "Ampliar"}
      >
        {isZoomed ? (
          <ZoomOut className="w-5 h-5 text-white" />
        ) : (
          <ZoomIn className="w-5 h-5 text-white" />
        )}
        <span className="text-sm font-medium text-white">
          {isZoomed ? "Diminuir" : "Ampliar"}
        </span>
      </button>

      {/* Image counter - top on mobile/tablet, bottom on desktop */}
      <div className="absolute z-20 bg-white/20 lg:bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full
        top-4 left-4 lg:top-auto lg:left-1/2 lg:-translate-x-1/2 lg:bottom-6">
        <span className="text-sm font-medium text-white drop-shadow-md">
          {currentIndex + 1} / {images.length}
        </span>
      </div>

      {/* Add to Cart button - mobile/tablet only */}
      {onAddToCartClick && (
        <div className="lg:hidden absolute bottom-6 left-4 right-4 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCartClick(); }}
            className="w-full h-12 flex items-center justify-center gap-2 font-semibold text-sm bg-[#4A90D9] hover:bg-[#3B7DD8] text-white transition-colors rounded-lg"
          >
            ADICIONAR AO CARRINHO
          </button>
        </div>
      )}
    </div>
  );
}
