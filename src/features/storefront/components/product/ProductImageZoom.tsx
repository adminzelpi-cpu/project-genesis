import { useState, useRef, useCallback } from 'react';
import { getOptimizedImageUrl } from '@/lib/imageOptimization';

interface ProductImageZoomProps {
  imageSrc: string;
  altText: string;
  onClick?: () => void;
}

export function ProductImageZoom({ imageSrc, altText, onClick }: ProductImageZoomProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [lensPosition, setLensPosition] = useState({ x: 0, y: 0 });
  const [backgroundPosition, setBackgroundPosition] = useState('0% 0%');
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const LENS_SIZE = 150;
  const ZOOM_LEVEL = 2.5;
  const RESULT_SIZE = 400;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = imageContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    
    // Get cursor position relative to the image container
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    // Calculate lens position (centered on cursor)
    let lensX = x - LENS_SIZE / 2;
    let lensY = y - LENS_SIZE / 2;

    // Clamp lens position to stay within the image bounds
    lensX = Math.max(0, Math.min(lensX, rect.width - LENS_SIZE));
    lensY = Math.max(0, Math.min(lensY, rect.height - LENS_SIZE));

    setLensPosition({ x: lensX, y: lensY });

    // Calculate background position for the zoomed result
    // The background position should correspond to where the lens is on the image
    const percentX = (lensX / (rect.width - LENS_SIZE)) * 100;
    const percentY = (lensY / (rect.height - LENS_SIZE)) * 100;

    setBackgroundPosition(`${percentX}% ${percentY}%`);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  return (
    <div className="relative">
      {/* Image Container */}
      <div
        ref={imageContainerRef}
        className="overflow-hidden cursor-crosshair relative bg-muted"
        style={{ borderRadius: 'var(--store-element-radius, 0.5rem)' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
      >
        <img
          src={getOptimizedImageUrl(imageSrc, 800)}
          alt={altText}
          className="w-full h-auto object-contain block pointer-events-none text-transparent"
          draggable={false}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          sizes="(max-width: 768px) 100vw, 50vw"
          width={800}
          height={800}
        />

        {/* Lens */}
        {isHovering && (
          <div
            className="absolute pointer-events-none border-2 border-primary"
            style={{
              width: LENS_SIZE,
              height: LENS_SIZE,
              left: lensPosition.x,
              top: lensPosition.y,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
            }}
          />
        )}
      </div>

      {/* Zoom Result Window */}
      {isHovering && (
        <div
          className="absolute top-0 border border-border shadow-xl overflow-hidden bg-white z-50"
          style={{
            left: 'calc(100% + 20px)',
            width: RESULT_SIZE,
            height: RESULT_SIZE,
            backgroundImage: `url(${getOptimizedImageUrl(imageSrc, 1600)})`,
            backgroundSize: `${ZOOM_LEVEL * 100}%`,
            backgroundPosition: backgroundPosition,
            backgroundRepeat: 'no-repeat',
            borderRadius: 'var(--store-element-radius, 0.5rem)',
          }}
        />
      )}
    </div>
  );
}
