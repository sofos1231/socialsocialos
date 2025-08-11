import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const usePageTransition = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTransitionPage, setCurrentTransitionPage] = useState<string>('');
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const location = useLocation();
  
  const pageOrder = ['/', '/stats', '/shop', '/profile'];
  const pageNames = {
    '/': 'Practice',
    '/stats': 'Stats', 
    '/shop': 'Shop',
    '/profile': 'Profile'
  };
  
  useEffect(() => {
    const currentIndex = pageOrder.indexOf(location.pathname);
    const prevPath = sessionStorage.getItem('prevPath') || '/';
    const prevIndex = pageOrder.indexOf(prevPath);
    
    // Skip transition if it's the same page or initial load
    if (currentIndex === prevIndex || !sessionStorage.getItem('prevPath')) {
      sessionStorage.setItem('prevPath', location.pathname);
      return;
    }
    
    // Determine direction and intermediate pages
    const isForward = currentIndex > prevIndex;
    setDirection(isForward ? 'right' : 'left');
    
    // Calculate pages to show during transition
    const startIndex = Math.min(prevIndex, currentIndex);
    const endIndex = Math.max(prevIndex, currentIndex);
    const pagesToShow = pageOrder.slice(startIndex, endIndex + 1);
    
    if (!isForward) {
      pagesToShow.reverse();
    }
    
    setIsTransitioning(true);
    
    // Animate through each intermediate page
    let currentPageIndex = 0;
    const animatePages = () => {
      if (currentPageIndex < pagesToShow.length) {
        setCurrentTransitionPage(pagesToShow[currentPageIndex]);
        currentPageIndex++;
        
        // Show each intermediate page for 150ms, final page for longer
        const delay = currentPageIndex === pagesToShow.length ? 250 : 150;
        setTimeout(animatePages, delay);
      } else {
        // Transition complete
        setIsTransitioning(false);
        setCurrentTransitionPage('');
      }
    };
    
    animatePages();
    
    // Store current path for next navigation
    sessionStorage.setItem('prevPath', location.pathname);
  }, [location.pathname]);
  
  return { 
    isTransitioning, 
    direction, 
    currentTransitionPage: currentTransitionPage || location.pathname,
    pageNames 
  };
};