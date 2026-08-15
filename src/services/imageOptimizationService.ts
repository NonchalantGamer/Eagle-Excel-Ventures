import { ResponsiveImageMap } from '../types';

export interface ImageOptimizationResult {
  file: File;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  savedPercentage: number;
  width: number;
  height: number;
  dataUrl: string;
}

/**
 * Client-Side Browser WebP Converter & Compressor
 * Converts any JPEG, PNG, or standard image to ultra-fast modern WebP format in the browser
 */
export async function convertImageToOptimizedWebP(
  inputFile: File,
  maxWidth: number = 1200,
  quality: number = 0.82
): Promise<ImageOptimizationResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate proportional dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP format
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback to original if webp conversion fails
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              resolve({
                file: inputFile,
                originalSizeBytes: inputFile.size,
                optimizedSizeBytes: inputFile.size,
                savedPercentage: 0,
                width,
                height,
                dataUrl
              });
              return;
            }

            const cleanName = inputFile.name.replace(/\.[^/.]+$/, '') + '.webp';
            const optimizedFile = new File([blob], cleanName, { type: 'image/webp' });
            const dataUrl = canvas.toDataURL('image/webp', quality);
            const savedBytes = Math.max(0, inputFile.size - blob.size);
            const savedPercentage = Math.round((savedBytes / inputFile.size) * 100);

            resolve({
              file: optimizedFile,
              originalSizeBytes: inputFile.size,
              optimizedSizeBytes: blob.size,
              savedPercentage,
              width,
              height,
              dataUrl
            });
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to decode image file'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(inputFile);
  });
}

/**
 * Generate multiple responsive sizes client-side (320w, 640w, 1200w)
 */
export async function generateClientResponsiveSizes(
  inputFile: File
): Promise<{
  thumb320: ImageOptimizationResult;
  medium640: ImageOptimizationResult;
  large1200: ImageOptimizationResult;
}> {
  const [thumb320, medium640, large1200] = await Promise.all([
    convertImageToOptimizedWebP(inputFile, 320, 0.80),
    convertImageToOptimizedWebP(inputFile, 640, 0.82),
    convertImageToOptimizedWebP(inputFile, 1200, 0.85)
  ]);

  return { thumb320, medium640, large1200 };
}

/**
 * Helper to construct responsive image srcset for high DPI & mobile loading
 */
export function getResponsiveImageProps(
  imageUrl: string,
  responsive?: ResponsiveImageMap
): {
  src: string;
  srcSet?: string;
  sizes?: string;
} {
  if (!responsive) {
    return { src: imageUrl };
  }

  const srcSetEntries: string[] = [];
  if (responsive.webp320) srcSetEntries.push(`${responsive.webp320} 320w`);
  if (responsive.webp640) srcSetEntries.push(`${responsive.webp640} 640w`);
  if (responsive.webp1200) srcSetEntries.push(`${responsive.webp1200} 1200w`);

  if (srcSetEntries.length === 0) {
    return { src: imageUrl };
  }

  return {
    src: responsive.webp640 || responsive.webp1200 || imageUrl,
    srcSet: srcSetEntries.join(', '),
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
  };
}
