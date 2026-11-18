export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
}

/**
 * Compresses an image file, blob, or base64 data URL down to lightweight WebP/JPEG.
 * Shrinks typical 3MB - 10MB phone camera uploads down to 40KB - 90KB (~98% reduction),
 * protecting Supabase database egress limits on the free plan.
 */
export async function compressImage(
  input: File | Blob | string,
  options: CompressImageOptions = {}
): Promise<string> {
  const {
    maxWidth = 1000,
    maxHeight = 1000,
    quality = 0.75,
    mimeType = 'image/jpeg',
  } = options;

  // If already a remote hosted URL (e.g. Unsplash, CDN), leave unchanged
  if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
    return input;
  }

  return new Promise((resolve) => {
    let src: string;
    let isObjectUrl = false;

    if (typeof input === 'string') {
      src = input;
    } else {
      src = URL.createObjectURL(input);
      isObjectUrl = true;
    }

    const img = new Image();

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (isObjectUrl) URL.revokeObjectURL(src);
          resolve(typeof input === 'string' ? input : '');
          return;
        }

        // Fill background white if converting PNG with transparency to JPEG
        if (mimeType === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL(mimeType, quality);
        resolve(compressed);
      } catch {
        resolve(typeof input === 'string' ? input : '');
      } finally {
        if (isObjectUrl) {
          URL.revokeObjectURL(src);
        }
      }
    };

    img.onerror = () => {
      if (isObjectUrl) URL.revokeObjectURL(src);
      resolve(typeof input === 'string' ? input : '');
    };

    img.src = src;
  });
}
