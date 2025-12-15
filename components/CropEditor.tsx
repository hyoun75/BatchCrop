import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Area, UploadedImage } from '../types';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface CropEditorProps {
  image: UploadedImage;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
  aspectRatio: number;
}

const CropEditor: React.FC<CropEditorProps> = ({ image, onCropComplete, aspectRatio }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((zoomValue: number) => {
    setZoom(zoomValue);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-800 shadow-sm">
      <div className="relative flex-1 bg-black w-full">
        <Cropper
          image={image.url}
          crop={crop}
          zoom={zoom}
          aspect={aspectRatio}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#0f1115' },
            cropAreaStyle: { border: '2px solid #6366f1' },
          }}
        />
      </div>

      <div className="p-3 md:p-4 bg-gray-850 border-t border-gray-800 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 md:gap-4 shrink-0">
        <div className="flex items-center gap-2 min-w-0 hidden md:flex">
           <span className="text-xs font-mono text-gray-400 truncate max-w-[150px]">Ref: {image.name}</span>
        </div>
        
        <div className="flex items-center gap-3 flex-1 w-full md:w-auto">
            <ZoomOut size={18} className="text-gray-400" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 md:h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 touch-none"
            />
            <ZoomIn size={18} className="text-gray-400" />
        </div>

        <button 
            onClick={() => { setZoom(1); setCrop({x: 0, y: 0}) }}
            className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="Reset View"
        >
            <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
};

export default CropEditor;