import React, { useState } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { SplashScreen } from './components/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground dark">
      <ChatInterface />
    </div>
  );
}
