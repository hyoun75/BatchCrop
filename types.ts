export interface UploadedImage {
  id: string;
  url: string;
  file: File;
  name: string;
  width: number;
  height: number;
}

export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropState {
  crop: { x: number; y: number };
  zoom: number;
  aspect: number;
}

// Global window definition for AdSense
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}