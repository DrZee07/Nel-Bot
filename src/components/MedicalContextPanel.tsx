import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { PatientInfo } from '../types';
import { 
  User, 
  Calendar, 
  Weight, 
  Ruler, 
  Heart, 
  Thermometer, 
  Activity,
  AlertTriangle,
  Plus,
  X
} from 'lucide-react';

interface MedicalContextPanelProps {
  patientInfo: PatientInfo;
  onPatientInfoChange: (info: PatientInfo) => void;
  onClose?: () => void;
  compact?: boolean;
}

export function MedicalContextPanel({ 
  patientInfo, 
  onPatientInfoChange, 
  onClose,
  compact = false 
}: MedicalContextPanelProps) {
  const [newAllergy, setNewAllergy] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [newCondition, setNewCondition] = useState('');

  const addItem = (type: 'allergies' | 'medications' | 'conditions', value: string) => {
    if (!value.trim()) return;
    
    const updated = {
      ...patientInfo,
      [type]: [...patientInfo[type], value.trim()]
    };
    onPatientInfoChange(updated);
    
    if (type === 'allergies') setNewAllergy('');
    if (type === 'medications') setNewMedication('');
    if (type === 'conditions') setNewCondition('');
  };

  const removeItem = (type: 'allergies' | 'medications' | 'conditions', index: number) => {
    const updated = {
      ...patientInfo,
      [type]: patientInfo[type].filter((_, i) => i !== index)
    };
    onPatientInfoChange(updated);
  };

  const updateBasicInfo = (field: string, value: string) => {
    onPatientInfoChange({
      ...patientInfo,
      [field]: value
    });
  };

  const updateVitals = (field: string, value: string) => {
    onPatientInfoChange({
      ...patientInfo,
      vitals: {
        ...patientInfo.vitals,
        [field]: value
      }
    });
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Patient Context
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <Label className="text-xs">Age</Label>
              <Input 
                value={patientInfo.age || ''} 
                onChange={(e) => updateBasicInfo('age', e.target.value)}
                placeholder="e.g., 5 years"
                className="h-7"
              />
            </div>
            <div>
              <Label className="text-xs">Weight</Label>
              <Input 
                value={patientInfo.weight || ''} 
                onChange={(e) => updateBasicInfo('weight', e.target.value)}
                placeholder="e.g., 20 kg"
                className="h-7"
              />
            </div>
          </div>
          
          {patientInfo.allergies.length > 0 && (
            <div>
              <Label className="text-xs text-red-600">Allergies</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {patientInfo.allergies.map((allergy, index) => (
                  <Badge key={index} variant="destructive" className="text-xs">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Information
            </CardTitle>
            <CardDescription>
              Medical context for accurate consultations
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Basic Information
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Age</Label>
              <Input 
                value={patientInfo.age || ''} 
                onChange={(e) => updateBasicInfo('age', e.target.value)}
                placeholder="e.g., 5 years, 18 months"
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={patientInfo.gender} onValueChange={(value) => updateBasicInfo('gender', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1">
                <Weight className="h-3 w-3" />
                Weight
              </Label>
              <Input 
                value={patientInfo.weight || ''} 
                onChange={(e) => updateBasicInfo('weight', e.target.value)}
                placeholder="e.g., 20 kg, 45 lbs"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                Height
              </Label>
              <Input 
                value={patientInfo.height || ''} 
                onChange={(e) => updateBasicInfo('height', e.target.value)}
                placeholder="e.g., 110 cm, 3'6&quot;"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Vital Signs */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Vital Signs
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                Temperature
              </Label>
              <Input 
                value={patientInfo.vitals?.temperature || ''} 
                onChange={(e) => updateVitals('temperature', e.target.value)}
                placeholder="e.g., 38.5°C, 101.3°F"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                Heart Rate
              </Label>
              <Input 
                value={patientInfo.vitals?.heartRate || ''} 
                onChange={(e) => updateVitals('heartRate', e.target.value)}
                placeholder="e.g., 120 bpm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Blood Pressure</Label>
              <Input 
                value={patientInfo.vitals?.bloodPressure || ''} 
                onChange={(e) => updateVitals('bloodPressure', e.target.value)}
                placeholder="e.g., 110/70 mmHg"
              />
            </div>
            <div>
              <Label>Respiratory Rate</Label>
              <Input 
                value={patientInfo.vitals?.respiratoryRate || ''} 
                onChange={(e) => updateVitals('respiratoryRate', e.target.value)}
                placeholder="e.g., 22/min"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Allergies */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Allergies
          </h4>
          
          <div className="flex gap-2">
            <Input 
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              placeholder="Add allergy..."
              onKeyPress={(e) => e.key === 'Enter' && addItem('allergies', newAllergy)}
            />
            <Button 
              size="sm" 
              onClick={() => addItem('allergies', newAllergy)}
              disabled={!newAllergy.trim()}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {patientInfo.allergies.map((allergy, index) => (
              <Badge key={index} variant="destructive" className="flex items-center gap-1">
                {allergy}
                <button onClick={() => removeItem('allergies', index)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Current Medications */}
        <div className="space-y-3">
          <h4 className="font-medium">Current Medications</h4>
          
          <div className="flex gap-2">
            <Input 
              value={newMedication}
              onChange={(e) => setNewMedication(e.target.value)}
              placeholder="Add medication..."
              onKeyPress={(e) => e.key === 'Enter' && addItem('medications', newMedication)}
            />
            <Button 
              size="sm" 
              onClick={() => addItem('medications', newMedication)}
              disabled={!newMedication.trim()}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {patientInfo.medications.map((medication, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {medication}
                <button onClick={() => removeItem('medications', index)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Medical Conditions */}
        <div className="space-y-3">
          <h4 className="font-medium">Medical Conditions</h4>
          
          <div className="flex gap-2">
            <Input 
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              placeholder="Add condition..."
              onKeyPress={(e) => e.key === 'Enter' && addItem('conditions', newCondition)}
            />
            <Button 
              size="sm" 
              onClick={() => addItem('conditions', newCondition)}
              disabled={!newCondition.trim()}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {patientInfo.conditions.map((condition, index) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                {condition}
                <button onClick={() => removeItem('conditions', index)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
