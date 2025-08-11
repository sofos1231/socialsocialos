import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ProfileCardProps {
  className?: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ className }) => {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isStreakAnimating, setIsStreakAnimating] = useState(false);
  const [xpCount, setXpCount] = useState(1200);
  
  // Mock user data
  const userInfo = {
    name: "Shalev",
    level: 5,
    currentXP: 1250,
    xpToNext: 1500,
    streak: 7,
    topTrait: "Humor",
    todaysFocus: "Dating & Group Skills"
  };

  // Calculate XP progress
  const xpProgress = (userInfo.currentXP / userInfo.xpToNext) * 100;
  
  // Motivational quotes that rotate
  const quotes = [
    "Every rep counts. Even the cringe ones.",
    "Flirt. Fail. Adjust. Level up.",
    "Confidence is a skill, not a gift.",
    "Social muscle grows with practice.",
    "Your comfort zone is your danger zone."
  ];

  // Rotate quotes every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  // Animate XP count on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setXpCount(userInfo.currentXP);
    }, 500);
    return () => clearTimeout(timer);
  }, [userInfo.currentXP]);

  const handleStreakClick = () => {
    setIsStreakAnimating(true);
    // Add haptic feedback simulation
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    setTimeout(() => setIsStreakAnimating(false), 600);
  };

  const handleAvatarClick = () => {
    // Avatar bounce animation is handled by CSS
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  return (
    <div className={cn("profile-card-container", className)}>
      {/* Frosted Glass Card */}
      <div className="profile-card-glass">
        {/* Top Bar with Settings */}
        <div className="profile-card-header">
          <div className="flex items-center gap-3">
            {/* Avatar with XP Ring */}
            <div className="profile-avatar-container" onClick={handleAvatarClick}>
              <div className="profile-xp-ring" style={{ '--progress': `${xpProgress}%` } as React.CSSProperties}>
                <Avatar className="profile-avatar">
                  <AvatarFallback className="profile-avatar-fallback">
                    {userInfo.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            
            {/* Greeting */}
            <div className="profile-greeting">
              <h2 className="profile-greeting-text">Hey {userInfo.name}!</h2>
            </div>
          </div>
          
          {/* Settings Icon */}
          <button className="profile-settings-btn">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="profile-stats-row">
          {/* Level Badge */}
          <div className="profile-level-badge">
            <span className="profile-level-text">Level {userInfo.level}</span>
          </div>
          
          {/* XP Counter */}
          <div className="profile-xp-container">
            <span className="profile-xp-amount">{xpCount.toLocaleString()}</span>
            <span className="profile-xp-label">XP</span>
          </div>
          
          {/* Streak */}
          <div 
            className={cn("profile-streak-container", isStreakAnimating && "profile-streak-burst")}
            onClick={handleStreakClick}
          >
            <span className="profile-streak-emoji">🔥</span>
            <span className="profile-streak-count">x{userInfo.streak}</span>
          </div>
        </div>

        {/* Traits Section */}
        <div className="profile-traits-section">
          {/* Top Trait */}
          <div className="profile-trait-item">
            <span className="profile-trait-icon">🎯</span>
            <span className="profile-trait-label">Top Trait:</span>
            <div className="profile-trait-chip">
              {userInfo.topTrait}
            </div>
          </div>
          
          {/* Today's Focus */}
          <div className="profile-trait-item">
            <span className="profile-trait-icon">🧠</span>
            <span className="profile-trait-label">Today's Focus:</span>
            <div className="profile-focus-chip">
              {userInfo.todaysFocus}
            </div>
          </div>
        </div>

        {/* Motivational Quote */}
        <div className="profile-quote-container">
          <p className="profile-quote-text">
            "{quotes[currentQuoteIndex]}"
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;