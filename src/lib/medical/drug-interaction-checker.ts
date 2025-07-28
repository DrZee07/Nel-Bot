/**
 * Advanced Drug Interaction Checker for Medical Applications
 * 
 * Implements comprehensive drug interaction detection, allergy checking,
 * dosage validation, and clinical decision support for medication safety.
 */

export interface Medication {
  id: string;
  name: string;
  genericName: string;
  brandNames: string[];
  activeIngredients: string[];
  drugClass: string[];
  therapeuticCategory: string;
  dosageForm: string[];
  strength: string[];
  route: ('oral' | 'iv' | 'im' | 'topical' | 'inhalation' | 'sublingual' | 'rectal')[];
  halfLife?: string;
  metabolism: string[];
  excretion: string[];
  contraindications: string[];
  warnings: string[];
  pregnancyCategory?: 'A' | 'B' | 'C' | 'D' | 'X';
  lactationSafety?: 'safe' | 'caution' | 'avoid';
  pediatricUse?: boolean;
  geriatricConsiderations?: string[];
  renalAdjustment?: boolean;
  hepaticAdjustment?: boolean;
  fdaApproved: boolean;
  lastUpdated: string;
}

export interface DrugInteraction {
  id: string;
  drug1: string; // Medication ID
  drug2: string; // Medication ID
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  mechanism: string;
  clinicalEffect: string;
  onset: 'rapid' | 'delayed' | 'unspecified';
  documentation: 'excellent' | 'good' | 'fair' | 'poor';
  management: string;
  monitoring: string[];
  alternatives?: string[];
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  sources: string[];
  lastVerified: string;
}

export interface AllergyAlert {
  medicationId: string;
  allergen: string;
  allergyType: 'drug_allergy' | 'cross_reactivity' | 'ingredient_allergy';
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  symptoms: string[];
  crossReactiveAgents?: string[];
  recommendation: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
}

export interface DosageAlert {
  medicationId: string;
  alertType: 'overdose' | 'underdose' | 'frequency' | 'duration' | 'route';
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentDose: string;
  recommendedDose: string;
  rationale: string;
  adjustment: string;
  monitoring: string[];
}

export interface PatientMedication {
  medicationId: string;
  dose: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
  indication: string;
  prescriber: string;
  pharmacy?: string;
  adherence?: 'excellent' | 'good' | 'fair' | 'poor';
  sideEffects?: string[];
  effectiveness?: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface InteractionCheckResult {
  interactions: DrugInteraction[];
  allergyAlerts: AllergyAlert[];
  dosageAlerts: DosageAlert[];
  duplicateTherapy: DuplicateTherapyAlert[];
  clinicalRecommendations: ClinicalRecommendation[];
  overallRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
  requiresPharmacistReview: boolean;
  requiresPhysicianReview: boolean;
  timestamp: string;
}

export interface DuplicateTherapyAlert {
  medications: string[]; // Medication IDs
  therapeuticClass: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
  alternatives?: string[];
}

export interface ClinicalRecommendation {
  type: 'interaction' | 'allergy' | 'dosage' | 'monitoring' | 'alternative';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recommendation: string;
  rationale: string;
  timeframe: string;
  followUp?: string;
}

/**
 * Advanced Drug Interaction Checker
 */
export class DrugInteractionChecker {
  private medications = new Map<string, Medication>();
  private interactions = new Map<string, DrugInteraction[]>();
  private drugClassInteractions = new Map<string, string[]>();
  private allergyDatabase = new Map<string, string[]>(); // allergen -> medication IDs
  private therapeuticClasses = new Map<string, string[]>(); // class -> medication IDs

  constructor() {
    this.initializeDrugDatabase();
    console.log('💊 Drug Interaction Checker initialized');
  }

  /**
   * Comprehensive medication interaction check
   */
  checkInteractions(
    patientMedications: PatientMedication[],
    patientAllergies: string[],
    patientContext?: {
      age?: number;
      weight?: number;
      renalFunction?: 'normal' | 'mild_impairment' | 'moderate_impairment' | 'severe_impairment';
      hepaticFunction?: 'normal' | 'mild_impairment' | 'moderate_impairment' | 'severe_impairment';
      pregnancy?: boolean;
      lactation?: boolean;
      medicalConditions?: string[];
    }
  ): InteractionCheckResult {
    console.log(`🔍 Checking interactions for ${patientMedications.length} medications`);

    const result: InteractionCheckResult = {
      interactions: [],
      allergyAlerts: [],
      dosageAlerts: [],
      duplicateTherapy: [],
      clinicalRecommendations: [],
      overallRiskLevel: 'low',
      requiresPharmacistReview: false,
      requiresPhysicianReview: false,
      timestamp: new Date().toISOString()
    };

    // Check drug-drug interactions
    result.interactions = this.checkDrugDrugInteractions(patientMedications);

    // Check allergy alerts
    result.allergyAlerts = this.checkAllergyAlerts(patientMedications, patientAllergies);

    // Check dosage alerts
    if (patientContext) {
      result.dosageAlerts = this.checkDosageAlerts(patientMedications, patientContext);
    }

    // Check duplicate therapy
    result.duplicateTherapy = this.checkDuplicateTherapy(patientMedications);

    // Generate clinical recommendations
    result.clinicalRecommendations = this.generateClinicalRecommendations(result);

    // Assess overall risk level
    result.overallRiskLevel = this.assessOverallRisk(result);

    // Determine review requirements
    result.requiresPharmacistReview = this.requiresPharmacistReview(result);
    result.requiresPhysicianReview = this.requiresPhysicianReview(result);

    console.log(`✅ Interaction check complete: ${result.interactions.length} interactions, ${result.allergyAlerts.length} allergy alerts`);
    return result;
  }

  /**
   * Check for drug-drug interactions
   */
  private checkDrugDrugInteractions(patientMedications: PatientMedication[]): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];
    const medicationIds = patientMedications.map(pm => pm.medicationId);

    // Check pairwise interactions
    for (let i = 0; i < medicationIds.length; i++) {
      for (let j = i + 1; j < medicationIds.length; j++) {
        const drug1 = medicationIds[i];
        const drug2 = medicationIds[j];

        // Check direct interactions
        const directInteractions = this.findDirectInteractions(drug1, drug2);
        interactions.push(...directInteractions);

        // Check drug class interactions
        const classInteractions = this.findClassInteractions(drug1, drug2);
        interactions.push(...classInteractions);
      }
    }

    // Sort by severity
    return interactions.sort((a, b) => {
      const severityOrder = { 'contraindicated': 4, 'major': 3, 'moderate': 2, 'minor': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Check for allergy alerts
   */
  private checkAllergyAlerts(
    patientMedications: PatientMedication[],
    patientAllergies: string[]
  ): AllergyAlert[] {
    const alerts: AllergyAlert[] = [];

    for (const patientMed of patientMedications) {
      const medication = this.medications.get(patientMed.medicationId);
      if (!medication) continue;

      for (const allergy of patientAllergies) {
        const normalizedAllergy = allergy.toLowerCase().trim();

        // Check direct drug allergy
        if (medication.name.toLowerCase().includes(normalizedAllergy) ||
            medication.genericName.toLowerCase().includes(normalizedAllergy) ||
            medication.brandNames.some(brand => brand.toLowerCase().includes(normalizedAllergy))) {
          
          alerts.push({
            medicationId: medication.id,
            allergen: allergy,
            allergyType: 'drug_allergy',
            severity: 'life_threatening',
            symptoms: ['rash', 'hives', 'difficulty breathing', 'swelling'],
            recommendation: 'CONTRAINDICATED - Do not administer',
            evidenceLevel: 'A'
          });
        }

        // Check ingredient allergy
        if (medication.activeIngredients.some(ingredient => 
          ingredient.toLowerCase().includes(normalizedAllergy))) {
          
          alerts.push({
            medicationId: medication.id,
            allergen: allergy,
            allergyType: 'ingredient_allergy',
            severity: 'severe',
            symptoms: ['allergic reaction', 'skin reactions'],
            recommendation: 'Avoid - contains allergenic ingredient',
            evidenceLevel: 'A'
          });
        }

        // Check cross-reactivity
        const crossReactiveAlerts = this.checkCrossReactivity(medication, normalizedAllergy);
        alerts.push(...crossReactiveAlerts);
      }
    }

    return alerts;
  }

  /**
   * Check for dosage alerts
   */
  private checkDosageAlerts(
    patientMedications: PatientMedication[],
    patientContext: any
  ): DosageAlert[] {
    const alerts: DosageAlert[] = [];

    for (const patientMed of patientMedications) {
      const medication = this.medications.get(patientMed.medicationId);
      if (!medication) continue;

      // Check renal adjustment
      if (medication.renalAdjustment && patientContext.renalFunction !== 'normal') {
        alerts.push({
          medicationId: medication.id,
          alertType: 'overdose',
          severity: 'high',
          currentDose: patientMed.dose,
          recommendedDose: 'Reduce dose by 50%',
          rationale: `Renal impairment (${patientContext.renalFunction}) requires dose adjustment`,
          adjustment: 'Consult nephrology or reduce dose based on creatinine clearance',
          monitoring: ['serum creatinine', 'drug levels if available']
        });
      }

      // Check hepatic adjustment
      if (medication.hepaticAdjustment && patientContext.hepaticFunction !== 'normal') {
        alerts.push({
          medicationId: medication.id,
          alertType: 'overdose',
          severity: 'high',
          currentDose: patientMed.dose,
          recommendedDose: 'Reduce dose or avoid',
          rationale: `Hepatic impairment (${patientContext.hepaticFunction}) affects drug metabolism`,
          adjustment: 'Consider dose reduction or alternative medication',
          monitoring: ['liver function tests', 'clinical response']
        });
      }

      // Check geriatric considerations
      if (patientContext.age && patientContext.age >= 65 && medication.geriatricConsiderations) {
        alerts.push({
          medicationId: medication.id,
          alertType: 'overdose',
          severity: 'medium',
          currentDose: patientMed.dose,
          recommendedDose: 'Consider dose reduction',
          rationale: 'Elderly patients may require lower doses',
          adjustment: 'Start low, go slow approach recommended',
          monitoring: ['clinical response', 'adverse effects']
        });
      }

      // Check pregnancy safety
      if (patientContext.pregnancy && medication.pregnancyCategory) {
        const severity = this.getPregnancySeverity(medication.pregnancyCategory);
        if (severity !== 'low') {
          alerts.push({
            medicationId: medication.id,
            alertType: 'route',
            severity: severity as any,
            currentDose: patientMed.dose,
            recommendedDose: 'Avoid or use alternative',
            rationale: `Pregnancy category ${medication.pregnancyCategory}`,
            adjustment: 'Consult obstetrics for safer alternatives',
            monitoring: ['fetal monitoring', 'maternal monitoring']
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Check for duplicate therapy
   */
  private checkDuplicateTherapy(patientMedications: PatientMedication[]): DuplicateTherapyAlert[] {
    const alerts: DuplicateTherapyAlert[] = [];
    const therapeuticClassGroups = new Map<string, string[]>();

    // Group medications by therapeutic class
    for (const patientMed of patientMedications) {
      const medication = this.medications.get(patientMed.medicationId);
      if (!medication) continue;

      const therapeuticClass = medication.therapeuticCategory;
      if (!therapeuticClassGroups.has(therapeuticClass)) {
        therapeuticClassGroups.set(therapeuticClass, []);
      }
      therapeuticClassGroups.get(therapeuticClass)!.push(medication.id);
    }

    // Check for duplicates
    for (const [therapeuticClass, medicationIds] of therapeuticClassGroups.entries()) {
      if (medicationIds.length > 1) {
        alerts.push({
          medications: medicationIds,
          therapeuticClass,
          severity: 'medium',
          recommendation: 'Review for duplicate therapy - consider consolidating or discontinuing one medication',
          alternatives: ['Consult prescriber for medication review']
        });
      }
    }

    return alerts;
  }

  /**
   * Find direct drug interactions
   */
  private findDirectInteractions(drug1: string, drug2: string): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];
    
    // Check both directions
    const drug1Interactions = this.interactions.get(drug1) || [];
    const drug2Interactions = this.interactions.get(drug2) || [];
    
    // Find interactions involving both drugs
    interactions.push(...drug1Interactions.filter(interaction => 
      interaction.drug2 === drug2 || interaction.drug1 === drug2
    ));
    
    interactions.push(...drug2Interactions.filter(interaction => 
      interaction.drug2 === drug1 || interaction.drug1 === drug1
    ));
    
    return interactions;
  }

  /**
   * Find drug class interactions
   */
  private findClassInteractions(drug1: string, drug2: string): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];
    
    const med1 = this.medications.get(drug1);
    const med2 = this.medications.get(drug2);
    
    if (!med1 || !med2) return interactions;
    
    // Check if drug classes interact
    for (const class1 of med1.drugClass) {
      for (const class2 of med2.drugClass) {
        if (this.drugClassInteractions.has(class1) && 
            this.drugClassInteractions.get(class1)!.includes(class2)) {
          
          interactions.push({
            id: `class_interaction_${class1}_${class2}`,
            drug1,
            drug2,
            severity: 'moderate',
            mechanism: `${class1} and ${class2} drug class interaction`,
            clinicalEffect: 'Potential additive or synergistic effects',
            onset: 'unspecified',
            documentation: 'fair',
            management: 'Monitor for enhanced effects',
            monitoring: ['clinical response', 'adverse effects'],
            evidenceLevel: 'C',
            sources: ['Drug class interaction database'],
            lastVerified: new Date().toISOString()
          });
        }
      }
    }
    
    return interactions;
  }

  /**
   * Check cross-reactivity
   */
  private checkCrossReactivity(medication: Medication, allergy: string): AllergyAlert[] {
    const alerts: AllergyAlert[] = [];
    
    // Common cross-reactivity patterns
    const crossReactivityMap: Record<string, string[]> = {
      'penicillin': ['amoxicillin', 'ampicillin', 'cephalexin'],
      'sulfa': ['sulfamethoxazole', 'furosemide', 'hydrochlorothiazide'],
      'aspirin': ['ibuprofen', 'naproxen', 'diclofenac'],
      'codeine': ['morphine', 'oxycodone', 'hydrocodone']
    };
    
    for (const [allergen, crossReactiveAgents] of Object.entries(crossReactivityMap)) {
      if (allergy.includes(allergen)) {
        const isReactive = crossReactiveAgents.some(agent => 
          medication.name.toLowerCase().includes(agent) ||
          medication.genericName.toLowerCase().includes(agent) ||
          medication.activeIngredients.some(ingredient => 
            ingredient.toLowerCase().includes(agent)
          )
        );
        
        if (isReactive) {
          alerts.push({
            medicationId: medication.id,
            allergen: allergy,
            allergyType: 'cross_reactivity',
            severity: 'moderate',
            symptoms: ['allergic reaction', 'cross-sensitivity'],
            crossReactiveAgents,
            recommendation: 'Use with caution - monitor for allergic reactions',
            evidenceLevel: 'B'
          });
        }
      }
    }
    
    return alerts;
  }

  /**
   * Generate clinical recommendations
   */
  private generateClinicalRecommendations(result: InteractionCheckResult): ClinicalRecommendation[] {
    const recommendations: ClinicalRecommendation[] = [];

    // Recommendations for major interactions
    const majorInteractions = result.interactions.filter(i => i.severity === 'major' || i.severity === 'contraindicated');
    if (majorInteractions.length > 0) {
      recommendations.push({
        type: 'interaction',
        priority: 'urgent',
        recommendation: 'Review major drug interactions immediately',
        rationale: `${majorInteractions.length} major interactions detected`,
        timeframe: 'immediate',
        followUp: 'Consider alternative medications or adjust dosing'
      });
    }

    // Recommendations for allergy alerts
    if (result.allergyAlerts.length > 0) {
      recommendations.push({
        type: 'allergy',
        priority: 'urgent',
        recommendation: 'Address allergy alerts before medication administration',
        rationale: `${result.allergyAlerts.length} allergy alerts detected`,
        timeframe: 'immediate',
        followUp: 'Verify patient allergies and consider alternatives'
      });
    }

    // Recommendations for dosage alerts
    const criticalDosageAlerts = result.dosageAlerts.filter(d => d.severity === 'critical' || d.severity === 'high');
    if (criticalDosageAlerts.length > 0) {
      recommendations.push({
        type: 'dosage',
        priority: 'high',
        recommendation: 'Review dosage adjustments for patient-specific factors',
        rationale: `${criticalDosageAlerts.length} critical dosage alerts`,
        timeframe: 'within 24 hours',
        followUp: 'Implement dose adjustments and monitoring plan'
      });
    }

    // Recommendations for duplicate therapy
    if (result.duplicateTherapy.length > 0) {
      recommendations.push({
        type: 'alternative',
        priority: 'medium',
        recommendation: 'Review for duplicate therapy optimization',
        rationale: `${result.duplicateTherapy.length} potential duplicate therapies`,
        timeframe: 'within 1 week',
        followUp: 'Consolidate or discontinue redundant medications'
      });
    }

    return recommendations;
  }

  /**
   * Assess overall risk level
   */
  private assessOverallRisk(result: InteractionCheckResult): 'low' | 'moderate' | 'high' | 'critical' {
    const contraindicated = result.interactions.filter(i => i.severity === 'contraindicated').length;
    const major = result.interactions.filter(i => i.severity === 'major').length;
    const severeAllergies = result.allergyAlerts.filter(a => a.severity === 'life_threatening' || a.severity === 'severe').length;
    const criticalDosage = result.dosageAlerts.filter(d => d.severity === 'critical').length;

    if (contraindicated > 0 || severeAllergies > 0 || criticalDosage > 0) {
      return 'critical';
    } else if (major > 0 || result.dosageAlerts.filter(d => d.severity === 'high').length > 0) {
      return 'high';
    } else if (result.interactions.length > 2 || result.allergyAlerts.length > 0) {
      return 'moderate';
    } else {
      return 'low';
    }
  }

  /**
   * Determine if pharmacist review is required
   */
  private requiresPharmacistReview(result: InteractionCheckResult): boolean {
    return result.overallRiskLevel === 'high' || 
           result.overallRiskLevel === 'critical' ||
           result.interactions.filter(i => i.severity === 'major').length > 0 ||
           result.dosageAlerts.filter(d => d.severity === 'high' || d.severity === 'critical').length > 0;
  }

  /**
   * Determine if physician review is required
   */
  private requiresPhysicianReview(result: InteractionCheckResult): boolean {
    return result.overallRiskLevel === 'critical' ||
           result.interactions.filter(i => i.severity === 'contraindicated').length > 0 ||
           result.allergyAlerts.filter(a => a.severity === 'life_threatening').length > 0;
  }

  /**
   * Get pregnancy category severity
   */
  private getPregnancySeverity(category: string): string {
    const severityMap: Record<string, string> = {
      'A': 'low',
      'B': 'low',
      'C': 'medium',
      'D': 'high',
      'X': 'critical'
    };
    return severityMap[category] || 'medium';
  }

  /**
   * Add medication to database
   */
  addMedication(medication: Medication): void {
    this.medications.set(medication.id, medication);
    
    // Index by therapeutic class
    if (!this.therapeuticClasses.has(medication.therapeuticCategory)) {
      this.therapeuticClasses.set(medication.therapeuticCategory, []);
    }
    this.therapeuticClasses.get(medication.therapeuticCategory)!.push(medication.id);
    
    console.log(`💊 Added medication: ${medication.name}`);
  }

  /**
   * Add drug interaction
   */
  addInteraction(interaction: DrugInteraction): void {
    if (!this.interactions.has(interaction.drug1)) {
      this.interactions.set(interaction.drug1, []);
    }
    this.interactions.get(interaction.drug1)!.push(interaction);
    
    console.log(`⚠️ Added interaction: ${interaction.drug1} ↔ ${interaction.drug2}`);
  }

  /**
   * Get medication by ID
   */
  getMedication(medicationId: string): Medication | null {
    return this.medications.get(medicationId) || null;
  }

  /**
   * Search medications
   */
  searchMedications(query: string): Medication[] {
    const normalizedQuery = query.toLowerCase();
    const results: Medication[] = [];
    
    for (const medication of this.medications.values()) {
      if (medication.name.toLowerCase().includes(normalizedQuery) ||
          medication.genericName.toLowerCase().includes(normalizedQuery) ||
          medication.brandNames.some(brand => brand.toLowerCase().includes(normalizedQuery))) {
        results.push(medication);
      }
    }
    
    return results.slice(0, 20); // Limit results
  }

  /**
   * Initialize drug database with sample data
   */
  private initializeDrugDatabase(): void {
    const sampleMedications: Medication[] = [
      {
        id: 'warfarin',
        name: 'Warfarin',
        genericName: 'warfarin sodium',
        brandNames: ['Coumadin', 'Jantoven'],
        activeIngredients: ['warfarin sodium'],
        drugClass: ['anticoagulant', 'vitamin K antagonist'],
        therapeuticCategory: 'anticoagulation',
        dosageForm: ['tablet'],
        strength: ['1mg', '2mg', '2.5mg', '3mg', '4mg', '5mg', '6mg', '7.5mg', '10mg'],
        route: ['oral'],
        halfLife: '20-60 hours',
        metabolism: ['hepatic', 'CYP2C9', 'CYP1A2'],
        excretion: ['renal', 'fecal'],
        contraindications: ['active bleeding', 'pregnancy', 'severe liver disease'],
        warnings: ['bleeding risk', 'drug interactions', 'dietary interactions'],
        pregnancyCategory: 'X',
        lactationSafety: 'caution',
        pediatricUse: false,
        geriatricConsiderations: ['increased bleeding risk', 'lower initial doses'],
        renalAdjustment: false,
        hepaticAdjustment: true,
        fdaApproved: true,
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'aspirin',
        name: 'Aspirin',
        genericName: 'acetylsalicylic acid',
        brandNames: ['Bayer', 'Bufferin', 'Ecotrin'],
        activeIngredients: ['acetylsalicylic acid'],
        drugClass: ['NSAID', 'antiplatelet', 'salicylate'],
        therapeuticCategory: 'antiplatelet',
        dosageForm: ['tablet', 'chewable tablet', 'enteric-coated tablet'],
        strength: ['81mg', '325mg', '500mg'],
        route: ['oral'],
        halfLife: '2-3 hours',
        metabolism: ['hepatic'],
        excretion: ['renal'],
        contraindications: ['active bleeding', 'severe renal impairment'],
        warnings: ['bleeding risk', 'GI irritation', 'Reye syndrome in children'],
        pregnancyCategory: 'D',
        lactationSafety: 'caution',
        pediatricUse: false,
        geriatricConsiderations: ['increased bleeding risk', 'GI toxicity'],
        renalAdjustment: true,
        hepaticAdjustment: false,
        fdaApproved: true,
        lastUpdated: new Date().toISOString()
      }
    ];

    const sampleInteractions: DrugInteraction[] = [
      {
        id: 'warfarin_aspirin',
        drug1: 'warfarin',
        drug2: 'aspirin',
        severity: 'major',
        mechanism: 'Additive anticoagulant and antiplatelet effects',
        clinicalEffect: 'Increased risk of bleeding',
        onset: 'rapid',
        documentation: 'excellent',
        management: 'Avoid combination or monitor INR closely',
        monitoring: ['INR', 'signs of bleeding', 'CBC'],
        alternatives: ['Consider alternative antiplatelet agent'],
        evidenceLevel: 'A',
        sources: ['FDA drug label', 'Clinical studies'],
        lastVerified: new Date().toISOString()
      }
    ];

    // Initialize medications
    for (const medication of sampleMedications) {
      this.addMedication(medication);
    }

    // Initialize interactions
    for (const interaction of sampleInteractions) {
      this.addInteraction(interaction);
    }

    // Initialize drug class interactions
    this.drugClassInteractions.set('anticoagulant', ['antiplatelet', 'NSAID']);
    this.drugClassInteractions.set('NSAID', ['anticoagulant', 'ACE inhibitor']);

    console.log(`💊 Initialized ${sampleMedications.length} medications and ${sampleInteractions.length} interactions`);
  }

  /**
   * Get system statistics
   */
  getStatistics(): {
    totalMedications: number;
    totalInteractions: number;
    interactionsBySeverity: Record<string, number>;
    medicationsByClass: Record<string, number>;
  } {
    const interactionsBySeverity: Record<string, number> = {};
    const medicationsByClass: Record<string, number> = {};

    // Count interactions by severity
    for (const interactions of this.interactions.values()) {
      for (const interaction of interactions) {
        interactionsBySeverity[interaction.severity] = (interactionsBySeverity[interaction.severity] || 0) + 1;
      }
    }

    // Count medications by therapeutic class
    for (const medication of this.medications.values()) {
      medicationsByClass[medication.therapeuticCategory] = (medicationsByClass[medication.therapeuticCategory] || 0) + 1;
    }

    return {
      totalMedications: this.medications.size,
      totalInteractions: Array.from(this.interactions.values()).flat().length,
      interactionsBySeverity,
      medicationsByClass
    };
  }
}

/**
 * Global drug interaction checker instance
 */
export const drugInteractionChecker = new DrugInteractionChecker();
