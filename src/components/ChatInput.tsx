import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export function ChatInput({ 
  onSendMessage, 
  isLoading = false,
  placeholder = "Message NelsonGPT...",
  maxLength = 1000
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    onSendMessage(message.trim());
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    if (isListening) {
      setIsListening(false);
      // Stop speech recognition
      return;
    }

    setIsListening(true);
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(prev => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="p-4 bg-background">
      {/* ChatGPT-style Input Container */}
      <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
        <div className="relative flex items-end bg-input/50 border border-border/50 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 focus-within:border-ring/50 focus-within:shadow-md">
          {/* Voice Input Button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleVoiceInput}
            disabled={isLoading}
            className={cn(
              "ml-3 my-2 h-8 w-8 rounded-full shrink-0 transition-colors",
              isListening 
                ? "bg-red-500 text-white hover:bg-red-600" 
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            )}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </Button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            maxLength={maxLength}
            rows={1}
            className={cn(
              "flex-1 min-h-[44px] max-h-[120px] resize-none bg-transparent border-0 outline-none",
              "px-3 py-3 text-foreground placeholder:text-muted-foreground",
              "text-base leading-6 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            )}
            style={{ 
              fieldSizing: 'content',
              scrollbarWidth: 'thin'
            }}
          />

          {/* Send Button */}
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || isLoading}
            className={cn(
              "mr-3 my-2 h-8 w-8 rounded-full shrink-0 transition-all duration-200",
              !message.trim() || isLoading
                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md"
            )}
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </div>

        {/* Character count - only show when approaching limit */}
        {message.length > maxLength * 0.8 && (
          <div className="absolute -bottom-6 right-0 text-xs text-muted-foreground">
            {message.length}/{maxLength}
          </div>
        )}
      </form>
    </div>
  );
}

// Extend window interface for speech recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}
