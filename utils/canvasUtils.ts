import { Area, GridSettings } from '../types';

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); 
    image.src = url;
  });

/**
 * Returns a Blob of the cropped image.
 * Uses percentage-based cropping to apply the same relative crop to images of different sizes.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  refWidth: number,
  refHeight: number
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Calculate the ratio of the current image vs the reference image used to define the crop
  // Ideally, we use percentage crop, but pixelCrop from react-easy-crop is absolute to the rendered image size or original.
  // We assume pixelCrop passed here is relative to the ORIGINAL size of the reference image.
  
  // Calculate percentages from the reference crop
  const percX = pixelCrop.x / refWidth;
  const percY = pixelCrop.y / refHeight;
  const percW = pixelCrop.width / refWidth;
  const percH = pixelCrop.height / refHeight;

  // Apply percentages to the current image's natural dimensions
  const cropX = percX * image.naturalWidth;
  const cropY = percY * image.naturalHeight;
  const cropW = percW * image.naturalWidth;
  const cropH = percH * image.naturalHeight;

  canvas.width = cropW;
  canvas.height = cropH;

  ctx.drawImage(
    image,
    cropX,
    cropY,
    cropW,
    cropH,
    0,
    0,
    cropW,
    cropH
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
}

/**
 * Generates a preview URL for the side panel
 */
export async function generatePreview(
  imageSrc: string,
  pixelCrop: Area,
  refWidth: number,
  refHeight: number
): Promise<string> {
  const blob = await getCroppedImg(imageSrc, pixelCrop, refWidth, refHeight);
  if (!blob) return '';
  return URL.createObjectURL(blob);
}

/**
 * Splits an image into a grid of blobs.
 */
export async function splitImageIntoGrid(
  imageSrc: string,
  settings: GridSettings
): Promise<Blob[]> {
  const image = await createImage(imageSrc);
  const { rows, cols, margin } = settings;
  
  const totalWidth = image.naturalWidth;
  const totalHeight = image.naturalHeight;
  
  const usableWidth = totalWidth - 2 * margin;
  const usableHeight = totalHeight - 2 * margin;
  
  if (usableWidth <= 0 || usableHeight <= 0) {
    throw new Error("Margin is too large for this image.");
  }
  
  const cellWidth = usableWidth / cols;
  const cellHeight = usableHeight / rows;
  
  const blobs: Blob[] = [];
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      
      canvas.width = cellWidth;
      canvas.height = cellHeight;
      
      const sourceX = margin + c * cellWidth;
      const sourceY = margin + r * cellHeight;
      
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        cellWidth,
        cellHeight,
        0,
        0,
        cellWidth,
        cellHeight
      );
      
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
      });
      
      if (blob) {
        blobs.push(blob);
      }
    }
  }
  
  return blobs;
}
