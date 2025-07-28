/**
 * Enhanced RAG (Retrieval-Augmented Generation) System for Medical Applications
 * 
 * Implements advanced medical knowledge retrieval with context-aware generation,
 * evidence-based recommendations, and clinical decision support.
 */

import { medicalKnowledgeBase, MedicalCondition, PatientContext, TreatmentOption } from './knowledge-base';

export interface MedicalQuery {
  text: string;
  type: 'symptom_analysis' | 'treatment_recommendation' | 'drug_interaction' | 'emergency_protocol' | 'general_medical';
  patientContext?: PatientContext;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  specialty?: string;
  evidenceLevel?: 'A' | 'B' | 'C' | 'D';
}

export interface RAGResponse {
  answer: string;
  confidence: number; // 0-100
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  sources: MedicalSource[];
  relatedConditions?: MedicalCondition[];
  treatmentOptions?: TreatmentOption[];
  warnings?: MedicalWarning[];
  emergencyProtocols?: any[];
  followUpQuestions?: string[];
  clinicalDecisionSupport?: ClinicalDecisionSupport;
}

export interface MedicalSource {
  id: string;
  title: string;
  type: 'knowledge_base' | 'clinical_guideline' | 'research_paper' | 'drug_database';
  relevanceScore: number;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  excerpt: string;
  url?: string;
  lastUpdated: string;
}

export interface MedicalWarning {
  type: 'allergy' | 'interaction' | 'contraindication' | 'emergency' | 'dosage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
}

export interface ClinicalDecisionSupport {
  recommendations: ClinicalRecommendation[];
  riskAssessment?: RiskAssessment;
  diagnosticSuggestions?: DiagnosticSuggestion[];
  monitoringPlan?: MonitoringPlan;
}

export interface ClinicalRecommendation {
  category: 'diagnostic' | 'therapeutic' | 'monitoring' | 'referral';
  recommendation: string;
  rationale: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeframe?: string;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: string[];
}

export interface RiskFactor {
  factor: string;
  impact: 'low' | 'moderate' | 'high';
  modifiable: boolean;
  intervention?: string;
}

export interface DiagnosticSuggestion {
  test: string;
  indication: string;
  urgency: 'routine' | 'urgent' | 'stat';
  expectedResults?: string;
  cost?: 'low' | 'moderate' | 'high';
}

export interface MonitoringPlan {
  parameters: MonitoringParameter[];
  frequency: string;
  duration: string;
  alertCriteria: string[];
}

export interface MonitoringParameter {
  parameter: string;
  method: string;
  normalRange: string;
  actionThreshold: string;
}

/**
 * Enhanced Medical RAG System
 */
export class MedicalRAGSystem {
  private knowledgeBase = medicalKnowledgeBase;
  private contextWindow = 4000; // Maximum context length
  private confidenceThreshold = 0.7; // Minimum confidence for recommendations

  constructor() {
    console.log('🧠 Enhanced Medical RAG System initialized');
  }

  /**
   * Process medical query with enhanced RAG
   */
  async processQuery(query: MedicalQuery): Promise<RAGResponse> {
    console.log(`🔍 Processing ${query.type} query: "${query.text.substring(0, 100)}..."`);

    try {
      // Step 1: Analyze query and extract medical entities
      const extractedEntities = this.extractMedicalEntities(query.text);
      
      // Step 2: Retrieve relevant medical knowledge
      const retrievedKnowledge = await this.retrieveRelevantKnowledge(query, extractedEntities);
      
      // Step 3: Generate contextual response
      const response = await this.generateMedicalResponse(query, retrievedKnowledge);
      
      // Step 4: Add clinical decision support
      if (query.patientContext) {
        response.clinicalDecisionSupport = this.generateClinicalDecisionSupport(
          query,
          retrievedKnowledge,
          query.patientContext
        );
      }
      
      // Step 5: Validate and enhance response
      return this.validateAndEnhanceResponse(response, query);
      
    } catch (error) {
      console.error('❌ Error processing medical query:', error);
      return this.generateErrorResponse(query, error as Error);
    }
  }

  /**
   * Extract medical entities from query text
   */
  private extractMedicalEntities(text: string): {
    symptoms: string[];
    medications: string[];
    conditions: string[];
    procedures: string[];
    anatomicalTerms: string[];
  } {
    const normalizedText = text.toLowerCase();
    
    // Simple entity extraction (in production, use NLP models)
    const medicalTerms = {
      symptoms: ['pain', 'fever', 'nausea', 'headache', 'dizziness', 'fatigue', 'cough', 'shortness of breath'],
      medications: ['aspirin', 'ibuprofen', 'acetaminophen', 'metformin', 'lisinopril', 'atorvastatin'],
      conditions: ['diabetes', 'hypertension', 'asthma', 'depression', 'arthritis', 'heart disease'],
      procedures: ['surgery', 'biopsy', 'x-ray', 'mri', 'ct scan', 'blood test'],
      anatomicalTerms: ['heart', 'lung', 'liver', 'kidney', 'brain', 'stomach', 'chest', 'abdomen']
    };

    const extractedEntities = {
      symptoms: [] as string[],
      medications: [] as string[],
      conditions: [] as string[],
      procedures: [] as string[],
      anatomicalTerms: [] as string[]
    };

    // Extract entities by checking for term presence
    for (const [category, terms] of Object.entries(medicalTerms)) {
      for (const term of terms) {
        if (normalizedText.includes(term)) {
          (extractedEntities as any)[category].push(term);
        }
      }
    }

    console.log('🏷️ Extracted medical entities:', extractedEntities);
    return extractedEntities;
  }

  /**
   * Retrieve relevant medical knowledge
   */
  private async retrieveRelevantKnowledge(
    query: MedicalQuery,
    entities: any
  ): Promise<{
    conditions: MedicalCondition[];
    treatments: TreatmentOption[];
    sources: MedicalSource[];
    emergencyProtocols: any[];
  }> {
    const retrievedKnowledge = {
      conditions: [] as MedicalCondition[],
      treatments: [] as TreatmentOption[],
      sources: [] as MedicalSource[],
      emergencyProtocols: [] as any[]
    };

    // Retrieve based on query type
    switch (query.type) {
      case 'symptom_analysis':
        if (entities.symptoms.length > 0) {
          retrievedKnowledge.conditions = this.knowledgeBase.searchBySymptoms(
            entities.symptoms,
            query.patientContext
          );
        }
        break;

      case 'treatment_recommendation':
        if (entities.conditions.length > 0) {
          for (const conditionName of entities.conditions) {
            const treatments = this.knowledgeBase.getTreatmentRecommendations(
              conditionName,
              query.patientContext
            );
            retrievedKnowledge.treatments.push(...treatments);
          }
        }
        break;

      case 'drug_interaction':
        if (entities.medications.length > 0 && query.patientContext?.currentMedications) {
          const allMedications = [...entities.medications, ...query.patientContext.currentMedications];
          const interactions = this.knowledgeBase.checkDrugInteractions(allMedications);
          // Convert interactions to sources for consistency
          retrievedKnowledge.sources = interactions.map(interaction => ({
            id: `interaction_${interaction.drugName}`,
            title: `Drug Interaction: ${interaction.drugName}`,
            type: 'drug_database' as const,
            relevanceScore: this.getSeverityScore(interaction.severity),
            evidenceLevel: interaction.evidenceLevel,
            excerpt: `${interaction.clinicalEffect} - ${interaction.management}`,
            lastUpdated: new Date().toISOString()
          }));
        }
        break;

      case 'emergency_protocol':
        if (entities.conditions.length > 0) {
          for (const conditionName of entities.conditions) {
            const protocols = this.knowledgeBase.getEmergencyProtocols(conditionName);
            retrievedKnowledge.emergencyProtocols.push(...protocols);
          }
        }
        break;

      case 'general_medical':
        // Comprehensive search for general queries
        if (entities.symptoms.length > 0) {
          retrievedKnowledge.conditions = this.knowledgeBase.searchBySymptoms(
            entities.symptoms,
            query.patientContext
          );
        }
        break;
    }

    // Generate sources from retrieved knowledge
    this.generateSourcesFromKnowledge(retrievedKnowledge);

    console.log(`📚 Retrieved ${retrievedKnowledge.conditions.length} conditions, ${retrievedKnowledge.treatments.length} treatments`);
    return retrievedKnowledge;
  }

  /**
   * Generate medical response with context
   */
  private async generateMedicalResponse(
    query: MedicalQuery,
    knowledge: any
  ): Promise<RAGResponse> {
    const response: RAGResponse = {
      answer: '',
      confidence: 0,
      evidenceLevel: 'D',
      sources: knowledge.sources,
      relatedConditions: knowledge.conditions,
      treatmentOptions: knowledge.treatments,
      warnings: [],
      emergencyProtocols: knowledge.emergencyProtocols,
      followUpQuestions: []
    };

    // Generate response based on query type
    switch (query.type) {
      case 'symptom_analysis':
        response.answer = this.generateSymptomAnalysisResponse(query, knowledge);
        response.confidence = this.calculateConfidence(knowledge.conditions.length, query.urgency);
        break;

      case 'treatment_recommendation':
        response.answer = this.generateTreatmentResponse(query, knowledge);
        response.confidence = this.calculateConfidence(knowledge.treatments.length, query.urgency);
        break;

      case 'drug_interaction':
        response.answer = this.generateDrugInteractionResponse(query, knowledge);
        response.confidence = 0.9; // High confidence for drug interactions
        break;

      case 'emergency_protocol':
        response.answer = this.generateEmergencyProtocolResponse(query, knowledge);
        response.confidence = 0.95; // Very high confidence for emergency protocols
        response.evidenceLevel = 'A';
        break;

      case 'general_medical':
        response.answer = this.generateGeneralMedicalResponse(query, knowledge);
        response.confidence = this.calculateConfidence(
          knowledge.conditions.length + knowledge.treatments.length,
          query.urgency
        );
        break;
    }

    // Generate warnings
    response.warnings = this.generateMedicalWarnings(query, knowledge);

    // Generate follow-up questions
    response.followUpQuestions = this.generateFollowUpQuestions(query, knowledge);

    // Determine overall evidence level
    response.evidenceLevel = this.determineEvidenceLevel(knowledge);

    return response;
  }

  /**
   * Generate symptom analysis response
   */
  private generateSymptomAnalysisResponse(query: MedicalQuery, knowledge: any): string {
    if (knowledge.conditions.length === 0) {
      return "I couldn't find specific conditions matching the described symptoms. Please provide more details or consult with a healthcare professional for proper evaluation.";
    }

    const topConditions = knowledge.conditions.slice(0, 3);
    let response = "Based on the symptoms described, here are the most likely conditions to consider:\n\n";

    topConditions.forEach((condition: MedicalCondition, index: number) => {
      response += `${index + 1}. **${condition.name}** (${condition.category}, ${condition.severity} severity)\n`;
      response += `   - ICD-10: ${condition.icd10Code || 'N/A'}\n`;
      response += `   - Evidence Level: ${condition.evidenceLevel}\n`;
      
      if (condition.emergencyProtocols && condition.emergencyProtocols.length > 0) {
        response += `   - ⚠️ Emergency protocols available\n`;
      }
      
      response += '\n';
    });

    if (query.urgency === 'emergency') {
      response += "🚨 **EMERGENCY**: If this is a medical emergency, call 911 immediately or go to the nearest emergency room.\n\n";
    }

    response += "**Important**: This analysis is for informational purposes only. Please consult with a qualified healthcare professional for proper diagnosis and treatment.";

    return response;
  }

  /**
   * Generate treatment recommendation response
   */
  private generateTreatmentResponse(query: MedicalQuery, knowledge: any): string {
    if (knowledge.treatments.length === 0) {
      return "No specific treatment recommendations found. Please consult with a healthcare professional for personalized treatment options.";
    }

    let response = "Here are evidence-based treatment recommendations:\n\n";

    knowledge.treatments.slice(0, 5).forEach((treatment: TreatmentOption, index: number) => {
      response += `${index + 1}. **${treatment.name}** (${treatment.type})\n`;
      response += `   - Efficacy: ${treatment.efficacy}%\n`;
      response += `   - Evidence Level: ${treatment.evidenceLevel}\n`;
      
      if (treatment.dosage) {
        response += `   - Dosage: ${treatment.dosage.amount} ${treatment.dosage.unit} ${treatment.dosage.frequency}\n`;
      }
      
      if (treatment.sideEffects.length > 0) {
        response += `   - Common side effects: ${treatment.sideEffects.slice(0, 3).join(', ')}\n`;
      }
      
      response += '\n';
    });

    response += "**Important**: Treatment recommendations should be discussed with your healthcare provider who can consider your complete medical history and current condition.";

    return response;
  }

  /**
   * Generate drug interaction response
   */
  private generateDrugInteractionResponse(query: MedicalQuery, knowledge: any): string {
    if (knowledge.sources.length === 0) {
      return "No significant drug interactions found with the specified medications.";
    }

    let response = "⚠️ **Drug Interaction Analysis**:\n\n";

    knowledge.sources.forEach((source: MedicalSource, index: number) => {
      const severity = this.getSeverityFromScore(source.relevanceScore);
      response += `${index + 1}. **${source.title}** (${severity} severity)\n`;
      response += `   - ${source.excerpt}\n`;
      response += `   - Evidence Level: ${source.evidenceLevel}\n\n`;
    });

    response += "**Critical**: Always consult with your pharmacist or healthcare provider before starting, stopping, or changing medications.";

    return response;
  }

  /**
   * Generate emergency protocol response
   */
  private generateEmergencyProtocolResponse(query: MedicalQuery, knowledge: any): string {
    if (knowledge.emergencyProtocols.length === 0) {
      return "🚨 **EMERGENCY**: Call 911 immediately for any medical emergency. No specific protocols found for this condition.";
    }

    let response = "🚨 **EMERGENCY PROTOCOL**:\n\n";

    const protocol = knowledge.emergencyProtocols[0]; // Use first (most relevant) protocol
    response += `**${protocol.name}**\n`;
    response += `Indication: ${protocol.indication}\n`;
    response += `Timeframe: ${protocol.timeframe}\n\n`;

    response += "**Steps to follow**:\n";
    protocol.steps.forEach((step: any) => {
      const urgentMarker = step.criticalPoint ? '🔴 ' : '';
      response += `${step.order}. ${urgentMarker}${step.action}`;
      if (step.timeframe) {
        response += ` (${step.timeframe})`;
      }
      response += '\n';
    });

    response += "\n🚨 **CALL 911 IMMEDIATELY** if this is a life-threatening emergency.";

    return response;
  }

  /**
   * Generate general medical response
   */
  private generateGeneralMedicalResponse(query: MedicalQuery, knowledge: any): string {
    let response = "Based on your medical query, here's what I found:\n\n";

    if (knowledge.conditions.length > 0) {
      response += "**Related Conditions**:\n";
      knowledge.conditions.slice(0, 3).forEach((condition: MedicalCondition) => {
        response += `- ${condition.name} (${condition.evidenceLevel} evidence)\n`;
      });
      response += '\n';
    }

    if (knowledge.treatments.length > 0) {
      response += "**Treatment Options**:\n";
      knowledge.treatments.slice(0, 3).forEach((treatment: TreatmentOption) => {
        response += `- ${treatment.name} (${treatment.efficacy}% efficacy)\n`;
      });
      response += '\n';
    }

    response += "**Recommendation**: For personalized medical advice, please consult with a qualified healthcare professional who can evaluate your specific situation.";

    return response;
  }

  /**
   * Generate medical warnings
   */
  private generateMedicalWarnings(query: MedicalQuery, knowledge: any): MedicalWarning[] {
    const warnings: MedicalWarning[] = [];

    // Check for allergy warnings
    if (query.patientContext?.allergies.length) {
      for (const treatment of knowledge.treatments || []) {
        const hasAllergy = query.patientContext.allergies.some(allergy =>
          treatment.name.toLowerCase().includes(allergy.toLowerCase())
        );
        
        if (hasAllergy) {
          warnings.push({
            type: 'allergy',
            severity: 'critical',
            message: `Potential allergy to ${treatment.name}`,
            recommendation: 'Avoid this medication and consult healthcare provider',
            evidenceLevel: 'A'
          });
        }
      }
    }

    // Check for emergency conditions
    const emergencyConditions = knowledge.conditions?.filter((c: MedicalCondition) => 
      c.category === 'emergency' || c.severity === 'critical'
    ) || [];

    if (emergencyConditions.length > 0) {
      warnings.push({
        type: 'emergency',
        severity: 'critical',
        message: 'Potential emergency condition detected',
        recommendation: 'Seek immediate medical attention or call 911',
        evidenceLevel: 'A'
      });
    }

    return warnings;
  }

  /**
   * Generate follow-up questions
   */
  private generateFollowUpQuestions(query: MedicalQuery, knowledge: any): string[] {
    const questions: string[] = [];

    switch (query.type) {
      case 'symptom_analysis':
        questions.push(
          "How long have you been experiencing these symptoms?",
          "Are there any other symptoms you haven't mentioned?",
          "Have you taken any medications for these symptoms?"
        );
        break;

      case 'treatment_recommendation':
        questions.push(
          "Do you have any allergies to medications?",
          "Are you currently taking any other medications?",
          "Have you tried any treatments for this condition before?"
        );
        break;

      case 'drug_interaction':
        questions.push(
          "Are you taking any over-the-counter medications or supplements?",
          "Have you experienced any unusual symptoms since starting these medications?",
          "When did you last review your medications with a healthcare provider?"
        );
        break;
    }

    return questions.slice(0, 3); // Return top 3 questions
  }

  /**
   * Generate clinical decision support
   */
  private generateClinicalDecisionSupport(
    query: MedicalQuery,
    knowledge: any,
    patientContext: PatientContext
  ): ClinicalDecisionSupport {
    const recommendations: ClinicalRecommendation[] = [];
    
    // Generate diagnostic recommendations
    if (knowledge.conditions.length > 0) {
      recommendations.push({
        category: 'diagnostic',
        recommendation: 'Consider differential diagnosis evaluation',
        rationale: 'Multiple conditions match the presented symptoms',
        evidenceLevel: 'B',
        priority: 'medium',
        timeframe: '1-2 weeks'
      });
    }

    // Generate therapeutic recommendations
    if (knowledge.treatments.length > 0) {
      const topTreatment = knowledge.treatments[0];
      recommendations.push({
        category: 'therapeutic',
        recommendation: `Consider ${topTreatment.name} as first-line treatment`,
        rationale: `High efficacy (${topTreatment.efficacy}%) with ${topTreatment.evidenceLevel} level evidence`,
        evidenceLevel: topTreatment.evidenceLevel,
        priority: 'high',
        timeframe: 'immediate'
      });
    }

    // Generate risk assessment
    const riskAssessment: RiskAssessment = {
      overallRisk: this.assessOverallRisk(patientContext, knowledge),
      riskFactors: this.identifyRiskFactors(patientContext),
      mitigationStrategies: [
        'Regular monitoring of vital signs',
        'Medication adherence',
        'Lifestyle modifications as appropriate'
      ]
    };

    return {
      recommendations,
      riskAssessment
    };
  }

  /**
   * Validate and enhance response
   */
  private validateAndEnhanceResponse(response: RAGResponse, query: MedicalQuery): RAGResponse {
    // Ensure minimum confidence threshold
    if (response.confidence < this.confidenceThreshold) {
      response.answer += "\n\n**Note**: This response has lower confidence. Please consult with a healthcare professional for more reliable information.";
    }

    // Add emergency disclaimer for high urgency queries
    if (query.urgency === 'emergency') {
      response.answer = "🚨 **EMERGENCY DISCLAIMER**: If this is a medical emergency, call 911 immediately.\n\n" + response.answer;
    }

    // Add general medical disclaimer
    response.answer += "\n\n---\n*This information is for educational purposes only and should not replace professional medical advice.*";

    return response;
  }

  /**
   * Generate error response
   */
  private generateErrorResponse(query: MedicalQuery, error: Error): RAGResponse {
    return {
      answer: "I apologize, but I encountered an error while processing your medical query. Please try rephrasing your question or consult with a healthcare professional.",
      confidence: 0,
      evidenceLevel: 'D',
      sources: [],
      warnings: [{
        type: 'emergency',
        severity: 'medium',
        message: 'System error occurred',
        recommendation: 'Consult healthcare professional for reliable medical information',
        evidenceLevel: 'A'
      }]
    };
  }

  /**
   * Helper methods
   */
  private calculateConfidence(knowledgeCount: number, urgency: string): number {
    let baseConfidence = Math.min(knowledgeCount * 0.2, 0.9);
    
    // Adjust for urgency
    if (urgency === 'emergency') {
      baseConfidence = Math.max(baseConfidence, 0.8);
    }
    
    return Math.round(baseConfidence * 100) / 100;
  }

  private getSeverityScore(severity: string): number {
    const scores = { 'contraindicated': 1.0, 'major': 0.8, 'moderate': 0.6, 'minor': 0.4 };
    return scores[severity as keyof typeof scores] || 0.2;
  }

  private getSeverityFromScore(score: number): string {
    if (score >= 0.9) return 'contraindicated';
    if (score >= 0.7) return 'major';
    if (score >= 0.5) return 'moderate';
    return 'minor';
  }

  private determineEvidenceLevel(knowledge: any): 'A' | 'B' | 'C' | 'D' {
    const evidenceLevels = [
      ...(knowledge.conditions || []).map((c: MedicalCondition) => c.evidenceLevel),
      ...(knowledge.treatments || []).map((t: TreatmentOption) => t.evidenceLevel)
    ];

    if (evidenceLevels.includes('A')) return 'A';
    if (evidenceLevels.includes('B')) return 'B';
    if (evidenceLevels.includes('C')) return 'C';
    return 'D';
  }

  private generateSourcesFromKnowledge(knowledge: any): void {
    // Generate sources from conditions
    for (const condition of knowledge.conditions || []) {
      knowledge.sources.push({
        id: `condition_${condition.id}`,
        title: condition.name,
        type: 'knowledge_base',
        relevanceScore: 0.9,
        evidenceLevel: condition.evidenceLevel,
        excerpt: `${condition.category} condition with ${condition.severity} severity`,
        lastUpdated: condition.lastUpdated
      });
    }
  }

  private assessOverallRisk(patientContext: PatientContext, knowledge: any): 'low' | 'moderate' | 'high' | 'critical' {
    // Simple risk assessment based on available data
    const emergencyConditions = knowledge.conditions?.filter((c: MedicalCondition) => 
      c.category === 'emergency' || c.severity === 'critical'
    ).length || 0;

    if (emergencyConditions > 0) return 'critical';
    if (patientContext.medicalHistory.length > 3) return 'high';
    if (patientContext.currentMedications.length > 5) return 'moderate';
    return 'low';
  }

  private identifyRiskFactors(patientContext: PatientContext): RiskFactor[] {
    const riskFactors: RiskFactor[] = [];

    if (patientContext.age && patientContext.age > 65) {
      riskFactors.push({
        factor: 'Advanced age',
        impact: 'moderate',
        modifiable: false
      });
    }

    if (patientContext.currentMedications.length > 5) {
      riskFactors.push({
        factor: 'Polypharmacy',
        impact: 'moderate',
        modifiable: true,
        intervention: 'Medication review and optimization'
      });
    }

    return riskFactors;
  }
}

/**
 * Global enhanced RAG system instance
 */
export const medicalRAGSystem = new MedicalRAGSystem();
