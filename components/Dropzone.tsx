import React, { useCallback } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFilesSelected }) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="border-2 border-dashed border-gray-700 bg-gray-900 rounded-xl p-6 md:p-12 text-center hover:border-indigo-500 hover:bg-gray-800 transition-colors cursor-pointer group touch-manipulation"
    >
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
        <div className="p-3 md:p-4 bg-gray-800 rounded-full mb-3 md:mb-4 group-hover:bg-indigo-500/20 transition-colors">
          <UploadCloud className="w-8 h-8 md:w-10 md:h-10 text-indigo-400 group-hover:text-indigo-300" />
        </div>
        <h3 className="text-base md:text-lg font-semibold text-gray-200 mb-1">Upload Images</h3>
        <p className="text-gray-400 text-xs md:text-sm">Drag & drop or tap to select</p>
      </label>
    </div>
  );
};

export default Dropzone;