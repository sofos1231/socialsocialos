import { CheckCircle, Lock, Target } from 'lucide-react';

interface SkillNodeProps {
  title: string;
  status: 'completed' | 'current' | 'locked';
  icon?: string;
  isLast?: boolean;
  onClick?: () => void;
}

const SkillNode = ({ title, status, icon, isLast = false, onClick }: SkillNodeProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} className="text-success-foreground" />;
      case 'current':
        return <Target size={20} className="text-primary-foreground" />;
      case 'locked':
        return <Lock size={16} className="text-muted-foreground" />;
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'completed':
        return 'skill-node-completed';
      case 'current':
        return 'skill-node-current';
      case 'locked':
        return 'skill-node-locked cursor-not-allowed';
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={status !== 'locked' ? onClick : undefined}
        className={`
          relative flex items-center justify-center w-16 h-16 transition-all duration-300
          ${getStatusClass()}
          ${status !== 'locked' ? 'hover:scale-105 active:scale-95' : ''}
        `}
        disabled={status === 'locked'}
      >
        {icon && status === 'completed' && (
          <span className="absolute -top-2 -right-2 text-lg">{icon}</span>
        )}
        {getStatusIcon()}
        
        {status === 'current' && (
          <div className="absolute inset-0 rounded-full animate-pulse-glow" />
        )}
      </button>
      
      <div className="mt-2 text-center">
        <p className={`
          text-sm font-medium
          ${status === 'locked' ? 'text-muted-foreground' : 'text-foreground'}
        `}>
          {title}
        </p>
      </div>
      
      {!isLast && (
        <div className={`
          w-0.5 h-8 mt-2 rounded-full
          ${status === 'completed' ? 'bg-success' : 'bg-border'}
        `} />
      )}
    </div>
  );
};

export default SkillNode;