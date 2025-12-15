import React, { useEffect, useRef, useState } from 'react';

interface AdPlaceholderProps {
  format: 'banner' | 'rectangle';
  className?: string;
  adClient?: string; // e.g., "ca-pub-XXXXXXXXXXXXXXXX"
  adSlot?: string;   // e.g., "1234567890"
}

const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ 
  format, 
  className = '', 
  adClient, 
  adSlot 
}) => {
  const adRef = useRef<HTMLModElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    // Only try to load the ad if we have valid IDs and the script is loaded
    if (adClient && adSlot) {
        // Use a timeout to allow the DOM to settle and width to be calculated
        const timer = setTimeout(() => {
             if (adRef.current && !adLoaded) {
                 // Check if the element has width (is visible)
                 if (adRef.current.offsetWidth > 0) {
                     try {
                         // Double check if ad is already inside (adsbygoogle modifies DOM)
                         if (adRef.current.innerHTML.trim() === "") {
                             (window.adsbygoogle = window.adsbygoogle || []).push({});
                             setAdLoaded(true);
                         }
                     } catch (e) {
                         console.error("AdSense error:", e);
                     }
                 } else {
                     console.warn("AdSense: Ad slot has 0 width, skipping initialization.");
                 }
             }
        }, 500); // 500ms delay to ensure layout
        
        return () => clearTimeout(timer);
    }
  }, [adClient, adSlot, adLoaded]);

  // If IDs are missing, show the dummy placeholder (for development)
  if (!adClient || !adSlot || adClient === "YOUR_CLIENT_ID") {
    return (
      <div 
        className={`
          bg-gray-800/50 border border-gray-800 rounded flex flex-col items-center justify-center 
          text-gray-600 uppercase tracking-widest text-[10px] font-semibold select-none
          ${format === 'banner' ? 'w-full h-full' : 'w-full aspect-[4/3]'}
          ${className}
        `}
      >
        <span className="mb-2">Ad Space ({format})</span>
        <div className="w-12 h-1 bg-gray-700/50 rounded-full"></div>
        <div className="mt-2 text-[9px] text-gray-700 normal-case">ID not configured</div>
      </div>
    );
  }

  // Render Real Google Ad
  return (
    <div 
        className={`overflow-hidden flex justify-center items-center bg-gray-900 ${className} ${format === 'banner' ? 'w-full h-full' : 'w-full min-h-[250px]'}`}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ 
            display: 'block', 
            width: format === 'banner' ? '100%' : 'auto', 
            height: format === 'banner' ? '100%' : 'auto',
            minWidth: '250px', // Ensure minimum width to avoid 0 width error
            textAlign: 'center'
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={format === 'banner' ? 'horizontal' : 'rectangle'}
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default AdPlaceholder;