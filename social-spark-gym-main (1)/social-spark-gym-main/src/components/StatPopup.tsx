import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LucideIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface StatPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string;
  icon: LucideIcon;
  chartData?: any;
  summary: string;
  trend: string;
  aiInsight: string;
  color: string;
}

const StatPopup: React.FC<StatPopupProps> = ({
  isOpen,
  onClose,
  title,
  value,
  icon: Icon,
  summary,
  trend,
  aiInsight,
  color,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Popup */}
          <motion.div
            className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8, y: 100 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              transition: {
                type: "spring",
                damping: 20,
                stiffness: 300,
                mass: 0.8
              }
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.8, 
              y: 100,
              transition: { duration: 0.2 }
            }}
          >
            <div className="w-full max-w-2xl max-h-full overflow-y-auto bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl">
              {/* Header */}
              <div className="relative p-6 border-b border-white/10">
                <motion.button
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  onClick={onClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-white" />
                </motion.button>
                
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-full bg-gradient-to-br ${color}`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <div className="text-3xl font-bold text-white mt-1">{value}</div>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Chart Placeholder */}
                <motion.div 
                  className="h-32 bg-gradient-to-r from-white/5 to-white/10 rounded-xl flex items-center justify-center border border-white/10"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="text-center">
                    <div className="text-white/60 text-sm mb-2">Interactive Chart</div>
                    <div className="w-full max-w-xs">
                      <Progress value={Math.random() * 100} className="h-3" />
                    </div>
                  </div>
                </motion.div>
                
                {/* Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
                  <p className="text-white/80 text-sm leading-relaxed">{summary}</p>
                </motion.div>
                
                {/* Weekly Trend */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-lg font-semibold text-white mb-2">Weekly Trend</h3>
                  <p className="text-white/80 text-sm">{trend}</p>
                </motion.div>
                
                {/* AI Insight */}
                <motion.div
                  className="relative p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-400/20"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="absolute -top-2 left-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                    AI Insight
                  </div>
                  <p className="text-white/90 text-sm mt-2">{aiInsight}</p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default StatPopup;