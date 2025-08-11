import React, { useState } from 'react';
import { Edit3, Share2, User, Mail, Camera, Check, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface UserProfileCardProps {
  className?: string;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({ className }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "Jordan Smith",
    email: "jordan.smith@email.com",
    level: 3,
    role: "Rising Charmer",
    avatar: "JS"
  });

  const userInfo = {
    name: "Jordan Smith",
    email: "jordan.smith@email.com",
    level: 3,
    role: "Rising Charmer",
    avatar: "JS"
  };

  const handleEditProfile = () => {
    setIsEditMode(!isEditMode);
  };

  const handleSaveProfile = () => {
    console.log('Saving profile:', editForm);
    setIsEditMode(false);
    // Here you would typically save to backend
  };

  const handleCancelEdit = () => {
    setEditForm(userInfo); // Reset form to original values
    setIsEditMode(false);
  };

  const handleShareProfile = () => {
    console.log('Share profile clicked');
  };

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className={cn("card-primary relative overflow-visible group", className)}>
      {/* Soft glow outline */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-primary-glow/5 opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
      
      <div className="relative z-10">
        {/* Header with avatar and share */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-16 h-16 ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
                <AvatarFallback className="text-lg font-bold bg-gradient-primary text-primary-foreground">
                  {userInfo.avatar}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -inset-0.5 bg-gradient-primary rounded-full opacity-20 blur-sm" />
            </div>
            
            {/* User info */}
            <div>
              <h2 className="heading-card text-2xl mb-1">{userInfo.name}</h2>
              <p className="text-caption mb-2">{userInfo.email}</p>
              <div className="flex items-center gap-3">
                <div className="level-badge">
                  Level {userInfo.level}
                </div>
                <span className="text-subtitle text-sm">{userInfo.role}</span>
              </div>
            </div>
          </div>
          
          {/* Share button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShareProfile}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Edit Profile Button */}
        <Button 
          onClick={handleEditProfile}
          className={cn(
            "w-full btn-tier-1 transition-all duration-200",
            isEditMode ? "opacity-80" : "hover:scale-[1.02]"
          )}
        >
          <Edit3 className="w-4 h-4 mr-2" />
          {isEditMode ? "Close Editor" : "Edit Profile"}
        </Button>

        {/* Edit Profile Dropdown Menu */}
        {isEditMode && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
              onClick={handleCancelEdit}
            />
            
            {/* Menu Popup */}
            <div className="absolute top-full left-0 right-0 mt-3 bg-card border border-border/50 rounded-xl shadow-elevation z-50 animate-scale-in overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/30 bg-card/95">
                <h3 className="heading-card flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-primary" />
                  Edit Profile
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancelEdit}
                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Form Content */}
              <div className="p-6 space-y-5 bg-card">
                {/* Avatar Section */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border border-muted/30 hover:bg-muted/30 transition-colors">
                  <Avatar className="w-14 h-14 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg font-bold">
                      {editForm.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">Profile Picture</p>
                    <p className="text-xs text-muted-foreground">Click to change your avatar</p>
                  </div>
                  <Button variant="outline" size="sm" className="hover:scale-105 transition-transform">
                    <Camera className="w-4 h-4 mr-2" />
                    Change
                  </Button>
                </div>

                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-sm font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Full Name
                  </Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full transition-all duration-200 focus:scale-[1.01]"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Email Address
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full transition-all duration-200 focus:scale-[1.01]"
                    placeholder="Enter your email"
                  />
                </div>

                {/* Role Field */}
                <div className="space-y-2">
                  <Label htmlFor="edit-role" className="text-sm font-semibold flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-primary" />
                    Role/Title
                  </Label>
                  <Input
                    id="edit-role"
                    value={editForm.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="w-full transition-all duration-200 focus:scale-[1.01]"
                    placeholder="Enter your role or title"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-border/20">
                  <Button 
                    onClick={handleSaveProfile}
                    className="flex-1 btn-success hover:scale-[1.02] transition-transform"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button 
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="flex-1 hover:scale-[1.02] transition-transform"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Decorative glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl opacity-50" />
    </div>
  );
};

export default UserProfileCard;