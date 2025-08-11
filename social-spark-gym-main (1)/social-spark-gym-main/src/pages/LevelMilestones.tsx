import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface LevelMilestone {
  level: number;
  title: string;
  description: string;
  xpRequired: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  currentXP?: number;
}

const LevelMilestones = () => {
  const navigate = useNavigate();
  
  // Mock current user data
  const currentLevel = 3;
  const currentXP = 2890;
  
  const milestones: LevelMilestone[] = [
    { level: 1, title: 'Social Starter', description: 'Your first steps into confidence', xpRequired: 100, isUnlocked: true, isCompleted: true },
    { level: 5, title: 'Confident Explorer', description: 'Building your conversation foundations', xpRequired: 500, isUnlocked: true, isCompleted: true },
    { level: 10, title: 'Magnetic Talker', description: 'Natural charm in every interaction', xpRequired: 1200, isUnlocked: true, isCompleted: true },
    { level: 15, title: 'Charisma Champion', description: 'Command attention with authentic presence', xpRequired: 2000, isUnlocked: true, isCompleted: false, currentXP: 2890 },
    { level: 20, title: 'Master Communicator', description: 'Effortless connection with anyone', xpRequired: 3200, isUnlocked: true, isCompleted: false },
    { level: 25, title: 'Influence Artist', description: 'Inspire and motivate others naturally', xpRequired: 5000, isUnlocked: false, isCompleted: false },
    { level: 30, title: 'Confidence King', description: 'Unshakeable self-assurance', xpRequired: 7500, isUnlocked: false, isCompleted: false },
    { level: 40, title: 'Social Virtuoso', description: 'Master of every social situation', xpRequired: 12000, isUnlocked: false, isCompleted: false },
    { level: 50, title: 'Legendary Leader', description: 'Command respect and admiration', xpRequired: 20000, isUnlocked: false, isCompleted: false },
    { level: 75, title: 'Charisma Grandmaster', description: 'Peak human social potential', xpRequired: 35000, isUnlocked: false, isCompleted: false },
    { level: 100, title: 'Social Transcendent', description: 'You have achieved social mastery', xpRequired: 60000, isUnlocked: false, isCompleted: false },
  ];

  const calculateProgress = (milestone: LevelMilestone) => {
    if (milestone.isCompleted) return 100;
    if (!milestone.isUnlocked) return 0;
    
    const previousMilestone = milestones.find(m => m.level < milestone.level && m.isCompleted);
    const baseXP = previousMilestone?.xpRequired || 0;
    const progressXP = currentXP - baseXP;
    const requiredXP = milestone.xpRequired - baseXP;
    
    return Math.min(100, Math.max(0, (progressXP / requiredXP) * 100));
  };

  const getMilestoneIcon = (milestone: LevelMilestone) => {
    if (milestone.isCompleted) {
      return <CheckCircle className="w-8 h-8 text-success" />;
    }
    if (!milestone.isUnlocked) {
      return <Lock className="w-8 h-8 text-muted-foreground" />;
    }
    return <Star className="w-8 h-8 text-warning animate-pulse-glow" />;
  };

  return (
    <div 
      className="min-h-screen pb-20 pt-24"
      style={{ 
        background: 'linear-gradient(135deg, #0f1323 0%, #1a1a2e 50%, #16213e 100%)' 
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-gradient-intense">
              Level Milestones
            </h1>
            <p className="text-sm text-muted-foreground">
              Your journey to social mastery
            </p>
          </div>
        </div>
      </div>

      {/* Current Level Banner */}
      <div className="px-4 py-6">
        <div className="card-warm p-6 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-warning flex items-center justify-center text-2xl font-bold text-white shadow-glow">
              {currentLevel}
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">
                Level {currentLevel}
              </h2>
              <p className="text-muted-foreground">Current Level</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to next milestone</span>
              <span className="text-foreground font-medium">{currentXP} XP</span>
            </div>
            <Progress value={calculateProgress(milestones.find(m => !m.isCompleted) || milestones[0])} className="h-3" />
          </div>
          
          {/* Decorative glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-warning/20 rounded-full blur-3xl" />
        </div>
      </div>

      {/* Milestones List */}
      <div className="px-4 space-y-4">
        {milestones.map((milestone, index) => {
          const progress = calculateProgress(milestone);
          const isCurrentTarget = !milestone.isCompleted && milestone.isUnlocked;
          
          return (
            <div
              key={milestone.level}
              className={`
                relative group transition-all duration-500 animate-slide-up
                ${isCurrentTarget ? 'scale-105' : ''}
              `}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Connection Line */}
              {index < milestones.length - 1 && (
                <div className="absolute left-8 top-20 w-0.5 h-8 bg-gradient-to-b from-white/20 to-transparent" />
              )}
              
              <div className={`
                card-elevated p-6 relative overflow-hidden
                ${milestone.isCompleted ? 'bg-success/5 border-success/20' : ''}
                ${isCurrentTarget ? 'bg-warning/5 border-warning/20 shadow-glow' : ''}
                ${!milestone.isUnlocked ? 'opacity-60' : ''}
              `}>
                <div className="flex items-start gap-4">
                  {/* Level Icon */}
                  <div className={`
                    flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center relative
                    ${milestone.isCompleted ? 'bg-gradient-success' : ''}
                    ${isCurrentTarget ? 'bg-gradient-warning' : ''}
                    ${!milestone.isUnlocked ? 'bg-muted' : ''}
                  `}>
                    {milestone.isCompleted || isCurrentTarget ? (
                      <span className="text-2xl font-bold text-white">{milestone.level}</span>
                    ) : !milestone.isUnlocked ? (
                      <Lock className="w-8 h-8 text-muted-foreground" />
                    ) : (
                      <span className="text-2xl font-bold text-foreground">{milestone.level}</span>
                    )}
                    
                    {/* Status Icon Overlay */}
                    {milestone.isCompleted && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-display font-bold text-foreground">
                        {milestone.title}
                      </h3>
                      {isCurrentTarget && (
                        <div className="px-2 py-1 bg-warning/20 rounded-full">
                          <span className="text-xs font-medium text-warning">IN PROGRESS</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {milestone.description}
                    </p>

                    {/* XP Requirement */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>Required XP: {milestone.xpRequired.toLocaleString()}</span>
                      {!milestone.isCompleted && milestone.isUnlocked && (
                        <span>{Math.round(progress)}% complete</span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {!milestone.isCompleted && milestone.isUnlocked && (
                      <Progress 
                        value={progress} 
                        className={`h-2 ${isCurrentTarget ? 'animate-pulse-glow' : ''}`}
                      />
                    )}
                  </div>
                </div>

                {/* Glow Effect for Current Target */}
                {isCurrentTarget && (
                  <div className="absolute inset-0 bg-gradient-warning rounded-xl opacity-5 pointer-events-none" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Motivational Footer */}
      <div className="px-4 py-8">
        <div className="card-warm p-6 text-center">
          <h3 className="text-lg font-display font-bold text-gradient-xp mb-2">
            Every level unlocks new potential! 🚀
          </h3>
          <p className="text-sm text-muted-foreground">
            Keep practicing to reach your next milestone
          </p>
        </div>
      </div>
    </div>
  );
};

export default LevelMilestones;