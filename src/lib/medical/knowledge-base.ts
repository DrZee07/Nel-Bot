/**
 * Advanced Medical Knowledge Base System
 * 
 * Implements comprehensive medical knowledge management with
 * evidence-based medicine, drug interactions, and clinical guidelines.
 */

export interface MedicalCondition {
  id: string;
  name: string;
  icd10Code?: string;
  category: 'acute' | 'chronic' | 'emergency' | 'preventive';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  symptoms: string[];
  differentialDiagnosis: string[];
  treatmentOptions: TreatmentOption[];
  contraindications: string[];
  emergencyProtocols?: EmergencyProtocol[];
  evidenceLevel: 'A' | 'B' | 'C' | 'D'; // Evidence-based medicine levels
  lastUpdated: string;
  sources: MedicalSource[];
}

export interface TreatmentOption {
  id: string;
  name: string;
  type: 'medication' | 'procedure' | 'therapy' | 'lifestyle';
  dosage?: Dosage;
  duration?: string;
  efficacy: number; // 0-100 percentage
  sideEffects: string[];
  contraindications: string[];
  interactions: DrugInteraction[];
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  cost?: 'low' | 'moderate' | 'high' | 'very_high';
  availability?: 'common' | 'specialized' | 'rare';
}

export interface Dosage {
  amount: number;
  unit: string;
  frequency: string;
  route: 'oral' | 'iv' | 'im' | 'topical' | 'inhalation' | 'sublingual';
  adjustments?: DosageAdjustment[];
}

export interface DosageAdjustment {
  condition: string; // e.g., "renal impairment", "elderly", "pediatric"
  adjustment: string;
  rationale: string;
}

export interface DrugInteraction {
  drugName: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  mechanism: string;
  clinicalEffect: string;
  management: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
}

export interface EmergencyProtocol {
  id: string;
  name: string;
  indication: string;
  steps: ProtocolStep[];
  timeframe: string;
  equipment?: string[];
  medications?: string[];
  contraindications: string[];
  complications: string[];
}

export interface ProtocolStep {
  order: number;
  action: string;
  timeframe?: string;
  criticalPoint?: boolean;
  alternatives?: string[];
}

export interface MedicalSource {
  type: 'journal' | 'guideline' | 'textbook' | 'database';
  title: string;
  authors?: string[];
  publication: string;
  year: number;
  doi?: string;
  url?: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  lastVerified: string;
}

export interface PatientContext {
  age?: number;
  weight?: number;
  height?: number;
  sex?: 'male' | 'female' | 'other';
  allergies: string[];
  currentMedications: string[];
  medicalHistory: string[];
  vitalSigns?: VitalSigns;
  labResults?: LabResult[];
  emergencyContact?: EmergencyContact;
}

export interface VitalSigns {
  bloodPressure?: { systolic: number; diastolic: number };
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  timestamp: string;
}

export interface LabResult {
  test: string;
  value: number;
  unit: string;
  referenceRange: string;
  abnormal?: boolean;
  timestamp: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

/**
 * Advanced Medical Knowledge Base Manager
 */
export class MedicalKnowledgeBase {
  private conditions = new Map<string, MedicalCondition>();
  private medications = new Map<string, TreatmentOption>();
  private emergencyProtocols = new Map<string, EmergencyProtocol>();
  private drugInteractions = new Map<string, DrugInteraction[]>();
  private indexedSymptoms = new Map<string, string[]>(); // symptom -> condition IDs
  private indexedICD10 = new Map<string, string>(); // ICD10 -> condition ID

  constructor() {
    this.initializeKnowledgeBase();
    console.log('🏥 Medical Knowledge Base initialized');
  }

  /**
   * Search for medical conditions by symptoms
   */
  searchBySymptoms(symptoms: string[], patientContext?: PatientContext): MedicalCondition[] {
    const normalizedSymptoms = symptoms.map(s => s.toLowerCase().trim());
    const conditionScores = new Map<string, number>();

    // Score conditions based on symptom matches
    for (const symptom of normalizedSymptoms) {
      const matchingConditions = this.indexedSymptoms.get(symptom) || [];
      for (const conditionId of matchingConditions) {
        const currentScore = conditionScores.get(conditionId) || 0;
        conditionScores.set(conditionId, currentScore + 1);
      }
    }

    // Get conditions and sort by relevance
    const results = Array.from(conditionScores.entries())
      .map(([conditionId, score]) => ({
        condition: this.conditions.get(conditionId)!,
        relevanceScore: score / symptoms.length
      }))
      .filter(result => result.condition)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .map(result => result.condition);

    // Apply patient context filtering if available
    if (patientContext) {
      return this.filterByPatientContext(results, patientContext);
    }

    return results.slice(0, 10); // Return top 10 matches
  }

  /**
   * Get treatment recommendations for a condition
   */
  getTreatmentRecommendations(
    conditionId: string,
    patientContext?: PatientContext
  ): TreatmentOption[] {
    const condition = this.conditions.get(conditionId);
    if (!condition) {
      throw new Error(`Condition ${conditionId} not found`);
    }

    let treatments = [...condition.treatmentOptions];

    // Filter based on patient context
    if (patientContext) {
      treatments = this.filterTreatmentsByPatientContext(treatments, patientContext);
    }

    // Sort by evidence level and efficacy
    return treatments.sort((a, b) => {
      const evidenceOrder = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
      const evidenceDiff = evidenceOrder[b.evidenceLevel] - evidenceOrder[a.evidenceLevel];
      if (evidenceDiff !== 0) return evidenceDiff;
      return b.efficacy - a.efficacy;
    });
  }

  /**
   * Check for drug interactions
   */
  checkDrugInteractions(medications: string[]): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];
    
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const drug1 = medications[i].toLowerCase();
        const drug2 = medications[j].toLowerCase();
        
        const drug1Interactions = this.drugInteractions.get(drug1) || [];
        const drug2Interactions = this.drugInteractions.get(drug2) || [];
        
        // Check if drug1 interacts with drug2
        const interaction1 = drug1Interactions.find(int => 
          int.drugName.toLowerCase() === drug2
        );
        
        // Check if drug2 interacts with drug1
        const interaction2 = drug2Interactions.find(int => 
          int.drugName.toLowerCase() === drug1
        );
        
        if (interaction1) interactions.push(interaction1);
        if (interaction2) interactions.push(interaction2);
      }
    }

    // Sort by severity
    const severityOrder = { 'contraindicated': 4, 'major': 3, 'moderate': 2, 'minor': 1 };
    return interactions.sort((a, b) => 
      severityOrder[b.severity] - severityOrder[a.severity]
    );
  }

  /**
   * Calculate safe dosage based on patient context
   */
  calculateSafeDosage(
    medicationId: string,
    patientContext: PatientContext
  ): Dosage | null {
    const medication = this.medications.get(medicationId);
    if (!medication || !medication.dosage) {
      return null;
    }

    let adjustedDosage = { ...medication.dosage };

    // Apply dosage adjustments based on patient context
    if (medication.dosage.adjustments) {
      for (const adjustment of medication.dosage.adjustments) {
        if (this.shouldApplyAdjustment(adjustment, patientContext)) {
          adjustedDosage = this.applyDosageAdjustment(adjustedDosage, adjustment);
          console.log(`📊 Applied dosage adjustment for ${adjustment.condition}: ${adjustment.adjustment}`);
        }
      }
    }

    return adjustedDosage;
  }

  /**
   * Get emergency protocols for a condition
   */
  getEmergencyProtocols(conditionId: string): EmergencyProtocol[] {
    const condition = this.conditions.get(conditionId);
    if (!condition || !condition.emergencyProtocols) {
      return [];
    }

    return condition.emergencyProtocols.sort((a, b) => {
      // Prioritize protocols with shorter timeframes
      const timeA = this.parseTimeframe(a.timeframe);
      const timeB = this.parseTimeframe(b.timeframe);
      return timeA - timeB;
    });
  }

  /**
   * Search medical knowledge by ICD-10 code
   */
  searchByICD10(icd10Code: string): MedicalCondition | null {
    const conditionId = this.indexedICD10.get(icd10Code.toUpperCase());
    return conditionId ? this.conditions.get(conditionId) || null : null;
  }

  /**
   * Get differential diagnosis for symptoms
   */
  getDifferentialDiagnosis(symptoms: string[], patientContext?: PatientContext): {
    primary: MedicalCondition[];
    secondary: MedicalCondition[];
    emergency: MedicalCondition[];
  } {
    const allMatches = this.searchBySymptoms(symptoms, patientContext);
    
    const primary = allMatches.filter(c => c.category !== 'emergency').slice(0, 5);
    const secondary = allMatches.slice(5, 10);
    const emergency = allMatches.filter(c => c.category === 'emergency' || c.severity === 'critical');

    return { primary, secondary, emergency };
  }

  /**
   * Filter conditions by patient context
   */
  private filterByPatientContext(
    conditions: MedicalCondition[],
    patientContext: PatientContext
  ): MedicalCondition[] {
    return conditions.filter(condition => {
      // Check age-related conditions
      if (patientContext.age !== undefined) {
        // Add age-specific filtering logic here
        // For example, certain conditions are more common in specific age groups
      }

      // Check sex-related conditions
      if (patientContext.sex) {
        // Add sex-specific filtering logic here
      }

      // Check medical history
      if (patientContext.medicalHistory.length > 0) {
        // Prioritize conditions related to medical history
      }

      return true; // For now, return all conditions
    });
  }

  /**
   * Filter treatments by patient context
   */
  private filterTreatmentsByPatientContext(
    treatments: TreatmentOption[],
    patientContext: PatientContext
  ): TreatmentOption[] {
    return treatments.filter(treatment => {
      // Check allergies
      if (patientContext.allergies.length > 0) {
        const hasAllergy = patientContext.allergies.some(allergy =>
          treatment.name.toLowerCase().includes(allergy.toLowerCase()) ||
          treatment.sideEffects.some(effect => 
            effect.toLowerCase().includes(allergy.toLowerCase())
          )
        );
        if (hasAllergy) {
          console.warn(`⚠️ Treatment ${treatment.name} filtered due to allergy`);
          return false;
        }
      }

      // Check drug interactions with current medications
      if (patientContext.currentMedications.length > 0) {
        const hasInteraction = treatment.interactions.some(interaction =>
          patientContext.currentMedications.some(med =>
            med.toLowerCase().includes(interaction.drugName.toLowerCase())
          )
        );
        if (hasInteraction) {
          console.warn(`⚠️ Treatment ${treatment.name} has potential drug interaction`);
          // Don't filter out, but flag for review
        }
      }

      return true;
    });
  }

  /**
   * Check if dosage adjustment should be applied
   */
  private shouldApplyAdjustment(
    adjustment: DosageAdjustment,
    patientContext: PatientContext
  ): boolean {
    const condition = adjustment.condition.toLowerCase();

    // Age-based adjustments
    if (condition.includes('elderly') && patientContext.age && patientContext.age >= 65) {
      return true;
    }
    if (condition.includes('pediatric') && patientContext.age && patientContext.age < 18) {
      return true;
    }

    // Medical history-based adjustments
    if (patientContext.medicalHistory.some(history => 
      history.toLowerCase().includes(condition)
    )) {
      return true;
    }

    return false;
  }

  /**
   * Apply dosage adjustment
   */
  private applyDosageAdjustment(
    dosage: Dosage,
    adjustment: DosageAdjustment
  ): Dosage {
    const adjustedDosage = { ...dosage };

    // Parse adjustment string and apply
    const adjustmentText = adjustment.adjustment.toLowerCase();
    
    if (adjustmentText.includes('reduce') || adjustmentText.includes('decrease')) {
      if (adjustmentText.includes('50%')) {
        adjustedDosage.amount *= 0.5;
      } else if (adjustmentText.includes('25%')) {
        adjustedDosage.amount *= 0.75;
      } else {
        adjustedDosage.amount *= 0.8; // Default 20% reduction
      }
    } else if (adjustmentText.includes('increase')) {
      if (adjustmentText.includes('50%')) {
        adjustedDosage.amount *= 1.5;
      } else if (adjustmentText.includes('25%')) {
        adjustedDosage.amount *= 1.25;
      } else {
        adjustedDosage.amount *= 1.2; // Default 20% increase
      }
    }

    return adjustedDosage;
  }

  /**
   * Parse timeframe string to minutes
   */
  private parseTimeframe(timeframe: string): number {
    const lower = timeframe.toLowerCase();
    
    if (lower.includes('immediate')) return 0;
    if (lower.includes('minute')) {
      const match = lower.match(/(\d+)\s*minute/);
      return match ? parseInt(match[1]) : 5;
    }
    if (lower.includes('hour')) {
      const match = lower.match(/(\d+)\s*hour/);
      return match ? parseInt(match[1]) * 60 : 60;
    }
    
    return 30; // Default 30 minutes
  }

  /**
   * Initialize knowledge base with sample data
   */
  private initializeKnowledgeBase(): void {
    // Sample medical conditions
    const sampleConditions: MedicalCondition[] = [
      {
        id: 'hypertension',
        name: 'Hypertension',
        icd10Code: 'I10',
        category: 'chronic',
        severity: 'moderate',
        symptoms: ['headache', 'dizziness', 'chest pain', 'shortness of breath'],
        differentialDiagnosis: ['secondary hypertension', 'white coat hypertension'],
        treatmentOptions: [],
        contraindications: [],
        evidenceLevel: 'A',
        lastUpdated: new Date().toISOString(),
        sources: [{
          type: 'guideline',
          title: 'AHA/ACC Hypertension Guidelines',
          publication: 'American Heart Association',
          year: 2023,
          evidenceLevel: 'A',
          lastVerified: new Date().toISOString()
        }]
      },
      {
        id: 'acute_mi',
        name: 'Acute Myocardial Infarction',
        icd10Code: 'I21',
        category: 'emergency',
        severity: 'critical',
        symptoms: ['chest pain', 'shortness of breath', 'nausea', 'sweating', 'arm pain'],
        differentialDiagnosis: ['unstable angina', 'pulmonary embolism', 'aortic dissection'],
        treatmentOptions: [],
        contraindications: [],
        emergencyProtocols: [{
          id: 'stemi_protocol',
          name: 'STEMI Protocol',
          indication: 'ST-elevation myocardial infarction',
          steps: [
            { order: 1, action: 'Obtain 12-lead ECG within 10 minutes', timeframe: '10 minutes', criticalPoint: true },
            { order: 2, action: 'Administer aspirin 325mg chewed', timeframe: 'immediate' },
            { order: 3, action: 'Activate cardiac catheterization lab', timeframe: '15 minutes', criticalPoint: true }
          ],
          timeframe: 'immediate',
          equipment: ['ECG machine', 'defibrillator', 'IV access'],
          medications: ['aspirin', 'clopidogrel', 'heparin'],
          contraindications: ['active bleeding', 'recent surgery'],
          complications: ['cardiogenic shock', 'arrhythmias', 'mechanical complications']
        }],
        evidenceLevel: 'A',
        lastUpdated: new Date().toISOString(),
        sources: []
      }
    ];

    // Initialize conditions
    for (const condition of sampleConditions) {
      this.conditions.set(condition.id, condition);
      
      // Index by ICD-10
      if (condition.icd10Code) {
        this.indexedICD10.set(condition.icd10Code, condition.id);
      }
      
      // Index by symptoms
      for (const symptom of condition.symptoms) {
        const normalizedSymptom = symptom.toLowerCase();
        if (!this.indexedSymptoms.has(normalizedSymptom)) {
          this.indexedSymptoms.set(normalizedSymptom, []);
        }
        this.indexedSymptoms.get(normalizedSymptom)!.push(condition.id);
      }
    }

    console.log(`📚 Initialized ${sampleConditions.length} medical conditions`);
  }

  /**
   * Add new medical condition to knowledge base
   */
  addCondition(condition: MedicalCondition): void {
    this.conditions.set(condition.id, condition);
    
    // Update indexes
    if (condition.icd10Code) {
      this.indexedICD10.set(condition.icd10Code, condition.id);
    }
    
    for (const symptom of condition.symptoms) {
      const normalizedSymptom = symptom.toLowerCase();
      if (!this.indexedSymptoms.has(normalizedSymptom)) {
        this.indexedSymptoms.set(normalizedSymptom, []);
      }
      this.indexedSymptoms.get(normalizedSymptom)!.push(condition.id);
    }
    
    console.log(`➕ Added medical condition: ${condition.name}`);
  }

  /**
   * Get knowledge base statistics
   */
  getStatistics(): {
    totalConditions: number;
    totalMedications: number;
    totalEmergencyProtocols: number;
    totalDrugInteractions: number;
    evidenceLevels: Record<string, number>;
  } {
    const evidenceLevels = { A: 0, B: 0, C: 0, D: 0 };
    
    for (const condition of this.conditions.values()) {
      evidenceLevels[condition.evidenceLevel]++;
    }

    return {
      totalConditions: this.conditions.size,
      totalMedications: this.medications.size,
      totalEmergencyProtocols: this.emergencyProtocols.size,
      totalDrugInteractions: Array.from(this.drugInteractions.values()).flat().length,
      evidenceLevels
    };
  }
}

/**
 * Global medical knowledge base instance
 */
export const medicalKnowledgeBase = new MedicalKnowledgeBase();
