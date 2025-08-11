import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, Briefcase, Mic } from 'lucide-react';

interface CategoryData {
  id: string;
  title: string;
  icon: React.ElementType;
  theme: 'dating' | 'interview' | 'charisma' | 'speaking';
  xp: number;
  streak: number;
  completedMissions: number;
  totalMissions: number;
  route: string;
}

interface InfoCardData {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
}

const Practice = () => {
  const navigate = useNavigate();
  const [activeShimmer, setActiveShimmer] = useState<string | null>(null);

  const categories: CategoryData[] = [
    {
      id: 'dating',
      title: 'Dating & Romance',
      icon: Heart,
      theme: 'dating',
      xp: 1450,
      streak: 7,
      completedMissions: 12,
      totalMissions: 20,
      route: '/quick-drill'
    },
    {
      id: 'interviews',
      title: 'Job Interviews',
      icon: Briefcase,
      theme: 'interview',
      xp: 890,
      streak: 3,
      completedMissions: 5,
      totalMissions: 15,
      route: '/quick-drill'
    },
    {
      id: 'charisma',
      title: 'Charisma & Social Manners',
      icon: Users,
      theme: 'charisma',
      xp: 2100,
      streak: 12,
      completedMissions: 18,
      totalMissions: 25,
      route: '/quick-drill'
    },
    {
      id: 'speaking',
      title: 'Public Speaking',
      icon: Mic,
      theme: 'speaking',
      xp: 650,
      streak: 2,
      completedMissions: 4,
      totalMissions: 12,
      route: '/quick-drill'
    }
  ];

  const infoCards: InfoCardData[] = [
    {
      id: 'level',
      icon: '🏆',
      title: 'Level 3',
      subtitle: 'Rising Charmer'
    },
    {
      id: 'badges',
      icon: '🎖️',
      title: '8 Badges',
      subtitle: 'Achievement hunter'
    },
    {
      id: 'progress',
      icon: '📈',
      title: 'Weekly XP',
      subtitle: '2,890 / 3,500'
    },
    {
      id: 'insight',
      icon: '💡',
      title: 'AI Insight',
      subtitle: 'Focus on eye contact'
    }
  ];

  const handleCategoryClick = (category: CategoryData) => {
    setActiveShimmer(category.id);
    
    // Navigate after animation completes
    setTimeout(() => {
      navigate(category.route);
      setActiveShimmer(null);
    }, 300);
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--gradient-background)' }}>
      {/* Header */}
      <div className="section-mobile">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gradient-intense">Practice Hub</h1>
          <p className="text-lg text-muted-foreground">
            Choose your training world
          </p>
        </div>
      </div>

      {/* Category Cards */}
      <div className="px-4 space-y-4 mb-8">
        {categories.map((category) => {
          const IconComponent = category.icon;
          const progressPercentage = getProgressPercentage(category.completedMissions, category.totalMissions);
          
          return (
            <div
              key={category.id}
              className={`category-card category-${category.theme} p-6 h-32 ${
                activeShimmer === category.id ? 'shimmer-effect shimmer-active' : 'shimmer-effect'
              }`}
              onClick={() => handleCategoryClick(category)}
            >
              <div className="relative z-10 h-full flex flex-col justify-between">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <IconComponent size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{category.title}</h3>
                      <div className="flex items-center gap-3 text-sm opacity-90">
                        <span>{category.xp} XP</span>
                        <div className="flex items-center gap-1">
                          <span>🔥</span>
                          <span>{category.streak} day streak</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {category.completedMissions}/{category.totalMissions}
                    </div>
                    <div className="text-xs opacity-75">missions</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full">
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-white/60 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    {progressPercentage}% complete
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Strip */}
      <div className="px-4">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Your Stats</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {infoCards.map((card) => (
            <div key={card.id} className="info-card flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{card.icon}</span>
                <span className="text-sm font-semibold text-foreground">{card.title}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {card.subtitle}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Motivational Footer */}
      <div className="mt-8 px-4">
        <div className="card-warm p-4 text-center">
          <p className="text-sm font-medium text-gradient-xp">
            "Every conversation is a chance to level up!" 💪
          </p>
        </div>
      </div>
    </div>
  );
};

export default Practice;