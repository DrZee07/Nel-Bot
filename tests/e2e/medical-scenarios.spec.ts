import { test, expect } from '@playwright/test';

test.describe('Medical Scenarios - End-to-End Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Skip splash screen if present
    const splashScreen = page.locator('[data-testid="splash-screen"]');
    if (await splashScreen.isVisible()) {
      await page.waitForTimeout(3000); // Wait for splash animation
    }
  });

  test.describe('Basic Medical Consultation Flow', () => {
    test('should complete a basic pediatric consultation', async ({ page }) => {
      // Find and interact with chat input
      const chatInput = page.locator('textarea, input[type="text"]').first();
      await expect(chatInput).toBeVisible();
      
      // Type a medical query
      const medicalQuery = 'What is the recommended dosage of acetaminophen for a 6-year-old child weighing 20kg?';
      await chatInput.fill(medicalQuery);
      
      // Submit the query
      const sendButton = page.locator('button').filter({ hasText: /send|submit/i }).first();
      await sendButton.click();
      
      // Wait for response
      await page.waitForSelector('[data-testid="chat-message"], .message', { timeout: 30000 });
      
      // Verify response contains medical information
      const response = page.locator('[data-testid="chat-message"], .message').last();
      await expect(response).toContainText(/acetaminophen|dosage|mg|kg/i);
      
      // Check for citations
      const citations = page.locator('[data-testid="citations"], .citations');
      if (await citations.isVisible()) {
        await expect(citations).toContainText(/nelson|textbook|chapter|page/i);
      }
    });

    test('should handle dosage calculation requests', async ({ page }) => {
      const chatInput = page.locator('textarea, input[type="text"]').first();
      
      // Request dosage calculation
      await chatInput.fill('Calculate amoxicillin dosage for 8-year-old, 25kg');
      await page.locator('button').filter({ hasText: /send/i }).click();
      
      // Wait for calculation response
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 });
      
      const response = page.locator('[data-testid="chat-message"]').last();
      await expect(response).toContainText(/amoxicillin/i);
      await expect(response).toContainText(/25.*kg/i);
      await expect(response).toContainText(/mg/i);
      await expect(response).toContainText(/verify.*dosing/i);
    });

    test('should provide medical references and citations', async ({ page }) => {
      const chatInput = page.locator('textarea, input[type="text"]').first();
      
      await chatInput.fill('Tell me about pediatric asthma management');
      await page.locator('button').filter({ hasText: /send/i }).click();
      
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 });
      
      // Check for medical references
      const response = page.locator('[data-testid="chat-message"]').last();
      await expect(response).toContainText(/asthma/i);
      
      // Look for citation elements
      const citationElements = page.locator('[data-testid="citation"], .citation, [class*="citation"]');
      if (await citationElements.count() > 0) {
        await expect(citationElements.first()).toContainText(/nelson|chapter|page/i);
      }
    });
  });

  test.describe('Emergency Mode Testing', () => {
    test('should activate emergency mode', async ({ page }) => {
      // Look for emergency mode toggle
      const emergencyToggle = page.locator('button').filter({ hasText: /emergency/i }).first();
      await expect(emergencyToggle).toBeVisible();
      
      // Activate emergency mode
      await emergencyToggle.click();
      
      // Verify emergency mode is active
      await expect(page.locator('[data-testid="emergency-mode"], .emergency-mode')).toBeVisible();
      
      // Check for emergency styling (red colors, urgent indicators)
      const emergencyContainer = page.locator('[data-testid="emergency-mode"], .emergency-mode').first();
      const backgroundColor = await emergencyContainer.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      // Should have red/urgent styling
      expect(backgroundColor).toMatch(/rgb\(.*,.*0.*,.*0.*\)|red|#[a-f0-9]*[^0-9a-f]/i);
    });

    test('should handle emergency medical queries with priority', async ({ page }) => {
      // Activate emergency mode
      const emergencyToggle = page.locator('button').filter({ hasText: /emergency/i }).first();
      await emergencyToggle.click();
      
      const chatInput = page.locator('textarea, input[type="text"]').first();
      
      // Submit emergency query
      await chatInput.fill('Child is unconscious and not breathing');
      await page.locator('button').filter({ hasText: /send/i }).click();
      
      // Emergency responses should be faster and contain urgent instructions
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 15000 });
      
      const response = page.locator('[data-testid="chat-message"]').last();
      await expect(response).toContainText(/emergency|911|immediate|cpr|airway/i);
    });

    test('should display emergency protocols', async ({ page }) => {
      const emergencyToggle = page.locator('button').filter({ hasText: /emergency/i }).first();
      await emergencyToggle.click();
      
      // Should show emergency protocols
      await expect(page.locator('[data-testid="emergency-protocols"], .emergency-protocols')).toBeVisible();
      
      // Check for common emergency protocols
      const protocolsContainer = page.locator('[data-testid="emergency-protocols"], .emergency-protocols');
      await expect(protocolsContainer).toContainText(/cpr|airway|cardiac|respiratory/i);
    });
  });

  test.describe('Medical Context Panel', () => {
    test('should open and use medical context panel', async ({ page }) => {
      // Look for medical context toggle
      const contextToggle = page.locator('button').filter({ hasText: /context|medical|patient/i }).first();
      
      if (await contextToggle.isVisible()) {
        await contextToggle.click();
        
        // Wait for panel to open
        await expect(page.locator('[data-testid="medical-context-panel"]')).toBeVisible();
        
        // Fill in patient information
        const ageInput = page.locator('input[placeholder*="age"], input[name*="age"]').first();
        const weightInput = page.locator('input[placeholder*="weight"], input[name*="weight"]').first();
        
        if (await ageInput.isVisible()) {
          await ageInput.fill('8');
        }
        
        if (await weightInput.isVisible()) {
          await weightInput.fill('25');
        }
        
        // Submit a query that uses this context
        const chatInput = page.locator('textarea, input[type="text"]').first();
        await chatInput.fill('What is the appropriate ibuprofen dose?');
        await page.locator('button').filter({ hasText: /send/i }).click();
        
        await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 });
        
        // Response should reference the patient context
        const response = page.locator('[data-testid="chat-message"]').last();
        await expect(response).toContainText(/8.*year|25.*kg|ibuprofen/i);
      }
    });

    test('should validate patient information input', async ({ page }) => {
      const contextToggle = page.locator('button').filter({ hasText: /context|medical|patient/i }).first();
      
      if (await contextToggle.isVisible()) {
        await contextToggle.click();
        
        const ageInput = page.locator('input[placeholder*="age"], input[name*="age"]').first();
        
        if (await ageInput.isVisible()) {
          // Test invalid age
          await ageInput.fill('-5');
          await ageInput.blur();
          
          // Should show validation error
          await expect(page.locator('.error, [data-testid="error"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Accessibility Testing', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      
      // Should focus on first interactive element
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Continue tabbing through interface
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to reach chat input
      const chatInput = page.locator('textarea, input[type="text"]').first();
      await chatInput.focus();
      
      // Type and submit with keyboard
      await chatInput.fill('Test keyboard navigation');
      await page.keyboard.press('Enter');
      
      // Should submit the message
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 10000 });
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for proper ARIA labels on medical elements
      const emergencyButton = page.locator('button').filter({ hasText: /emergency/i }).first();
      
      if (await emergencyButton.isVisible()) {
        const ariaLabel = await emergencyButton.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/emergency|urgent/i);
      }
      
      // Check for proper roles
      const chatContainer = page.locator('[role="main"], main').first();
      await expect(chatContainer).toBeVisible();
      
      // Check for live regions for important announcements
      const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
      expect(await liveRegions.count()).toBeGreaterThan(0);
    });

    test('should work with screen reader announcements', async ({ page }) => {
      const chatInput = page.locator('textarea, input[type="text"]').first();
      
      // Submit emergency query
      await chatInput.fill('Emergency: child having seizure');
      await page.locator('button').filter({ hasText: /send/i }).click();
      
      // Should have aria-live region for important medical announcements
      await page.waitForSelector('[aria-live="assertive"], [role="alert"]', { timeout: 10000 });
      
      const alertRegion = page.locator('[aria-live="assertive"], [role="alert"]').first();
      await expect(alertRegion).toBeVisible();
    });
  });

  test.describe('Error Handling and Resilience', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());
      
      const chatInput = page.locator('textarea, input[type="text"]').first();
      await chatInput.fill('Test network error handling');
      await page.locator('button').filter({ hasText: /send/i }).click();
      
      // Should show error message
      await expect(page.locator('.error, [data-testid="error"]')).toBeVisible({ timeout: 10000 });
      
      // Error should be user-friendly
      const errorMessage = page.locator('.error, [data-testid="error"]').first();
      await expect(errorMessage).toContainText(/error|unavailable|try again/i);
    });

    test('should maintain functionality during partial failures', async ({ page }) => {
      // Block only specific API endpoints
      await page.route('**/api/mistral/**', route => route.abort());
      
      const chatInput = page.locator('textarea, input[type="text"]').first();
      await chatInput.fill('Test partial failure');
      await page.locator('button').filter({ hasText: /send/i }).click();
      
      // Should still show some response or appropriate error
      await page.waitForSelector('[data-testid="chat-message"], .error', { timeout: 15000 });
      
      // Interface should remain functional
      await expect(chatInput).toBeEnabled();
      await expect(page.locator('button').filter({ hasText: /send/i })).toBeEnabled();
    });

    test('should handle emergency scenarios during system errors', async ({ page }) => {
      // Simulate API failure
      await page.route('**/api/**', route => route.abort());
      
      // Activate emergency mode
      const emergencyToggle = page.locator('button').filter({ hasText: /emergency/i }).first();
      await emergencyToggle.click();
      
      const chatInput = page.locator('textarea, input[type="text"]').first();
      await chatInput.fill('Child not breathing');
      await page.locator('button').filter({ hasText: /send/i }).click();
      
      // Should show emergency guidance even during system failure
      await page.waitForSelector('[data-testid="chat-message"], .error', { timeout: 10000 });
      
      const response = page.locator('[data-testid="chat-message"], .error').last();
      await expect(response).toContainText(/emergency|911|immediate|call/i);
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle rapid message sending', async ({ page }) => {
      const chatInput = page.locator('textarea, input[type="text"]').first();
      const sendButton = page.locator('button').filter({ hasText: /send/i });
      
      // Send multiple messages rapidly
      for (let i = 0; i < 5; i++) {
        await chatInput.fill(`Rapid message ${i + 1}`);
        await sendButton.click();
        await page.waitForTimeout(100); // Brief pause
      }
      
      // Should handle all messages without crashing
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 });
      
      // Check that messages are displayed
      const messages = page.locator('[data-testid="chat-message"]');
      expect(await messages.count()).toBeGreaterThan(0);
    });

    test('should maintain performance with long chat history', async ({ page }) => {
      const chatInput = page.locator('textarea, input[type="text"]').first();
      const sendButton = page.locator('button').filter({ hasText: /send/i });
      
      // Send many messages to build up history
      for (let i = 0; i < 20; i++) {
        await chatInput.fill(`History message ${i + 1}`);
        await sendButton.click();
        await page.waitForTimeout(50);
      }
      
      // Interface should remain responsive
      const startTime = Date.now();
      await chatInput.fill('Performance test message');
      await sendButton.click();
      
      await page.waitForSelector('[data-testid="chat-message"]', { timeout: 10000 });
      const endTime = Date.now();
      
      // Should respond within reasonable time even with long history
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  test.describe('Mobile and Responsive Testing', () => {
    test('should work on mobile devices', async ({ page, isMobile }) => {
      if (isMobile) {
        // Test mobile-specific functionality
        const chatInput = page.locator('textarea, input[type="text"]').first();
        await expect(chatInput).toBeVisible();
        
        // Mobile keyboards should work
        await chatInput.tap();
        await chatInput.fill('Mobile test query');
        
        const sendButton = page.locator('button').filter({ hasText: /send/i });
        await sendButton.tap();
        
        await page.waitForSelector('[data-testid="chat-message"]', { timeout: 30000 });
        
        // Response should be visible on mobile
        const response = page.locator('[data-testid="chat-message"]').last();
        await expect(response).toBeVisible();
      }
    });

    test('should handle touch interactions for emergency mode', async ({ page, isMobile }) => {
      if (isMobile) {
        const emergencyToggle = page.locator('button').filter({ hasText: /emergency/i }).first();
        
        // Touch interaction for emergency mode
        await emergencyToggle.tap();
        
        await expect(page.locator('[data-testid="emergency-mode"]')).toBeVisible();
        
        // Emergency protocols should be accessible on mobile
        const protocols = page.locator('[data-testid="emergency-protocols"]');
        if (await protocols.isVisible()) {
          await expect(protocols).toBeVisible();
        }
      }
    });
  });
});
