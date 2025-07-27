import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { EmergencyProtocolEnhanced } from '../types';
import { 
  AlertTriangle, 
  Phone, 
  Clock, 
  Heart, 
  Thermometer,
  Activity,
  Zap,
  Shield,
  X
} from 'lucide-react';

interface EmergencyModeProps {
  onClose?: () => void;
  onProtocolSelect?: (protocol: EmergencyProtocolEnhanced) => void;
}

const emergencyProtocols: EmergencyProtocolEnhanced[] = [
  {
    id: 'cardiac-arrest',
    title: 'Pediatric Cardiac Arrest',
    category: 'cardiac',
    urgency: 'critical',
    steps: [
      'Call 911 immediately',
      'Begin CPR (30:2 ratio for children >1 year)',
      'Ensure airway is clear',
      'Continue until EMS arrives',
      'Prepare for advanced life support'
    ],
    medications: [
      { name: 'Epinephrine', dosage: '0.01 mg/kg IV/IO', route: 'IV/IO' },
      { name: 'Amiodarone', dosage: '5 mg/kg IV/IO', route: 'IV/IO' }
    ],
    vitals: ['Check pulse every 2 minutes', 'Monitor rhythm if available']
  },
  {
    id: 'severe-asthma',
    title: 'Severe Asthma Exacerbation',
    category: 'respiratory',
    urgency: 'critical',
    steps: [
      'Assess severity (unable to speak, cyanosis)',
      'High-flow oxygen',
      'Nebulized bronchodilators',
      'Systemic corticosteroids',
      'Consider IV magnesium sulfate'
    ],
    medications: [
      { name: 'Albuterol', dosage: '2.5-5mg nebulized', route: 'Nebulized' },
      { name: 'Prednisolone', dosage: '1-2 mg/kg PO', route: 'Oral' },
      { name: 'Magnesium Sulfate', dosage: '25-50 mg/kg IV', route: 'IV' }
    ]
  },
  {
    id: 'anaphylaxis',
    title: 'Anaphylaxis',
    category: 'allergic',
    urgency: 'critical',
    steps: [
      'Remove/avoid trigger if known',
      'Epinephrine IM immediately',
      'Call 911',
      'Position patient supine',
      'Prepare for second dose if no improvement'
    ],
    medications: [
      { name: 'Epinephrine', dosage: '0.01 mg/kg IM (max 0.5mg)', route: 'IM' },
      { name: 'Diphenhydramine', dosage: '1-2 mg/kg IV/IM', route: 'IV/IM' },
      { name: 'Methylprednisolone', dosage: '1-2 mg/kg IV', route: 'IV' }
    ]
  },
  {
    id: 'seizure',
    title: 'Status Epilepticus',
    category: 'neurological',
    urgency: 'critical',
    steps: [
      'Protect airway and prevent injury',
      'Check blood glucose',
      'IV/IO access',
      'Benzodiazepine administration',
      'If continues >5 min, second-line therapy'
    ],
    medications: [
      { name: 'Lorazepam', dosage: '0.1 mg/kg IV/IO', route: 'IV/IO' },
      { name: 'Midazolam', dosage: '0.2 mg/kg IM', route: 'IM' },
      { name: 'Phenytoin', dosage: '20 mg/kg IV', route: 'IV' }
    ]
  }
];

export function EmergencyMode({ onClose, onProtocolSelect }: EmergencyModeProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    setIsTimerRunning(true);
    setTimer(0);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cardiac': return <Heart className="h-4 w-4" />;
      case 'respiratory': return <Activity className="h-4 w-4" />;
      case 'neurological': return <Zap className="h-4 w-4" />;
      case 'allergic': return <Shield className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'urgent': return 'default';
      case 'semi-urgent': return 'secondary';
      default: return 'outline';
    }
  };

  const filteredProtocols = selectedCategory 
    ? emergencyProtocols.filter(p => p.category === selectedCategory)
    : emergencyProtocols;

  return (
    <div className="fixed inset-0 bg-red-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto border-red-200 bg-red-50/95 dark:bg-red-950/95">
        <CardHeader className="bg-red-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Emergency Mode</CardTitle>
                <CardDescription className="text-red-100">
                  Pediatric Emergency Protocols - Nelson Textbook Guidelines
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Emergency Timer */}
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">{formatTime(timer)}</span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={isTimerRunning ? stopTimer : startTimer}
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                >
                  {isTimerRunning ? '⏸' : '▶'}
                </Button>
              </div>
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Emergency Contacts */}
          <Alert className="mb-6 border-red-200 bg-red-50">
            <Phone className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="font-medium">Emergency: 911 | Poison Control: 1-800-222-1222</span>
              <Button size="sm" variant="outline" className="ml-4">
                <Phone className="h-3 w-3 mr-1" />
                Call 911
              </Button>
            </AlertDescription>
          </Alert>

          {/* Category Filters */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Emergency Categories</h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All Protocols
              </Button>
              {['cardiac', 'respiratory', 'neurological', 'allergic', 'trauma', 'poisoning'].map(category => (
                <Button 
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {getCategoryIcon(category)}
                  <span className="ml-1">{category}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Emergency Protocols */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredProtocols.map(protocol => (
              <Card key={protocol.id} className="border-l-4 border-l-red-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getCategoryIcon(protocol.category)}
                      {protocol.title}
                    </CardTitle>
                    <Badge variant={getUrgencyColor(protocol.urgency) as any}>
                      {protocol.urgency}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Steps */}
                  <div>
                    <h4 className="font-medium mb-2">Immediate Actions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {protocol.steps.map((step, index) => (
                        <li key={index} className="text-gray-700 dark:text-gray-300">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Medications */}
                  {protocol.medications && (
                    <div>
                      <h4 className="font-medium mb-2">Medications:</h4>
                      <div className="space-y-2">
                        {protocol.medications.map((med, index) => (
                          <div key={index} className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded text-sm">
                            <div className="font-medium">{med.name}</div>
                            <div className="text-gray-600 dark:text-gray-400">
                              {med.dosage} - {med.route}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vitals */}
                  {protocol.vitals && (
                    <div>
                      <h4 className="font-medium mb-2">Monitoring:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {protocol.vitals.map((vital, index) => (
                          <li key={index} className="text-gray-700 dark:text-gray-300">
                            {vital}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button 
                    onClick={() => onProtocolSelect?.(protocol)}
                    className="w-full"
                    variant="outline"
                  >
                    Use This Protocol
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Disclaimer */}
          <Alert className="mt-6 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Medical Disclaimer:</strong> These protocols are for reference only and based on Nelson Textbook of Pediatrics guidelines. 
              Always follow your institution's protocols and consult with senior medical staff. In true emergencies, call 911 immediately.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
