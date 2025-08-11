import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, MessageSquare, Play, Pause } from 'lucide-react';

const ShadowPractice = () => {
  const navigate = useNavigate();
  const [practiceMode, setPracticeMode] = useState<'text' | 'voice'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [sessionActive, setSessionActive] = useState(false);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!sessionActive) setSessionActive(true);
  };

  const startTextSession = () => {
    setSessionActive(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Back</span>
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-20">
        {/* Header Quote */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-4">Shadow Practice</h1>
          <p className="text-white/70 italic text-lg leading-relaxed">
            "No one is watching. Try. Fail. Grow."
          </p>
        </div>

        {/* Mode Selection */}
        {!sessionActive && (
          <div className="mb-8">
            <div className="flex gap-3 p-1 bg-white/10 rounded-xl">
              <button
                onClick={() => setPracticeMode('text')}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all
                  ${practiceMode === 'text' 
                    ? 'bg-white text-slate-900 font-semibold' 
                    : 'text-white/70 hover:text-white'
                  }
                `}
              >
                <MessageSquare size={20} />
                Text Practice
              </button>
              
              <button
                onClick={() => setPracticeMode('voice')}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-all
                  ${practiceMode === 'voice' 
                    ? 'bg-white text-slate-900 font-semibold' 
                    : 'text-white/70 hover:text-white'
                  }
                `}
              >
                <Mic size={20} />
                Voice Practice
              </button>
            </div>
          </div>
        )}

        {/* Practice Area */}
        <div className="card-elevated bg-white/5 backdrop-blur-lg border-white/10 p-6 mb-8">
          {practiceMode === 'text' ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Write Your Practice</h3>
              <textarea
                value={textInput}
                onChange={(e) => {
                  setTextInput(e.target.value);
                  if (e.target.value && !sessionActive) startTextSession();
                }}
                placeholder="Start typing your conversation practice here... What would you say in this situation?"
                className="w-full h-40 bg-white/10 border border-white/20 rounded-lg p-4 text-white placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <div className="mt-3 text-sm text-white/60">
                Express yourself freely. No judgment, just growth.
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-6">Voice Practice</h3>
              
              <div className="mb-6">
                <button
                  onClick={toggleRecording}
                  className={`
                    w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
                    ${isRecording 
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                      : 'bg-white/20 hover:bg-white/30'
                    }
                  `}
                >
                  {isRecording ? <Pause size={32} /> : <Mic size={32} />}
                </button>
              </div>
              
              <div className="text-sm text-white/60">
                {isRecording 
                  ? "Recording... Speak with confidence!" 
                  : "Tap to start recording your practice"
                }
              </div>
            </div>
          )}
        </div>

        {/* Session Stats */}
        {sessionActive && (
          <div className="card-elevated bg-white/5 backdrop-blur-lg border-white/10 p-4 mb-8">
            <h4 className="font-semibold mb-3">This Session</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-glow">5:23</div>
                <div className="text-xs text-white/60">Time Practiced</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success-glow">+15</div>
                <div className="text-xs text-white/60">XP Earned</div>
              </div>
            </div>
          </div>
        )}

        {/* Helpful Tips */}
        <div className="card-elevated bg-white/5 backdrop-blur-lg border-white/10 p-4">
          <h4 className="font-semibold mb-3">💡 Practice Tips</h4>
          <ul className="space-y-2 text-sm text-white/80">
            <li>• Speak or write as if you're in a real conversation</li>
            <li>• Focus on being authentic, not perfect</li>
            <li>• Try different tones and approaches</li>
            <li>• Practice makes progress, not perfection</li>
          </ul>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors"
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShadowPractice;