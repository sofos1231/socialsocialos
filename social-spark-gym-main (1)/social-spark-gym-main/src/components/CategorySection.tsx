import { LucideIcon } from 'lucide-react';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import MissionCard from './MissionCard';

interface Mission {
  id: string;
  title: string;
  illustration: string;
  category: 'dating' | 'interview' | 'charisma' | 'speaking' | 'humor' | 'power';
  duration: string;
  xpReward: number;
  isLocked?: boolean;
  isCompleted?: boolean;
  progress?: number;
  tags?: Array<{
    type: 'trending' | 'premium' | 'quick' | 'deep' | 'new';
    label: string;
    icon: LucideIcon;
  }>;
}

interface CategorySectionProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  missions: Mission[];
  onMissionClick: (mission: Mission) => void;
  animationDelay?: number;
}

const CategorySection = ({
  title,
  description,
  icon: Icon,
  missions,
  onMissionClick,
  animationDelay = 0
}: CategorySectionProps) => {
  return (
    <section 
      className="mb-8 animate-scale-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Section Header */}
      <div className="section-container-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-primary shadow-glow-primary">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="heading-section mb-1">{title}</h2>
            {description && (
              <p className="text-subtitle">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Mission Cards Carousel */}
      <div className="relative">
        <Carousel 
          className="w-full"
          opts={{
            align: "start",
            loop: false,
            dragFree: true,
          }}
        >
          <CarouselContent className="ml-4">
            {missions.map((mission, index) => (
              <CarouselItem key={mission.id} className="basis-auto pl-4">
                <div 
                  className="animate-scale-in"
                  style={{ animationDelay: `${animationDelay + (index * 100)}ms` }}
                >
                  <MissionCard
                    {...mission}
                    onClick={() => onMissionClick(mission)}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Navigation Arrows */}
          <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 border-white/20 text-white hover:bg-black/60" />
          <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/40 border-white/20 text-white hover:bg-black/60" />
        </Carousel>
        
        {/* Fade Out Indicator */}
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
    </section>
  );
};

export default CategorySection;