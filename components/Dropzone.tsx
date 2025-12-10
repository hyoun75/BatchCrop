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
      className="border-2 border-dashed border-gray-700 bg-gray-900 rounded-xl p-12 text-center hover:border-indigo-500 hover:bg-gray-800 transition-colors cursor-pointer group"
    >
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
        <div className="p-4 bg-gray-800 rounded-full mb-4 group-hover:bg-indigo-500/20 transition-colors">
          <UploadCloud className="w-10 h-10 text-indigo-400 group-hover:text-indigo-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-200 mb-1">Upload Images</h3>
        <p className="text-gray-400 text-sm">Drag & drop or click to select multiple files</p>
      </label>
    </div>
  );
};

export default Dropzone;
