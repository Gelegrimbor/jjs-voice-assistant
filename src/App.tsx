import { useState, useRef } from 'react';
import './App.css';

// Add this interface at the top, before the App function
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
  const [text, setText] = useState('Hello! I am your AI voice assistant.');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Voice input setup
  const startListening = () => {
    // Check if browser supports speech recognition
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
      setText(transcript);
      setIsListening(false);
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

  const speakText = async () => {
    setIsLoading(true);

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
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();

      console.log('Success! Audio played');

    } catch (error) {
      console.error('Detailed Error:', error);
      alert('Failed to generate speech. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>🎤 Voice Assistant Test</h1>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to speak or click the microphone..."
        rows={4}
        style={{ width: '400px', padding: '10px', fontSize: '16px' }}
      />

      <br /><br />

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={startListening}
          disabled={isListening || isLoading}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            cursor: (isListening || isLoading) ? 'not-allowed' : 'pointer',
            backgroundColor: isListening ? '#ff9800' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          {isListening ? '🎤 Listening...' : '🎤 Speak'}
        </button>

        <button
          onClick={speakText}
          disabled={isLoading || isListening}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            cursor: (isLoading || isListening) ? 'not-allowed' : 'pointer',
            backgroundColor: isLoading ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          {isLoading ? '🔄 Generating...' : '🔊 Play'}
        </button>
      </div>
    </div>
  );
}

export default App;