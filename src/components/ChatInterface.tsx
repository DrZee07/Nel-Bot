import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, Chat, UserSettings, MedicalContext, PatientInfo } from '../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatSidebar } from './ChatSidebar';
import { MedicalContextPanel } from './MedicalContextPanel';
import { EmergencyMode } from './EmergencyMode';
import { SettingsPage } from './SettingsPage';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Menu, Stethoscope, Loader2, User, AlertTriangle, Settings, Wifi, WifiOff, Download } from 'lucide-react';
import { generateMedicalResponse, calculatePediatricDosage } from '../lib/rag';
import { MistralMessage } from '../lib/mistral';
import { usePWA } from '../hooks/usePWA';

interface ChatInterfaceProps {
  initialSettings?: Partial<UserSettings>;
}

const defaultSettings: UserSettings = {
  showTimestamps: false,
  showCitations: true,
  fontSize: 'medium',
  theme: 'dark',
  autoScroll: true,
  soundEnabled: false,
};

export function ChatInterface({ initialSettings = {} }: ChatInterfaceProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({ ...defaultSettings, ...initialSettings });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [medicalContext, setMedicalContext] = useState<MedicalContext>({});
  const [showMedicalPanel, setShowMedicalPanel] = useState(false);
  const [showEmergencyMode, setShowEmergencyMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    allergies: [],
    medications: [],
    conditions: []
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isOnline, isInstallable, isInstalled } = usePWA();

  // Get current chat
  const currentChat = chats.find(chat => chat.id === currentChatId);
  const messages = currentChat?.messages || [];

  // Auto-scroll to bottom
  useEffect(() => {
    if (settings.autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, settings.autoScroll]);

  // Check URL parameters for special modes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'emergency') {
      setShowEmergencyMode(true);
    }
    if (urlParams.get('tool') === 'calculator') {
      // Future: Open calculator tool
    }
  }, []);

  // Show PWA install prompt after delay
  useEffect(() => {
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => {
        setShowPWAPrompt(true);
      }, 10000); // Show after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem('nelsongpt-chats');
    const savedSettings = localStorage.getItem('nelsongpt-settings');

    if (savedChats) {
      const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      setChats(parsedChats);
    }

    if (savedSettings) {
      setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
    }

    // Don't auto-load previous chat - always start with welcome screen
    // Users can manually select a chat from the sidebar if needed
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('nelsongpt-chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('nelsongpt-settings', JSON.stringify(settings));
  }, [settings]);

  // Don't persist current chat ID - always start fresh

  // Create new chat
  const createNewChat = (initialMessage?: string) => {
    const newChatId = uuidv4();
    const newChat: Chat = {
      id: newChatId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        totalMessages: 0,
        urgency: 'low'
      }
    };

    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    setSidebarOpen(false);

    // If initial message provided, send it automatically
    if (initialMessage) {
      setTimeout(() => {
        sendMessage(initialMessage);
      }, 100); // Small delay to ensure chat is set up
    }
  };

  // Select chat
  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setSidebarOpen(false);
  };

  // Delete chat
  const deleteChat = (chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      setCurrentChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
    }
  };

  // Clear all chats
  const clearAllChats = () => {
    setChats([]);
    setCurrentChatId(null);
    localStorage.removeItem('nelsongpt-chats');
    localStorage.removeItem('nelsongpt-current-chat');
  };

  // Update settings
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Generate title for chat based on first message
  const generateChatTitle = (firstMessage: string): string => {
    const keywords = firstMessage.toLowerCase();
    
    if (keywords.includes('dosage') || keywords.includes('dose')) {
      return 'Drug Dosage';
    } else if (keywords.includes('emergency') || keywords.includes('urgent')) {
      return 'Emergency Protocol';
    } else if (keywords.includes('symptom')) {
      return 'Symptom Analysis';
    } else if (keywords.includes('growth') || keywords.includes('development')) {
      return 'Growth & Development';
    } else {
      return firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '...' : '');
    }
  };

  // Determine urgency based on message content
  const determineUrgency = (message: string): 'low' | 'medium' | 'high' | 'emergency' => {
    const content = message.toLowerCase();
    
    if (content.includes('emergency') || content.includes('urgent') || content.includes('resuscitation')) {
      return 'emergency';
    } else if (content.includes('immediate') || content.includes('acute')) {
      return 'high';
    } else if (content.includes('concern') || content.includes('worried')) {
      return 'medium';
    }
    return 'low';
  };

  // Send message and get AI response
  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    let chatId = currentChatId;

    // Create new chat if none exists
    if (!chatId) {
      chatId = uuidv4();
      const title = generateChatTitle(userMessage);
      const urgency = determineUrgency(userMessage);
      
      const newChat: Chat = {
        id: chatId,
        title,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          totalMessages: 0,
          urgency
        }
      };

      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(chatId);
    }

    // Add user message
    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    // Add typing indicator
    const typingMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    };

    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, userMsg, typingMsg],
            updatedAt: new Date(),
            metadata: {
              ...chat.metadata,
              totalMessages: chat.messages.length + 1
            }
          }
        : chat
    ));

    setIsLoading(true);

    try {
      // Check if it's a dosage calculation request
      if (userMessage.toLowerCase().includes('dosage') || userMessage.toLowerCase().includes('calculate')) {
        // This would need more sophisticated parsing in a real app
        // For demo, we'll use a simple example
        const dosageResult = calculatePediatricDosage({
          drugName: 'Amoxicillin',
          dosePerKg: 20,
          patientWeight: 15,
          maxDose: 500,
          frequency: 'twice daily'
        });

        const assistantMsg: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: dosageResult,
          timestamp: new Date(),
          citations: [{
            source: 'Nelson Textbook of Pediatrics, Chapter 24',
            page: 455,
            chapter: 'Antimicrobial Therapy',
            relevance: 0.9
          }]
        };

        // Replace typing indicator with actual response
        setChats(prev => prev.map(chat => 
          chat.id === chatId 
            ? { 
                ...chat, 
                messages: [...chat.messages.slice(0, -1), assistantMsg],
                updatedAt: new Date()
              }
            : chat
        ));
      } else {
        // Get conversation history for context
        const currentChatMessages = chats.find(c => c.id === chatId)?.messages || [];
        const conversationHistory: MistralMessage[] = currentChatMessages
          .filter(msg => !msg.isTyping)
          .slice(-10) // Last 10 messages
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));

        // Generate AI response
        const { response, citations } = await generateMedicalResponse(userMessage, conversationHistory);

        const assistantMsg: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          citations
        };

        // Replace typing indicator with actual response
        setChats(prev => prev.map(chat => 
          chat.id === chatId 
            ? { 
                ...chat, 
                messages: [...chat.messages.slice(0, -1), assistantMsg],
                updatedAt: new Date()
              }
            : chat
        ));
      }
    } catch (error) {
      console.error('Error generating response:', error);
      
      const errorMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.',
        timestamp: new Date()
      };

      // Replace typing indicator with error message
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              messages: [...chat.messages.slice(0, -1), errorMsg],
              updatedAt: new Date()
            }
          : chat
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const hasCurrentChat = currentChatId && currentChat;

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Main Chat Area - Full Screen for Smartphone */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Clean Header - Smartphone Optimized */}
        <div className="border-b bg-card px-4 py-4 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Stethoscope className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold text-center">
                Pediatric Assistant
              </h1>
            </div>
          </div>
          
          {/* PWA Install Prompt - Smartphone Focused */}
          {isInstallable && !isInstalled && (
            <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Install on Home Screen</span>
                </div>
                <Button size="sm" onClick={() => setShowPWAPrompt(true)} className="ml-2">
                  Install
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Get quick access from your home screen
              </p>
            </div>
          )}
        </div>

        {/* Medical Context Panel */}
        {showMedicalPanel && (
          <div className="border-b bg-muted/30 p-4">
            <MedicalContextPanel 
              patientInfo={patientInfo}
              onPatientInfoChange={setPatientInfo}
              onClose={() => setShowMedicalPanel(false)}
              compact={true}
            />
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {!hasCurrentChat ? (
            // Welcome screen
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <Stethoscope size={40} className="text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Pediatric Assistant</h1>
              <p className="text-muted-foreground mb-8 max-w-md text-center">
                Your mobile pediatric medical assistant. Get clinical guidance, dosage calculations, and emergency protocols on the go.
              </p>
              <Button onClick={createNewChat} size="lg">
                Start New Chat
              </Button>
            </div>
          ) : (
            // Chat messages
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  showTimestamp={settings.showTimestamps}
                  showCitations={settings.showCitations}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {hasCurrentChat && (
          <ChatInput
            onSendMessage={sendMessage}
            isLoading={isLoading}
            placeholder="Ask about pediatric medicine, drug dosages, symptoms..."
          />
        )}

        {/* Floating Action Button - Medical Features */}
        <div className="fixed bottom-20 right-4 flex flex-col gap-2 z-50">
          {/* Emergency Button */}
          <Button 
            size="sm" 
            variant="destructive"
            onClick={() => setShowEmergencyMode(true)}
            className="rounded-full shadow-lg h-12 w-12 p-0"
          >
            <AlertTriangle className="h-5 w-5" />
          </Button>
          
          {/* Patient Info Button */}
          <Button 
            size="sm" 
            variant={showMedicalPanel ? "default" : "outline"}
            onClick={() => setShowMedicalPanel(!showMedicalPanel)}
            className="rounded-full shadow-lg h-12 w-12 p-0"
          >
            <User className="h-5 w-5" />
          </Button>
          
          {/* Settings Button */}
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setShowSettings(true)}
            className="rounded-full shadow-lg h-12 w-12 p-0 bg-card border"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Modal Components */}
      {showEmergencyMode && (
        <EmergencyMode 
          onClose={() => setShowEmergencyMode(false)}
          onProtocolSelect={(protocol) => {
            // Add protocol to chat context
            setMedicalContext(prev => ({
              ...prev,
              emergencyProtocol: protocol
            }));
            setShowEmergencyMode(false);
          }}
        />
      )}

      {showSettings && (
        <SettingsPage
          settings={settings}
          onSettingsChange={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showPWAPrompt && (
        <PWAInstallPrompt 
          onDismiss={() => setShowPWAPrompt(false)}
          compact={false}
        />
      )}
    </div>
  );
}
