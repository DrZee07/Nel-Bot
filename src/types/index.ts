export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  citations?: Citation[];
  isTyping?: boolean;
}

export interface Citation {
  source: string;
  page?: number;
  chapter?: string;
  relevance: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    totalMessages: number;
    medicalDomain?: string;
    urgency?: 'low' | 'medium' | 'high' | 'emergency';
  };
}

export interface MedicalContext {
  patientAge?: {
    years?: number;
    months?: number;
    days?: number;
  };
  weight?: number;
  symptoms?: string[];
  medicalHistory?: string[];
  currentMedications?: string[];
  allergies?: string[];
}

export interface DrugDosage {
  drug: string;
  indication: string;
  route: 'oral' | 'iv' | 'im' | 'topical' | 'inhaled';
  dosePerKg?: number;
  dosePerM2?: number;
  maxDose?: number;
  frequency: string;
  duration?: string;
  notes?: string;
}

export interface EmergencyProtocol {
  id: string;
  title: string;
  category: 'resuscitation' | 'trauma' | 'poisoning' | 'respiratory' | 'cardiac';
  steps: ProtocolStep[];
  contraindications?: string[];
  citations: Citation[];
}

export interface ProtocolStep {
  order: number;
  action: string;
  details?: string;
  timeFrame?: string;
  dosage?: DrugDosage;
}

export interface PediatricReference {
  id: string;
  title: string;
  content: string;
  chapter: string;
  page: number;
  embedding?: number[];
  tags: string[];
  lastUpdated: Date;
}

export interface UserSettings {
  showTimestamps: boolean;
  showCitations: boolean;
  fontSize: 'small' | 'medium' | 'large';
  theme: 'dark' | 'light';
  autoScroll: boolean;
  soundEnabled: boolean;
  compactMode?: boolean;
  showMessageCount?: boolean;
}

export interface AppState {
  currentChatId: string | null;
  chats: Chat[];
  settings: UserSettings;
  medicalContext: MedicalContext;
  isLoading: boolean;
  sidebarOpen: boolean;
}
