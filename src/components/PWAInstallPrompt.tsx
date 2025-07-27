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
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 shadow-lg border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Install NelsonGPT</p>
                  <p className="text-xs text-muted-foreground">Access offline & get updates</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={handleInstall} className="h-8">
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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Install NelsonGPT</CardTitle>
          <CardDescription>
            Get the full medical assistant experience with offline access and instant updates
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
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Monitor className="h-4 w-4 text-primary flex-shrink-0" />
              <span>Works offline for critical medical consultations</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Download className="h-4 w-4 text-primary flex-shrink-0" />
              <span>Instant access from home screen</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Smartphone className="h-4 w-4 text-primary flex-shrink-0" />
              <span>Optimized for mobile medical workflows</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleInstall} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              Maybe Later
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

