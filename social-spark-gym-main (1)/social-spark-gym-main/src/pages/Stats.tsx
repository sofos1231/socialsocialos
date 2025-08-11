import { useState } from 'react';
import { 
  Trophy, 
  MessageCircle, 
  Zap, 
  Heart, 
  BarChart3, 
  Brain,
  Lock,
  Mic,
  Sparkles,
  Eye,
  Volume2,
} from 'lucide-react';
import StatTile from '../components/StatTile';
import StatPopup from '../components/StatPopup';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const Stats = () => {
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const statTiles = [
    {
      id: 'confidence',
      title: 'Confidence',
      value: '92%',
      icon: Trophy,
      borderColor: 'border-yellow-400/40',
      glowColor: 'rgba(251, 191, 36, 0.4)',
      color: 'from-yellow-400/20 to-yellow-600/20',
      summary: 'Your confidence level has been consistently high this week, with strong vocal projection and assertive language patterns.',
      trend: 'Confidence peaked during afternoon meetings (↑8% vs morning sessions)',
      aiInsight: 'You tend to sound most confident when discussing technical topics. Try bringing this energy to casual conversations too!'
    },
    {
      id: 'filler-words',
      title: 'Filler Words',
      value: '4/min',
      icon: MessageCircle,
      borderColor: 'border-orange-400/40',
      glowColor: 'rgba(251, 146, 60, 0.4)',
      color: 'from-orange-400/20 to-red-600/20',
      summary: 'You say "um" and "like" about 4 times per minute, which is slightly above the ideal range of 2-3 per minute.',
      trend: 'Filler word usage decreased by 15% compared to last week (↓1 filler/min)',
      aiInsight: 'You tend to say "like" 90 times per session. Try pausing instead of filling silence - it actually makes you sound more authoritative!'
    },
    {
      id: 'energy',
      title: 'Energy Level',
      value: 'High',
      icon: Zap,
      borderColor: 'border-teal-400/40',
      glowColor: 'rgba(45, 212, 191, 0.4)',
      color: 'from-teal-400/20 to-teal-600/20',
      summary: 'Your vocal energy and enthusiasm are consistently high, making you engaging and dynamic in conversations.',
      trend: 'Energy levels peak around 2-4 PM, with slight dips in early morning calls',
      aiInsight: 'Your energy is contagious! You bring 25% more enthusiasm to group conversations than one-on-ones.'
    },
    {
      id: 'sentiment',
      title: 'Sentiment',
      value: '85%',
      icon: Heart,
      borderColor: 'border-pink-400/40',
      glowColor: 'rgba(244, 114, 182, 0.4)',
      color: 'from-pink-400/20 to-pink-600/20',
      summary: 'Your overall sentiment is very positive, with encouraging language and supportive tone throughout conversations.',
      trend: 'Positive sentiment increased by 5% this week, especially in team meetings',
      aiInsight: 'You use 40% more positive words during collaborative sessions. Your optimism really shines in teamwork!'
    },
    {
      id: 'xp-progress',
      title: 'XP Progress',
      value: '2,840',
      icon: BarChart3,
      borderColor: 'border-purple-400/40',
      glowColor: 'rgba(147, 51, 234, 0.4)',
      color: 'from-purple-400/20 to-purple-600/20',
      summary: 'You\'ve earned 2,840 XP this week through consistent practice and achieving communication milestones.',
      trend: 'XP gain accelerated by 30% with daily practice sessions (↑650 XP vs last week)',
      aiInsight: 'You\'re on track to reach Level 15 this month! Keep up the daily practice for bonus XP multipliers.'
    },
    {
      id: 'ai-insights',
      title: 'AI Insights',
      value: '12 New',
      icon: Brain,
      borderColor: 'border-gray-400/40',
      glowColor: 'rgba(156, 163, 175, 0.4)',
      color: 'from-gray-400/20 to-gray-600/20',
      summary: 'Our AI has identified 12 new patterns in your communication style, including improved eye contact and humor usage.',
      trend: 'AI detected 3x more humor attempts this week - your wit is developing!',
      aiInsight: 'You make eye contact 60% more during storytelling. This natural instinct is a huge strength - use it more often!'
    }
  ];

  const premiumTiles = [
    {
      id: 'tone-mastery',
      title: 'Tone Mastery',
      description: 'Measures pitch control, tension, pauses, nuance',
      icon: Mic,
    },
    {
      id: 'charisma-index',
      title: 'Charisma Index',
      description: 'Based on humor, storytelling, presence',
      icon: Sparkles,
    },
    {
      id: 'body-language',
      title: 'Body Language Score',
      description: 'Based on posture, facial cues, gestures',
      icon: Eye,
    },
    {
      id: 'speaking-habits',
      title: 'Speaking Habits Scan',
      description: 'Unique patterns & quirks in your speech',
      icon: Volume2,
    }
  ];

  return (
    <div 
      className="min-h-screen pb-20 pt-24 px-4"
      style={{ 
        background: 'linear-gradient(135deg, hsl(222, 84%, 5%) 0%, hsl(220, 30%, 8%) 50%, hsl(222, 84%, 5%) 100%)'
      }}
    >
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Performance Dashboard
        </h1>
        <p className="text-lg text-white/70 max-w-2xl mx-auto">
          Your personal communication playground with AI-powered insights
        </p>
      </div>

      {/* Free Stats Grid - 2x3 */}
      <div className="max-w-5xl mx-auto mb-16">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {statTiles.map((tile, index) => (
            <StatTile
              key={tile.id}
              title={tile.title}
              value={tile.value}
              icon={tile.icon}
              borderColor={tile.borderColor}
              glowColor={tile.glowColor}
              onClick={() => setSelectedStat(tile.id)}
            />
          ))}
        </div>
      </div>

      {/* Premium Locked Section - 2x2 */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Premium Deep Insights
          </h2>
          <p className="text-white/60">
            Unlock advanced personality and communication analytics
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 md:gap-6 mb-8">
          {premiumTiles.map((tile) => (
            <div
              key={tile.id}
              onClick={() => setShowUpgradeModal(true)}
              className="group relative p-6 rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-400/5 to-purple-600/10 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:scale-105 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-400/20"
            >
              {/* Lock Icon Overlay */}
              <div className="absolute top-4 right-4">
                <Lock className="w-5 h-5 text-yellow-400" />
              </div>
              
              {/* Glow Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-400/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              
              {/* Content */}
              <div className="relative z-10">
                <tile.icon className="w-8 h-8 text-yellow-400/70 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {tile.title}
                </h3>
                <p className="text-sm text-white/60">
                  {tile.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Upgrade CTA */}
        <div className="text-center">
          <Button
            onClick={() => setShowUpgradeModal(true)}
            className="bg-gradient-to-r from-yellow-400 to-purple-600 hover:from-yellow-500 hover:to-purple-700 text-black font-semibold px-8 py-3 rounded-xl text-lg shadow-lg shadow-yellow-400/20 transition-all duration-300 hover:scale-105"
          >
            🔓 Unlock Deep Personality Stats
          </Button>
        </div>
      </div>

      {/* Free Stats Popups */}
      {statTiles.map((tile) => (
        <StatPopup
          key={`popup-${tile.id}`}
          isOpen={selectedStat === tile.id}
          onClose={() => setSelectedStat(null)}
          title={tile.title}
          value={tile.value}
          icon={tile.icon}
          summary={tile.summary}
          trend={tile.trend}
          aiInsight={tile.aiInsight}
          color={tile.color}
        />
      ))}

      {/* Premium Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-yellow-400/30 rounded-3xl p-8 max-w-md w-full relative animate-scale-in shadow-2xl shadow-yellow-400/20">
            {/* Close Button */}
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Unlock Deep Personality Stats
              </h3>
              <p className="text-white/70">
                See how your tone, charisma, and body language truly show up
              </p>
            </div>

            {/* Premium Features */}
            <div className="space-y-3 mb-6">
              {premiumTiles.map((tile) => (
                <div key={tile.id} className="flex items-center space-x-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <tile.icon className="w-5 h-5 text-yellow-400" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">{tile.title}</h4>
                    <p className="text-xs text-white/60">{tile.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Upgrade Button */}
            <Button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full bg-gradient-to-r from-yellow-400 to-purple-600 hover:from-yellow-500 hover:to-purple-700 text-black font-semibold py-4 rounded-xl text-lg shadow-lg shadow-yellow-400/20 transition-all duration-300 hover:scale-105"
            >
              Upgrade to Premium - $9.99/month
            </Button>

            {/* Additional Info */}
            <p className="text-center text-xs text-white/40 mt-4">
              Cancel anytime • 7-day free trial • Advanced AI insights
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;