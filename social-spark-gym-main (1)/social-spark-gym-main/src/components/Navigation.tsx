import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, BarChart3, User, ShoppingBag } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { path: '/', icon: Home, label: 'Practice', emoji: '🏋️' },
    { path: '/stats', icon: BarChart3, label: 'Stats', emoji: '📊' },
    { path: '/shop', icon: ShoppingBag, label: 'Shop', emoji: '💰' },
    { path: '/profile', icon: User, label: 'Profile', emoji: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl">
      <div 
        className="h-20 border-t"
        style={{ 
          background: 'var(--gradient-background)',
          borderColor: 'hsl(var(--border) / 0.3)'
        }}
      >
        <div className="flex items-center justify-around h-full px-4">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 relative min-w-[60px]
                  ${isActive 
                    ? 'nav-tab-active scale-105' 
                    : 'nav-tab-inactive hover:scale-102'
                  }
                `}
              >
                {/* Active glow effect */}
                {isActive && (
                  <div 
                    className="absolute inset-0 rounded-xl blur-sm opacity-40" 
                    style={{ background: 'var(--gradient-primary)' }}
                  />
                )}
                
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 relative
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-glow-primary' 
                      : 'bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground'
                    }
                  `}>
                    <Icon size={18} className="relative z-10" />
                    {isActive && (
                      <div className="absolute -top-1 -right-1 text-sm animate-bounce-in">
                        {item.emoji}
                      </div>
                    )}
                  </div>
                  
                  <span className={`
                    text-xs transition-all duration-200
                    ${isActive ? 'font-semibold text-primary' : 'font-medium text-muted-foreground'}
                  `}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;