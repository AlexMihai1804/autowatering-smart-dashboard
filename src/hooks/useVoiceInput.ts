/**
 * Voice Input Hook
 * 
 * 4.9: Speech-to-text for zone names
 */

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseVoiceInputOptions {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
}

interface UseVoiceInputResult {
    isSupported: boolean;
    isListening: boolean;
    transcript: string;
    interimTranscript: string;
    error: string | null;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
}

export const useVoiceInput = (options: UseVoiceInputOptions = {}): UseVoiceInputResult => {
    const {
        language = 'en-US',
        continuous = false,
        interimResults = true,
    } = options;
    
    const [isSupported, setIsSupported] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const recognitionRef = useRef<any>(null);
    
    // Check for browser support
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        setIsSupported(!!SpeechRecognition);
        
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = continuous;
            recognitionRef.current.interimResults = interimResults;
            recognitionRef.current.lang = language;
            
            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                let interimText = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        finalTranscript += result[0].transcript;
                    } else {
                        interimText += result[0].transcript;
                    }
                }
                
                if (finalTranscript) {
                    setTranscript(prev => prev + finalTranscript);
                }
                setInterimTranscript(interimText);
            };
            
            recognitionRef.current.onerror = (event: any) => {
                console.error('[VoiceInput] Error:', event.error);
                setError(getErrorMessage(event.error));
                setIsListening(false);
            };
            
            recognitionRef.current.onend = () => {
                setIsListening(false);
                setInterimTranscript('');
            };
        }
        
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [continuous, interimResults, language]);
    
    const startListening = useCallback(() => {
        if (!recognitionRef.current) {
            setError('Speech recognition not supported');
            return;
        }
        
        setError(null);
        setIsListening(true);
        
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error('[VoiceInput] Failed to start:', e);
            setError('Failed to start voice recognition');
            setIsListening(false);
        }
    }, []);
    
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }, []);
    
    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
    }, []);
    
    return {
        isSupported,
        isListening,
        transcript,
        interimTranscript,
        error,
        startListening,
        stopListening,
        resetTranscript,
    };
};

const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        case 'no-speech':
            return 'No speech detected. Please try again.';
        case 'aborted':
            return 'Voice input was cancelled.';
        case 'audio-capture':
            return 'No microphone found. Please check your device.';
        case 'not-allowed':
            return 'Microphone access denied. Please allow microphone access.';
        case 'network':
            return 'Network error. Please check your connection.';
        default:
            return 'Voice recognition error. Please try again.';
    }
};

export default useVoiceInput;
