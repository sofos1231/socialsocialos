import { useState, useEffect } from 'react';
import { Share2, Download, MessageCircle, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface StreakFireButtonProps {
  streak: number;
  weeklyXP: number;
  currentLevel: number;
  levelTitle: string;
}

const StreakFireButton = ({ streak, weeklyXP, currentLevel, levelTitle }: StreakFireButtonProps) => {
  const [tapCount, setTapCount] = useState(0);
  const [isExploding, setIsExploding] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [flameSize, setFlameSize] = useState(1);
  const [isShaking, setIsShaking] = useState(false);

  const handleTap = () => {
    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);
    
    // Shake animation after each tap
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 300);
    
    // Increase flame size with each tap
    setFlameSize(1 + (newTapCount * 0.15));

    // Small explosion after 3 taps
    if (newTapCount === 3) {
      createSmallExplosion();
    }

    // Big explosion after 7 taps
    if (newTapCount >= 7) {
      triggerExplosion();
      return;
    }

    // Reset tap count after 3 seconds of inactivity
    setTimeout(() => {
      if (tapCount === newTapCount - 1) {
        setTapCount(0);
        setFlameSize(1);
        setIsShaking(false);
      }
    }, 3000);
  };

  const createSmallExplosion = () => {
    const container = document.querySelector('.fire-explosion-container');
    if (container) {
      for (let i = 0; i < 6; i++) {
        const emoji = document.createElement('div');
        emoji.innerHTML = '✨';
        emoji.style.position = 'absolute';
        emoji.style.fontSize = '16px';
        emoji.style.zIndex = '50';
        emoji.style.pointerEvents = 'none';
        emoji.style.left = '50%';
        emoji.style.top = '50%';
        emoji.style.transform = 'translate(-50%, -50%)';
        emoji.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        container.appendChild(emoji);

        setTimeout(() => {
          const angle = (i / 6) * 360;
          const distance = 40 + Math.random() * 20;
          const radian = (angle * Math.PI) / 180;
          const x = Math.cos(radian) * distance;
          const y = Math.sin(radian) * distance;
          
          emoji.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0.3) rotate(${angle}deg)`;
          emoji.style.opacity = '0';
        }, 50);

        setTimeout(() => {
          emoji.remove();
        }, 700);
      }
    }
  };

  const triggerExplosion = () => {
    setIsExploding(true);
    
    // Create fire emoji explosion effect
    const container = document.querySelector('.fire-explosion-container');
    if (container) {
      for (let i = 0; i < 12; i++) {
        const emoji = document.createElement('div');
        emoji.innerHTML = '🔥';
        emoji.style.position = 'absolute';
        emoji.style.fontSize = '24px';
        emoji.style.zIndex = '50';
        emoji.style.pointerEvents = 'none';
        emoji.style.left = '50%';
        emoji.style.top = '50%';
        emoji.style.transform = 'translate(-50%, -50%)';
        emoji.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        container.appendChild(emoji);

        // Animate explosion
        setTimeout(() => {
          const angle = (i / 12) * 360;
          const distance = 80 + Math.random() * 40;
          const radian = (angle * Math.PI) / 180;
          const x = Math.cos(radian) * distance;
          const y = Math.sin(radian) * distance;
          
          emoji.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0.5) rotate(${angle}deg)`;
          emoji.style.opacity = '0';
        }, 50);

        // Remove emoji after animation
        setTimeout(() => {
          emoji.remove();
        }, 1100);
      }
    }

    // Show share modal after explosion
    setTimeout(() => {
      setIsExploding(false);
      setShowShareModal(true);
      setTapCount(0);
      setFlameSize(1);
      setIsShaking(false);
    }, 1000);
  };

  const handleShare = (platform: string) => {
    const message = `🔥 I'm on a ${streak}-day streak in SocialGym! Building confidence one conversation at a time. 💪`;
    
    switch (platform) {
      case 'instagram':
        // In a real app, this would open Instagram with the story template
        navigator.share?.({ text: message });
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        break;
      case 'download':
        // In a real app, this would download the streak card as an image
        alert('Streak card downloaded! 📸');
        break;
      default:
        navigator.share?.({ text: message });
    }
    setShowShareModal(false);
  };

  return (
    <>
      {/* Fire Explosion Container */}
      <div className="fire-explosion-container absolute inset-0 pointer-events-none" />
      
      {/* Streak Button */}
      <div 
        className={`
          relative cursor-pointer transition-all duration-200 h-20 w-full
          ${isShaking ? 'animate-pulse' : ''}
          ${tapCount > 0 ? 'scale-105' : 'hover:scale-105'}
        `}
        onClick={handleTap}
      >
        <div className={`
          animate-scale-in p-4 rounded-xl backdrop-blur-sm border border-white/20 transition-all duration-300 h-full w-full
          bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-xl shadow-orange-500/25
          hover:shadow-2xl relative overflow-hidden
        `}>
          {/* Background Heat Effect */}
          {tapCount > 3 && (
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-orange-600 animate-pulse opacity-50" />
          )}
          
          {/* Main Content */}
          <div className="relative z-10">
            <div className="flex flex-col items-center justify-center text-center h-full">
              <span 
                className="text-lg filter drop-shadow-sm mb-1 transition-all duration-300"
                style={{ 
                  transform: `scale(${flameSize})`,
                  filter: tapCount > 0 ? 'drop-shadow(0 0 8px rgba(255,165,0,0.8))' : 'drop-shadow-sm'
                }}
              >
                🔥
              </span>
              <span className="text-sm font-bold drop-shadow-sm">
                {streak} Day Streak
              </span>
            </div>
          </div>

          {/* Flame Glow Effect */}
          {tapCount > 0 && (
            <div 
              className="absolute inset-0 rounded-xl"
              style={{
                background: 'radial-gradient(circle, rgba(255,165,0,0.4) 0%, rgba(255,69,0,0.2) 50%, transparent 70%)',
                transform: `scale(${1 + tapCount * 0.1})`,
                animation: tapCount > 5 ? 'pulse 0.5s infinite' : 'none'
              }}
            />
          )}
        </div>
      </div>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="mx-4 rounded-xl border-0 bg-gradient-to-br from-orange-50 to-red-50 max-w-sm">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-3xl font-display font-bold mb-2">
              <span className="text-6xl block mb-2">🔥</span>
              <span className="text-gradient-xp">Epic Streak!</span>
            </DialogTitle>
            <p className="text-lg text-muted-foreground">You're crushing it, Social Warrior!</p>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Enhanced Streak Card */}
            <div className="bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 p-8 rounded-2xl text-white text-center relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <div className="text-5xl mb-4 animate-bounce-subtle">🔥</div>
                <h3 className="text-4xl font-bold mb-2">{streak}</h3>
                <p className="text-xl font-semibold text-orange-100 mb-6">Day Streak!</p>
                
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                    <div className="text-2xl font-bold">{weeklyXP}</div>
                    <div className="text-sm text-orange-200">Weekly XP</div>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                    <div className="text-2xl font-bold">Level {currentLevel}</div>
                    <div className="text-sm text-orange-200">{levelTitle}</div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Background Effects */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 left-6 text-3xl animate-pulse">🔥</div>
                <div className="absolute top-12 right-8 text-2xl animate-pulse" style={{animationDelay: '0.5s'}}>🔥</div>
                <div className="absolute bottom-8 left-8 text-2xl animate-pulse" style={{animationDelay: '1s'}}>🔥</div>
                <div className="absolute bottom-4 right-6 text-3xl animate-pulse" style={{animationDelay: '1.5s'}}>🔥</div>
                <div className="absolute top-1/2 left-4 text-xl animate-pulse" style={{animationDelay: '2s'}}>🔥</div>
                <div className="absolute top-1/2 right-4 text-xl animate-pulse" style={{animationDelay: '2.5s'}}>🔥</div>
              </div>
              
              {/* Radial glow */}
              <div className="absolute inset-0 bg-gradient-radial from-white/10 via-transparent to-transparent" />
            </div>

            {/* Share Options */}
            <div className="space-y-3">
              <h4 className="font-semibold text-center text-foreground">Share Your Achievement</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleShare('instagram')}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  <Instagram className="w-4 h-4 mr-2" />
                  Instagram Story
                </Button>
                
                <Button
                  onClick={() => handleShare('whatsapp')}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                
                <Button
                  onClick={() => handleShare('download')}
                  variant="outline"
                  className="col-span-2"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Save Image
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StreakFireButton;