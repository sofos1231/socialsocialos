import React from 'react';
import { Download, LogOut, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountManagementSectionProps {
  className?: string;
  style?: React.CSSProperties;
}

const AccountManagementSection: React.FC<AccountManagementSectionProps> = ({ className, style }) => {
  const handleExportData = () => {
    console.log('Export data clicked');
  };

  const handleSignOut = () => {
    console.log('Sign out clicked');
  };

  const handleDeleteAccount = () => {
    console.log('Delete account clicked');
  };

  return (
    <div className={cn("card-section border-destructive/20", className)} style={style}>
      <h3 className="heading-section text-xl mb-6 text-destructive">Account Management</h3>
      
      <div className="space-y-3">
        {/* Export Data */}
        <button 
          onClick={handleExportData}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 transition-all duration-200 hover:bg-card/70 text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Download className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <p className="text-label">Export My Data</p>
            <p className="text-caption">Download your practice history</p>
          </div>
        </button>

        {/* Sign Out */}
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 transition-all duration-200 hover:bg-destructive/10 hover:border-destructive/30 text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-label text-destructive">Sign Out</p>
            <p className="text-caption">Sign out of your account</p>
          </div>
        </button>

        {/* Delete Account */}
        <button 
          onClick={handleDeleteAccount}
          className="w-full flex items-center gap-3 p-3 rounded-lg bg-card/30 border border-border/30 transition-all duration-200 hover:bg-destructive/5 hover:border-destructive/20 text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Trash2 className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium text-destructive">Delete Account</p>
            <p className="text-xs text-muted-foreground">This will permanently delete your account and data</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default AccountManagementSection;