import React from 'react';
import { TrendingUp, Star, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MyJourneyPanelProps {
  className?: string;
  style?: React.CSSProperties;
}

const MyJourneyPanel: React.FC<MyJourneyPanelProps> = ({ className, style }) => {
  return (
    <div className={cn("card-section relative overflow-hidden", className)} style={style}>
      {/* Subtle gradient background */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-success/5 to-primary/5 opacity-50" />
      
      <div className="relative z-10 text-center">
        {/* Illustration placeholder */}
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-success/20 to-primary/20 flex items-center justify-center">
          <TrendingUp className="w-10 h-10 text-success" />
        </div>
        
        <h3 className="heading-card text-xl mb-2 text-success">My Journey</h3>
        <p className="text-subtitle mb-4">Your growth journey starts here</p>
        
        {/* Future progress placeholder */}
        <div className="flex items-center justify-center gap-2 mb-4 opacity-60">
          <div className="w-8 h-2 bg-muted/40 rounded-full" />
          <div className="w-8 h-2 bg-muted/40 rounded-full" />
          <div className="w-8 h-2 bg-muted/40 rounded-full" />
          <div className="w-8 h-2 bg-muted/40 rounded-full" />
        </div>
        
        <p className="text-caption italic">More coming soon</p>
        
        {/* Decorative elements */}
        <div className="flex items-center justify-center gap-4 mt-6 opacity-40">
          <Star className="w-4 h-4 text-success" />
          <Target className="w-4 h-4 text-primary" />
          <Star className="w-4 h-4 text-secondary" />
        </div>
      </div>
      
      {/* Decorative glow */}
      <div className="absolute -top-6 -left-6 w-16 h-16 bg-success/10 rounded-full blur-xl opacity-60" />
      <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-primary/10 rounded-full blur-lg opacity-40" />
    </div>
  );
};

export default MyJourneyPanel;