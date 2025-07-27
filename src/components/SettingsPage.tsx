import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Settings, 
  User, 
  Smartphone, 
  Palette, 
  Database, 
  Shield, 
  Bell,
  Download,
  Upload,
  Trash2,
  Info,
  Stethoscope,
  Calculator,
  Globe,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Wifi,
  WifiOff
} from 'lucide-react';
import { UserSettings } from '../types';
import { usePWA } from '../hooks/usePWA';

interface SettingsPageProps {
  settings: UserSettings;
  onSettingsChange: (settings: UserSettings) => void;
  onClose?: () => void;
}

export function SettingsPage({ settings, onSettingsChange, onClose }: SettingsPageProps) {
  const { isInstallable, isInstalled, isOnline, installPrompt } = usePWA();
  const [exportData, setExportData] = useState<string>('');

  const updateSetting = (key: keyof UserSettings, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const handleExportData = () => {
    const data = {
      settings,
      chats: JSON.parse(localStorage.getItem('nelsongpt-chats') || '[]'),
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nelsongpt-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.settings) {
          onSettingsChange(data.settings);
        }
        if (data.chats) {
          localStorage.setItem('nelsongpt-chats', JSON.stringify(data.chats));
        }
        alert('Data imported successfully!');
      } catch (error) {
        alert('Error importing data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      localStorage.clear();
      onSettingsChange({
        showTimestamps: false,
        showCitations: true,
        fontSize: 'medium',
        theme: 'dark',
        autoScroll: true,
        soundEnabled: false,
      });
      alert('All data cleared successfully!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Settings</CardTitle>
                <CardDescription>
                  Customize your NelsonGPT medical assistant experience
                </CardDescription>
              </div>
            </div>
            {onClose && (
              <Button variant="ghost" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="medical" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="medical" className="flex items-center gap-1">
                <Stethoscope className="h-3 w-3" />
                Medical
              </TabsTrigger>
              <TabsTrigger value="pwa" className="flex items-center gap-1">
                <Smartphone className="h-3 w-3" />
                PWA
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-1">
                <Palette className="h-3 w-3" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                Data
              </TabsTrigger>
              <TabsTrigger value="about" className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                About
              </TabsTrigger>
            </TabsList>

            {/* Medical Preferences */}
            <TabsContent value="medical" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    Medical Preferences
                  </CardTitle>
                  <CardDescription>
                    Configure medical-specific settings and units
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Weight Units</Label>
                      <Select defaultValue="kg">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Height Units</Label>
                      <Select defaultValue="cm">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cm">Centimeters (cm)</SelectItem>
                          <SelectItem value="ft">Feet/Inches (ft/in)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Temperature Units</Label>
                      <Select defaultValue="celsius">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="celsius">Celsius (°C)</SelectItem>
                          <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Drug Database</Label>
                      <Select defaultValue="nelson">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nelson">Nelson Textbook</SelectItem>
                          <SelectItem value="lexicomp">Lexicomp Pediatric</SelectItem>
                          <SelectItem value="micromedex">Micromedex</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Citations</Label>
                        <p className="text-sm text-muted-foreground">
                          Display references to Nelson Textbook sections
                        </p>
                      </div>
                      <Switch 
                        checked={settings.showCitations}
                        onCheckedChange={(checked) => updateSetting('showCitations', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Drug Interaction Warnings</Label>
                        <p className="text-sm text-muted-foreground">
                          Alert for potential drug interactions
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Emergency Mode Access</Label>
                        <p className="text-sm text-muted-foreground">
                          Quick access to emergency protocols
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Medical Calculators
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Pediatric Dosage Calculator</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Growth Chart Integration</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>BMI Calculator</Label>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PWA Settings */}
            <TabsContent value="pwa" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Progressive Web App
                  </CardTitle>
                  <CardDescription>
                    Manage app installation and offline capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Installation Status */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isInstalled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {isInstalled ? 'App Installed' : 'Web Version'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isInstalled ? 'Running as installed app' : 'Running in browser'}
                        </p>
                      </div>
                    </div>
                    {isInstallable && !isInstalled && (
                      <Button onClick={() => installPrompt?.prompt()}>
                        <Download className="h-4 w-4 mr-2" />
                        Install App
                      </Button>
                    )}
                  </div>

                  {/* Online Status */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium">
                          {isOnline ? 'Online' : 'Offline'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {isOnline ? 'Connected to internet' : 'Working offline'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isOnline ? "default" : "secondary"}>
                      {isOnline ? 'Connected' : 'Offline Mode'}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Offline Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Cache medical data for offline access
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive updates and reminders
                        </p>
                      </div>
                      <Switch />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-Update</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically update when new version available
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Appearance & Accessibility
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Theme</Label>
                      <Select 
                        value={settings.theme} 
                        onValueChange={(value) => updateSetting('theme', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">
                            <div className="flex items-center gap-2">
                              <Sun className="h-4 w-4" />
                              Light
                            </div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center gap-2">
                              <Moon className="h-4 w-4" />
                              Dark
                            </div>
                          </SelectItem>
                          <SelectItem value="system">
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              System
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Font Size</Label>
                      <Select 
                        value={settings.fontSize} 
                        onValueChange={(value) => updateSetting('fontSize', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                          <SelectItem value="xl">Extra Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Timestamps</Label>
                        <p className="text-sm text-muted-foreground">
                          Display message timestamps
                        </p>
                      </div>
                      <Switch 
                        checked={settings.showTimestamps}
                        onCheckedChange={(checked) => updateSetting('showTimestamps', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-scroll</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically scroll to new messages
                        </p>
                      </div>
                      <Switch 
                        checked={settings.autoScroll}
                        onCheckedChange={(checked) => updateSetting('autoScroll', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Sound Effects</Label>
                        <p className="text-sm text-muted-foreground">
                          Play sounds for notifications
                        </p>
                      </div>
                      <Switch 
                        checked={settings.soundEnabled}
                        onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>High Contrast Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Improve visibility for accessibility
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Data Management */}
            <TabsContent value="data" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Management
                  </CardTitle>
                  <CardDescription>
                    Backup, restore, and manage your medical consultation data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button onClick={handleExportData} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Export Data
                    </Button>
                    
                    <div>
                      <Input
                        type="file"
                        accept=".json"
                        onChange={handleImportData}
                        className="hidden"
                        id="import-file"
                      />
                      <Button asChild variant="outline" className="w-full">
                        <label htmlFor="import-file" className="flex items-center gap-2 cursor-pointer">
                          <Upload className="h-4 w-4" />
                          Import Data
                        </label>
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={clearAllData} 
                      variant="destructive" 
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear All Data
                    </Button>
                  </div>

                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Your medical consultation data is stored locally on your device for privacy. 
                      Regular backups are recommended to prevent data loss.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* About */}
            <TabsContent value="about" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    About NelsonGPT
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">NelsonGPT</h3>
                    <p className="text-muted-foreground">
                      Evidence-based Pediatric Medical Assistant
                    </p>
                    <Badge variant="outline">Version 1.0.0</Badge>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">Powered By</h4>
                      <p className="text-sm text-muted-foreground">
                        Nelson Textbook of Pediatrics - The gold standard in pediatric medicine
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Features</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Evidence-based medical consultations</li>
                        <li>• Pediatric dosage calculations</li>
                        <li>• Emergency protocol access</li>
                        <li>• Offline medical reference</li>
                        <li>• Progressive Web App capabilities</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">Medical Disclaimer</h4>
                      <p className="text-xs text-muted-foreground">
                        This application is for educational and reference purposes only. 
                        Always consult with qualified healthcare professionals for medical decisions. 
                        Not intended to replace clinical judgment or professional medical advice.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

