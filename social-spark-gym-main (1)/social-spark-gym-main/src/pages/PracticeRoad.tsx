import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Lock, 
  CheckCircle, 
  Play, 
  Flame, 
  Diamond,
  Star,
  Users,
  Heart,
  Briefcase,
  Sparkles
} from 'lucide-react';
import MissionPopup from '@/components/MissionPopup';
import WavyRoadmapPath from '@/components/WavyRoadmapPath';
import MissionBubble from '@/components/MissionBubble';
import ProgressTopBar from '@/components/ProgressTopBar';
import AnimatedConnectorTrail from '@/components/AnimatedConnectorTrail';
import RewardPopup from '@/components/RewardPopup';

interface Mission {
  id: number;
  title: string;
  description: string;
  type: 'chat' | 'video' | 'boss' | 'premium';
  duration: string;
  xpReward: number;
  status: 'locked' | 'available' | 'completed' | 'current';
  difficulty: 'easy' | 'medium' | 'hard';
}

const PracticeRoad = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [showMissionPopup, setShowMissionPopup] = useState(false);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardData, setRewardData] = useState<{ xp: number; title: string } | null>(null);

  // Get mission data based on category
  const getMissionData = () => {
    switch (category) {
      case 'dating':
        return {
          title: 'Dating & Romance',
          chapterNumber: 1,
          icon: Heart,
          color: 'from-pink-500 to-red-500',
          missions: [
            {
              id: 1,
              title: "Flirty Hello",
              description: "Master the art of an engaging first impression",
              type: 'chat' as const,
              duration: '3 min',
              xpReward: 50,
              status: 'completed' as const,
              difficulty: 'easy' as const
            },
            {
              id: 2,
              title: "Playful Disagreement",
              description: "Navigate disagreements with charm and wit",
              type: 'chat' as const,
              duration: '4 min',
              xpReward: 75,
              status: 'completed' as const,
              difficulty: 'easy' as const
            },
            {
              id: 3,
              title: "Reading the Room",
              description: "Pick up on subtle social cues and respond appropriately",
              type: 'chat' as const,
              duration: '5 min',
              xpReward: 100,
              status: 'completed' as const,
              difficulty: 'medium' as const
            },
            {
              id: 4,
              title: "Storytelling Magic",
              description: "Captivate with engaging personal anecdotes",
              type: 'chat' as const,
              duration: '6 min',
              xpReward: 125,
              status: 'current' as const,
              difficulty: 'medium' as const
            },
            {
              id: 5,
              title: "Confident Compliments",
              description: "Give genuine compliments that create connection",
              type: 'chat' as const,
              duration: '4 min',
              xpReward: 100,
              status: 'available' as const,
              difficulty: 'medium' as const
            },
            {
              id: 6,
              title: "Handling Awkward Silence",
              description: "Turn uncomfortable pauses into opportunities",
              type: 'chat' as const,
              duration: '5 min',
              xpReward: 150,
              status: 'locked' as const,
              difficulty: 'hard' as const
            },
            {
              id: 7,
              title: "Teasing & Banter",
              description: "Master playful conversation dynamics",
              type: 'premium' as const,
              duration: '7 min',
              xpReward: 200,
              status: 'locked' as const,
              difficulty: 'hard' as const
            },
            {
              id: 8,
              title: "Deep Connection",
              description: "Move beyond surface-level conversation",
              type: 'chat' as const,
              duration: '8 min',
              xpReward: 175,
              status: 'locked' as const,
              difficulty: 'hard' as const
            },
            {
              id: 9,
              title: "The Perfect Exit",
              description: "End conversations memorably and gracefully",
              type: 'chat' as const,
              duration: '4 min',
              xpReward: 125,
              status: 'locked' as const,
              difficulty: 'medium' as const
            },
            {
              id: 10,
              title: "Video: Convince Her You're Not Boring",
              description: "Put it all together in a real conversation challenge",
              type: 'boss' as const,
              duration: '3 min',
              xpReward: 300,
              status: 'locked' as const,
              difficulty: 'hard' as const
            }
          ]
        };
      case 'interview':
        return {
          title: 'Job Interviews',
          chapterNumber: 2,
          icon: Briefcase,
          color: 'from-blue-500 to-indigo-500',
          missions: [
            {
              id: 11,
              title: "Perfect Introduction",
              description: "Make a strong first impression in interviews",
              type: 'chat' as const,
              duration: '4 min',
              xpReward: 60,
              status: 'available' as const,
              difficulty: 'easy' as const
            },
            {
              id: 12,
              title: "Answering Tough Questions",
              description: "Handle challenging interview questions with confidence",
              type: 'chat' as const,
              duration: '6 min',
              xpReward: 100,
              status: 'locked' as const,
              difficulty: 'medium' as const
            },
            {
              id: 13,
              title: "Salary Negotiation",
              description: "Get the compensation you deserve",
              type: 'premium' as const,
              duration: '8 min',
              xpReward: 200,
              status: 'locked' as const,
              difficulty: 'hard' as const
            }
          ]
        };
      case 'charisma':
        return {
          title: 'Charisma & Social Skills',
          chapterNumber: 3,
          icon: Sparkles,
          color: 'from-purple-500 to-pink-500',
          missions: [
            {
              id: 21,
              title: "Commanding Presence",
              description: "Enter any room with confidence and authority",
              type: 'chat' as const,
              duration: '5 min',
              xpReward: 75,
              status: 'available' as const,
              difficulty: 'medium' as const
            },
            {
              id: 22,
              title: "Leading Conversations",
              description: "Guide group discussions naturally",
              type: 'chat' as const,
              duration: '7 min',
              xpReward: 125,
              status: 'locked' as const,
              difficulty: 'hard' as const
            }
          ]
        };
      default:
        return {
          title: 'Practice Road',
          chapterNumber: 1,
          icon: Users,
          color: 'from-slate-500 to-slate-600',
          missions: []
        };
    }
  };

  const { title, chapterNumber, icon: CategoryIcon, color, missions } = getMissionData();

  const completedMissions = missions.filter(m => m.status === 'completed').length;
  const totalMissions = missions.length;
  const progressPercentage = (completedMissions / totalMissions) * 100;

  const getMissionIcon = (mission: Mission) => {
    if (mission.status === 'completed') return CheckCircle;
    if (mission.status === 'locked') return Lock;
    if (mission.type === 'boss') return Flame;
    if (mission.type === 'premium') return Diamond;
    if (mission.type === 'video') return Play;
    return Star;
  };

  const getMissionNodeStyle = (mission: Mission) => {
    const baseClasses = "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-lg transform hover:scale-105";
    
    if (mission.status === 'completed') {
      return `${baseClasses} bg-gradient-to-br from-green-400 to-green-600 shadow-green-400/30`;
    }
    if (mission.status === 'current') {
      return `${baseClasses} bg-gradient-to-br ${color} shadow-primary/40 animate-pulse`;
    }
    if (mission.status === 'available') {
      return `${baseClasses} bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-500/30 hover:shadow-primary/30`;
    }
    if (mission.type === 'boss') {
      return `${baseClasses} bg-gradient-to-br from-orange-400 to-red-500 shadow-orange-400/40`;
    }
    if (mission.type === 'premium') {
      return `${baseClasses} bg-gradient-to-br from-purple-400 to-pink-500 shadow-purple-400/40`;
    }
    return `${baseClasses} bg-gradient-to-br from-slate-700 to-slate-800 shadow-slate-600/20`;
  };

  const getPathStyle = (fromMission: Mission, toMission: Mission) => {
    if (fromMission.status === 'completed' && toMission.status === 'completed') {
      return "bg-gradient-to-r from-green-400 to-green-400";
    }
    if (fromMission.status === 'completed' && toMission.status === 'current') {
      return "bg-gradient-to-r from-green-400 to-primary";
    }
    if (fromMission.status === 'completed') {
      return "bg-gradient-to-r from-green-400 to-slate-600";
    }
    return "bg-slate-600";
  };

  const handleMissionClick = (mission: Mission) => {
    setSelectedMission(mission);
    setShowMissionPopup(true);
  };

  const handleStartMission = (mission: Mission) => {
    setShowMissionPopup(false);
    
    setTimeout(() => {
      if (mission.type === 'premium') {
        navigate('/upgrade');
      } else {
        navigate(`/practice/${mission.id}`);
      }
    }, 150);
  };

  const generateWavyPositions = () => {
    const centerX = 50; // Center percentage
    const amplitude = 25; // Wave amplitude
    const frequency = 0.7; // Wave frequency
    const stepY = 140; // Vertical spacing
    
    return missions.map((_, index) => {
      const y = index * stepY + 100;
      const waveOffset = Math.sin(index * frequency) * amplitude;
      const x = centerX + waveOffset;
      return { x, y };
    });
  };

  const positions = generateWavyPositions();

  const totalXP = missions.reduce((sum, m) => m.status === 'completed' ? sum + m.xpReward : sum, 0);
  const totalHeight = positions[positions.length - 1]?.y + 200 || 600;

  const handleMissionTap = (mission: Mission) => {
    setSelectedMission(mission);
    setShowMissionPopup(true);
  };

  const handleMissionComplete = (mission: Mission) => {
    setRewardData({ xp: mission.xpReward, title: mission.title });
    setShowRewardPopup(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Progress Top Bar */}
      <ProgressTopBar
        title={title}
        chapterNumber={chapterNumber}
        completedMissions={completedMissions}
        totalMissions={totalMissions}
        totalXP={totalXP}
        icon={CategoryIcon}
        onBack={() => navigate('/practice')}
      />

      {/* Scrollable Mission Road */}
      <div className="pt-40 pb-20">
        <div 
          className="relative w-full max-w-md mx-auto px-4"
          style={{ height: `${totalHeight}px` }}
        >
          {/* Wavy Path Background */}
          <WavyRoadmapPath 
            missionCount={missions.length}
            className="absolute inset-0"
          />
          
          {/* Animated Connector Trails */}
          <AnimatedConnectorTrail
            missions={missions}
            pathPoints={positions}
            className="absolute inset-0"
          />

          {/* Mission Bubbles */}
          {missions.map((mission, index) => {
            const MissionIcon = getMissionIcon(mission);
            const isNewlyUnlocked = mission.status === 'available' && index > 0 && missions[index - 1].status === 'completed';
            const hasStreakBonus = completedMissions >= 3 && mission.status === 'current';
            
            return (
              <MissionBubble
                key={mission.id}
                mission={mission}
                icon={MissionIcon}
                position={positions[index]}
                onTap={handleMissionTap}
                showNewTag={isNewlyUnlocked}
                streakBonus={hasStreakBonus}
              />
            );
          })}
        </div>

        {/* Chapter Complete Celebration */}
        {progressPercentage === 100 && (
          <div className="mt-8 mx-4 p-6 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-2xl text-center animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <span className="text-2xl">🏆</span>
            </div>
            <h3 className="text-xl font-display font-bold text-foreground mb-2">
              Chapter Complete! 🎉
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              You've mastered the fundamentals of {title.toLowerCase()}. Ready for the next adventure?
            </p>
            <div className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 rounded-xl text-primary-foreground font-semibold cursor-pointer hover:scale-105 transition-transform">
              Continue to Chapter {chapterNumber + 1}
            </div>
          </div>
        )}
      </div>

      {/* Mission Popup */}
      <MissionPopup
        isOpen={showMissionPopup}
        onClose={() => setShowMissionPopup(false)}
        mission={selectedMission}
        onStartMission={handleStartMission}
      />

      {/* Reward Popup */}
      <RewardPopup
        isOpen={showRewardPopup}
        onClose={() => setShowRewardPopup(false)}
        xpGained={rewardData?.xp || 0}
        missionTitle={rewardData?.title || ''}
        streakBonus={completedMissions >= 3 ? 25 : 0}
      />
    </div>
  );
};

export default PracticeRoad;