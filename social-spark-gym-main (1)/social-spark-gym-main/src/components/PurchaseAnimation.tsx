import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PurchaseAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
  currency: 'coins' | 'diamonds';
  amount: number;
}

const PurchaseAnimation = ({ isVisible, onComplete, currency, amount }: PurchaseAnimationProps) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    if (isVisible) {
      // Generate particles
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100
      }));
      setParticles(newParticles);

      // Auto complete after animation
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  const currencyIcon = currency === 'coins' ? '🪙' : '💎';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Confetti particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute text-2xl"
              initial={{
                x: `${particle.x}vw`,
                y: `${particle.y}vh`,
                scale: 0,
                rotate: 0,
              }}
              animate={{
                x: `${particle.x + (Math.random() - 0.5) * 40}vw`,
                y: `${particle.y + Math.random() * 60}vh`,
                scale: [0, 1, 0.8, 0],
                rotate: 360,
              }}
              transition={{
                duration: 2,
                ease: "easeOut",
              }}
            >
              {Math.random() > 0.5 ? '🎉' : currencyIcon}
            </motion.div>
          ))}

          {/* Central success message */}
          <motion.div
            className="bg-card/90 backdrop-blur-sm rounded-xl p-6 shadow-elevation text-center"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: "spring", damping: 15 }}
          >
            <motion.div
              className="text-4xl mb-2"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: 1 }}
            >
              🎉
            </motion.div>
            <h3 className="text-lg font-bold text-foreground mb-1">
              Purchase Successful!
            </h3>
            <div className="flex items-center justify-center gap-2 text-2xl font-bold">
              <span>{currencyIcon}</span>
              <motion.span
                className={currency === 'coins' ? 'text-yellow-500' : 'text-blue-500'}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                +{amount.toLocaleString()}
              </motion.span>
            </div>
          </motion.div>

          {/* Flying currency animation */}
          <motion.div
            className="absolute bottom-20 left-1/2 text-6xl"
            initial={{ 
              x: "-50%", 
              y: 0, 
              scale: 0,
              rotate: 0 
            }}
            animate={{ 
              x: "-50%", 
              y: "-60vh", 
              scale: [0, 1, 0.8, 0],
              rotate: 720 
            }}
            transition={{ 
              duration: 1.5, 
              ease: "easeOut",
              delay: 0.5 
            }}
          >
            {currencyIcon}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PurchaseAnimation;