/**
 * Medical Citation and Evidence System
 * 
 * Implements comprehensive medical citation management with evidence-based
 * medicine standards, source verification, and academic referencing.
 */

export interface MedicalCitation {
  id: string;
  type: 'journal_article' | 'clinical_guideline' | 'systematic_review' | 'meta_analysis' | 'textbook' | 'database';
  title: string;
  authors: Author[];
  publication: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  pmid?: string; // PubMed ID
  url?: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  studyType?: StudyType;
  sampleSize?: number;
  abstract?: string;
  keywords: string[];
  medicalSpecialty: string[];
  lastVerified: string;
  accessDate: string;
  citationCount?: number;
  impactFactor?: number;
}

export interface Author {
  firstName: string;
  lastName: string;
  middleInitial?: string;
  affiliation?: string;
  orcid?: string;
}

export interface StudyType {
  primary: 'randomized_controlled_trial' | 'cohort_study' | 'case_control' | 'cross_sectional' | 'case_series' | 'case_report' | 'review' | 'meta_analysis';
  secondary?: string[];
  blindingType?: 'single_blind' | 'double_blind' | 'triple_blind' | 'open_label';
  multiCenter?: boolean;
  prospective?: boolean;
}

export interface EvidenceAssessment {
  citationId: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  qualityScore: number; // 0-100
  biasRisk: 'low' | 'moderate' | 'high' | 'unclear';
  applicability: 'high' | 'moderate' | 'low';
  consistency: 'consistent' | 'mostly_consistent' | 'inconsistent';
  directness: 'direct' | 'indirect';
  precision: 'precise' | 'imprecise';
  assessmentDate: string;
  assessor: string;
  notes?: string;
}

export interface CitationContext {
  statement: string;
  supportingCitations: string[]; // Citation IDs
  evidenceStrength: 'strong' | 'moderate' | 'weak' | 'insufficient';
  consensusLevel: 'unanimous' | 'majority' | 'divided' | 'unclear';
  clinicalRelevance: 'high' | 'moderate' | 'low';
  lastUpdated: string;
}

export interface MedicalReference {
  id: string;
  topic: string;
  statements: CitationContext[];
  overallEvidenceLevel: 'A' | 'B' | 'C' | 'D';
  lastReviewed: string;
  nextReviewDate: string;
  reviewers: string[];
}

/**
 * Medical Citation Manager
 */
export class MedicalCitationSystem {
  private citations = new Map<string, MedicalCitation>();
  private evidenceAssessments = new Map<string, EvidenceAssessment>();
  private references = new Map<string, MedicalReference>();
  private citationIndex = new Map<string, string[]>(); // keyword -> citation IDs

  constructor() {
    this.initializeCitationDatabase();
    console.log('📚 Medical Citation System initialized');
  }

  /**
   * Add medical citation to the system
   */
  addCitation(citation: MedicalCitation): void {
    this.citations.set(citation.id, citation);
    
    // Index by keywords and medical specialties
    const indexTerms = [...citation.keywords, ...citation.medicalSpecialty];
    for (const term of indexTerms) {
      const normalizedTerm = term.toLowerCase();
      if (!this.citationIndex.has(normalizedTerm)) {
        this.citationIndex.set(normalizedTerm, []);
      }
      this.citationIndex.get(normalizedTerm)!.push(citation.id);
    }
    
    console.log(`📖 Added citation: ${citation.title.substring(0, 50)}...`);
  }

  /**
   * Search citations by topic or keywords
   */
  searchCitations(
    query: string,
    filters?: {
      evidenceLevel?: ('A' | 'B' | 'C' | 'D')[];
      type?: string[];
      yearRange?: { start: number; end: number };
      specialty?: string[];
    }
  ): MedicalCitation[] {
    const normalizedQuery = query.toLowerCase();
    const matchingCitationIds = new Set<string>();

    // Search by keywords and specialties
    for (const [term, citationIds] of this.citationIndex.entries()) {
      if (term.includes(normalizedQuery) || normalizedQuery.includes(term)) {
        citationIds.forEach(id => matchingCitationIds.add(id));
      }
    }

    // Search by title and abstract
    for (const citation of this.citations.values()) {
      const searchText = `${citation.title} ${citation.abstract || ''}`.toLowerCase();
      if (searchText.includes(normalizedQuery)) {
        matchingCitationIds.add(citation.id);
      }
    }

    let results = Array.from(matchingCitationIds)
      .map(id => this.citations.get(id)!)
      .filter(citation => citation);

    // Apply filters
    if (filters) {
      if (filters.evidenceLevel) {
        results = results.filter(c => filters.evidenceLevel!.includes(c.evidenceLevel));
      }
      
      if (filters.type) {
        results = results.filter(c => filters.type!.includes(c.type));
      }
      
      if (filters.yearRange) {
        results = results.filter(c => 
          c.year >= filters.yearRange!.start && c.year <= filters.yearRange!.end
        );
      }
      
      if (filters.specialty) {
        results = results.filter(c => 
          c.medicalSpecialty.some(spec => 
            filters.specialty!.some(filterSpec => 
              spec.toLowerCase().includes(filterSpec.toLowerCase())
            )
          )
        );
      }
    }

    // Sort by evidence level and year
    return results.sort((a, b) => {
      const evidenceOrder = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
      const evidenceDiff = evidenceOrder[b.evidenceLevel] - evidenceOrder[a.evidenceLevel];
      if (evidenceDiff !== 0) return evidenceDiff;
      return b.year - a.year;
    });
  }

  /**
   * Get citation by ID
   */
  getCitation(citationId: string): MedicalCitation | null {
    return this.citations.get(citationId) || null;
  }

  /**
   * Format citation in various academic styles
   */
  formatCitation(
    citationId: string,
    style: 'apa' | 'vancouver' | 'harvard' | 'ama' | 'nejm' = 'vancouver'
  ): string {
    const citation = this.citations.get(citationId);
    if (!citation) {
      return `Citation not found: ${citationId}`;
    }

    switch (style) {
      case 'vancouver':
        return this.formatVancouver(citation);
      case 'apa':
        return this.formatAPA(citation);
      case 'harvard':
        return this.formatHarvard(citation);
      case 'ama':
        return this.formatAMA(citation);
      case 'nejm':
        return this.formatNEJM(citation);
      default:
        return this.formatVancouver(citation);
    }
  }

  /**
   * Generate evidence summary for a topic
   */
  generateEvidenceSummary(topic: string): {
    totalCitations: number;
    evidenceDistribution: Record<string, number>;
    qualityAssessment: {
      highQuality: number;
      moderateQuality: number;
      lowQuality: number;
    };
    recommendations: string[];
    lastUpdated: string;
  } {
    const citations = this.searchCitations(topic);
    const evidenceDistribution = { A: 0, B: 0, C: 0, D: 0 };
    const qualityAssessment = { highQuality: 0, moderateQuality: 0, lowQuality: 0 };

    for (const citation of citations) {
      evidenceDistribution[citation.evidenceLevel]++;
      
      const assessment = this.evidenceAssessments.get(citation.id);
      if (assessment) {
        if (assessment.qualityScore >= 80) qualityAssessment.highQuality++;
        else if (assessment.qualityScore >= 60) qualityAssessment.moderateQuality++;
        else qualityAssessment.lowQuality++;
      }
    }

    const recommendations = this.generateEvidenceRecommendations(citations);

    return {
      totalCitations: citations.length,
      evidenceDistribution,
      qualityAssessment,
      recommendations,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Assess evidence quality for a citation
   */
  assessEvidenceQuality(citationId: string, assessment: Omit<EvidenceAssessment, 'citationId'>): void {
    const fullAssessment: EvidenceAssessment = {
      citationId,
      ...assessment
    };
    
    this.evidenceAssessments.set(citationId, fullAssessment);
    console.log(`📊 Evidence assessment added for citation: ${citationId}`);
  }

  /**
   * Get evidence assessment for a citation
   */
  getEvidenceAssessment(citationId: string): EvidenceAssessment | null {
    return this.evidenceAssessments.get(citationId) || null;
  }

  /**
   * Create medical reference with citations
   */
  createMedicalReference(reference: MedicalReference): void {
    this.references.set(reference.id, reference);
    console.log(`📋 Created medical reference: ${reference.topic}`);
  }

  /**
   * Get medical reference
   */
  getMedicalReference(referenceId: string): MedicalReference | null {
    return this.references.get(referenceId) || null;
  }

  /**
   * Validate citation completeness
   */
  validateCitation(citation: MedicalCitation): {
    isValid: boolean;
    missingFields: string[];
    warnings: string[];
  } {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!citation.title) missingFields.push('title');
    if (!citation.authors || citation.authors.length === 0) missingFields.push('authors');
    if (!citation.publication) missingFields.push('publication');
    if (!citation.year) missingFields.push('year');

    // Recommended fields
    if (!citation.doi && !citation.pmid) {
      warnings.push('Missing DOI or PMID for verification');
    }
    
    if (!citation.abstract) {
      warnings.push('Missing abstract for better searchability');
    }
    
    if (citation.keywords.length === 0) {
      warnings.push('No keywords provided for indexing');
    }

    // Evidence level validation
    if (citation.type === 'systematic_review' && citation.evidenceLevel !== 'A') {
      warnings.push('Systematic reviews typically have evidence level A');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings
    };
  }

  /**
   * Generate bibliography for a set of citations
   */
  generateBibliography(
    citationIds: string[],
    style: 'apa' | 'vancouver' | 'harvard' | 'ama' | 'nejm' = 'vancouver'
  ): string {
    const citations = citationIds
      .map(id => this.citations.get(id))
      .filter(citation => citation)
      .sort((a, b) => {
        // Sort by first author's last name
        const aAuthor = a!.authors[0]?.lastName || '';
        const bAuthor = b!.authors[0]?.lastName || '';
        return aAuthor.localeCompare(bAuthor);
      });

    let bibliography = '## References\n\n';
    
    citations.forEach((citation, index) => {
      const formattedCitation = this.formatCitation(citation!.id, style);
      bibliography += `${index + 1}. ${formattedCitation}\n\n`;
    });

    return bibliography;
  }

  /**
   * Check for citation updates
   */
  async checkForUpdates(citationId: string): Promise<{
    hasUpdates: boolean;
    updates?: {
      citationCount?: number;
      impactFactor?: number;
      retracted?: boolean;
      corrections?: string[];
    };
  }> {
    // In a real implementation, this would check external databases
    // For now, return a mock response
    const citation = this.citations.get(citationId);
    if (!citation) {
      return { hasUpdates: false };
    }

    // Simulate checking for updates
    const hasUpdates = Math.random() > 0.8; // 20% chance of updates
    
    if (hasUpdates) {
      return {
        hasUpdates: true,
        updates: {
          citationCount: (citation.citationCount || 0) + Math.floor(Math.random() * 10),
          impactFactor: citation.impactFactor ? citation.impactFactor + 0.1 : undefined
        }
      };
    }

    return { hasUpdates: false };
  }

  /**
   * Format citation in Vancouver style
   */
  private formatVancouver(citation: MedicalCitation): string {
    const authors = this.formatAuthorsVancouver(citation.authors);
    let formatted = `${authors}. ${citation.title}`;
    
    if (!citation.title.endsWith('.')) {
      formatted += '.';
    }
    
    formatted += ` ${citation.publication}`;
    
    if (citation.year) {
      formatted += `. ${citation.year}`;
    }
    
    if (citation.volume) {
      formatted += `;${citation.volume}`;
      if (citation.issue) {
        formatted += `(${citation.issue})`;
      }
    }
    
    if (citation.pages) {
      formatted += `:${citation.pages}`;
    }
    
    if (citation.doi) {
      formatted += `. doi:${citation.doi}`;
    }
    
    return formatted;
  }

  /**
   * Format citation in APA style
   */
  private formatAPA(citation: MedicalCitation): string {
    const authors = this.formatAuthorsAPA(citation.authors);
    let formatted = `${authors} (${citation.year}). ${citation.title}`;
    
    if (!citation.title.endsWith('.')) {
      formatted += '.';
    }
    
    formatted += ` *${citation.publication}*`;
    
    if (citation.volume) {
      formatted += `, *${citation.volume}*`;
      if (citation.issue) {
        formatted += `(${citation.issue})`;
      }
    }
    
    if (citation.pages) {
      formatted += `, ${citation.pages}`;
    }
    
    if (citation.doi) {
      formatted += `. https://doi.org/${citation.doi}`;
    }
    
    return formatted;
  }

  /**
   * Format citation in Harvard style
   */
  private formatHarvard(citation: MedicalCitation): string {
    const authors = this.formatAuthorsHarvard(citation.authors);
    let formatted = `${authors} ${citation.year}, '${citation.title}'`;
    
    formatted += `, *${citation.publication}*`;
    
    if (citation.volume) {
      formatted += `, vol. ${citation.volume}`;
      if (citation.issue) {
        formatted += `, no. ${citation.issue}`;
      }
    }
    
    if (citation.pages) {
      formatted += `, pp. ${citation.pages}`;
    }
    
    if (citation.doi) {
      formatted += `, doi: ${citation.doi}`;
    }
    
    return formatted + '.';
  }

  /**
   * Format citation in AMA style
   */
  private formatAMA(citation: MedicalCitation): string {
    const authors = this.formatAuthorsAMA(citation.authors);
    let formatted = `${authors}. ${citation.title}`;
    
    if (!citation.title.endsWith('.')) {
      formatted += '.';
    }
    
    formatted += ` *${citation.publication}*`;
    
    if (citation.year) {
      formatted += `. ${citation.year}`;
    }
    
    if (citation.volume) {
      formatted += `;${citation.volume}`;
      if (citation.issue) {
        formatted += `(${citation.issue})`;
      }
    }
    
    if (citation.pages) {
      formatted += `:${citation.pages}`;
    }
    
    if (citation.doi) {
      formatted += `. doi:${citation.doi}`;
    }
    
    return formatted;
  }

  /**
   * Format citation in NEJM style
   */
  private formatNEJM(citation: MedicalCitation): string {
    const authors = this.formatAuthorsNEJM(citation.authors);
    let formatted = `${authors}. ${citation.title}`;
    
    if (!citation.title.endsWith('.')) {
      formatted += '.';
    }
    
    formatted += ` N Engl J Med ${citation.year}`;
    
    if (citation.volume) {
      formatted += `;${citation.volume}`;
    }
    
    if (citation.pages) {
      formatted += `:${citation.pages}`;
    }
    
    if (citation.doi) {
      formatted += `. DOI: ${citation.doi}`;
    }
    
    return formatted;
  }

  /**
   * Format authors for different citation styles
   */
  private formatAuthorsVancouver(authors: Author[]): string {
    if (authors.length === 0) return '';
    
    const formattedAuthors = authors.slice(0, 6).map(author => {
      let name = author.lastName;
      if (author.firstName) {
        name += ` ${author.firstName.charAt(0)}`;
      }
      if (author.middleInitial) {
        name += author.middleInitial;
      }
      return name;
    });
    
    if (authors.length > 6) {
      formattedAuthors.push('et al');
    }
    
    return formattedAuthors.join(', ');
  }

  private formatAuthorsAPA(authors: Author[]): string {
    if (authors.length === 0) return '';
    
    const formattedAuthors = authors.map(author => {
      let name = `${author.lastName}, ${author.firstName.charAt(0)}.`;
      if (author.middleInitial) {
        name += ` ${author.middleInitial}.`;
      }
      return name;
    });
    
    if (formattedAuthors.length === 1) {
      return formattedAuthors[0];
    } else if (formattedAuthors.length === 2) {
      return `${formattedAuthors[0]} & ${formattedAuthors[1]}`;
    } else {
      const lastAuthor = formattedAuthors.pop();
      return `${formattedAuthors.join(', ')}, & ${lastAuthor}`;
    }
  }

  private formatAuthorsHarvard(authors: Author[]): string {
    if (authors.length === 0) return '';
    
    if (authors.length === 1) {
      return `${authors[0].lastName}, ${authors[0].firstName.charAt(0)}.`;
    } else if (authors.length === 2) {
      return `${authors[0].lastName}, ${authors[0].firstName.charAt(0)}. & ${authors[1].lastName}, ${authors[1].firstName.charAt(0)}.`;
    } else {
      return `${authors[0].lastName}, ${authors[0].firstName.charAt(0)}. et al.`;
    }
  }

  private formatAuthorsAMA(authors: Author[]): string {
    return this.formatAuthorsVancouver(authors);
  }

  private formatAuthorsNEJM(authors: Author[]): string {
    return this.formatAuthorsVancouver(authors);
  }

  /**
   * Generate evidence-based recommendations
   */
  private generateEvidenceRecommendations(citations: MedicalCitation[]): string[] {
    const recommendations: string[] = [];
    
    const levelACitations = citations.filter(c => c.evidenceLevel === 'A').length;
    const totalCitations = citations.length;
    
    if (levelACitations / totalCitations > 0.5) {
      recommendations.push('Strong evidence base with multiple high-quality studies');
    } else if (levelACitations > 0) {
      recommendations.push('Moderate evidence base with some high-quality studies');
    } else {
      recommendations.push('Limited high-quality evidence available');
    }
    
    const recentCitations = citations.filter(c => c.year >= new Date().getFullYear() - 5).length;
    if (recentCitations / totalCitations < 0.3) {
      recommendations.push('Consider updating with more recent literature');
    }
    
    const systematicReviews = citations.filter(c => c.type === 'systematic_review' || c.type === 'meta_analysis').length;
    if (systematicReviews === 0) {
      recommendations.push('Look for systematic reviews or meta-analyses for stronger evidence');
    }
    
    return recommendations;
  }

  /**
   * Initialize citation database with sample data
   */
  private initializeCitationDatabase(): void {
    const sampleCitations: MedicalCitation[] = [
      {
        id: 'hypertension_guidelines_2023',
        type: 'clinical_guideline',
        title: '2023 ESH Guidelines for the management of arterial hypertension',
        authors: [
          { firstName: 'Giuseppe', lastName: 'Mancia', affiliation: 'University of Milano-Bicocca' },
          { firstName: 'Reinhold', lastName: 'Kreutz', affiliation: 'Charité University Medicine Berlin' }
        ],
        publication: 'Journal of Hypertension',
        year: 2023,
        volume: '41',
        issue: '12',
        pages: '1874-2071',
        doi: '10.1097/HJH.0000000000003480',
        evidenceLevel: 'A',
        keywords: ['hypertension', 'blood pressure', 'cardiovascular', 'guidelines'],
        medicalSpecialty: ['cardiology', 'internal medicine'],
        lastVerified: new Date().toISOString(),
        accessDate: new Date().toISOString(),
        abstract: 'The 2023 ESH Guidelines provide updated recommendations for the diagnosis and management of arterial hypertension based on the latest evidence.',
        citationCount: 245,
        impactFactor: 4.2
      },
      {
        id: 'diabetes_management_2023',
        type: 'systematic_review',
        title: 'Effectiveness of continuous glucose monitoring in type 2 diabetes: a systematic review and meta-analysis',
        authors: [
          { firstName: 'Sarah', lastName: 'Johnson', affiliation: 'Harvard Medical School' },
          { firstName: 'Michael', lastName: 'Chen', affiliation: 'Mayo Clinic' }
        ],
        publication: 'Diabetes Care',
        year: 2023,
        volume: '46',
        issue: '8',
        pages: '1456-1467',
        doi: '10.2337/dc23-0456',
        pmid: '37234567',
        evidenceLevel: 'A',
        studyType: {
          primary: 'meta_analysis',
          secondary: ['systematic_review']
        },
        keywords: ['diabetes', 'glucose monitoring', 'HbA1c', 'meta-analysis'],
        medicalSpecialty: ['endocrinology', 'internal medicine'],
        lastVerified: new Date().toISOString(),
        accessDate: new Date().toISOString(),
        abstract: 'This systematic review and meta-analysis evaluates the effectiveness of continuous glucose monitoring in improving glycemic control in patients with type 2 diabetes.',
        citationCount: 89,
        impactFactor: 7.9
      }
    ];

    for (const citation of sampleCitations) {
      this.addCitation(citation);
    }

    console.log(`📚 Initialized ${sampleCitations.length} sample citations`);
  }

  /**
   * Get citation statistics
   */
  getStatistics(): {
    totalCitations: number;
    citationsByType: Record<string, number>;
    citationsByEvidenceLevel: Record<string, number>;
    citationsByYear: Record<number, number>;
    averageImpactFactor: number;
  } {
    const citationsByType: Record<string, number> = {};
    const citationsByEvidenceLevel: Record<string, number> = {};
    const citationsByYear: Record<number, number> = {};
    let totalImpactFactor = 0;
    let impactFactorCount = 0;

    for (const citation of this.citations.values()) {
      // Count by type
      citationsByType[citation.type] = (citationsByType[citation.type] || 0) + 1;
      
      // Count by evidence level
      citationsByEvidenceLevel[citation.evidenceLevel] = (citationsByEvidenceLevel[citation.evidenceLevel] || 0) + 1;
      
      // Count by year
      citationsByYear[citation.year] = (citationsByYear[citation.year] || 0) + 1;
      
      // Calculate average impact factor
      if (citation.impactFactor) {
        totalImpactFactor += citation.impactFactor;
        impactFactorCount++;
      }
    }

    return {
      totalCitations: this.citations.size,
      citationsByType,
      citationsByEvidenceLevel,
      citationsByYear,
      averageImpactFactor: impactFactorCount > 0 ? totalImpactFactor / impactFactorCount : 0
    };
  }
}

/**
 * Global medical citation system instance
 */
export const medicalCitationSystem = new MedicalCitationSystem();
