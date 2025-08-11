import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Zap, Play, Diamond, Flame, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

interface MissionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  mission: Mission | null;
  onStartMission: (mission: Mission) => void;
}

const MissionPopup = ({ isOpen, onClose, mission, onStartMission }: MissionPopupProps) => {
  if (!mission) return null;

  const getMissionIcon = () => {
    if (mission.status === 'completed') return <CheckCircle className="w-8 h-8 text-green-400" />;
    if (mission.type === 'boss') return <Flame className="w-8 h-8 text-orange-400" />;
    if (mission.type === 'premium') return <Diamond className="w-8 h-8 text-purple-400" />;
    if (mission.type === 'video') return <Play className="w-8 h-8 text-blue-400" />;
    return <Star className="w-8 h-8 text-yellow-400" />;
  };

  const getDifficultyColor = () => {
    switch (mission.difficulty) {
      case 'easy': return 'bg-green-500/20 text-green-400 border-green-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-400';
      case 'hard': return 'bg-red-500/20 text-red-400 border-red-400';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-400';
    }
  };

  const getStatusMessage = () => {
    switch (mission.status) {
      case 'completed': return 'Mission Completed!';
      case 'current': return 'Continue Mission';
      case 'available': return 'Start Mission';
      case 'locked': return 'Mission Locked';
      default: return 'Start Mission';
    }
  };

  const canStartMission = mission.status !== 'locked';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <Card className="p-6 card-warm relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Mission Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
                  {getMissionIcon()}
                </div>
              </div>

              {/* Mission Title */}
              <h2 className="text-xl font-display font-bold text-white text-center mb-2">
                {mission.title}
              </h2>

              {/* Mission Type Badge */}
              <div className="flex justify-center mb-4">
                <Badge variant="outline" className={getDifficultyColor()}>
                  {mission.difficulty.charAt(0).toUpperCase() + mission.difficulty.slice(1)} Mission
                </Badge>
              </div>

              {/* Mission Description */}
              <p className="text-slate-300 text-center mb-6 leading-relaxed">
                {mission.description}
              </p>

              {/* Mission Details */}
              <div className="flex items-center justify-between mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{mission.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-yellow-400">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium">{mission.xpReward} XP</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {canStartMission ? (
                  <Button
                    onClick={() => onStartMission(mission)}
                    className="w-full"
                    variant={mission.status === 'completed' ? 'outline' : 'default'}
                  >
                    {getStatusMessage()}
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    Complete previous missions to unlock
                  </Button>
                )}

                {mission.type === 'premium' && mission.status === 'locked' && (
                  <Button variant="outline" className="w-full border-purple-400 text-purple-400 hover:bg-purple-400/10">
                    <Diamond className="w-4 h-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MissionPopup;