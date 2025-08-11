import { Check, Flame } from 'lucide-react';

const WeeklyStreakChart = () => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const completedDays = [true, true, true, true, true, false, false]; // Example data
  const currentStreak = 5;

  return (
    <div className="section-container-sm">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {currentStreak} Day Streak
              </p>
              <p className="text-xs text-white/60">Keep it up!</p>
            </div>
          </div>
          <p className="text-xs text-white/40">This Week</p>
        </div>
        
        <div className="flex justify-between items-center gap-2">
          {days.map((day, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <div 
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  completedDays[index]
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-400 scale-110'
                    : 'bg-white/5 border-white/20 hover:border-white/40'
                }`}
              >
                {completedDays[index] && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </div>
              <span className={`text-xs ${
                completedDays[index] ? 'text-white font-medium' : 'text-white/40'
              }`}>
                {day}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeeklyStreakChart;