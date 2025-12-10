import React, { useState, useEffect, useCallback } from 'react';
import { Area, UploadedImage } from './types';
import Dropzone from './components/Dropzone';
import CropEditor from './components/CropEditor';
import AdPlaceholder from './components/AdPlaceholder';
import { getCroppedImg, generatePreview } from './utils/canvasUtils';
import { Download, Layout, Image as ImageIcon, Trash2, Settings, Loader2, Plus } from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';

// TODO: Replace these with your actual AdSense IDs
const ADSENSE_CLIENT_ID = "YOUR_CLIENT_ID"; // e.g., ca-pub-1234567890123456
const ADSENSE_SLOT_SIDEBAR = "YOUR_SIDEBAR_SLOT_ID"; 
const ADSENSE_SLOT_BANNER = "YOUR_BANNER_SLOT_ID";

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1); // Default to 1:1
  const [isProcessing, setIsProcessing] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // Requested aspect ratios
  const ASPECT_RATIOS = [
    { label: '16:9', value: 16/9 },
    { label: '4:3', value: 4/3 },
    { label: '1:1', value: 1 },
    { label: '3:4', value: 3/4 },
    { label: '9:16', value: 9/16 },
  ];

  // When files are added
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

    setImages((prev) => {
      const updated = [...prev, ...newImages];
      return updated;
    });
    
    // Select the first new image if nothing is selected
    if (!selectedId && newImages.length > 0) {
      setSelectedId(newImages[0].id);
    }
  };

  const handleAddMoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
    }
    e.target.value = ''; // Reset to allow same file selection
  };

  const handleRemoveImage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setImages((prev) => prev.filter(img => img.id !== id));
    setPreviews(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
    });
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const selectedImage = images.find((img) => img.id === selectedId);

  // Debounced preview generation to avoid lagging while dragging
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (cropArea && images.length > 0 && selectedImage) {
        const newPreviews: Record<string, string> = {};
        
        for (const img of images) {
           // Skip generating preview for selected image as it is already live in editor
           if (img.id === selectedImage.id) continue;
           
           const previewUrl = await generatePreview(
             img.url,
             cropArea,
             selectedImage.width, // Pass reference dimensions
             selectedImage.height
           );
           newPreviews[img.id] = previewUrl;
        }
        setPreviews(newPreviews);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [cropArea, images, selectedImage]);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCropArea(croppedAreaPixels);
  }, []);

  const handleDownloadAll = async () => {
    if (!cropArea || !selectedImage) return;

    setIsProcessing(true);
    const zip = new JSZip();
    const folder = zip.folder('cropped_images');

    try {
      await Promise.all(
        images.map(async (img) => {
          const blob = await getCroppedImg(
            img.url, 
            cropArea, 
            selectedImage.width, 
            selectedImage.height
          );
          if (blob && folder) {
            folder.file(`cropped_${img.name}`, blob);
          }
        })
      );

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'batch_crop_images.zip');
    } catch (error) {
      console.error("Error processing images", error);
      alert("Failed to process images.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-200">
      {/* Header */}
      <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Layout className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-xl text-white tracking-tight">BatchCrop <span className="text-indigo-400 font-light">Pro</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
             <button
              onClick={handleDownloadAll}
              disabled={isProcessing || images.length === 0}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all ${
                isProcessing || images.length === 0
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              }`}
            >
              {isProcessing ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
              {isProcessing ? 'Processing...' : 'Save Images'}
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: Settings & List & Ad */}
        <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-800">
             <h2 className="text-xs font-semibold uppercase text-gray-500 mb-3 flex items-center gap-2">
                <Settings className="w-3 h-3" /> Crop Settings
             </h2>
             <div className="space-y-4">
                <div>
                    <label className="text-sm text-gray-300 mb-2 block">Aspect Ratio</label>
                    <div className="grid grid-cols-3 gap-2">
                        {ASPECT_RATIOS.map((ratio) => (
                            <button
                                key={ratio.label}
                                onClick={() => setAspectRatio(ratio.value)}
                                className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                                    Math.abs(aspectRatio - ratio.value) < 0.01
                                    ? 'bg-indigo-600 border-indigo-500 text-white font-medium' 
                                    : 'bg-gray-800 border-gray-700 hover:border-gray-600 text-gray-300'
                                }`}
                            >
                                {ratio.label}
                            </button>
                        ))}
                    </div>
                </div>
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
                            <input 
                                id="add-more-input" 
                                type="file" 
                                multiple 
                                accept="image/*" 
                                onChange={handleAddMoreChange} 
                                className="hidden" 
                            />
                            <label 
                                htmlFor="add-more-input"
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
                <div className="space-y-2">
                    {images.map(img => (
                        <div 
                            key={img.id}
                            onClick={() => setSelectedId(img.id)}
                            className={`group relative flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border ${
                                selectedId === img.id 
                                ? 'bg-gray-800 border-indigo-500/50' 
                                : 'hover:bg-gray-800/50 border-transparent hover:border-gray-800'
                            }`}
                        >
                            <div className="w-12 h-12 bg-gray-950 rounded overflow-hidden shrink-0 relative">
                                <img src={img.url} className="w-full h-full object-cover opacity-50" alt="" />
                                {/* Overlay preview if available */}
                                {previews[img.id] && (
                                     <img src={previews[img.id]} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                                )}
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
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 text-gray-500 rounded transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
          </div>
          
          {/* Sidebar Ad Slot */}
          <div className="p-4 border-t border-gray-800 bg-gray-900 shrink-0">
            <AdPlaceholder 
                format="rectangle" 
                adClient={ADSENSE_CLIENT_ID}
                adSlot={ADSENSE_SLOT_SIDEBAR}
            />
          </div>
        </div>

        {/* Center: Workspace & Bottom Ad */}
        <div className="flex-1 bg-gray-950 flex flex-col min-w-0">
          <div className="flex-1 p-6 flex flex-col min-h-0 overflow-hidden">
            {images.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full">
                <div className="mb-8 text-center space-y-2">
                    <h2 className="text-2xl font-bold text-white">Batch Crop Images</h2>
                    <p className="text-gray-400">Upload multiple images, set the crop on one, and apply it to all.</p>
                </div>
                <Dropzone onFilesSelected={handleFilesSelected} />
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0">
                    {selectedImage ? (
                        <>
                            <div className="mb-4 flex items-center justify-between shrink-0">
                                <h3 className="text-lg font-medium text-gray-200 flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5 text-indigo-400" />
                                    Reference: <span className="text-gray-400">{selectedImage.name}</span>
                                </h3>
                                <div className="text-sm text-gray-500">
                                    Adjust the crop box. This relative position applies to all images.
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 relative">
                                <CropEditor 
                                    image={selectedImage}
                                    aspectRatio={aspectRatio}
                                    onCropComplete={onCropComplete}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            Select an image from the sidebar to start editing
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* Main Footer Ad Slot */}
          <div className="h-24 bg-gray-900 border-t border-gray-800 p-2 flex items-center justify-center shrink-0">
             <div className="w-full max-w-[728px] h-full">
                <AdPlaceholder 
                    format="banner" 
                    adClient={ADSENSE_CLIENT_ID}
                    adSlot={ADSENSE_SLOT_BANNER}
                />
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;