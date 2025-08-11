import { useState, useEffect } from 'react';
import { Coins, Gem, Flame, Trophy, Plus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const TopStatusBar = () => {
  const [user] = useState({
    level: 5,
    currentXP: 750,
    nextLevelXP: 1000,
    coins: 1250,
    gems: 8,
    streak: 5,
    isLevelingUp: false
  });

  const [animatingCurrency, setAnimatingCurrency] = useState<'coins' | 'gems' | null>(null);
  const [streakBurst, setStreakBurst] = useState(false);
  const [showXPBonusPopup, setShowXPBonusPopup] = useState(false);

  const xpProgress = (user.currentXP / user.nextLevelXP) * 100;
  const streakMultiplier = Math.min(10 + (user.streak * 2), 50); // 10% base + 2% per day, max 50%
  const hasXPBonus = user.streak > 0;

  const handleCurrencyClick = (type: 'coins' | 'gems') => {
    setAnimatingCurrency(type);
    setTimeout(() => setAnimatingCurrency(null), 300);
    
    // Simulate haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleStreakClick = () => {
    setStreakBurst(true);
    setTimeout(() => setStreakBurst(false), 600);
    
    // Simulate haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }
  };

  const handleTrophyClick = () => {
    if (hasXPBonus) {
      setShowXPBonusPopup(true);
      // Auto-dismiss after 2.5 seconds
      setTimeout(() => setShowXPBonusPopup(false), 2500);
      
      // Simulate haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    }
  };

  const handleShopClick = () => {
    // Navigate to shop when + button is clicked
    // Simulate haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    console.log('Opening shop...');
  };

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showXPBonusPopup) {
        setShowXPBonusPopup(false);
      }
    };

    if (showXPBonusPopup) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showXPBonusPopup]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div 
        className="px-3 py-2 backdrop-blur-xl"
        style={{ 
          background: 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* Clash Royale Style Status Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Level Trophy + XP Bar */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <div 
                onClick={handleTrophyClick}
                className={`
                  relative flex items-center justify-center w-10 h-10 rounded-lg font-bold text-xs transition-all duration-300
                  ${user.isLevelingUp ? 'animate-pulse-glow' : ''}
                  ${hasXPBonus ? 'cursor-pointer hover:scale-105' : ''}
                `}
                style={{ 
                  background: 'var(--gradient-primary)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                <Trophy size={14} className="text-primary-foreground mr-0.5" />
                <span className="text-primary-foreground font-bold">{user.level}</span>
              </div>
              
              {/* Green XP Bonus Glow Ring with Enhanced Pulse */}
              {hasXPBonus && (
                <div 
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{ 
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    boxShadow: '0 0 15px 2px rgba(34, 197, 94, 0.5), 0 0 25px 4px rgba(34, 197, 94, 0.3)',
                    border: '2px solid rgba(34, 197, 94, 0.7)'
                  }}
                />
              )}

              {/* XP Bonus Popup */}
              {showXPBonusPopup && hasXPBonus && (
                <div 
                  className="absolute -top-16 left-1/2 transform -translate-x-1/2 z-[60] animate-fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div 
                    className="px-3 py-2 rounded-xl backdrop-blur-xl border border-green-400/40 shadow-xl text-center"
                    style={{
                      background: 'rgba(34, 197, 94, 0.15)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(34, 197, 94, 0.4)'
                    }}
                  >
                    <div className="text-xs font-bold text-green-400">
                      +{streakMultiplier}% XP Bonus Active
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Level Text and XP Progress Bar */}
            <div className="flex items-center gap-2 flex-1 min-w-0 max-w-[140px]">
              <div className="text-xs font-bold text-white whitespace-nowrap">
                Level {user.level}
              </div>
              <div className="flex-1 min-w-0">
                <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${xpProgress}%`,
                      background: 'var(--gradient-primary)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Center: Currency + Shop Button */}
          <div className="flex items-center gap-1.5">
            {/* Coins */}
            <div 
              onClick={() => handleCurrencyClick('coins')}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-95
                ${animatingCurrency === 'coins' ? 'animate-bounce-subtle' : ''}
              `}
              style={{ 
                background: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Coins size={12} className="text-white" />
              </div>
              <span className="text-xs font-bold text-white">
                {user.coins.toLocaleString()}
              </span>
            </div>

            {/* Gems */}
            <div 
              onClick={() => handleCurrencyClick('gems')}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-95
                ${animatingCurrency === 'gems' ? 'animate-bounce-subtle' : ''}
              `}
              style={{ 
                background: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <Gem size={12} className="text-white" />
              </div>
              <span className="text-xs font-bold text-white">
                {user.gems}
              </span>
            </div>

            {/* Green Shop + Button */}
            <div 
              onClick={handleShopClick}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
              style={{
                boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)'
              }}
            >
              <Plus size={14} className="text-white font-bold" />
            </div>
          </div>

          {/* Right: Streak */}
          <div className="flex items-center">
            <div 
              onClick={handleStreakClick}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all duration-200 active:scale-95 relative overflow-hidden
                ${streakBurst ? 'animate-pulse-glow' : ''}
              `}
              style={{ 
                background: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(10px)'
              }}
            >
              {streakBurst && (
                <>
                  <div className="absolute inset-0 animate-ping bg-orange-500 opacity-50 rounded-lg" />
                  <div className="absolute -top-1 -left-1 text-sm animate-bounce-in">🔥</div>
                  <div className="absolute -top-1 -right-1 text-sm animate-bounce-in" style={{animationDelay: '100ms'}}>✨</div>
                </>
              )}
              
              <div className="relative z-10 flex items-center gap-1.5">
                <Flame size={12} className="text-orange-400" />
                <span className="text-xs font-bold text-white">
                  {user.streak}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopStatusBar;