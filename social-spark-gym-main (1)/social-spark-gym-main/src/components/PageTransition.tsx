import { ReactNode } from 'react';
import { usePageTransition } from '@/hooks/usePageTransition';
import PracticeHub from '@/pages/PracticeHub';
import Stats from '@/pages/Stats';
import Shop from '@/pages/Shop';
import Profile from '@/pages/Profile';

interface PageTransitionProps {
  children: ReactNode;
  currentPath: string;
}

const PageTransition = ({ children, currentPath }: PageTransitionProps) => {
  const { isTransitioning, direction, currentTransitionPage, pageNames } = usePageTransition();
  
  // Map paths to components for transition display
  const pageComponents: { [key: string]: ReactNode } = {
    '/': <PracticeHub />,
    '/stats': <Stats />,
    '/shop': <Shop />,
    '/profile': <Profile />
  };
  
  const getAnimationClass = () => {
    if (!isTransitioning) return '';
    
    return direction === 'right' 
      ? 'animate-slide-in-right' 
      : 'animate-slide-in-left';
  };
  
  // Show transition content during animation, otherwise show normal children
  const displayContent = isTransitioning && pageComponents[currentTransitionPage] 
    ? pageComponents[currentTransitionPage] 
    : children;
  
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Transition indicator */}
      {isTransitioning && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/20 backdrop-blur-sm rounded-full px-4 py-2">
          <div className="text-white text-sm font-medium">
            {pageNames[currentTransitionPage as keyof typeof pageNames]}
          </div>
        </div>
      )}
      
      <div className={`min-h-screen transition-all duration-150 ${getAnimationClass()}`}>
        {displayContent}
      </div>
    </div>
  );
};

export default PageTransition;