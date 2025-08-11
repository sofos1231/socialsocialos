import { Lock, Crown, Sparkles } from 'lucide-react';

interface LockedEffectCardProps {
  title: string;
  description: string;
  previewImage?: string;
  unlockCost: number;
  unlockCurrency: 'coins' | 'diamonds' | 'premium';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  onClick?: () => void;
}

const LockedEffectCard = ({ 
  title, 
  description, 
  previewImage, 
  unlockCost, 
  unlockCurrency,
  rarity,
  onClick 
}: LockedEffectCardProps) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-400 to-gray-600';
      case 'rare': return 'from-blue-400 to-blue-600';
      case 'epic': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-orange-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getCurrencyIcon = () => {
    switch (unlockCurrency) {
      case 'coins': return '🪙';
      case 'diamonds': return '💎';
      case 'premium': return '👑';
      default: return '🪙';
    }
  };

  const getCurrencyColor = () => {
    switch (unlockCurrency) {
      case 'coins': return 'text-yellow-400';
      case 'diamonds': return 'text-blue-400';
      case 'premium': return 'text-purple-400';
      default: return 'text-yellow-400';
    }
  };

  return (
    <div 
      className="relative overflow-hidden rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-105 group"
      onClick={onClick}
    >
      {/* Rarity border glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getRarityColor(rarity)} opacity-20 rounded-xl`} />
      <div className={`absolute inset-0 border-2 border-gradient-to-br ${getRarityColor(rarity)} opacity-50 rounded-xl`} />
      
      {/* Card background */}
      <div className="absolute inset-0 bg-card/80 backdrop-blur-sm rounded-xl" />
      
      {/* Lock overlay */}
      <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center opacity-80 group-hover:opacity-70 transition-opacity">
        <div className="text-center">
          <Lock size={32} className="text-white mx-auto mb-2 animate-pulse" />
          <div className="text-white font-bold text-sm">LOCKED</div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Preview area */}
        <div className="aspect-square mb-3 rounded-lg bg-gradient-to-br from-muted/50 to-card/50 flex items-center justify-center relative overflow-hidden">
          {previewImage ? (
            <img 
              src={previewImage} 
              alt={title}
              className="w-full h-full object-cover opacity-40"
            />
          ) : (
            <div className="text-4xl opacity-40">
              {rarity === 'legendary' ? '✨' : rarity === 'epic' ? '🌟' : rarity === 'rare' ? '⭐' : '🔮'}
            </div>
          )}
          
          {/* Rarity indicator */}
          <div className={`absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-to-br ${getRarityColor(rarity)} flex items-center justify-center`}>
            {rarity === 'legendary' && <Crown size={14} className="text-white" />}
            {rarity === 'epic' && <Sparkles size={14} className="text-white" />}
            {rarity === 'rare' && <span className="text-white text-xs">R</span>}
            {rarity === 'common' && <span className="text-white text-xs">C</span>}
          </div>
        </div>

        {/* Title & Description */}
        <h4 className="font-bold text-sm mb-1 text-foreground group-hover:text-white transition-colors">
          {title}
        </h4>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed group-hover:text-gray-300 transition-colors">
          {description}
        </p>

        {/* Unlock cost */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-lg">{getCurrencyIcon()}</span>
            <span className={`text-sm font-bold ${getCurrencyColor()}`}>
              {unlockCurrency === 'premium' ? 'Premium' : unlockCost}
            </span>
          </div>
          
          {unlockCurrency === 'premium' && (
            <div className="text-xs text-purple-400 font-medium">
              VIP Only
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LockedEffectCard;