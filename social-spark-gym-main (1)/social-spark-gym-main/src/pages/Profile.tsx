import React from 'react';
import UserProfileCard from '@/components/profile/UserProfileCard';
import SettingsSection from '@/components/profile/SettingsSection';
import AccountManagementSection from '@/components/profile/AccountManagementSection';
import SubscriptionStatusSection from '@/components/profile/SubscriptionStatusSection';
import MyJourneyPanel from '@/components/profile/MyJourneyPanel';

const Profile = () => {
  return (
    <div className="min-h-screen pb-20 pt-24 px-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="heading-hero text-3xl mb-3">
          Profile & Settings
        </h1>
        <p className="text-subtitle">
          Manage your account and preferences
        </p>
      </div>

      {/* User Profile Card */}
      <UserProfileCard className="mb-6 animate-slide-up" />

      {/* Settings Section */}
      <SettingsSection className="mb-6 animate-slide-up" style={{animationDelay: '100ms'}} />

      {/* Account Management Section */}
      <AccountManagementSection className="mb-6 animate-slide-up" style={{animationDelay: '200ms'}} />

      {/* Subscription Status Section */}
      <SubscriptionStatusSection className="mb-6 animate-slide-up" style={{animationDelay: '300ms'}} />

      {/* My Journey Panel */}
      <MyJourneyPanel className="mb-8 animate-slide-up" style={{animationDelay: '400ms'}} />
    </div>
  );
};

export default Profile;