import { useState, useEffect } from 'react';
import { Clock, Zap, Sparkles } from 'lucide-react';
import { Button } from './ui/button';

interface LimitedOfferProps {
  title: string;
  description: string;
  originalPrice: number;
  salePrice: number;
  endTime: Date;
  icon?: React.ComponentType<any>;
}

const LimitedOffer = ({ 
  title, 
  description, 
  originalPrice, 
  salePrice, 
  endTime,
  icon: Icon = Sparkles 
}: LimitedOfferProps) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance > 0) {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeLeft({ hours, minutes, seconds });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const discount = Math.round(((originalPrice - salePrice) / originalPrice) * 100);

  return (
    <div className="relative overflow-hidden rounded-xl p-6 mb-6 animate-scale-in bg-gradient-to-br from-red-500/20 via-orange-500/20 to-yellow-500/20 border-2 border-orange-400/50 shadow-elevation backdrop-blur-sm">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_3s_ease-in-out_infinite] -skew-x-12" />
      
      {/* Fire icon animation */}
      <div className="absolute top-4 right-4">
        <div className="animate-bounce-subtle">
          🔥
        </div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 animate-pulse">
            <Icon size={24} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-orange-400 uppercase tracking-wider">
              Limited Time Offer
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-200 mb-4">{description}</p>

        {/* Pricing */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">${salePrice}</span>
            <span className="text-lg text-gray-400 line-through">${originalPrice}</span>
          </div>
          <div className="px-3 py-1 bg-green-500 text-white text-sm font-bold rounded-full">
            {discount}% OFF
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 text-orange-400">
            <Clock size={16} className="animate-pulse" />
            <span className="text-sm font-medium">Ends in:</span>
          </div>
          <div className="flex gap-2">
            <div className="bg-black/30 px-2 py-1 rounded text-white font-mono">
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
            <span className="text-white">:</span>
            <div className="bg-black/30 px-2 py-1 rounded text-white font-mono">
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <span className="text-white">:</span>
            <div className="bg-black/30 px-2 py-1 rounded text-white font-mono animate-pulse">
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Button 
          className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg"
        >
          Claim Deal Now
        </Button>
      </div>
    </div>
  );
};

export default LimitedOffer;