import { useState } from 'react';
import { Coins, Gem, Zap, RotateCcw, Unlock, Crown, Star, Gift, Sparkles, Lock, Palette } from 'lucide-react';
import LimitedOffer from '../components/LimitedOffer';
import LockedEffectCard from '../components/LockedEffectCard';
import ImprovedBadge from '../components/ImprovedBadge';
import PurchaseAnimation from '../components/PurchaseAnimation';
import { Button } from '../components/ui/button';

const Shop = () => {
  const [currency, setCurrency] = useState({
    coins: 1250,
    diamonds: 8
  });

  const [purchaseAnimation, setPurchaseAnimation] = useState<{
    show: boolean;
    currency: 'coins' | 'diamonds';
    amount: number;
  }>({ show: false, currency: 'coins', amount: 0 });

  const powerUps = [
    {
      id: 'xp-boost',
      icon: Zap,
      title: '2x XP Boost',
      description: '24 hours of double XP gains',
      cost: 50,
      currency: 'coins' as const,
      rarity: 'common',
      gradient: 'from-yellow-400 to-orange-500'
    },
    {
      id: 'confidence-booster',
      icon: Star,
      title: 'Confidence Booster',
      description: '+15% confidence score for next session',
      cost: 75,
      currency: 'coins' as const,
      rarity: 'uncommon',
      gradient: 'from-blue-400 to-indigo-500'
    },
    {
      id: 'retry-token',
      icon: RotateCcw,
      title: 'Retry Token',
      description: 'Retry any failed practice drill',
      cost: 30,
      currency: 'coins' as const,
      rarity: 'common',
      gradient: 'from-green-400 to-emerald-500'
    },
    {
      id: 'instant-unlock',
      icon: Unlock,
      title: 'Instant Unlock',
      description: 'Unlock next skill node immediately',
      cost: 2,
      currency: 'diamonds' as const,
      rarity: 'rare',
      gradient: 'from-purple-400 to-pink-500'
    },
    {
      id: 'premium-drill',
      icon: Crown,
      title: 'Premium Scenarios',
      description: '10 exclusive practice scenarios',
      cost: 3,
      currency: 'diamonds' as const,
      rarity: 'epic',
      gradient: 'from-orange-400 to-red-500'
    },
    {
      id: 'ai-coach-boost',
      icon: Sparkles,
      title: 'AI Coach Boost',
      description: 'Enhanced feedback for 7 days',
      cost: 5,
      currency: 'diamonds' as const,
      rarity: 'legendary',
      gradient: 'from-pink-400 to-rose-500'
    }
  ];

  const coinPacks = [
    { amount: 100, price: 4.99, bonus: null, badge: null },
    { amount: 300, price: 9.99, bonus: "+50 Bonus", badge: 'popular' as const },
    { amount: 750, price: 19.99, bonus: "+150 Bonus", badge: 'best-value' as const },
    { amount: 1500, price: 34.99, bonus: "+400 Bonus", badge: null }
  ];

  const diamondPacks = [
    { amount: 5, price: 2.99, bonus: null, badge: null },
    { amount: 15, price: 7.99, bonus: "+3 Bonus", badge: 'popular' as const },
    { amount: 40, price: 14.99, bonus: "+10 Bonus", badge: 'best-value' as const },
    { amount: 100, price: 24.99, bonus: "+25 Bonus", badge: 'premium' as const }
  ];

  const visualEffects = [
    {
      id: 1,
      title: 'Sparkle Trails',
      description: 'Beautiful particle effects when completing tasks',
      unlockCost: 150,
      unlockCurrency: 'coins' as const,
      rarity: 'common' as const
    },
    {
      id: 2,
      title: 'Golden Frame',
      description: 'Exclusive golden avatar border',
      unlockCost: 5,
      unlockCurrency: 'diamonds' as const,
      rarity: 'rare' as const
    },
    {
      id: 3,
      title: 'Confidence Aura',
      description: 'Glowing confidence indicator effect',
      unlockCost: 12,
      unlockCurrency: 'diamonds' as const,
      rarity: 'epic' as const
    },
    {
      id: 4,
      title: 'Champion Crown',
      description: 'Ultimate achievement crown effect',
      unlockCost: 0,
      unlockCurrency: 'premium' as const,
      rarity: 'legendary' as const
    }
  ];

  // Limited time offer - ends in 24 hours
  const limitedOffer = {
    title: 'Double Diamond Bonus',
    description: 'Get 100% extra diamonds on all packs for a limited time!',
    originalPrice: 24.99,
    salePrice: 14.99,
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  };

  const getRarityStyle = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 shadow-gray-500/20';
      case 'uncommon': return 'border-green-300 shadow-green-500/20';
      case 'rare': return 'border-blue-300 shadow-blue-500/20';
      case 'epic': return 'border-purple-300 shadow-purple-500/20';
      case 'legendary': return 'border-yellow-300 shadow-yellow-500/20';
      default: return 'border-gray-300 shadow-gray-500/20';
    }
  };

  const canAfford = (item: typeof powerUps[0]) => {
    return item.currency === 'coins' 
      ? currency.coins >= item.cost 
      : currency.diamonds >= item.cost;
  };

  const handlePurchase = (packType: 'coins' | 'diamonds', amount: number) => {
    setPurchaseAnimation({ show: true, currency: packType, amount });
    
    // Update currency (simulate purchase)
    if (packType === 'coins') {
      setCurrency(prev => ({ ...prev, coins: prev.coins + amount }));
    } else {
      setCurrency(prev => ({ ...prev, diamonds: prev.diamonds + amount }));
    }
  };

  const handleEffectUnlock = (effect: typeof visualEffects[0]) => {
    // Handle effect unlock logic here
    console.log('Unlocking effect:', effect.title);
  };

  return (
    <div className="min-h-screen pb-20 pt-24 bg-[#121212] text-[#E0E0E0]">
      {/* Header */}
      <div className="section-mobile">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Power Shop
          </h1>
          <p className="text-lg text-[#E0E0E0]/80 font-display font-medium">
            Boost your social training with premium items
          </p>
        </div>
      </div>

      {/* Currency Balance */}
      <div className="px-4 mb-6">
        <div className="bg-[#1E1E1E] border border-[#333] rounded-xl p-6 animate-scale-in shadow-lg">
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl animate-pulse">
                <Coins size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#E0E0E0]">{currency.coins.toLocaleString()}</div>
                <div className="text-sm text-[#B0B0B0]">Coins</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-xl animate-pulse">
                <Gem size={24} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#E0E0E0]">{currency.diamonds}</div>
                <div className="text-sm text-[#B0B0B0]">Diamonds</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Limited Time Offer */}
      <div className="px-4 mb-8">
        <LimitedOffer {...limitedOffer} />
      </div>

      {/* Power-ups Grid */}
      <div className="px-4 mb-8">
        <h2 className="text-2xl font-display font-bold mb-4 text-[#E0E0E0] flex items-center gap-2">
          <Zap size={24} className="text-yellow-400" />
          Power-ups
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          {powerUps.map((powerUp, index) => {
            const Icon = powerUp.icon;
            const affordable = canAfford(powerUp);
            
            return (
              <div
                key={powerUp.id}
                className={`
                  bg-[#1E1E1E] border border-[#333] rounded-xl p-4 text-center transition-all duration-300 animate-scale-in relative overflow-hidden hover:bg-[#252525] hover:border-[#444]
                  ${affordable 
                    ? 'hover:scale-105 hover:shadow-2xl cursor-pointer hover:shadow-purple-500/20' 
                    : 'opacity-60 cursor-not-allowed'
                  }
                  ${getRarityStyle(powerUp.rarity)}
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Rarity glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${powerUp.gradient} opacity-10 rounded-xl`} />
                
                {/* Content */}
                <div className="relative z-10">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br ${powerUp.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  
                  <h3 className="font-bold text-sm mb-2 text-[#E0E0E0]">{powerUp.title}</h3>
                  <p className="text-xs text-[#B0B0B0] mb-4 leading-relaxed">
                    {powerUp.description}
                  </p>
                  
                  <div className="flex items-center justify-center gap-2">
                    {powerUp.currency === 'coins' ? (
                      <Coins size={16} className="text-yellow-500" />
                    ) : (
                      <Gem size={16} className="text-blue-500" />
                    )}
                    <span className="text-sm font-bold text-[#E0E0E0]">{powerUp.cost}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coin Packs */}
      <div className="px-4 mb-8">
        <h2 className="text-2xl font-display font-bold mb-4 text-[#E0E0E0] flex items-center gap-2">
          <Coins size={24} className="text-yellow-500" />
          Coin Packs
        </h2>
        
        <div className="space-y-4">
          {coinPacks.map((pack, index) => (
            <div
              key={index}
              onClick={() => handlePurchase('coins', pack.amount + (pack.bonus ? parseInt(pack.bonus.match(/\d+/)?.[0] || '0') : 0))}
              className="bg-[#1E1E1E] border border-[#333] rounded-xl p-4 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer animate-slide-up relative overflow-hidden hover:bg-[#252525] hover:border-yellow-400/50 hover:shadow-yellow-400/20"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {pack.badge && (
                <ImprovedBadge variant={pack.badge} />
              )}
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <Coins size={24} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-lg text-[#E0E0E0]">{pack.amount.toLocaleString()} Coins</div>
                  {pack.bonus && (
                    <div className="text-sm text-green-400 font-medium">{pack.bonus}</div>
                  )}
                </div>
              </div>
              
              <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:shadow-purple-500/30 transition-all duration-200">
                ${pack.price}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Diamond Packs */}
      <div className="px-4 mb-8">
        <h2 className="text-2xl font-display font-bold mb-4 text-[#E0E0E0] flex items-center gap-2">
          <Gem size={24} className="text-blue-500" />
          Diamond Packs
        </h2>
        
        <div className="space-y-4">
          {diamondPacks.map((pack, index) => (
            <div
              key={index}
              onClick={() => handlePurchase('diamonds', pack.amount + (pack.bonus ? parseInt(pack.bonus.match(/\d+/)?.[0] || '0') : 0))}
              className="bg-[#1E1E1E] border border-[#333] rounded-xl p-4 flex items-center justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer animate-slide-up relative overflow-hidden hover:bg-[#252525] hover:border-blue-400/50 hover:shadow-blue-400/20"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {pack.badge && (
                <ImprovedBadge variant={pack.badge} />
              )}
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center shadow-lg">
                  <Gem size={24} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-lg text-[#E0E0E0]">{pack.amount} Diamonds</div>
                  {pack.bonus && (
                    <div className="text-sm text-green-400 font-medium">{pack.bonus}</div>
                  )}
                </div>
              </div>
              
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all duration-200">
                ${pack.price}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Effects Section */}
      <div className="px-4 mb-8">
        <h2 className="text-2xl font-display font-bold mb-4 text-[#E0E0E0] flex items-center gap-2">
          <Palette size={24} className="text-purple-500" />
          Visual Effects
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          {visualEffects.map((effect, index) => (
            <LockedEffectCard
              key={effect.id}
              title={effect.title}
              description={effect.description}
              unlockCost={effect.unlockCost}
              unlockCurrency={effect.unlockCurrency}
              rarity={effect.rarity}
              onClick={() => handleEffectUnlock(effect)}
            />
          ))}
        </div>
      </div>

      {/* Footer Tip */}
      <div className="px-4 py-8">
        <div className="bg-[#1E1E1E] border border-[#333] rounded-xl p-6 text-center animate-scale-in shadow-lg" style={{animationDelay: '500ms'}}>
          <div className="text-4xl mb-3">💡</div>
          <h3 className="text-lg font-display font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent mb-2">
            Earn coins daily!
          </h3>
          <p className="text-sm text-[#B0B0B0]">
            Complete practice sessions and maintain streaks to earn free coins every day
          </p>
        </div>
      </div>

      {/* Purchase Animation */}
      <PurchaseAnimation
        isVisible={purchaseAnimation.show}
        onComplete={() => setPurchaseAnimation(prev => ({ ...prev, show: false }))}
        currency={purchaseAnimation.currency}
        amount={purchaseAnimation.amount}
      />
    </div>
  );
};

export default Shop;