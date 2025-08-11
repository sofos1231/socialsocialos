import { Star, TrendingUp, Crown, Zap } from 'lucide-react';

interface ImprovedBadgeProps {
  variant: 'popular' | 'best-value' | 'new' | 'limited' | 'premium';
  text?: string;
  className?: string;
}

const ImprovedBadge = ({ variant, text, className = '' }: ImprovedBadgeProps) => {
  const getBadgeConfig = () => {
    switch (variant) {
      case 'popular':
        return {
          text: text || 'Most Popular',
          icon: Star,
          className: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30',
          iconColor: 'text-yellow-300'
        };
      case 'best-value':
        return {
          text: text || 'Best Value',
          icon: TrendingUp,
          className: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30',
          iconColor: 'text-green-100'
        };
      case 'new':
        return {
          text: text || 'New',
          icon: Zap,
          className: 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30',
          iconColor: 'text-orange-100'
        };
      case 'limited':
        return {
          text: text || 'Limited Time',
          icon: Zap,
          className: 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/30 animate-pulse',
          iconColor: 'text-red-100'
        };
      case 'premium':
        return {
          text: text || 'Premium',
          icon: Crown,
          className: 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg shadow-purple-500/30',
          iconColor: 'text-yellow-300'
        };
      default:
        return {
          text: text || 'Featured',
          icon: Star,
          className: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg',
          iconColor: 'text-gray-100'
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  return (
    <div className={`
      absolute -top-3 -right-3 z-10
      inline-flex items-center gap-1.5 
      px-3 py-1.5 
      rounded-full 
      text-xs font-bold 
      transform rotate-12
      transition-all duration-200 hover:scale-110
      min-w-max
      ${config.className} 
      ${className}
    `}>
      <Icon size={12} className={config.iconColor} />
      <span className="whitespace-nowrap">{config.text}</span>
    </div>
  );
};

export default ImprovedBadge;