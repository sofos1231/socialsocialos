import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Users, Briefcase, Mic, Smile, Crown, Star, LucideIcon, Flame, Zap, Brain, Lock, ChevronDown, ChevronUp, CheckCircle, Play, Diamond, Clock, Trophy } from 'lucide-react';
import CategorySection from '@/components/CategorySection';
import JourneyFlashcards from '@/components/JourneyFlashcards';
import ProfileCard from '@/components/ProfileCard';
import WeeklyStreakChart from '@/components/WeeklyStreakChart';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Import illustrations
import eyeContactIllustration from '@/assets/eye-contact-illustration.jpg';
import handshakeIllustration from '@/assets/handshake-illustration.jpg';
import groupConversationIllustration from '@/assets/group-conversation-illustration.jpg';
import publicSpeakingIllustration from '@/assets/public-speaking-illustration.jpg';
import leadershipIllustration from '@/assets/leadership-illustration.jpg';
import humorIllustration from '@/assets/humor-illustration.jpg';

interface Mission {
  id: string;
  title: string;
  illustration: string;
  category: 'dating' | 'interview' | 'charisma' | 'speaking' | 'humor' | 'power';
  duration: string;
  xpReward: number;
  isLocked?: boolean;
  isCompleted?: boolean;
  progress?: number;
  tags?: Array<{
    type: 'trending' | 'premium' | 'quick' | 'deep' | 'new';
    label: string;
    icon: LucideIcon;
  }>;
}

interface Category {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  missions: Mission[];
}

interface ChapterMission {
  id: number;
  title: string;
  description: string;
  type: 'chat' | 'video' | 'boss' | 'premium';
  duration: string;
  xpReward: number;
  status: 'locked' | 'available' | 'completed' | 'current';
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Chapter {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  missions: ChapterMission[];
  completedMissions: number;
  totalMissions: number;
  isLocked: boolean;
}

const PracticeHub = () => {
  const navigate = useNavigate();
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  // Chapter data with mission roads
  const chapters: Chapter[] = [
    {
      id: 'dating-romance',
      title: 'Dating & Romance',
      description: 'Master romantic connection skills',
      icon: Heart,
      gradient: 'from-pink-500 to-rose-500',
      completedMissions: 3,
      totalMissions: 10,
      isLocked: false,
      missions: [
        {
          id: 1,
          title: "Flirty Hello",
          description: "Master the art of an engaging first impression",
          type: 'chat',
          duration: '3 min',
          xpReward: 50,
          status: 'completed',
          difficulty: 'easy'
        },
        {
          id: 2,
          title: "Playful Disagreement",
          description: "Navigate disagreements with charm and wit",
          type: 'chat',
          duration: '4 min',
          xpReward: 75,
          status: 'completed',
          difficulty: 'easy'
        },
        {
          id: 3,
          title: "Reading the Room",
          description: "Pick up on subtle social cues and respond appropriately",
          type: 'chat',
          duration: '5 min',
          xpReward: 100,
          status: 'completed',
          difficulty: 'medium'
        },
        {
          id: 4,
          title: "Storytelling Magic",
          description: "Captivate with engaging personal anecdotes",
          type: 'chat',
          duration: '6 min',
          xpReward: 125,
          status: 'current',
          difficulty: 'medium'
        },
        {
          id: 5,
          title: "Confident Compliments",
          description: "Give genuine compliments that create connection",
          type: 'chat',
          duration: '4 min',
          xpReward: 100,
          status: 'available',
          difficulty: 'medium'
        },
        {
          id: 6,
          title: "Handling Awkward Silence",
          description: "Turn uncomfortable pauses into opportunities",
          type: 'chat',
          duration: '5 min',
          xpReward: 150,
          status: 'locked',
          difficulty: 'hard'
        },
        {
          id: 7,
          title: "Teasing & Banter",
          description: "Master playful conversation dynamics",
          type: 'premium',
          duration: '7 min',
          xpReward: 200,
          status: 'locked',
          difficulty: 'hard'
        },
        {
          id: 8,
          title: "Deep Connection",
          description: "Move beyond surface-level conversation",
          type: 'chat',
          duration: '8 min',
          xpReward: 175,
          status: 'locked',
          difficulty: 'hard'
        },
        {
          id: 9,
          title: "The Perfect Exit",
          description: "End conversations memorably and gracefully",
          type: 'chat',
          duration: '4 min',
          xpReward: 125,
          status: 'locked',
          difficulty: 'medium'
        },
        {
          id: 10,
          title: "Video: Convince Her You're Not Boring",
          description: "Put it all together in a real conversation challenge",
          type: 'boss',
          duration: '3 min',
          xpReward: 300,
          status: 'locked',
          difficulty: 'hard'
        }
      ]
    },
    {
      id: 'job-interviews',
      title: 'Job Interviews',
      description: 'Land your dream job with confidence',
      icon: Briefcase,
      gradient: 'from-blue-500 to-indigo-500',
      completedMissions: 0,
      totalMissions: 12,
      isLocked: true,
      missions: []
    },
    {
      id: 'charisma-social',
      title: 'Charisma & Social',
      description: 'Become naturally magnetic',
      icon: Users,
      gradient: 'from-green-500 to-emerald-500',
      completedMissions: 0,
      totalMissions: 15,
      isLocked: true,
      missions: []
    }
  ];

  const categories: Category[] = [
    {
      id: 'top-picks',
      title: 'Top Picks for You',
      description: 'Personalized recommendations based on your progress',
      icon: Star,
      missions: [
        {
          id: 'eye-contact-master',
          title: 'Mastering Eye Contact',
          illustration: eyeContactIllustration,
          category: 'dating',
          duration: '2 min',
          xpReward: 25,
          progress: 65,
          tags: [
            { type: 'trending', label: 'Trending', icon: Flame },
            { type: 'quick', label: '90 sec', icon: Zap }
          ]
        },
        {
          id: 'confident-handshake',
          title: 'Confident Handshake',
          illustration: handshakeIllustration,
          category: 'interview',
          duration: '1 min',
          xpReward: 15,
          isCompleted: true,
          tags: [
            { type: 'quick', label: 'Quick Drill', icon: Zap }
          ]
        },
        {
          id: 'own-the-room',
          title: 'Own the Room',
          illustration: leadershipIllustration,
          category: 'charisma',
          duration: '5 min',
          xpReward: 40,
          tags: [
            { type: 'deep', label: 'Deep Dive', icon: Brain }
          ]
        }
      ]
    },
    {
      id: 'dating',
      title: 'Dating & Romance',
      description: 'Master the art of romantic connections',
      icon: Heart,
      missions: [
        {
          id: 'eye-contact-dating',
          title: 'Mastering Eye Contact',
          illustration: eyeContactIllustration,
          category: 'dating',
          duration: '2 min',
          xpReward: 25,
          progress: 65,
          tags: [
            { type: 'trending', label: 'Trending', icon: Flame },
            { type: 'quick', label: '90 sec', icon: Zap }
          ]
        },
        {
          id: 'push-pull-teasing',
          title: 'Push-Pull Teasing',
          illustration: humorIllustration,
          category: 'dating',
          duration: '3 min',
          xpReward: 30,
          tags: [
            { type: 'trending', label: 'Hot', icon: Flame },
            { type: 'new', label: '+20 XP', icon: Star }
          ]
        },
        {
          id: 'conversation-starters',
          title: 'Conversation Starters',
          illustration: groupConversationIllustration,
          category: 'dating',
          duration: '4 min',
          xpReward: 35,
          isLocked: true,
          tags: [
            { type: 'premium', label: 'Premium', icon: Crown }
          ]
        }
      ]
    },
    {
      id: 'interviews',
      title: 'Job Interviews',
      description: 'Ace your next career opportunity',
      icon: Briefcase,
      missions: [
        {
          id: 'confident-handshake-interview',
          title: 'Confident Handshake',
          illustration: handshakeIllustration,
          category: 'interview',
          duration: '1 min',
          xpReward: 15,
          isCompleted: true,
          tags: [
            { type: 'quick', label: 'Quick Drill', icon: Zap }
          ]
        },
        {
          id: 'tell-me-about-yourself',
          title: 'Acing "Tell Me About Yourself"',
          illustration: publicSpeakingIllustration,
          category: 'interview',
          duration: '6 min',
          xpReward: 45,
          tags: [
            { type: 'deep', label: 'Deep Dive', icon: Brain }
          ]
        },
        {
          id: 'salary-negotiation',
          title: 'Salary Negotiation',
          illustration: handshakeIllustration,
          category: 'interview',
          duration: '8 min',
          xpReward: 50,
          isLocked: true,
          tags: [
            { type: 'premium', label: 'Premium', icon: Crown },
            { type: 'deep', label: 'Advanced', icon: Brain }
          ]
        }
      ]
    },
    {
      id: 'humor',
      title: 'Humor & Comedy',
      description: 'Bring laughter and levity to any situation',
      icon: Smile,
      missions: [
        {
          id: 'witty-comebacks',
          title: 'Witty Comebacks',
          illustration: humorIllustration,
          category: 'humor',
          duration: '3 min',
          xpReward: 30,
          tags: [
            { type: 'trending', label: 'Trending', icon: Flame }
          ]
        },
        {
          id: 'timing-your-jokes',
          title: 'Timing Your Jokes',
          illustration: humorIllustration,
          category: 'humor',
          duration: '4 min',
          xpReward: 35,
          isLocked: true,
          tags: [
            { type: 'premium', label: 'Premium', icon: Crown }
          ]
        },
        {
          id: 'self-deprecating-humor',
          title: 'Self-Deprecating Humor',
          illustration: humorIllustration,
          category: 'humor',
          duration: '3 min',
          xpReward: 25,
          progress: 30,
          tags: [
            { type: 'new', label: 'New', icon: Star }
          ]
        }
      ]
    },
    {
      id: 'power-presence',
      title: 'Power & Presence',
      description: 'Command respect and attention',
      icon: Crown,
      missions: [
        {
          id: 'own-the-room-power',
          title: 'Own the Room',
          illustration: leadershipIllustration,
          category: 'power',
          duration: '5 min',
          xpReward: 40,
          tags: [
            { type: 'deep', label: 'Deep Dive', icon: Brain }
          ]
        },
        {
          id: 'commanding-voice',
          title: 'Commanding Voice Projection',
          illustration: publicSpeakingIllustration,
          category: 'power',
          duration: '4 min',
          xpReward: 35,
          tags: [
            { type: 'deep', label: 'Deep Dive', icon: Brain }
          ]
        },
        {
          id: 'executive-presence',
          title: 'Executive Presence',
          illustration: leadershipIllustration,
          category: 'power',
          duration: '7 min',
          xpReward: 50,
          isLocked: true,
          tags: [
            { type: 'premium', label: 'Premium', icon: Crown },
            { type: 'deep', label: 'Advanced', icon: Brain }
          ]
        }
      ]
    },
    {
      id: 'group-dynamics',
      title: 'Group Dynamics',
      description: 'Master group interactions and leadership',
      icon: Users,
      missions: [
        {
          id: 'team-icebreakers',
          title: 'Team Icebreakers',
          illustration: groupConversationIllustration,
          category: 'charisma',
          duration: '2 min',
          xpReward: 20,
          tags: [
            { type: 'quick', label: '90 sec', icon: Zap }
          ]
        },
        {
          id: 'navigating-group-conversations',
          title: 'Navigating Group Conversations',
          illustration: groupConversationIllustration,
          category: 'charisma',
          duration: '5 min',
          xpReward: 40,
          tags: [
            { type: 'new', label: '+15 XP Bonus', icon: Star }
          ]
        },
        {
          id: 'group-leadership',
          title: 'Group Leadership',
          illustration: leadershipIllustration,
          category: 'charisma',
          duration: '6 min',
          xpReward: 45,
          progress: 80,
          tags: [
            { type: 'deep', label: 'Deep Dive', icon: Brain }
          ]
        }
      ]
    }
  ];

  const handleMissionClick = (mission: Mission) => {
    if (!mission.isLocked) {
      // Navigate to PracticeRoad with category parameter
      navigate(`/practice-road/${mission.category}`);
    }
  };

  const handleChapterMissionClick = (mission: ChapterMission) => {
    if (mission.status === 'locked') return;
    
    if (mission.type === 'premium') {
      navigate('/upgrade');
    } else {
      navigate(`/practice/${mission.id}`);
    }
  };

  const getMissionIcon = (mission: ChapterMission) => {
    if (mission.status === 'completed') return <CheckCircle className="w-6 h-6 text-green-400" />;
    if (mission.status === 'locked') return <Lock className="w-6 h-6 text-slate-500" />;
    if (mission.type === 'boss') return <Flame className="w-6 h-6 text-orange-400" />;
    if (mission.type === 'premium') return <Diamond className="w-6 h-6 text-purple-400" />;
    if (mission.type === 'video') return <Play className="w-6 h-6 text-blue-400" />;
    return <Star className="w-6 h-6 text-yellow-400" />;
  };

  const getMissionNodeStyle = (mission: ChapterMission) => {
    const baseClasses = "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border-2 cursor-pointer";
    
    if (mission.status === 'completed') {
      return `${baseClasses} bg-green-500/20 border-green-400 shadow-lg shadow-green-400/30`;
    }
    if (mission.status === 'current') {
      return `${baseClasses} bg-primary/20 border-primary shadow-lg shadow-primary/40 animate-pulse`;
    }
    if (mission.status === 'available') {
      return `${baseClasses} bg-slate-700/50 border-slate-600 hover:border-primary hover:bg-primary/10`;
    }
    if (mission.type === 'boss') {
      return `${baseClasses} bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-400 shadow-lg shadow-orange-400/30`;
    }
    if (mission.type === 'premium') {
      return `${baseClasses} bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400 shadow-lg shadow-purple-400/30`;
    }
    return `${baseClasses} bg-slate-800/50 border-slate-700`;
  };

  const getPathStyle = (index: number, missions: ChapterMission[]) => {
    const mission = missions[index];
    if (mission.status === 'completed') {
      return "bg-gradient-to-b from-green-400 to-green-600";
    }
    if (mission.status === 'current' && index > 0) {
      return "bg-gradient-to-b from-green-400 to-primary";
    }
    return "bg-slate-700";
  };

  return (
    <div 
      className="min-h-screen pb-20 pt-4"
      style={{ background: 'var(--gradient-background)' }}
    >
      {/* Profile Card Hero */}
      <ProfileCard />

      {/* Weekly Streak Chart */}
      <WeeklyStreakChart />


      {/* Category Sections with Horizontal Carousels */}
      <div className="space-y-8">
        {categories.map((category, index) => (
          <CategorySection
            key={category.id}
            title={category.title}
            description={category.description}
            icon={category.icon}
            missions={category.missions}
            onMissionClick={handleMissionClick}
            animationDelay={index * 200}
          />
        ))}
      </div>

      {/* Stats Section */}
      <div className="section-container-sm mt-12">
        <h2 className="heading-section mb-6">Your Journey</h2>
        <JourneyFlashcards />
      </div>

      {/* Motivational Footer */}
      <div className="section-container-sm mt-8">
        <div className="card-secondary text-center animate-scale-in" style={{ animationDelay: '1000ms' }}>
          <p className="text-sm font-semibold">
            <span className="text-gradient-xp">"Every conversation is a chance to level up!"</span> 💪
          </p>
        </div>
      </div>
    </div>
  );
};

export default PracticeHub;