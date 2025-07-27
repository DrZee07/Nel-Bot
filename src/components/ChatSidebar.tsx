import React from 'react';
import { Chat, UserSettings } from '../types';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  Info, 
  Trash2, 
  Clock,
  BookOpen,
  Stethoscope,
  Calculator,
  AlertTriangle,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  settings: UserSettings;
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onClearAllChats: () => void;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
}

export function ChatSidebar({
  chats,
  currentChatId,
  settings,
  isOpen,
  onClose,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onClearAllChats,
  onUpdateSettings
}: ChatSidebarProps) {
  const [activeTab, setActiveTab] = React.useState<'chats' | 'settings' | 'about'>('chats');

  const sortedChats = chats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const getUrgencyIcon = (urgency?: string) => {
    switch (urgency) {
      case 'emergency':
        return <AlertTriangle size={12} className="text-red-500" />;
      case 'high':
        return <AlertTriangle size={12} className="text-orange-500" />;
      case 'medium':
        return <Clock size={12} className="text-yellow-500" />;
      default:
        return <MessageSquare size={12} className="text-muted-foreground" />;
    }
  };

  const medicalTemplates = [
    { icon: <Calculator size={16} />, label: 'Drug Dosage Calculator', prompt: 'Help me calculate a pediatric drug dosage for:' },
    { icon: <AlertTriangle size={16} />, label: 'Emergency Protocol', prompt: 'I need the emergency protocol for:' },
    { icon: <Stethoscope size={16} />, label: 'Symptom Analysis', prompt: 'Please help analyze these symptoms:' },
    { icon: <BookOpen size={16} />, label: 'Medical Reference', prompt: 'I need information about:' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:relative lg:inset-auto">
      {/* Overlay for mobile */}
      <div className="fixed inset-0 bg-black/50 lg:hidden" onClick={onClose} />
      
      {/* Sidebar content */}
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-card border-r border-border lg:relative lg:w-full">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Stethoscope size={20} className="text-primary" />
              <h1 className="font-semibold text-lg">NelsonGPT</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden">
              <X size={16} />
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <Button onClick={onNewChat} className="w-full">
              <Plus size={16} className="mr-2" />
              New Chat
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border">
            {[
              { id: 'chats', label: 'Chats', icon: MessageSquare },
              { id: 'settings', label: 'Settings', icon: Settings },
              { id: 'about', label: 'About', icon: Info }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'chats' && (
              <div className="p-4 space-y-4">
                {/* Medical Templates */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Quick Start</h3>
                  <div className="space-y-2">
                    {medicalTemplates.map((template, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left h-auto p-3"
                        onClick={() => {
                          onNewChat();
                          // You could emit the template prompt here
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-primary mt-0.5">{template.icon}</div>
                          <div>
                            <div className="font-medium text-sm">{template.label}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {template.prompt}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Chat History */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Recent Chats</h3>
                    {sortedChats.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={onClearAllChats}
                      >
                        <Trash2 size={12} className="mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {sortedChats.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8">
                        No chats yet. Start a new conversation!
                      </div>
                    ) : (
                      sortedChats.map((chat) => (
                        <div
                          key={chat.id}
                          className={`group relative p-3 rounded-lg border cursor-pointer transition-colors ${
                            chat.id === currentChatId
                              ? 'bg-primary/10 border-primary/50'
                              : 'border-border hover:bg-muted/50'
                          }`}
                          onClick={() => onSelectChat(chat.id)}
                        >
                          <div className="flex items-start gap-2">
                            {getUrgencyIcon(chat.metadata?.urgency)}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {chat.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDistanceToNow(chat.updatedAt, { addSuffix: true })}
                                {chat.metadata?.medicalDomain && (
                                  <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">
                                    {chat.metadata.medicalDomain}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChat(chat.id);
                              }}
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-4 space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-4">Display Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Show Timestamps</div>
                        <div className="text-xs text-muted-foreground">Display message timestamps</div>
                      </div>
                      <Switch
                        checked={settings.showTimestamps}
                        onCheckedChange={(checked) => onUpdateSettings({ showTimestamps: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Show Citations</div>
                        <div className="text-xs text-muted-foreground">Display textbook references</div>
                      </div>
                      <Switch
                        checked={settings.showCitations}
                        onCheckedChange={(checked) => onUpdateSettings({ showCitations: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Auto Scroll</div>
                        <div className="text-xs text-muted-foreground">Scroll to new messages</div>
                      </div>
                      <Switch
                        checked={settings.autoScroll}
                        onCheckedChange={(checked) => onUpdateSettings({ autoScroll: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">Sound Effects</div>
                        <div className="text-xs text-muted-foreground">Play notification sounds</div>
                      </div>
                      <Switch
                        checked={settings.soundEnabled}
                        onCheckedChange={(checked) => onUpdateSettings({ soundEnabled: checked })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-4">Font Size</h3>
                  <div className="space-y-2">
                    {['small', 'medium', 'large'].map((size) => (
                      <Button
                        key={size}
                        variant={settings.fontSize === size ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start capitalize"
                        onClick={() => onUpdateSettings({ fontSize: size as any })}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">NelsonGPT</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Evidence-based pediatric medical assistant powered by the Nelson Textbook of Pediatrics
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium">Features</h4>
                      <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                        <li>• Symptom-to-diagnosis mapping</li>
                        <li>• Pediatric drug dosing calculations</li>
                        <li>• Emergency protocols and resuscitation</li>
                        <li>• Growth and development milestones</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium">Technology</h4>
                      <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                        <li>• LangChain + LangGraph RAG</li>
                        <li>• Mistral AI Language Model</li>
                        <li>• Supabase Vector Database</li>
                        <li>• PWA-Ready Progressive Web App</li>
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        <strong>Disclaimer:</strong> This tool is for educational and reference purposes only. 
                        Always consult with qualified healthcare professionals for medical decisions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
