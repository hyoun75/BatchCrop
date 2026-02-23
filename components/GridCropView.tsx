import React, { useState, useEffect } from 'react';
import { UploadedImage, GridSettings } from '../types';
import Dropzone from './Dropzone';
import { splitImageIntoGrid } from '../utils/canvasUtils';
import { Download, Trash2, Settings, Loader2, Plus, Info, FileText, List, Grid } from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';

const GridCropView: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'list'>('editor');
  const [isProcessing, setIsProcessing] = useState(false);

  const [gridSettings, setGridSettings] = useState<GridSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bc_grid_settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return { rows: 3, cols: 2, margin: 0 };
  });

  useEffect(() => {
    localStorage.setItem('bc_grid_settings', JSON.stringify(gridSettings));
  }, [gridSettings]);

  const handleFilesSelected = async (files: File[]) => {
    const newImages: UploadedImage[] = await Promise.all(
      files.map(async (file) => {
        const url = URL.createObjectURL(file);
        return new Promise<UploadedImage>((resolve) => {
          const img = new Image();
          img.onload = () => {
             resolve({
              id: Math.random().toString(36).substr(2, 9),
              url,
              file,
              name: file.name,
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          };
          img.src = url;
        });
      })
    );

    setImages((prev) => [...prev, ...newImages]);
    if (!selectedId && newImages.length > 0) {
      setSelectedId(newImages[0].id);
    }
    setActiveTab('editor');
  };

  const handleAddMoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const handleRemoveImage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setImages((prev) => prev.filter(img => img.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const handleReset = () => {
    if (images.length === 0) return;
    if (window.confirm("Are you sure you want to remove all images and reset settings?")) {
      setImages([]);
      setSelectedId(null);
      setGridSettings({ rows: 3, cols: 2, margin: 0 });
    }
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    const zip = new JSZip();
    const folder = zip.folder('grid_images');

    try {
      await Promise.all(
        images.map(async (img) => {
          const blobs = await splitImageIntoGrid(img.url, gridSettings);
          blobs.forEach((blob, index) => {
            const row = Math.floor(index / gridSettings.cols) + 1;
            const col = (index % gridSettings.cols) + 1;
            const nameParts = img.name.split('.');
            const ext = nameParts.pop();
            const baseName = nameParts.join('.');
            if (folder) {
              folder.file(`${baseName}_r${row}_c${col}.${ext}`, blob);
            }
          });
        })
      );

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'grid_crop_images.zip');
    } catch (error) {
      console.error("Error processing images", error);
      alert("Failed to process images. Check if margin is too large.");
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedImage = images.find((img) => img.id === selectedId);

  return (
    <main className="flex-1 flex overflow-hidden relative bg-gray-950 text-gray-200">
      
      {/* Left Sidebar */}
      <div className={`
          bg-gray-900 border-r border-gray-800 flex-col shrink-0 z-20 shadow-xl
          md:flex md:w-80 md:relative
          ${images.length > 0 && activeTab === 'list' ? 'flex w-full absolute inset-0' : 'hidden'}
      `}>
        <div className="p-4 border-b border-gray-800">
           <div className="flex items-center justify-between mb-3">
             <h2 className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-2">
                <Settings className="w-3 h-3" /> Grid Settings
             </h2>
             <button 
               onClick={() => setGridSettings({ rows: 3, cols: 2, margin: 0 })}
               className="text-xs text-gray-400 hover:text-white transition-colors"
               title="Reset settings"
             >
               Reset
             </button>
           </div>
           <div className="space-y-4">
              <div>
                  <label className="text-sm text-gray-300 mb-1 block">Columns (열)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="20"
                    value={gridSettings.cols} 
                    onChange={(e) => setGridSettings({...gridSettings, cols: Math.max(1, parseInt(e.target.value) || 1)})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
              </div>
              <div>
                  <label className="text-sm text-gray-300 mb-1 block">Rows (행)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="20"
                    value={gridSettings.rows} 
                    onChange={(e) => setGridSettings({...gridSettings, rows: Math.max(1, parseInt(e.target.value) || 1)})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
              </div>
              <div>
                  <label className="text-sm text-gray-300 mb-1 block">Margin (px)</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={gridSettings.margin} 
                    onChange={(e) => setGridSettings({...gridSettings, margin: Math.max(0, parseInt(e.target.value) || 0)})}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
              </div>
              
              <button
                onClick={handleDownloadAll}
                disabled={isProcessing || images.length === 0}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all mt-4 ${
                  isProcessing || images.length === 0
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                }`}
              >
                {isProcessing ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
                {isProcessing ? 'Processing...' : 'Save All Grid Images'}
              </button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-2">
                  Images ({images.length})
              </h2>
              <div className="flex items-center gap-2">
                  {images.length > 0 && (
                      <>
                          <button
                              onClick={handleReset}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-red-900/10 hover:bg-red-900/30 rounded border border-transparent hover:border-red-900/50 transition-colors"
                              title="Remove all images"
                          >
                              Clear All
                          </button>
                          <input 
                              id="grid-add-more" 
                              type="file" 
                              multiple 
                              accept="image/*" 
                              onChange={handleAddMoreChange} 
                              className="hidden" 
                          />
                          <label 
                              htmlFor="grid-add-more"
                              className="cursor-pointer flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-gray-300 hover:text-white transition-colors"
                          >
                              <Plus className="w-3 h-3" /> Add
                          </label>
                      </>
                  )}
              </div>
          </div>
          
          {images.length === 0 ? (
               <div className="text-center py-10 px-4 text-gray-600 text-sm border-2 border-dashed border-gray-800 rounded-lg">
                  No images uploaded
               </div>
          ) : (
              <div className="space-y-2 pb-20 md:pb-0">
                  {images.map(img => (
                      <div 
                          key={img.id}
                          onClick={() => {
                              setSelectedId(img.id);
                              if (window.innerWidth < 768) {
                                  setActiveTab('editor');
                              }
                          }}
                          className={`group relative flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${
                              selectedId === img.id 
                              ? 'bg-gray-800 border-indigo-500/50' 
                              : 'hover:bg-gray-800/50 border-transparent hover:border-gray-800'
                          }`}
                      >
                          <div className="w-12 h-12 bg-gray-950 rounded overflow-hidden shrink-0 relative">
                              <img src={img.url} className="w-full h-full object-cover opacity-50" alt="" />
                              {selectedId === img.id && (
                                  <div className="absolute inset-0 border-2 border-indigo-500 rounded"></div>
                              )}
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${selectedId === img.id ? 'text-white font-medium' : 'text-gray-400'}`}>
                                  {img.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                  {img.width} x {img.height}
                              </p>
                          </div>
                          <button 
                              onClick={(e) => handleRemoveImage(e, img.id)}
                              className="md:opacity-0 group-hover:opacity-100 p-2 md:p-1.5 hover:bg-red-500/20 hover:text-red-400 text-gray-500 rounded transition-all"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  ))}
              </div>
          )}
        </div>
      </div>

      {/* Center Workspace */}
      <div className={`
          bg-gray-950 flex-col min-w-0 relative
          md:flex md:flex-1
          ${(images.length === 0 || activeTab === 'editor') ? 'flex w-full h-full' : 'hidden'}
      `}>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {images.length === 0 ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-8 md:py-12">
                      <div className="text-center mb-8 md:mb-12">
                          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">Grid Crop Multiple Images</h2>
                          <p className="text-base md:text-lg text-gray-400 max-w-xl mx-auto">
                              Split your images into a perfect grid of rows and columns.
                              Great for Instagram grids, puzzles, or tile maps.
                          </p>
                      </div>

                      <div className="mb-12 md:mb-16">
                           <Dropzone onFilesSelected={handleFilesSelected} />
                      </div>

                      <div className="grid md:grid-cols-2 gap-6 md:gap-8 text-left">
                          <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                  <Info className="text-indigo-400" size={20}/> 
                                  How to use
                              </h3>
                              <ul className="space-y-3 text-gray-400 text-sm leading-relaxed">
                                  <li className="flex gap-2">
                                      <span className="text-indigo-500 font-bold">1.</span>
                                      <span>Upload your images by dragging them into the box above.</span>
                                  </li>
                                  <li className="flex gap-2">
                                      <span className="text-indigo-500 font-bold">2.</span>
                                      <span>Set the number of columns and rows in the sidebar.</span>
                                  </li>
                                  <li className="flex gap-2">
                                      <span className="text-indigo-500 font-bold">3.</span>
                                      <span>Preview the grid overlay on your images.</span>
                                  </li>
                                  <li className="flex gap-2">
                                      <span className="text-indigo-500 font-bold">4.</span>
                                      <span>Click "Save All Grid Images" to download a ZIP file.</span>
                                  </li>
                              </ul>
                          </div>
                      </div>
                  </div>
              </div>
          ) : (
              <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6">
                  {selectedImage ? (
                      <div className="flex-1 relative flex items-center justify-center bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                          <div className="relative max-w-full max-h-full flex items-center justify-center p-4">
                              <div className="relative" style={{ maxWidth: '100%', maxHeight: '100%', display: 'flex' }}>
                                  <img 
                                    src={selectedImage.url} 
                                    alt="Preview" 
                                    className="max-w-full max-h-[80vh] object-contain"
                                    style={{ display: 'block' }}
                                  />
                                  {/* Grid Overlay */}
                                  <div 
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                      top: `${(gridSettings.margin / selectedImage.height) * 100}%`,
                                      left: `${(gridSettings.margin / selectedImage.width) * 100}%`,
                                      right: `${(gridSettings.margin / selectedImage.width) * 100}%`,
                                      bottom: `${(gridSettings.margin / selectedImage.height) * 100}%`,
                                      display: 'grid',
                                      gridTemplateColumns: `repeat(${gridSettings.cols}, 1fr)`,
                                      gridTemplateRows: `repeat(${gridSettings.rows}, 1fr)`,
                                      border: '1px solid rgba(99, 102, 241, 0.8)'
                                    }}
                                  >
                                    {Array.from({ length: gridSettings.rows * gridSettings.cols }).map((_, i) => (
                                      <div key={i} className="border border-indigo-500/50 bg-indigo-500/10" />
                                    ))}
                                  </div>
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div className="flex-1 flex items-center justify-center text-gray-500">
                          Select an image to preview grid
                      </div>
                  )}
              </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {images.length > 0 && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800 flex items-center justify-around z-40 pb-safe">
              <button 
                onClick={() => setActiveTab('list')}
                className={`flex flex-col items-center justify-center w-1/2 h-full gap-1 ${activeTab === 'list' ? 'text-indigo-400 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'}`}
              >
                  <List size={20} />
                  <span className="text-xs font-medium">Settings</span>
              </button>
              <button 
                onClick={() => setActiveTab('editor')}
                className={`flex flex-col items-center justify-center w-1/2 h-full gap-1 ${activeTab === 'editor' ? 'text-indigo-400 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'}`}
              >
                  <Grid size={20} />
                  <span className="text-xs font-medium">Preview</span>
              </button>
          </div>
      )}
    </main>
  );
};

export default GridCropView;
