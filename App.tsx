import React, { useState, useEffect, useCallback } from 'react';
import { Area, UploadedImage } from './types';
import Dropzone from './components/Dropzone';
import CropEditor from './components/CropEditor';
import AdPlaceholder from './components/AdPlaceholder';
import { getCroppedImg, generatePreview } from './utils/canvasUtils';
import { Download, Layout, Image as ImageIcon, Trash2, Settings, Loader2, Plus, Info, Shield, FileText, RotateCcw, List, Crop } from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';

// AdSense Configuration
// Your Publisher ID: ca-pub-8164121612446768
const ADSENSE_CLIENT_ID = "ca-pub-8164121612446768"; 
// IMPORTANT: You must create 'Display Ad' units in Google AdSense dashboard and paste their Data-Ad-Slot IDs here.
const ADSENSE_SLOT_SIDEBAR = "1234567890"; // Replace with actual Ad Unit ID for sidebar (Square/Vertical)
const ADSENSE_SLOT_BANNER = "0987654321";  // Replace with actual Ad Unit ID for footer (Horizontal)

const App: React.FC = () => {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  
  // Mobile Tab State
  const [activeTab, setActiveTab] = useState<'editor' | 'list'>('editor');

  // Initialize aspect ratio from localStorage or default to 1:1
  const [aspectRatio, setAspectRatio] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bc_aspect_ratio');
      return saved ? parseFloat(saved) : 1;
    }
    return 1;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Requested aspect ratios
  const ASPECT_RATIOS = [
    { label: '16:9', value: 16/9 },
    { label: '4:3', value: 4/3 },
    { label: '1:1', value: 1 },
    { label: '3:4', value: 3/4 },
    { label: '9:16', value: 9/16 },
  ];

  // Save aspect ratio to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bc_aspect_ratio', aspectRatio.toString());
  }, [aspectRatio]);

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
    
    // Switch to editor view on mobile when images are added
    setActiveTab('editor');
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

  const handleReset = () => {
    if (images.length === 0) return;
    
    if (window.confirm("Are you sure you want to remove all images and start over?")) {
      setImages([]);
      setSelectedId(null);
      setCropArea(null);
      setPreviews({});
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
      <header className="h-14 md:h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Layout className="text-white w-4 h-4 md:w-5 md:h-5" />
          </div>
          <h1 className="font-bold text-lg md:text-xl text-white tracking-tight">BatchCrop <span className="text-indigo-400 font-light hidden xs:inline">Pro</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
             <button
              onClick={handleDownloadAll}
              disabled={isProcessing || images.length === 0}
              className={`flex items-center gap-2 px-3 md:px-5 py-1.5 md:py-2 rounded-lg font-medium text-sm md:text-base transition-all ${
                isProcessing || images.length === 0
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              }`}
            >
              {isProcessing ? <Loader2 className="animate-spin w-4 h-4" /> : <Download className="w-4 h-4" />}
              <span className="hidden md:inline">{isProcessing ? 'Processing...' : 'Save Images'}</span>
              <span className="md:hidden">{isProcessing ? 'Wait' : 'Save'}</span>
            </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left Sidebar: Settings & List & Ad */}
        {/* Mobile: Hidden by default, shown when activeTab is 'list' */}
        {/* Desktop: Always visible (flex) */}
        <div className={`
            bg-gray-900 border-r border-gray-800 flex-col shrink-0 z-20 shadow-xl
            md:flex md:w-80 md:relative
            ${images.length > 0 && activeTab === 'list' ? 'flex w-full absolute inset-0' : 'hidden'}
        `}>
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
                                className={`px-2 py-2 md:py-1.5 text-xs rounded border transition-colors ${
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
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-red-900/10 hover:bg-red-900/30 rounded border border-transparent hover:border-red-900/50 transition-colors"
                                title="Remove all images"
                            >
                                Clear All
                            </button>
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
                <div className="space-y-2 pb-20 md:pb-0">
                    {images.map(img => (
                        <div 
                            key={img.id}
                            onClick={() => {
                                setSelectedId(img.id);
                                // On mobile, clicking an image switches to editor view
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
                                className="md:opacity-0 group-hover:opacity-100 p-2 md:p-1.5 hover:bg-red-500/20 hover:text-red-400 text-gray-500 rounded transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
          </div>
          
          {/* Sidebar Ad Slot */}
          <div className="p-2 border-t border-gray-800 bg-gray-900 shrink-0 flex justify-center pb-20 md:pb-2">
            <AdPlaceholder 
                format="rectangle" 
                adClient={ADSENSE_CLIENT_ID}
                adSlot={ADSENSE_SLOT_SIDEBAR}
            />
          </div>
        </div>

        {/* Center: Workspace & Bottom Ad */}
        {/* Mobile: Shown if activeTab is 'editor' OR no images uploaded yet */}
        {/* Desktop: Always visible (flex-1) */}
        <div className={`
            bg-gray-950 flex-col min-w-0 relative
            md:flex md:flex-1
            ${(images.length === 0 || activeTab === 'editor') ? 'flex w-full h-full' : 'hidden'}
        `}>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {images.length === 0 ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-8 md:py-12">
                        {/* Hero Section */}
                        <div className="text-center mb-8 md:mb-12">
                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">BatchCrop Multiple Images</h2>
                            <p className="text-base md:text-lg text-gray-400 max-w-xl mx-auto">
                                Apply the same crop setting to hundreds of images at once. 
                                Perfect for creating datasets, thumbnails, or consistent social media posts.
                            </p>
                        </div>

                        {/* Upload Area */}
                        <div className="mb-12 md:mb-16">
                             <Dropzone onFilesSelected={handleFilesSelected} />
                        </div>

                        {/* SEO / How to use Content */}
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
                                        <span>Select an aspect ratio (e.g., 1:1, 16:9) from the sidebar.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-indigo-500 font-bold">3.</span>
                                        <span>Adjust the crop area on the reference image. The same relative position will apply to all images.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="text-indigo-500 font-bold">4.</span>
                                        <span>Click "Save Images" to download a ZIP file of your processed photos.</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                                    <FileText className="text-indigo-400" size={20}/> 
                                    Why use BatchCrop?
                                </h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                    BatchCrop Pro is a free online tool designed to streamline your image editing workflow. 
                                    Instead of cropping photos one by one, you can process entire collections in seconds.
                                </p>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    All processing happens locally in your browser. 
                                    Your photos are <span className="text-white font-medium">never uploaded to a server</span>, 
                                    ensuring 100% privacy and security for your data.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <footer className="mt-16 pt-8 border-t border-gray-800 text-center text-gray-600 text-xs pb-24 md:pb-0">
                            <div className="flex justify-center gap-6 mb-4">
                                <button onClick={() => setShowPrivacy(true)} className="hover:text-gray-400 transition-colors">Privacy Policy</button>
                                <button className="hover:text-gray-400 transition-colors cursor-not-allowed">Terms of Service</button>
                                <a href="mailto:contact@nata.pics" className="hover:text-gray-400 transition-colors">Contact</a>
                            </div>
                            <p>© {new Date().getFullYear()} BatchCrop Pro. All rights reserved.</p>
                        </footer>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0">
                    {selectedImage ? (
                        <>
                            <div className="mb-2 pt-4 px-4 md:mb-4 md:pt-6 md:px-6 flex items-center justify-between shrink-0">
                                <h3 className="text-base md:text-lg font-medium text-gray-200 flex items-center gap-2 truncate">
                                    <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-indigo-400 shrink-0" />
                                    <span className="truncate">Reference: <span className="text-gray-400">{selectedImage.name}</span></span>
                                </h3>
                                <div className="text-xs md:text-sm text-gray-500 hidden sm:block">
                                    Adjust crop box. Applies to all images.
                                </div>
                            </div>
                            <div className="flex-1 min-h-0 relative px-2 md:px-6 pb-2">
                                <CropEditor 
                                    image={selectedImage}
                                    aspectRatio={aspectRatio}
                                    onCropComplete={onCropComplete}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            Select an image to start editing
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* Main Footer Ad Slot - Hide on mobile if list view is active, but we handle layout via display logic */}
          <div className="h-16 md:h-24 bg-gray-900 border-t border-gray-800 p-2 flex items-center justify-center shrink-0 z-20 pb-[5rem] md:pb-2">
             <div className="w-full max-w-[728px] h-full flex items-center justify-center">
                <AdPlaceholder 
                    format="banner" 
                    adClient={ADSENSE_CLIENT_ID}
                    adSlot={ADSENSE_SLOT_BANNER}
                />
             </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation - Only shown when images exist */}
      {images.length > 0 && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800 flex items-center justify-around z-40 pb-safe">
              <button 
                onClick={() => setActiveTab('list')}
                className={`flex flex-col items-center justify-center w-1/2 h-full gap-1 ${activeTab === 'list' ? 'text-indigo-400 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'}`}
              >
                  <List size={20} />
                  <span className="text-xs font-medium">Images & Settings</span>
              </button>
              <button 
                onClick={() => setActiveTab('editor')}
                className={`flex flex-col items-center justify-center w-1/2 h-full gap-1 ${activeTab === 'editor' ? 'text-indigo-400 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'}`}
              >
                  <Crop size={20} />
                  <span className="text-xs font-medium">Editor</span>
              </button>
          </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield className="text-indigo-500" /> Privacy Policy
                    </h2>
                    <button onClick={() => setShowPrivacy(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <div className="p-6 space-y-4 text-gray-300 text-sm leading-relaxed">
                    <p><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</p>
                    <p>At BatchCrop Pro (accessible from nata.pics), one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by BatchCrop Pro and how we use it.</p>
                    <h3 className="text-white font-bold text-lg mt-4">Local Processing</h3>
                    <p>Unlike many other online tools, BatchCrop Pro processes your images <strong>locally within your web browser</strong>. Your images are NOT uploaded to our servers for processing. This ensures that your personal photos remain strictly on your device.</p>
                    <h3 className="text-white font-bold text-lg mt-4">Cookies & Ads</h3>
                    <p>Google is one of a third-party vendor on our site. It also uses cookies, known as DART cookies, to serve ads to our site visitors.</p>
                    <h3 className="text-white font-bold text-lg mt-4">Consent</h3>
                    <p>By using our website, you hereby consent to our Privacy Policy and agree to its Terms and Conditions.</p>
                </div>
                <div className="p-4 border-t border-gray-800 bg-gray-900 sticky bottom-0 text-right">
                    <button 
                        onClick={() => setShowPrivacy(false)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;