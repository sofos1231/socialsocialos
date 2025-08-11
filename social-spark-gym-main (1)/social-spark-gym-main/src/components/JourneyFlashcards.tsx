import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StreakFireButton from '@/components/StreakFireButton';

interface InfoCardData {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
}

const JourneyFlashcards = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<number>(0);
  const touchEndRef = useRef<number>(0);

  const infoCards: InfoCardData[] = [
    {
      id: 'insight',
      icon: '💡',
      title: 'AI Insight',
      subtitle: ''
    },
    {
      id: 'progress',
      icon: '📈',
      title: 'Weekly XP',
      subtitle: ''
    },
    {
      id: 'badges',
      icon: '🎖️',
      title: '8 Badges',
      subtitle: ''
    },
    {
      id: 'level',
      icon: '🏆',
      title: 'Level 3',
      subtitle: ''
    }
  ];

  const getCardStyle = (cardId: string) => {
    switch (cardId) {
      case 'level':
        return 'bg-gradient-primary text-primary-foreground shadow-glow-primary/50';
      case 'badges':
        return 'bg-gradient-secondary text-secondary-foreground shadow-glow-secondary/50';
      case 'progress':
        return 'bg-gradient-success text-success-foreground shadow-glow-success/50';
      case 'insight':
        return 'bg-card text-card-foreground shadow-elevation border border-border';
      default:
        return 'bg-card text-card-foreground shadow-card';
    }
  };

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % infoCards.length);
  };

  const goToCard = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const handleInfoCardClick = (cardId: string) => {
    if (cardId === 'badges') {
      navigate('/badges');
    } else if (cardId === 'level') {
      navigate('/level-milestones');
    }
  };

  // Auto-advance timer
  useEffect(() => {
    if (isAutoPlaying) {
      timerRef.current = setInterval(nextCard, 5000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isAutoPlaying]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.targetTouches[0].clientX;
    setIsAutoPlaying(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    
    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev + 1) % infoCards.length);
    }
    if (isRightSwipe) {
      setCurrentIndex((prev) => (prev - 1 + infoCards.length) % infoCards.length);
    }

    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const currentCard = infoCards[currentIndex];

  return (
    <div className="space-y-4">
      <div 
        className="relative h-32 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Special handling for progress card to show StreakFireButton */}
        {currentCard.id === 'progress' ? (
          <div className="w-full h-full animate-scale-in">
            <StreakFireButton
              streak={7}
              weeklyXP={2890}
              currentLevel={3}
              levelTitle="Rising Charmer"
            />
          </div>
        ) : (
          <div 
            className={`
              w-full h-full rounded-xl transition-all duration-200 p-6 animate-scale-in
              ${getCardStyle(currentCard.id)}
              ${(currentCard.id === 'badges' || currentCard.id === 'level') ? 'cursor-pointer hover:scale-105 hover:shadow-elevation' : 'hover:scale-102'}
            `}
            onClick={() => handleInfoCardClick(currentCard.id)}
          >
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-3xl mb-2">{currentCard.icon}</span>
              <span className="text-lg font-semibold">{currentCard.title}</span>
            </div>
          </div>
        )}
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center space-x-2">
        {infoCards.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentIndex 
                ? 'bg-primary scale-125' 
                : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'
            }`}
            onClick={() => goToCard(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default JourneyFlashcards;