import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Download, X, Smartphone, Monitor, Wifi, WifiOff } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

interface PWAInstallPromptProps {
  onDismiss?: () => void;
  compact?: boolean;
}

export function PWAInstallPrompt({ onDismiss, compact = false }: PWAInstallPromptProps) {
  const { isInstallable, isInstalled, isOnline, installPrompt, updateAvailable } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleUpdate = () => {
    window.location.reload();
  };

  if (dismissed || isInstalled || !isInstallable) {
    return null;
  }

  if (compact) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50">
        <Card className="shadow-lg border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Add to Home Screen</p>
                  <p className="text-xs text-muted-foreground">Quick access to Pediatric Assistant</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleInstall} className="h-8 px-3">
                  <Download className="h-3 w-3 mr-1" />
                  Install
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 w-8 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Add to Home Screen</CardTitle>
          <CardDescription className="text-base">
            Install Pediatric Assistant for quick access to medical guidance on your smartphone
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Status Indicators */}
          <div className="flex justify-center gap-2">
            <Badge variant={isOnline ? "default" : "secondary"} className="flex items-center gap-1">
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            {updateAvailable && (
              <Badge variant="outline" className="text-amber-600 border-amber-600">
                Update Available
              </Badge>
            )}
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Wifi className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm font-medium">Works offline during emergencies</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Smartphone className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium">One-tap access from home screen</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Download className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-sm font-medium">Native app experience</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-6">
            <Button onClick={handleInstall} className="w-full h-12 text-base font-semibold">
              <Download className="h-5 w-5 mr-2" />
              Add to Home Screen
            </Button>
            <Button variant="ghost" onClick={handleDismiss} className="w-full">
              Not Now
            </Button>
          </div>

          {updateAvailable && (
            <Button 
              onClick={handleUpdate} 
              variant="secondary" 
              className="w-full mt-2"
            >
              Update Now
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
