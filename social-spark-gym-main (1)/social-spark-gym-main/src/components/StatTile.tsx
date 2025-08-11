import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatTileProps {
  title: string;
  value: string;
  icon: LucideIcon;
  borderColor: string;
  glowColor: string;
  onClick: () => void;
}

const StatTile: React.FC<StatTileProps> = ({
  title,
  value,
  icon: Icon,
  borderColor,
  glowColor,
  onClick,
}) => {
  return (
    <motion.div
      className={`
        relative aspect-square rounded-xl cursor-pointer
        bg-gradient-to-br from-slate-800/80 to-slate-900/90
        border-2 ${borderColor}
        shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),_0_8px_20px_rgba(0,0,0,0.4)]
        backdrop-blur-sm
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),_0_12px_30px_rgba(0,0,0,0.5)]
        active:scale-[0.98]
        group
      `}
      onClick={onClick}
      whileHover={{ 
        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.2), 0 12px 30px rgba(0,0,0,0.5), 0 0 20px ${glowColor}`,
      }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Glass highlight */}
      <div className="absolute inset-[1px] rounded-xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
        <div className={`mb-4 p-3 rounded-full bg-gradient-to-br from-white/10 to-white/5 group-hover:from-white/20 group-hover:to-white/10 transition-all duration-300`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        
        <h3 className="text-sm font-medium text-white/90 mb-2 leading-tight">
          {title}
        </h3>
        
        <div className="text-2xl font-bold text-white">
          {value}
        </div>
      </div>
      
      {/* Hover glow effect */}
      <div 
        className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-sm`}
        style={{ 
          boxShadow: `0 0 30px ${glowColor}`,
        }}
      />
    </motion.div>
  );
};

export default StatTile;