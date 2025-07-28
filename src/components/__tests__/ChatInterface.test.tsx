import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../ChatInterface';
import { medicalTestUtils } from '../../test/setup';

// Mock the hooks and dependencies
vi.mock('../../hooks/usePWA', () => ({
  usePWA: () => ({
    isOnline: true,
    isInstallable: false,
    isInstalled: false
  })
}));

describe('ChatInterface - Medical Chat Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the chat interface with medical branding', () => {
      render(<ChatInterface />);
      
      // Check for medical assistant branding
      expect(screen.getByRole('main')).toBeInTheDocument();
      
      // Should have medical-specific UI elements
      const medicalElements = screen.queryAllByText(/medical|pediatric|nelson/i);
      expect(medicalElements.length).toBeGreaterThan(0);
    });

    it('should display offline indicator when offline', () => {
      // Mock offline state
      vi.mocked(require('../../hooks/usePWA').usePWA).mockReturnValue({
        isOnline: false,
        isInstallable: false,
        isInstalled: false
      });

      render(<ChatInterface />);
      
      const offlineIndicator = screen.getByTestId('offline-indicator') || 
                              screen.getByText(/offline/i);
      expect(offlineIndicator).toBeInTheDocument();
    });

    it('should show emergency mode toggle', () => {
      render(<ChatInterface />);
      
      const emergencyButton = screen.getByRole('button', { name: /emergency/i }) ||
                             screen.getByTestId('emergency-mode-toggle');
      expect(emergencyButton).toBeInTheDocument();
    });
  });

  describe('Medical Chat Functionality', () => {
    it('should handle medical query submission', async () => {
      render(<ChatInterface />);
      
      const chatInput = screen.getByRole('textbox', { name: /message|chat/i }) ||
                       screen.getByPlaceholderText(/ask|message/i);
      const submitButton = screen.getByRole('button', { name: /send|submit/i });

      const medicalQuery = 'What is the dosage of amoxicillin for a 5-year-old?';
      
      await user.type(chatInput, medicalQuery);
      await user.click(submitButton);

      // Should show loading state
      await waitFor(() => {
        const loadingIndicator = screen.queryByTestId('loading-indicator') ||
                                screen.queryByText(/loading|thinking/i);
        expect(loadingIndicator).toBeInTheDocument();
      });

      // Should eventually show response
      await waitFor(() => {
        const response = screen.queryByText(/mock medical response/i);
        expect(response).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should display medical citations when available', async () => {
      render(<ChatInterface />);
      
      const chatInput = screen.getByRole('textbox');
      await user.type(chatInput, 'Tell me about pediatric fever management');
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Look for citation elements
        const citations = screen.queryAllByText(/nelson textbook|chapter|page/i);
        expect(citations.length).toBeGreaterThan(0);
      });
    });

    it('should handle emergency queries with priority styling', async () => {
      render(<ChatInterface />);
      
      const emergencyQuery = 'Child is having trouble breathing!';
      const chatInput = screen.getByRole('textbox');
      
      await user.type(chatInput, emergencyQuery);
      
      // Emergency queries might trigger special UI
      await waitFor(() => {
        const emergencyIndicator = screen.queryByTestId('emergency-query') ||
                                  screen.queryByText(/emergency|urgent/i);
        expect(emergencyIndicator).toBeInTheDocument();
      });
    });

    it('should validate medical input before submission', async () => {
      render(<ChatInterface />);
      
      const chatInput = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: /send/i });

      // Try to submit empty message
      await user.click(submitButton);
      
      // Should not submit empty message
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      
      // Try with very long message
      const longMessage = 'a'.repeat(10000);
      await user.clear(chatInput);
      await user.type(chatInput, longMessage);
      await user.click(submitButton);
      
      // Should handle long messages appropriately
      await waitFor(() => {
        const errorMessage = screen.queryByText(/too long|limit/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Medical Context Panel', () => {
    it('should toggle medical context panel', async () => {
      render(<ChatInterface />);
      
      const contextToggle = screen.getByRole('button', { name: /context|medical/i }) ||
                           screen.getByTestId('medical-context-toggle');
      
      await user.click(contextToggle);
      
      await waitFor(() => {
        const contextPanel = screen.getByTestId('medical-context-panel') ||
                            screen.getByText(/patient information|medical context/i);
        expect(contextPanel).toBeInTheDocument();
      });
    });

    it('should allow patient information input', async () => {
      render(<ChatInterface />);
      
      // Open medical context panel
      const contextToggle = screen.getByTestId('medical-context-toggle');
      await user.click(contextToggle);
      
      await waitFor(() => {
        const ageInput = screen.getByLabelText(/age/i) ||
                        screen.getByPlaceholderText(/age/i);
        const weightInput = screen.getByLabelText(/weight/i) ||
                           screen.getByPlaceholderText(/weight/i);
        
        expect(ageInput).toBeInTheDocument();
        expect(weightInput).toBeInTheDocument();
      });
    });

    it('should validate patient data input', async () => {
      render(<ChatInterface />);
      
      const contextToggle = screen.getByTestId('medical-context-toggle');
      await user.click(contextToggle);
      
      await waitFor(async () => {
        const ageInput = screen.getByLabelText(/age/i);
        
        // Test invalid age
        await user.type(ageInput, '-5');
        await user.tab(); // Trigger validation
        
        const errorMessage = screen.queryByText(/invalid|error/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Emergency Mode', () => {
    it('should activate emergency mode', async () => {
      render(<ChatInterface />);
      
      const emergencyToggle = screen.getByTestId('emergency-mode-toggle');
      await user.click(emergencyToggle);
      
      await waitFor(() => {
        // Emergency mode should change UI appearance
        const emergencyIndicator = screen.getByTestId('emergency-mode-active') ||
                                  screen.getByText(/emergency mode/i);
        expect(emergencyIndicator).toBeInTheDocument();
        
        // Should have emergency styling
        const emergencyElement = screen.getByTestId('emergency-mode-container');
        expect(emergencyElement).toHaveClass(/emergency|urgent|red/);
      });
    });

    it('should show emergency protocols', async () => {
      render(<ChatInterface />);
      
      const emergencyToggle = screen.getByTestId('emergency-mode-toggle');
      await user.click(emergencyToggle);
      
      await waitFor(() => {
        const protocols = screen.queryAllByText(/protocol|emergency|cpr|airway/i);
        expect(protocols.length).toBeGreaterThan(0);
      });
    });

    it('should prioritize emergency queries', async () => {
      render(<ChatInterface />);
      
      // Activate emergency mode
      const emergencyToggle = screen.getByTestId('emergency-mode-toggle');
      await user.click(emergencyToggle);
      
      const chatInput = screen.getByRole('textbox');
      await user.type(chatInput, 'Child unconscious');
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      // Emergency queries should process faster
      await waitFor(() => {
        const response = screen.queryByText(/emergency|911|immediate/i);
        expect(response).toBeInTheDocument();
      }, { timeout: 3000 }); // Shorter timeout for emergency
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      render(<ChatInterface />);
      
      const chatInput = screen.getByRole('textbox');
      chatInput.focus();
      
      // Should be able to navigate with keyboard
      await user.keyboard('{Tab}');
      const submitButton = screen.getByRole('button', { name: /send/i });
      expect(submitButton).toHaveFocus();
      
      // Should be able to submit with Enter
      chatInput.focus();
      await user.type(chatInput, 'Test message');
      await user.keyboard('{Enter}');
      
      // Should submit the message
      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels for medical context', () => {
      render(<ChatInterface />);
      
      // Check for medical-specific ARIA labels
      const medicalElements = screen.getAllByRole('button');
      const hasAriaLabels = medicalElements.some(element => 
        element.getAttribute('aria-label')?.includes('medical') ||
        element.getAttribute('aria-label')?.includes('emergency')
      );
      
      expect(hasAriaLabels).toBe(true);
    });

    it('should announce important medical information to screen readers', async () => {
      render(<ChatInterface />);
      
      const chatInput = screen.getByRole('textbox');
      await user.type(chatInput, 'Emergency: child not breathing');
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        // Look for aria-live regions for important announcements
        const liveRegion = screen.queryByRole('status') ||
                          screen.queryByRole('alert');
        expect(liveRegion).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network Error'));
      
      render(<ChatInterface />);
      
      const chatInput = screen.getByRole('textbox');
      await user.type(chatInput, 'Test medical query');
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const errorMessage = screen.queryByText(/error|unavailable|try again/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should show appropriate error for medical emergencies', async () => {
      // Mock API error during emergency
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Service Unavailable'));
      
      render(<ChatInterface />);
      
      // Activate emergency mode
      const emergencyToggle = screen.getByTestId('emergency-mode-toggle');
      await user.click(emergencyToggle);
      
      const chatInput = screen.getByRole('textbox');
      await user.type(chatInput, 'Child having seizure');
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        const emergencyError = screen.queryByText(/emergency services|911|immediate/i);
        expect(emergencyError).toBeInTheDocument();
      });
    });

    it('should maintain chat history during errors', async () => {
      render(<ChatInterface />);
      
      // Send successful message first
      const chatInput = screen.getByRole('textbox');
      await user.type(chatInput, 'First message');
      
      const submitButton = screen.getByRole('button', { name: /send/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText('First message')).toBeInTheDocument();
      });
      
      // Mock error for second message
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Error'));
      
      await user.clear(chatInput);
      await user.type(chatInput, 'Second message');
      await user.click(submitButton);
      
      await waitFor(() => {
        // First message should still be visible
        expect(screen.queryByText('First message')).toBeInTheDocument();
        // Error message should be shown
        expect(screen.queryByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should handle rapid message sending', async () => {
      render(<ChatInterface />);
      
      const chatInput = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: /send/i });
      
      // Send multiple messages rapidly
      for (let i = 0; i < 3; i++) {
        await user.clear(chatInput);
        await user.type(chatInput, `Message ${i + 1}`);
        await user.click(submitButton);
      }
      
      // Should handle all messages without crashing
      await waitFor(() => {
        const messages = screen.queryAllByText(/Message \d/);
        expect(messages.length).toBeGreaterThan(0);
      });
    });

    it('should limit chat history for performance', async () => {
      render(<ChatInterface />);
      
      const chatInput = screen.getByRole('textbox');
      const submitButton = screen.getByRole('button', { name: /send/i });
      
      // Send many messages to test history limit
      for (let i = 0; i < 50; i++) {
        await user.clear(chatInput);
        await user.type(chatInput, `Test message ${i}`);
        await user.click(submitButton);
        
        // Wait briefly between messages
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Should not display all 50 messages (performance limit)
      const allMessages = screen.queryAllByText(/Test message/);
      expect(allMessages.length).toBeLessThan(50);
    });
  });
});
