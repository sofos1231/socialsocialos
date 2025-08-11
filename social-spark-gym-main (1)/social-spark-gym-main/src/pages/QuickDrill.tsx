import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Timer, RotateCcw } from 'lucide-react';
import XPToast from '../components/XPToast';

const QuickDrill = () => {
  const navigate = useNavigate();
  const [drillStarted, setDrillStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [drillComplete, setDrillComplete] = useState(false);
  const [showXPToast, setShowXPToast] = useState(false);

  const drillPrompts = [
    "Say something bold to get attention",
    "Make a playful comment about your surroundings",
    "Start a conversation with confidence",
    "Use humor to break the ice",
    "Give a genuine compliment that stands out"
  ];

  const [currentPrompt] = useState(
    drillPrompts[Math.floor(Math.random() * drillPrompts.length)]
  );

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (drillStarted && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (drillStarted && timeLeft === 0) {
      setDrillComplete(true);
      setDrillStarted(false);
      setShowXPToast(true);
    }

    return () => clearTimeout(timer);
  }, [drillStarted, timeLeft]);

  const startDrill = () => {
    setDrillStarted(true);
    setDrillComplete(false);
    setTimeLeft(30);
  };

  const resetDrill = () => {
    setDrillStarted(false);
    setDrillComplete(false);
    setTimeLeft(30);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Back</span>
        </button>
        
        {drillStarted && (
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1">
            <Timer size={16} />
            <span className="font-mono text-lg">{timeLeft}s</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-8 pb-20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Quick Drill</h1>
          <p className="text-white/70 text-lg">
            30 seconds to practice your skills
          </p>
        </div>

        {/* Drill Card */}
        <div className="card-elevated bg-white/5 backdrop-blur-lg border-white/10 p-6 mb-8">
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce-subtle">🎯</div>
            <h2 className="text-xl font-semibold mb-4">Your Challenge:</h2>
            <p className="text-lg leading-relaxed">
              "{currentPrompt}"
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {!drillStarted && !drillComplete && (
            <button
              onClick={startDrill}
              className="w-full btn-primary text-lg py-4"
            >
              Start 30-Second Drill
            </button>
          )}

          {drillStarted && (
            <div className="text-center">
              <div className="text-lg mb-4">Practice out loud! 🗣️</div>
              <div className="text-sm text-white/60">
                Timer is running... speak with confidence!
              </div>
            </div>
          )}

          {drillComplete && (
            <div className="space-y-3">
              <button
                onClick={resetDrill}
                className="w-full btn-success flex items-center justify-center gap-2"
              >
                <RotateCcw size={20} />
                Do Another Drill
              </button>
              
              <button
                onClick={() => navigate('/')}
                className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                Back to Practice
              </button>
            </div>
          )}
        </div>

        {/* Motivational Quote */}
        <div className="mt-12 text-center">
          <p className="text-white/50 text-sm italic">
            "Confidence is built one small action at a time"
          </p>
        </div>
      </div>

      {/* XP Toast */}
      {showXPToast && (
        <XPToast
          xp={10}
          showStreak={true}
          streakCount={3}
          onComplete={() => setShowXPToast(false)}
        />
      )}
    </div>
  );
};

export default QuickDrill;