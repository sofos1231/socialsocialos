import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown, Zap, Target, Sparkles } from 'lucide-react';

const Upgrade = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('weekly');

  const features = [
    { icon: Target, text: "Unlimited Quick Drills" },
    { icon: Sparkles, text: "Advanced Skill Modules" },
    { icon: Zap, text: "Personalized AI Feedback" },
    { icon: Crown, text: "Priority Coach Support" },
    { text: "Real-time Progress Analytics" },
    { text: "Custom Practice Scenarios" },
    { text: "Exclusive Community Access" },
    { text: "Advanced Streak Boosters" }
  ];

  const plans = {
    weekly: { price: 24.90, period: "week", savings: null },
    monthly: { price: 79.90, period: "month", savings: "Save 20%" }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Back</span>
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4 animate-bounce-subtle">👑</div>
          <h1 className="text-2xl font-bold mb-3">
            You're one decision away from your next level
          </h1>
          <p className="text-white/70 text-lg">
            Unlock your full social potential with PRO
          </p>
        </div>

        {/* Social Proof */}
        <div className="card-elevated bg-white/5 backdrop-blur-lg border-white/10 p-4 mb-6 text-center">
          <p className="text-sm text-white/80">
            🌟 <span className="font-semibold">Most users on your level go PRO</span>
          </p>
          <p className="text-xs text-white/60 mt-1">
            Join 10,000+ members building real confidence
          </p>
        </div>

        {/* Plan Selection */}
        <div className="mb-6">
          <div className="flex gap-3 p-1 bg-white/10 rounded-xl">
            <button
              onClick={() => setSelectedPlan('weekly')}
              className={`
                flex-1 py-3 rounded-lg transition-all text-center
                ${selectedPlan === 'weekly' 
                  ? 'bg-white text-slate-900 font-semibold' 
                  : 'text-white/70 hover:text-white'
                }
              `}
            >
              <div className="font-semibold">Weekly</div>
              <div className="text-sm opacity-80">₪{plans.weekly.price}</div>
            </button>
            
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`
                flex-1 py-3 rounded-lg transition-all text-center relative
                ${selectedPlan === 'monthly' 
                  ? 'bg-white text-slate-900 font-semibold' 
                  : 'text-white/70 hover:text-white'
                }
              `}
            >
              {plans.monthly.savings && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-warning text-warning-foreground text-xs px-2 py-0.5 rounded-full">
                  {plans.monthly.savings}
                </div>
              )}
              <div className="font-semibold">Monthly</div>
              <div className="text-sm opacity-80">₪{plans.monthly.price}</div>
            </button>
          </div>
        </div>

        {/* Features List */}
        <div className="card-elevated bg-white/5 backdrop-blur-lg border-white/10 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-center">
            Everything you need to level up:
          </h3>
          
          <div className="space-y-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center flex-shrink-0">
                    <Check size={14} className="text-success-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    {Icon && <Icon size={16} className="text-white/70" />}
                    <span className="text-white/90">{feature.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing Display */}
        <div className="text-center mb-6">
          <div className="text-3xl font-bold mb-2">
            ₪{plans[selectedPlan].price}/{plans[selectedPlan].period}
          </div>
          <p className="text-white/60 text-sm">
            3-Day Free Trial • Cancel anytime • No hidden fees
          </p>
        </div>

        {/* CTA Button */}
        <button className="w-full btn-warning text-lg py-4 mb-4 animate-pulse-glow">
          Try PRO for Free
        </button>

        {/* Alternative Actions */}
        <div className="space-y-3">
          <button 
            onClick={() => navigate('/practice')}
            className="w-full bg-white/10 text-white py-3 rounded-xl font-medium hover:bg-white/20 transition-colors"
          >
            Continue with Free Version
          </button>
        </div>

        {/* Testimonial */}
        <div className="mt-8 card-elevated bg-white/5 backdrop-blur-lg border-white/10 p-4 text-center">
          <div className="text-lg mb-2">💬</div>
          <p className="text-sm text-white/80 italic mb-2">
            "SocialGym PRO changed my dating life completely. I went from awkward to confident in just 2 months!"
          </p>
          <p className="text-xs text-white/60">- Alex, PRO member</p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-white/50">
          <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;