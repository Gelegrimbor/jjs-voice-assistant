import { useState, useRef } from 'react';
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

function App() {
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState<Array<{ role: string, content: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Voice input
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Your browser does not support speech recognition. Try Chrome!');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Listening...');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      console.log('You said:', transcript);
      setInputText(transcript);
      setIsListening(false);
      // Automatically send to AI after voice input
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

  // Send message to Claude AI
  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputText;
    if (!textToSend.trim()) return;

    setIsLoading(true);

    // Add user message to conversation
    const newConversation = [...conversation, { role: 'user', content: textToSend }];
    setConversation(newConversation);
    setInputText('');

    try {
      const anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

      const anthropic = new Anthropic({
        apiKey: anthropicApiKey,
        dangerouslyAllowBrowser: true // Note: In production, API calls should be from backend
      });

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: newConversation.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      });

      const assistantResponse = message.content[0].type === 'text' ? message.content[0].text : '';

      // Add assistant response to conversation
      setConversation([...newConversation, { role: 'assistant', content: assistantResponse }]);

      // Speak the response
      await speakText(assistantResponse);

    } catch (error) {
      console.error('Claude API Error:', error);
      alert('Failed to get AI response. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Text to speech
  const speakText = async (text: string) => {
    setIsSpeaking(true);

    try {
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      const voiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam voice

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
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
        throw new Error(`API returned ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();

    } catch (error) {
      console.error('Speech Error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  return (
    <div className="App" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🤖 AI Voice Assistant</h1>

      {/* Conversation History */}
      <div style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        minHeight: '300px',
        maxHeight: '400px',
        overflowY: 'auto',
        backgroundColor: '#f9f9f9'
      }}>
        {conversation.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center' }}>
            Click the microphone and start talking!
          </p>
        ) : (
          conversation.map((msg, index) => (
            <div
              key={index}
              style={{
                marginBottom: '15px',
                textAlign: msg.role === 'user' ? 'right' : 'left'
              }}
            >
              <div style={{
                display: 'inline-block',
                padding: '10px 15px',
                borderRadius: '15px',
                backgroundColor: msg.role === 'user' ? '#2196F3' : '#4CAF50',
                color: 'white',
                maxWidth: '70%',
                textAlign: 'left'
              }}>
                <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div style={{ textAlign: 'center', color: '#999' }}>
            <em>AI is thinking...</em>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message or use voice..."
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '16px',
            borderRadius: '5px',
            border: '1px solid #ccc'
          }}
          disabled={isLoading || isListening}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || isListening || !inputText.trim()}
          style={{
            padding: '12px 25px',
            fontSize: '16px',
            cursor: (isLoading || isListening || !inputText.trim()) ? 'not-allowed' : 'pointer',
            backgroundColor: (isLoading || !inputText.trim()) ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          Send
        </button>
      </div>

      {/* Voice Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={startListening}
          disabled={isListening || isLoading || isSpeaking}
          style={{
            padding: '20px 40px',
            fontSize: '20px',
            cursor: (isListening || isLoading || isSpeaking) ? 'not-allowed' : 'pointer',
            backgroundColor: isListening ? '#ff9800' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          {isListening ? '🎤 Listening...' : isSpeaking ? '🔊 Speaking...' : '🎤 Talk to AI'}
        </button>
      </div>
    </div>
  );
}

export default App;