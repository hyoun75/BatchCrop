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
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
      <div className="relative flex-1 bg-black min-h-[400px]">
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

      <div className="p-4 bg-gray-850 border-t border-gray-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
           <span className="text-xs font-mono text-gray-400">Ref: {image.name}</span>
        </div>
        
        <div className="flex items-center gap-4 flex-1 max-w-md">
            <ZoomOut size={16} className="text-gray-400" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <ZoomIn size={16} className="text-gray-400" />
        </div>

        <button 
            onClick={() => { setZoom(1); setCrop({x: 0, y: 0}) }}
            className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            title="Reset View"
        >
            <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
};

export default CropEditor;
