import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { DosageResult } from '../../types';
import { Calculator, AlertTriangle, Info } from 'lucide-react';

interface DosageCalculatorProps {
  onCalculate?: (result: DosageResult) => void;
}

const medications = [
  {
    name: 'Acetaminophen (Paracetamol)',
    dosing: '10-15 mg/kg/dose',
    frequency: 'q4-6h',
    maxDaily: '75 mg/kg/day',
    route: 'PO/PR',
    warnings: ['Hepatotoxicity risk with overdose', 'Check for other acetaminophen-containing medications']
  },
  {
    name: 'Ibuprofen',
    dosing: '5-10 mg/kg/dose',
    frequency: 'q6-8h',
    maxDaily: '40 mg/kg/day',
    route: 'PO',
    warnings: ['Avoid in dehydration', 'GI bleeding risk', 'Renal impairment risk']
  },
  {
    name: 'Amoxicillin',
    dosing: '20-40 mg/kg/day',
    frequency: 'divided q8h',
    maxDaily: '90 mg/kg/day for severe infections',
    route: 'PO',
    warnings: ['Penicillin allergy', 'C. diff risk']
  },
  {
    name: 'Prednisolone',
    dosing: '1-2 mg/kg/day',
    frequency: 'daily or divided',
    maxDaily: '60 mg/day',
    route: 'PO',
    warnings: ['Immunosuppression', 'Growth suppression', 'Adrenal suppression']
  }
];

export function DosageCalculator({ onCalculate }: DosageCalculatorProps) {
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [selectedMedication, setSelectedMedication] = useState('');
  const [indication, setIndication] = useState('');
  const [result, setResult] = useState<DosageResult | null>(null);

  const calculateDosage = () => {
    if (!weight || !selectedMedication) return;

    const weightInKg = weightUnit === 'lbs' ? parseFloat(weight) * 0.453592 : parseFloat(weight);
    const medication = medications.find(med => med.name === selectedMedication);
    
    if (!medication) return;

    // Simple dosage calculation (in real app, this would be more sophisticated)
    const dosageRange = medication.dosing.match(/(\d+)-?(\d+)?/);
    if (!dosageRange) return;

    const minDose = parseInt(dosageRange[1]);
    const maxDose = dosageRange[2] ? parseInt(dosageRange[2]) : minDose;
    
    const calculatedMinDose = (weightInKg * minDose).toFixed(1);
    const calculatedMaxDose = maxDose !== minDose ? (weightInKg * maxDose).toFixed(1) : calculatedMinDose;
    
    const doseString = calculatedMaxDose !== calculatedMinDose 
      ? `${calculatedMinDose}-${calculatedMaxDose} mg`
      : `${calculatedMinDose} mg`;

    const calculatedResult: DosageResult = {
      medication: medication.name,
      dose: doseString,
      frequency: medication.frequency,
      route: medication.route,
      maxDose: medication.maxDaily,
      warnings: medication.warnings,
      references: [`Nelson Textbook of Pediatrics - ${medication.name} dosing`]
    };

    setResult(calculatedResult);
    onCalculate?.(calculatedResult);
  };

  const clearCalculation = () => {
    setResult(null);
    setWeight('');
    setSelectedMedication('');
    setIndication('');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Pediatric Dosage Calculator
        </CardTitle>
        <CardDescription>
          Calculate evidence-based pediatric medication dosages based on Nelson Textbook guidelines
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Patient Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Patient Weight</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Enter weight"
                className="flex-1"
              />
              <Select value={weightUnit} onValueChange={setWeightUnit}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="lbs">lbs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label>Indication (Optional)</Label>
            <Input
              value={indication}
              onChange={(e) => setIndication(e.target.value)}
              placeholder="e.g., fever, infection"
            />
          </div>
        </div>

        {/* Medication Selection */}
        <div>
          <Label>Medication</Label>
          <Select value={selectedMedication} onValueChange={setSelectedMedication}>
            <SelectTrigger>
              <SelectValue placeholder="Select medication" />
            </SelectTrigger>
            <SelectContent>
              {medications.map((med) => (
                <SelectItem key={med.name} value={med.name}>
                  {med.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={calculateDosage}
            disabled={!weight || !selectedMedication}
            className="flex-1"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculate Dosage
          </Button>
          <Button variant="outline" onClick={clearCalculation}>
            Clear
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">
                Calculated Dosage
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-green-700 dark:text-green-300">Medication</Label>
                  <p className="font-medium">{result.medication}</p>
                </div>
                <div>
                  <Label className="text-green-700 dark:text-green-300">Dose per Administration</Label>
                  <p className="font-medium">{result.dose}</p>
                </div>
                <div>
                  <Label className="text-green-700 dark:text-green-300">Frequency</Label>
                  <p className="font-medium">{result.frequency}</p>
                </div>
                <div>
                  <Label className="text-green-700 dark:text-green-300">Route</Label>
                  <p className="font-medium">{result.route}</p>
                </div>
              </div>
              
              {result.maxDose && (
                <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                  <Label className="text-green-700 dark:text-green-300">Maximum Daily Dose</Label>
                  <p className="font-medium">{result.maxDose}</p>
                </div>
              )}
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Important Warnings:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {result.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* References */}
            {result.references && (
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1 mb-1">
                  <Info className="h-3 w-3" />
                  <span className="font-medium">References:</span>
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {result.references.map((ref, index) => (
                    <li key={index}>{ref}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Medical Disclaimer */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Medical Disclaimer:</strong> This calculator provides reference dosages based on standard pediatric guidelines. 
            Always verify dosages, check for contraindications, and consider individual patient factors. 
            Consult current prescribing information and clinical judgment.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
