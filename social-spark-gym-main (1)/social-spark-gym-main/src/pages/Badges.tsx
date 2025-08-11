import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Star, Lock, Filter, Search, Share2, 
  Users, Heart, Mic, Target, Brain, Crown,
  ChevronLeft, Timer, Zap, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BadgeData {
  id: string;
  title: string;
  description: string;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  status: 'locked' | 'in-progress' | 'unlocked';
  progress?: number;
  maxProgress?: number;
  icon: string;
  unlockedDate?: string;
  xpReward: number;
}

const Badges = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'in-progress' | 'locked'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', name: 'All Badges', icon: Trophy, color: 'text-primary' },
    { id: 'conversation', name: 'Conversation', icon: Users, color: 'text-dating-primary' },
    { id: 'empathy', name: 'Empathy', icon: Heart, color: 'text-success' },
    { id: 'leadership', name: 'Leadership', icon: Crown, color: 'text-secondary' },
    { id: 'speaking', name: 'Public Speaking', icon: Mic, color: 'text-speaking-primary' },
    { id: 'confidence', name: 'Confidence', icon: Target, color: 'text-interview-primary' },
    { id: 'mindfulness', name: 'Mindfulness', icon: Brain, color: 'text-charisma-primary' }
  ];

  const badges: BadgeData[] = [
    // Conversation Badges
    {
      id: 'first-chat',
      title: 'First Steps',
      description: 'Complete your first conversation practice',
      category: 'conversation',
      tier: 'bronze',
      status: 'unlocked',
      icon: '💬',
      unlockedDate: '2 days ago',
      xpReward: 50
    },
    {
      id: 'smooth-talker',
      title: 'Smooth Talker',
      description: 'Perfect score in 5 dating scenarios',
      category: 'conversation',
      tier: 'silver',
      status: 'in-progress',
      progress: 3,
      maxProgress: 5,
      icon: '😎',
      xpReward: 150
    },
    {
      id: 'conversation-master',
      title: 'Conversation Master',
      description: 'Complete 50 conversation practices',
      category: 'conversation',
      tier: 'gold',
      status: 'locked',
      progress: 12,
      maxProgress: 50,
      icon: '🗣️',
      xpReward: 300
    },
    {
      id: 'ice-breaker',
      title: 'Ice Breaker',
      description: 'Start 20 conversations with strangers',
      category: 'conversation',
      tier: 'silver',
      status: 'in-progress',
      progress: 8,
      maxProgress: 20,
      icon: '🧊',
      xpReward: 200
    },

    // Empathy Badges
    {
      id: 'active-listener',
      title: 'Active Listener',
      description: 'Perfect eye contact in 10 sessions',
      category: 'empathy',
      tier: 'bronze',
      status: 'unlocked',
      icon: '👂',
      unlockedDate: '1 week ago',
      xpReward: 75
    },
    {
      id: 'emotion-reader',
      title: 'Emotion Reader',
      description: 'Correctly identify emotions in 20 scenarios',
      category: 'empathy',
      tier: 'silver',
      status: 'in-progress',
      progress: 14,
      maxProgress: 20,
      icon: '🎭',
      xpReward: 200
    },
    {
      id: 'empath-master',
      title: 'Empathy Master',
      description: 'Show perfect empathy in difficult conversations',
      category: 'empathy',
      tier: 'gold',
      status: 'locked',
      icon: '💝',
      xpReward: 350
    },

    // Leadership Badges
    {
      id: 'team-player',
      title: 'Team Player',
      description: 'Complete 5 group collaboration exercises',
      category: 'leadership',
      tier: 'bronze',
      status: 'unlocked',
      icon: '🤝',
      unlockedDate: '3 days ago',
      xpReward: 100
    },
    {
      id: 'natural-leader',
      title: 'Natural Leader',
      description: 'Lead 10 successful group discussions',
      category: 'leadership',
      tier: 'gold',
      status: 'locked',
      progress: 2,
      maxProgress: 10,
      icon: '👑',
      xpReward: 400
    },
    {
      id: 'motivator',
      title: 'Team Motivator',
      description: 'Inspire your team in 15 scenarios',
      category: 'leadership',
      tier: 'silver',
      status: 'locked',
      icon: '🔥',
      xpReward: 250
    },

    // Speaking Badges
    {
      id: 'mic-drop',
      title: 'Mic Drop',
      description: 'Deliver a flawless 5-minute presentation',
      category: 'speaking',
      tier: 'silver',
      status: 'locked',
      icon: '🎤',
      xpReward: 250
    },
    {
      id: 'stage-presence',
      title: 'Stage Presence',
      description: 'Maintain confident posture throughout speech',
      category: 'speaking',
      tier: 'bronze',
      status: 'in-progress',
      progress: 7,
      maxProgress: 10,
      icon: '🎭',
      xpReward: 120
    },
    {
      id: 'storyteller',
      title: 'Master Storyteller',
      description: 'Captivate audience with compelling stories',
      category: 'speaking',
      tier: 'gold',
      status: 'locked',
      icon: '📖',
      xpReward: 300
    },

    // Confidence Badges
    {
      id: 'comfort-zone',
      title: 'Comfort Zone Breaker',
      description: 'Try 3 challenging social scenarios',
      category: 'confidence',
      tier: 'bronze',
      status: 'unlocked',
      icon: '🚀',
      unlockedDate: '5 days ago',
      xpReward: 80
    },
    {
      id: 'fearless',
      title: 'Fearless',
      description: 'Complete 15 high-anxiety scenarios',
      category: 'confidence',
      tier: 'gold',
      status: 'locked',
      progress: 3,
      maxProgress: 15,
      icon: '🦁',
      xpReward: 350
    },
    {
      id: 'confidence-boost',
      title: 'Confidence Booster',
      description: 'Help 5 others build their confidence',
      category: 'confidence',
      tier: 'silver',
      status: 'locked',
      icon: '💪',
      xpReward: 200
    },

    // Mindfulness Badges
    {
      id: 'present-moment',
      title: 'Present Moment',
      description: 'Complete 10 mindfulness exercises',
      category: 'mindfulness',
      tier: 'bronze',
      status: 'unlocked',
      icon: '🧘',
      unlockedDate: '1 week ago',
      xpReward: 60
    },
    {
      id: 'stress-master',
      title: 'Stress Master',
      description: 'Handle pressure in 20 stressful scenarios',
      category: 'mindfulness',
      tier: 'silver',
      status: 'in-progress',
      progress: 12,
      maxProgress: 20,
      icon: '🌊',
      xpReward: 180
    }
  ];

  const userStats = {
    totalBadges: badges.filter(b => b.status === 'unlocked').length,
    totalPossible: badges.length,
    totalXP: badges.filter(b => b.status === 'unlocked').reduce((sum, b) => sum + b.xpReward, 0)
  };

  const filteredBadges = badges.filter(badge => {
    const matchesFilter = filter === 'all' || badge.status === filter;
    const matchesCategory = selectedCategory === 'all' || badge.category === selectedCategory;
    const matchesSearch = badge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         badge.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesCategory && matchesSearch;
  });

  const groupedBadges = categories.reduce((acc, category) => {
    if (category.id === 'all') return acc;
    acc[category.id] = filteredBadges.filter(badge => badge.category === category.id);
    return acc;
  }, {} as Record<string, BadgeData[]>);

  return (
    <div className="min-h-screen pb-20 pt-24 px-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="heading-hero text-3xl mb-1">Your Badges</h1>
          <p className="text-subtitle">Collect achievements as you master social skills</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="card-primary mb-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow-primary">
              <Trophy className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h3 className="heading-card text-xl">Achievement Progress</h3>
              <p className="text-caption">Keep growing to unlock new rewards</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="hover:scale-105 transition-transform">
            <Share2 className="w-4 h-4 mr-2" />
            Share Progress
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="text-2xl font-bold text-primary mb-1">{userStats.totalBadges}</div>
            <div className="text-sm text-muted-foreground">Badges Earned</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20">
            <div className="text-2xl font-bold text-secondary mb-1">{userStats.totalXP}</div>
            <div className="text-sm text-muted-foreground">XP Gained</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20">
            <div className="text-2xl font-bold text-success mb-1">{Math.round((userStats.totalBadges / userStats.totalPossible) * 100)}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="progress-bar-primary">
          <div 
            className="progress-fill-primary" 
            style={{ width: `${(userStats.totalBadges / userStats.totalPossible) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {userStats.totalBadges} of {userStats.totalPossible} badges collected
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search badges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card/50 border-border/50"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'unlocked', 'in-progress', 'locked'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
              className="shrink-0 capitalize"
            >
              {status === 'all' ? 'All' : status.replace('-', ' ')}
            </Button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="shrink-0 flex items-center gap-2"
              >
                <IconComponent className={cn("w-4 h-4", category.color)} />
                <span className="hidden sm:inline">{category.name}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Badge Grid */}
      {selectedCategory === 'all' ? (
        <div className="space-y-8">
          {categories.slice(1).map((category) => {
            const categoryBadges = groupedBadges[category.id];
            if (!categoryBadges || categoryBadges.length === 0) return null;
            
            const IconComponent = category.icon;
            const unlockedInCategory = categoryBadges.filter(b => b.status === 'unlocked').length;
            
            return (
              <div key={category.id} className="animate-slide-up">
                <div className="flex items-center gap-3 mb-6">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", 
                    `bg-gradient-to-br from-${category.color.split('-')[1]}/20 to-${category.color.split('-')[1]}/10 border border-${category.color.split('-')[1]}/30`)}>
                    <IconComponent className={cn("w-6 h-6", category.color)} />
                  </div>
                  <div className="flex-1">
                    <h2 className="heading-section text-xl">{category.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {unlockedInCategory} of {categoryBadges.length} badges earned
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categoryBadges.map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBadges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      )}

      {filteredBadges.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
            <Search className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="heading-card mb-2">No badges found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search terms</p>
        </div>
      )}

      {/* Motivational Footer */}
      <div className="mt-12 card-primary text-center animate-slide-up">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-success/20 to-primary/20 flex items-center justify-center">
            <Zap className="w-8 h-8 text-success" />
          </div>
          <h3 className="heading-card text-xl mb-2 text-success">Keep Growing! 🌱</h3>
          <p className="text-subtitle mb-4">
            Each badge represents a milestone in your social confidence journey. 
            Challenge yourself to unlock them all!
          </p>
          <div className="text-sm text-muted-foreground">
            Next milestone: Earn {5 - (userStats.totalBadges % 5)} more badges to unlock a special reward
          </div>
        </div>
      </div>
    </div>
  );
};

interface BadgeCardProps {
  badge: BadgeData;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ badge }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'text-xp-bronze border-xp-bronze/30 bg-gradient-to-br from-xp-bronze/10 to-xp-bronze/5';
      case 'silver': return 'text-xp-silver border-xp-silver/30 bg-gradient-to-br from-xp-silver/10 to-xp-silver/5';
      case 'gold': return 'text-xp-gold border-xp-gold/30 bg-gradient-to-br from-xp-gold/10 to-xp-gold/5';
      case 'diamond': return 'text-xp-diamond border-xp-diamond/30 bg-gradient-to-br from-xp-diamond/10 to-xp-diamond/5';
      default: return 'text-muted-foreground border-muted/30 bg-muted/5';
    }
  };

  const getStatusAnimation = (status: string) => {
    switch (status) {
      case 'unlocked': return 'shadow-glow-primary animate-pulse-subtle';
      case 'in-progress': return 'shadow-card border-primary/50';
      default: return 'opacity-60';
    }
  };

  return (
    <div 
      className={cn(
        "relative aspect-square rounded-xl border-2 p-4 cursor-pointer transition-all duration-300 hover:scale-105",
        getTierColor(badge.tier),
        getStatusAnimation(badge.status)
      )}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      {!isFlipped ? (
        <div className="h-full flex flex-col items-center justify-center text-center relative">
          {/* New Badge Indicator */}
          {badge.status === 'unlocked' && badge.unlockedDate?.includes('day') && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-success rounded-full flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-white text-xs">✨</span>
            </div>
          )}

          {/* Badge Icon */}
          <div className="text-4xl mb-3 relative">
            {badge.icon}
            {badge.status === 'locked' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                <Lock className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
          
          {/* Badge Title */}
          <h3 className="font-semibold text-sm mb-2 line-clamp-2 leading-tight">{badge.title}</h3>
          
          {/* Progress Bar (if in progress) */}
          {badge.status === 'in-progress' && badge.progress && badge.maxProgress && (
            <div className="w-full mb-2">
              <div className="w-full bg-muted/30 rounded-full h-2 mb-1">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(badge.progress / badge.maxProgress) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {badge.progress}/{badge.maxProgress}
              </p>
            </div>
          )}
          
          {/* Status Indicator */}
          <div className="flex items-center gap-1 mt-auto">
            {badge.status === 'unlocked' && (
              <>
                <Star className="w-3 h-3 text-success fill-current" />
                <span className="text-xs text-success font-medium">Earned</span>
              </>
            )}
            {badge.status === 'in-progress' && (
              <>
                <Timer className="w-3 h-3 text-primary" />
                <span className="text-xs text-primary font-medium">In Progress</span>
              </>
            )}
            {badge.status === 'locked' && (
              <>
                <Lock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Locked</span>
              </>
            )}
          </div>

          {/* Tier Indicator */}
          <Badge 
            variant="outline" 
            className={cn("text-xs mt-2 capitalize", getTierColor(badge.tier))}
          >
            {badge.tier}
          </Badge>
        </div>
      ) : (
        <div className="h-full flex flex-col justify-between text-center p-2">
          <div>
            <h3 className="font-semibold text-sm mb-2">{badge.title}</h3>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{badge.description}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3 text-secondary" />
              <span className="text-xs text-secondary font-medium">{badge.xpReward} XP</span>
            </div>
            
            {badge.unlockedDate && (
              <p className="text-xs text-success">Earned {badge.unlockedDate}</p>
            )}
            
            <div className="text-xs text-muted-foreground">
              Tap to flip back
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Badges;