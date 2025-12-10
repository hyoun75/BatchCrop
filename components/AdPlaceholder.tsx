import React, { useEffect, useRef } from 'react';

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

  useEffect(() => {
    // Only try to load the ad if we have valid IDs and the script is loaded
    if (adClient && adSlot && window.adsbygoogle) {
      try {
        // Clear previous ad content if any (React strict mode safety)
        if (adRef.current && adRef.current.innerHTML === "") {
             (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }
  }, [adClient, adSlot]);

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
    <div className={`overflow-hidden ${className} ${format === 'banner' ? 'w-full h-full flex justify-center' : 'w-full'}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ 
            display: 'block', 
            width: '100%', 
            height: '100%',
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