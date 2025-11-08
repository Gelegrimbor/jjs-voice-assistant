import { useState, useRef, useEffect } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import './App.css';

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Voice {
  id: string;
  name: string;
}

function App() {
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('pNInz6obpgDQGcFmaJgB'); // Default: Adam
  const [volume, setVolume] = useState(1.0); // Default: 100%
  const recognitionRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Available voices from ElevenLabs
  const voices: Voice[] = [
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Male)' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Rachel (Female)' },
    { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie (Male)' },
    { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte (Female)' },
    { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica (Female)' },
    { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris (Male)' },
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation, isLoading]);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Your browser does not support speech recognition. Please use Chrome!');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
      handleSendMessage(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputText;
    if (!textToSend.trim()) return;

    setIsLoading(true);

    const newConversation: Message[] = [...conversation, { role: 'user', content: textToSend }];
    setConversation(newConversation);
    setInputText('');

    try {
      const anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

      const anthropic = new Anthropic({
        apiKey: anthropicApiKey,
        dangerouslyAllowBrowser: true
      });

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: newConversation
      });

      const assistantResponse = message.content[0].type === 'text' ? message.content[0].text : '';

      setConversation([...newConversation, { role: 'assistant', content: assistantResponse }]);

      await speakText(assistantResponse);

    } catch (error) {
      console.error('Claude API Error:', error);
      alert('Failed to get AI response. Check your API key and console.');
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = async (text: string) => {
    setIsSpeaking(true);

    try {
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey || '',
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`TTS API returned ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.volume = volume; // Set volume

      audio.onended = () => setIsSpeaking(false);
      await audio.play();

    } catch (error) {
      console.error('Speech Error:', error);
      setIsSpeaking(false);
    }
  };

  const clearConversation = () => {
    if (conversation.length > 0 && window.confirm('Are you sure you want to clear the conversation?')) {
      setConversation([]);
    }
  };

  const getVoiceButtonClass = () => {
    let className = 'voice-button';
    if (isListening) className += ' listening';
    if (isSpeaking) className += ' speaking';
    return className;
  };

  const getVoiceButtonText = () => {
    if (isListening) return '🎤 Listening...';
    if (isSpeaking) return '🔊 Speaking...';
    return '🎤 Talk to AI';
  };

  return (
    <div className="App">
      <div className="content-wrapper">
        <div className="header">
          <h1>🤖 AI Voice Assistant</h1>
          <p>Powered by Claude AI & ElevenLabs</p>
        </div>

        {/* Settings Panel */}
        <div className="settings-panel">
          <div className="setting-group">
            <label htmlFor="voice-select">🎙️ Voice:</label>
            <select
              id="voice-select"
              className="voice-select"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={isLoading || isListening || isSpeaking}
            >
              {voices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name}
                </option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <label htmlFor="volume-slider">🔊 Volume: {Math.round(volume * 100)}%</label>
            <input
              id="volume-slider"
              type="range"
              className="volume-slider"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              disabled={isLoading || isListening || isSpeaking}
            />
          </div>

          <button
            className="clear-button"
            onClick={clearConversation}
            disabled={conversation.length === 0 || isLoading || isListening || isSpeaking}
          >
            🗑️ Clear Chat
          </button>
        </div>

        <div className="chat-container" ref={chatContainerRef}>
          {conversation.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
                Start a conversation!
              </p>
              <p style={{ fontSize: '0.9rem' }}>
                Click the microphone button or type a message
              </p>
            </div>
          ) : (
            conversation.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="message-bubble">
                  <span className="message-label">
                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                  <div className="message-content">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="loading-indicator">
              <div className="loading-dots">
                AI is thinking<span>.</span><span>.</span><span>.</span>
              </div>
            </div>
          )}
        </div>

        <div className="input-container">
          <div className="input-row">
            <input
              type="text"
              className="text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message or use voice..."
              disabled={isLoading || isListening}
            />
            <button
              className="send-button"
              onClick={() => handleSendMessage()}
              disabled={isLoading || isListening || !inputText.trim()}
            >
              Send ✈️
            </button>
          </div>

          <div className="voice-button-container">
            <button
              className={getVoiceButtonClass()}
              onClick={startListening}
              disabled={isListening || isLoading || isSpeaking}
            >
              {getVoiceButtonText()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;