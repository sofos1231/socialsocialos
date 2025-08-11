import React from 'react';
import { Crown, Lock, Zap, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubscriptionStatusSectionProps {
  className?: string;
  style?: React.CSSProperties;
}

const SubscriptionStatusSection: React.FC<SubscriptionStatusSectionProps> = ({ className, style }) => {
  const userSubscription = {
    plan: "Free",
    isPremium: false
  };

  const premiumFeatures = [
    {
      icon: Zap,
      title: "Premium Scenarios",
      description: "Access 10 exclusive practice scenarios"
    },
    {
      icon: Brain,
      title: "AI Coach Feedback",
      description: "Enhanced feedback for sessions"
    }
  ];

  const handleUpgrade = () => {
    console.log('Upgrade clicked');
  };

  const handleManageSubscription = () => {
    console.log('Manage subscription clicked');
  };

  return (
    <div className={cn("card-section relative overflow-hidden", className)} style={style}>
      {/* Premium glow border */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary-glow/5 opacity-60" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-secondary flex items-center justify-center shadow-glow-secondary">
              <Crown className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="heading-card">Subscription</h3>
              <p className="text-caption">
                Plan: <span className="text-subtitle font-semibold">{userSubscription.plan}</span>
              </p>
            </div>
          </div>
          
          {!userSubscription.isPremium ? (
            <Button 
              onClick={handleUpgrade}
              className="btn-tier-2 shadow-glow-secondary"
            >
              Upgrade
            </Button>
          ) : (
            <Button 
              onClick={handleManageSubscription}
              variant="outline"
              size="sm"
            >
              Manage
            </Button>
          )}
        </div>

        {/* Premium Features Preview */}
        {!userSubscription.isPremium && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground mb-3">Premium Features:</p>
            {premiumFeatures.map((feature, index) => (
              <div 
                key={feature.title}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-muted/30"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    <feature.icon className="w-4 h-4 inline mr-2" />
                    {feature.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
                <span className="text-xs text-secondary font-medium px-2 py-1 rounded bg-secondary/10">
                  Premium
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Decorative sparkle effect */}
      <div className="absolute top-4 right-4 w-6 h-6 bg-secondary/20 rounded-full blur-lg opacity-60" />
      <div className="absolute bottom-6 left-6 w-4 h-4 bg-secondary/30 rounded-full blur-md opacity-40" />
    </div>
  );
};

export default SubscriptionStatusSection;