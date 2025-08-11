import React, { useState } from 'react';
import { Bell, Moon, Edit3, ChevronRight, Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SettingsSectionProps {
  className?: string;
  style?: React.CSSProperties;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ className, style }) => {
  const [dailyReminders, setDailyReminders] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleEditProfile = () => {
    console.log('Edit profile info clicked');
  };

  const handleNotificationPreferences = () => {
    console.log('Notification preferences clicked - Coming soon');
  };

  return (
    <div className={cn("card-section", className)} style={style}>
      <h3 className="heading-section text-xl mb-6">Settings</h3>
      
      <div className="space-y-4">
        {/* Daily Practice Reminders */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 transition-all duration-200 hover:bg-card/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-label">Daily Practice Reminders</p>
              <p className="text-caption">Receive daily practice motivation</p>
            </div>
          </div>
          <Switch
            checked={dailyReminders}
            onCheckedChange={setDailyReminders}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 transition-all duration-200 hover:bg-card/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Moon className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-label">Dark Mode</p>
              <p className="text-caption">Dark mode is currently the default theme</p>
            </div>
          </div>
          <Switch
            checked={darkMode}
            onCheckedChange={setDarkMode}
            disabled
            className="data-[state=checked]:bg-primary opacity-60"
          />
        </div>

        {/* Notification Preferences (Future) */}
        <button 
          onClick={handleNotificationPreferences}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 transition-all duration-200 hover:bg-card/70 text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-label text-muted-foreground">Notification Preferences</p>
              <p className="text-caption italic">Coming soon</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>

        {/* Edit Profile Info */}
        <button 
          onClick={handleEditProfile}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-card/50 border border-border/50 transition-all duration-200 hover:bg-card/70 text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-label">Edit Profile Info</p>
              <p className="text-caption">Manage your account details</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </div>
    </div>
  );
};

export default SettingsSection;