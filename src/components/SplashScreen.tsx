import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [showPoweredBy, setShowPoweredBy] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show "Powered By" text after a short delay
    const poweredByTimer = setTimeout(() => {
      setShowPoweredBy(true);
    }, 800);

    // Start fade out animation
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2200);

    // Complete splash screen after fade out
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(poweredByTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#121212' }}
    >
      {/* Main Title */}
      <div className="text-center">
        <h1 
          className="text-4xl md:text-6xl font-bold tracking-wide"
          style={{ 
            color: '#f2f2f2',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            animation: 'textPulse 2s ease-in-out infinite'
          }}
        >
          Nelson-GPT
        </h1>
        
        {/* Powered By Text with Pulsation */}
        <div 
          className={`mt-6 transition-all duration-700 ${
            showPoweredBy ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p 
            className="text-lg md:text-xl"
            style={{ 
              color: '#f2f2f2',
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              animation: 'textPulse 2.5s ease-in-out infinite'
            }}
          >
            Powered By Nelson Book of Pediatrics
          </p>
        </div>

        {/* Animated 3-dot loader */}
        <div className="mt-10 flex justify-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full animate-bounce"
            style={{ 
              backgroundColor: '#f2f2f2',
              animationDelay: '0ms',
              animationDuration: '1s'
            }}
          />
          <div 
            className="w-3 h-3 rounded-full animate-bounce"
            style={{ 
              backgroundColor: '#f2f2f2',
              animationDelay: '200ms',
              animationDuration: '1s'
            }}
          />
          <div 
            className="w-3 h-3 rounded-full animate-bounce"
            style={{ 
              backgroundColor: '#f2f2f2',
              animationDelay: '400ms',
              animationDuration: '1s'
            }}
          />
        </div>
      </div>


    </div>
  );
}
