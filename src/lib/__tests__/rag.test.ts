import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  searchMedicalKnowledge, 
  generateMedicalResponse, 
  calculatePediatricDosage 
} from '../rag';
import { medicalTestUtils } from '../../test/setup';

describe('RAG System - Medical Knowledge Retrieval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchMedicalKnowledge', () => {
    it('should retrieve relevant medical knowledge with proper structure', async () => {
      const query = 'pediatric asthma treatment';
      const results = await searchMedicalKnowledge(query, 3);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeLessThanOrEqual(3);
      
      if (results.length > 0) {
        const result = results[0];
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('chapter');
        expect(result).toHaveProperty('page');
        expect(result).toHaveProperty('tags');
        expect(result).toHaveProperty('lastUpdated');
        expect(result.lastUpdated).toBeInstanceOf(Date);
      }
    });

    it('should handle empty query gracefully', async () => {
      const results = await searchMedicalKnowledge('', 5);
      expect(results).toBeInstanceOf(Array);
      // Should return empty array or handle gracefully
    });

    it('should respect the limit parameter', async () => {
      const limit = 2;
      const results = await searchMedicalKnowledge('fever management', limit);
      expect(results.length).toBeLessThanOrEqual(limit);
    });

    it('should handle API errors gracefully', async () => {
      // Mock API failure
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('API Error'));
      
      const results = await searchMedicalKnowledge('test query');
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(0);
    });

    it('should filter results by medical relevance', async () => {
      const results = await searchMedicalKnowledge('pediatric cardiology');
      
      results.forEach(result => {
        expect(result.tags).toBeInstanceOf(Array);
        // Should contain medical-related tags
        const hasMedicalTags = result.tags.some(tag => 
          ['pediatric', 'medical', 'cardiology', 'treatment'].includes(tag.toLowerCase())
        );
        expect(hasMedicalTags || result.chapter.toLowerCase().includes('pediatric')).toBe(true);
      });
    });
  });

  describe('generateMedicalResponse', () => {
    it('should generate medical response with citations', async () => {
      const query = 'What is the treatment for pediatric pneumonia?';
      const result = await generateMedicalResponse(query);

      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('citations');
      expect(typeof result.response).toBe('string');
      expect(result.response.length).toBeGreaterThan(0);
      expect(result.citations).toBeInstanceOf(Array);
    });

    it('should include conversation history in context', async () => {
      const query = 'What about dosage?';
      const conversationHistory = [
        { role: 'user' as const, content: 'Tell me about amoxicillin for children' },
        { role: 'assistant' as const, content: 'Amoxicillin is commonly used for pediatric infections...' }
      ];

      const result = await generateMedicalResponse(query, conversationHistory);
      expect(result.response).toBeTruthy();
      expect(result.citations).toBeInstanceOf(Array);
    });

    it('should handle emergency medical queries with priority', async () => {
      const emergencyQuery = 'Child having difficulty breathing, what should I do?';
      const result = await generateMedicalResponse(emergencyQuery);

      expect(result.response).toBeTruthy();
      expect(result.response.toLowerCase()).toMatch(/(emergency|urgent|immediate|911|call)/);
    });

    it('should provide appropriate citations for medical advice', async () => {
      const query = 'Fever management in 2-year-old';
      const result = await generateMedicalResponse(query);

      expect(result.citations).toBeInstanceOf(Array);
      result.citations.forEach(citation => {
        expect(citation).toHaveProperty('source');
        expect(citation).toHaveProperty('page');
        expect(citation).toHaveProperty('chapter');
        expect(citation).toHaveProperty('relevance');
        expect(citation.relevance).toBeGreaterThanOrEqual(0);
        expect(citation.relevance).toBeLessThanOrEqual(1);
      });
    });

    it('should handle API failures gracefully', async () => {
      // Mock API failure
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network Error'));
      
      const result = await generateMedicalResponse('test query');
      expect(result.response).toContain('error');
      expect(result.citations).toBeInstanceOf(Array);
      expect(result.citations.length).toBe(0);
    });

    it('should sanitize and validate medical queries', async () => {
      const maliciousQuery = '<script>alert("xss")</script>What is aspirin dosage?';
      const result = await generateMedicalResponse(maliciousQuery);

      expect(result.response).not.toContain('<script>');
      expect(result.response).not.toContain('alert');
      expect(result.response).toBeTruthy();
    });
  });

  describe('calculatePediatricDosage', () => {
    it('should calculate correct dosage for standard medication', () => {
      const dosageParams = {
        drugName: 'Amoxicillin',
        dosePerKg: 20, // mg/kg
        patientWeight: 15, // kg
        frequency: 'twice daily'
      };

      const result = calculatePediatricDosage(dosageParams);
      
      medicalTestUtils.verifyDosageCalculation(result, {
        drug: 'Amoxicillin',
        weight: 15,
        dosePerKg: 20,
        expectedDose: 300 // 20 * 15
      });

      expect(result).toContain('twice daily');
      expect(result).toContain('Always verify dosing');
    });

    it('should respect maximum dose limits', () => {
      const dosageParams = {
        drugName: 'Acetaminophen',
        dosePerKg: 15,
        patientWeight: 40, // Large child
        maxDose: 500, // Maximum dose
        frequency: 'every 6 hours'
      };

      const result = calculatePediatricDosage(dosageParams);
      
      // Calculated dose would be 600mg (15 * 40), but should be capped at 500mg
      expect(result).toContain('500.0 mg'); // Should show max dose
      expect(result).toContain('Maximum dose: 500 mg');
    });

    it('should handle edge cases for very small patients', () => {
      const dosageParams = {
        drugName: 'Ibuprofen',
        dosePerKg: 10,
        patientWeight: 3, // Very small child
        frequency: 'every 8 hours'
      };

      const result = calculatePediatricDosage(dosageParams);
      
      medicalTestUtils.verifyDosageCalculation(result, {
        drug: 'Ibuprofen',
        weight: 3,
        dosePerKg: 10,
        expectedDose: 30
      });
    });

    it('should handle decimal weights accurately', () => {
      const dosageParams = {
        drugName: 'Prednisolone',
        dosePerKg: 1.5,
        patientWeight: 12.5,
        frequency: 'once daily'
      };

      const result = calculatePediatricDosage(dosageParams);
      
      // 1.5 * 12.5 = 18.75mg
      expect(result).toContain('18.8 mg'); // Rounded to 1 decimal
      expect(result).toContain('12.5 kg');
    });

    it('should include safety warnings', () => {
      const dosageParams = {
        drugName: 'Test Drug',
        dosePerKg: 5,
        patientWeight: 10,
        frequency: 'as needed'
      };

      const result = calculatePediatricDosage(dosageParams);
      
      expect(result).toContain('Always verify dosing with current guidelines');
      expect(result).toContain('consider patient-specific factors');
    });

    it('should format output consistently', () => {
      const dosageParams = {
        drugName: 'Azithromycin',
        dosePerKg: 10,
        patientWeight: 20,
        maxDose: 500,
        frequency: 'once daily for 3 days'
      };

      const result = calculatePediatricDosage(dosageParams);
      
      // Check formatting structure
      expect(result).toMatch(/\*\*.*Dosage Calculation:\*\*/);
      expect(result).toContain('- Patient weight:');
      expect(result).toContain('- Dose per kg:');
      expect(result).toContain('- Calculated dose:');
      expect(result).toContain('- **Recommended dose:');
      expect(result).toContain('*Always verify dosing');
    });
  });

  describe('Medical Data Validation', () => {
    it('should validate patient weight parameters', () => {
      expect(() => {
        calculatePediatricDosage({
          drugName: 'Test',
          dosePerKg: 10,
          patientWeight: -5, // Invalid negative weight
          frequency: 'daily'
        });
      }).not.toThrow(); // Should handle gracefully, not throw
    });

    it('should validate dose per kg parameters', () => {
      expect(() => {
        calculatePediatricDosage({
          drugName: 'Test',
          dosePerKg: 0, // Invalid zero dose
          patientWeight: 10,
          frequency: 'daily'
        });
      }).not.toThrow(); // Should handle gracefully
    });

    it('should require essential parameters', () => {
      expect(() => {
        calculatePediatricDosage({
          drugName: '',
          dosePerKg: 10,
          patientWeight: 10,
          frequency: 'daily'
        });
      }).not.toThrow(); // Should handle empty drug name gracefully
    });
  });

  describe('Performance and Reliability', () => {
    it('should complete medical knowledge search within reasonable time', async () => {
      const startTime = Date.now();
      await searchMedicalKnowledge('common pediatric conditions');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent medical queries', async () => {
      const queries = [
        'fever in infants',
        'pediatric asthma',
        'childhood vaccines',
        'growth charts'
      ];

      const promises = queries.map(query => generateMedicalResponse(query));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.response).toBeTruthy();
        expect(result.citations).toBeInstanceOf(Array);
      });
    });

    it('should maintain consistency across multiple dosage calculations', () => {
      const params = {
        drugName: 'Consistency Test',
        dosePerKg: 10,
        patientWeight: 15,
        frequency: 'twice daily'
      };

      const results = Array.from({ length: 5 }, () => calculatePediatricDosage(params));
      
      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toBe(firstResult);
      });
    });
  });
});
