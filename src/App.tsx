import { useState } from 'react';
import './App.css';

function App() {
  const [text, setText] = useState('Hello! I am your AI voice assistant.');
  const [isLoading, setIsLoading] = useState(false);

  const speakText = async () => {
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

      console.log('API Key:', apiKey ? 'Found' : 'NOT FOUND');
      console.log('First 10 chars:', apiKey?.substring(0, 10));

      // Direct fetch call with simpler approach
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
        placeholder="Enter text to speak..."
        rows={4}
        style={{ width: '400px', padding: '10px', fontSize: '16px' }}
      />

      <br /><br />

      <button
        onClick={speakText}
        disabled={isLoading}
        style={{
          padding: '15px 30px',
          fontSize: '18px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          backgroundColor: isLoading ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        {isLoading ? '🔄 Generating...' : '🔊 Speak'}
      </button>
    </div>
  );
}

export default App;