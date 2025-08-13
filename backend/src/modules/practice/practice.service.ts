import { Injectable } from '@nestjs/common';

export interface ComponentLayout {
  id: string;
  page: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, any>;
  safe: boolean;
}

@Injectable()
export class PracticeService {
  private componentLayouts: ComponentLayout[] = [
    // PracticeHub page - complete layout matching real app
    { id: 'TransparentTopBar', page: 'PracticeHub', x: 0, y: 0, width: 375, height: 60, properties: { title: 'Practice Hub', showBack: false }, safe: true },
    { id: 'PracticeCategoryCarousel', page: 'PracticeHub', x: 20, y: 80, width: 335, height: 120, properties: { categories: [] }, safe: true },
    { id: 'WeeklyStreakCard', page: 'PracticeHub', x: 20, y: 220, width: 335, height: 80, properties: { streak: 7, xp: 1250 }, safe: true },
    { id: 'JourneyFlashcards', page: 'PracticeHub', x: 20, y: 320, width: 335, height: 160, properties: { cards: [] }, safe: true },
    { id: 'BottomNavigationBar', page: 'PracticeHub', x: 0, y: 732, width: 375, height: 80, properties: { activeTab: 'practice' }, safe: false },
    
    // Stats page components - complete layout matching real app
    { id: 'TopMissionBar', page: 'Stats', x: 0, y: 0, width: 375, height: 60, properties: { title: 'Dashboard', showBack: true }, safe: true },
    
    // Main metric cards (3x2 grid)
    { id: 'StatTile', page: 'Stats', x: 20, y: 80, width: 160, height: 100, properties: { label: 'Confidence', value: '92%', icon: '🏆', color: 'gold' }, safe: true },
    { id: 'StatTile', page: 'Stats', x: 195, y: 80, width: 160, height: 100, properties: { label: 'Filler Words', value: '4/min', icon: '💬', color: 'blue' }, safe: true },
    { id: 'StatTile', page: 'Stats', x: 20, y: 200, width: 160, height: 100, properties: { label: 'Energy Level', value: 'High', icon: '⚡', color: 'teal' }, safe: true },
    { id: 'StatTile', page: 'Stats', x: 195, y: 200, width: 160, height: 100, properties: { label: 'Sentiment', value: '85%', icon: '❤️', color: 'pink' }, safe: true },
    { id: 'StatTile', page: 'Stats', x: 20, y: 320, width: 160, height: 100, properties: { label: 'XP Progress', value: '2,840', icon: '📊', color: 'purple' }, safe: true },
    { id: 'StatTile', page: 'Stats', x: 195, y: 320, width: 160, height: 100, properties: { label: 'AI Insights', value: '12 New', icon: '💡', color: 'blue' }, safe: true },
    
    // Premium Deep Insights section
    { id: 'SectionHeader', page: 'Stats', x: 20, y: 440, width: 335, height: 60, properties: { title: 'Premium Deep Insights', subtitle: 'Unlock advanced personality and communication analytics' }, safe: true },
    
    // Premium insight cards (2x2 grid)
    { id: 'PremiumInsightCard', page: 'Stats', x: 20, y: 520, width: 160, height: 140, properties: { title: 'Tone Mastery', description: 'Measures pitch control, tension, pauses, nuance', icon: '🎤', locked: true }, safe: false },
    { id: 'PremiumInsightCard', page: 'Stats', x: 195, y: 520, width: 160, height: 140, properties: { title: 'Charisma Index', description: 'Based on humor, storytelling, presence', icon: '⭐', locked: true }, safe: false },
    { id: 'PremiumInsightCard', page: 'Stats', x: 20, y: 680, width: 160, height: 140, properties: { title: 'Body Language Score', description: 'Based on posture, facial cues, gestures', icon: '👁️', locked: true }, safe: false },
    { id: 'PremiumInsightCard', page: 'Stats', x: 195, y: 680, width: 160, height: 140, properties: { title: 'Speaking Habits Scan', description: 'Unique patterns & quirks in your speech', icon: '🔊', locked: true }, safe: false },
    
    // Unlock button
    { id: 'UnlockButton', page: 'Stats', x: 20, y: 840, width: 335, height: 60, properties: { text: 'Unlock Deep Personality Stats', gradient: 'yellow-to-purple', locked: true }, safe: false },
    
    // Bottom navigation (positioned at bottom of scrollable content)
    { id: 'BottomNavigationBar', page: 'Stats', x: 0, y: 920, width: 375, height: 80, properties: { activeTab: 'stats' }, safe: false },
    
    // Shop page components - complete layout
    { id: 'TopMissionBar', page: 'Shop', x: 0, y: 0, width: 375, height: 60, properties: { title: 'Shop', showBack: true }, safe: true },
    { id: 'ShopItem', page: 'Shop', x: 20, y: 80, width: 160, height: 160, properties: { name: 'XP Boost', price: 100, icon: '⚡', description: 'Double your XP for 1 hour' }, safe: true },
    { id: 'ShopItem', page: 'Shop', x: 195, y: 80, width: 160, height: 160, properties: { name: 'Premium Pass', price: 500, icon: '👑', description: 'Unlock all premium features' }, safe: true },
    { id: 'ShopItem', page: 'Shop', x: 20, y: 260, width: 160, height: 160, properties: { name: 'Streak Freeze', price: 200, icon: '❄️', description: 'Protect your streak for 1 day' }, safe: true },
    { id: 'ShopItem', page: 'Shop', x: 195, y: 260, width: 160, height: 160, properties: { name: 'Practice Pack', price: 150, icon: '📚', description: '5 extra practice sessions' }, safe: true },
    { id: 'SectionHeader', page: 'Shop', x: 20, y: 440, width: 335, height: 60, properties: { title: 'Premium Features', subtitle: 'Unlock advanced training tools' }, safe: true },
    { id: 'PremiumFeatureCard', page: 'Shop', x: 20, y: 520, width: 335, height: 100, properties: { title: 'AI Coach', description: 'Personalized feedback and guidance', icon: '🤖', price: 1000, locked: true }, safe: false },
    { id: 'PremiumFeatureCard', page: 'Shop', x: 20, y: 640, width: 335, height: 100, properties: { title: 'Advanced Analytics', description: 'Deep insights into your progress', icon: '📈', price: 800, locked: true }, safe: false },
    { id: 'UnlockButton', page: 'Shop', x: 20, y: 760, width: 335, height: 60, properties: { text: 'Unlock Premium Features', gradient: 'blue-to-purple', locked: true }, safe: false },
    { id: 'BottomNavigationBar', page: 'Shop', x: 0, y: 840, width: 375, height: 80, properties: { activeTab: 'shop' }, safe: false },
    
    // Profile page components - complete layout
    { id: 'TopMissionBar', page: 'Profile', x: 0, y: 0, width: 375, height: 60, properties: { title: 'Profile', showBack: true }, safe: true },
    { id: 'UserProfileCard', page: 'Profile', x: 20, y: 80, width: 335, height: 120, properties: { name: 'User Name', avatar: '👤', level: 12, xp: 2840 }, safe: true },
    { id: 'AccountManagementSection', page: 'Profile', x: 20, y: 220, width: 335, height: 200, properties: { settings: ['Notifications', 'Privacy', 'Language', 'Theme'] }, safe: true },
    { id: 'SubscriptionStatusSection', page: 'Profile', x: 20, y: 440, width: 335, height: 120, properties: { status: 'Premium', expires: '2024-12-31', features: ['AI Coach', 'Advanced Analytics'] }, safe: true },
    { id: 'SectionHeader', page: 'Profile', x: 20, y: 580, width: 335, height: 60, properties: { title: 'Achievements', subtitle: 'Your milestones and badges' }, safe: true },
    { id: 'AchievementCard', page: 'Profile', x: 20, y: 660, width: 160, height: 120, properties: { title: 'First Steps', description: 'Complete your first practice', icon: '🎯', unlocked: true }, safe: true },
    { id: 'AchievementCard', page: 'Profile', x: 195, y: 660, width: 160, height: 120, properties: { title: 'Streak Master', description: '7 day streak', icon: '🔥', unlocked: true }, safe: true },
    { id: 'AchievementCard', page: 'Profile', x: 20, y: 800, width: 160, height: 120, properties: { title: 'Social Butterfly', description: 'Complete 50 practices', icon: '🦋', unlocked: false }, safe: true },
    { id: 'AchievementCard', page: 'Profile', x: 195, y: 800, width: 160, height: 120, properties: { title: 'Confidence King', description: 'Reach 90% confidence', icon: '👑', unlocked: false }, safe: true },
    { id: 'BottomNavigationBar', page: 'Profile', x: 0, y: 940, width: 375, height: 80, properties: { activeTab: 'profile' }, safe: false }
  ];

  getCategories() {
    return {
      items: [
        { id: '1', title: 'Public Speaking' },
        { id: '2', title: 'Networking' },
        { id: '3', title: 'Leadership' },
        { id: '4', title: 'Conflict Resolution' }
      ]
    };
  }

  getSessions() {
    return {
      items: [
        { id: '1', title: 'Morning Practice', category: 'Public Speaking' },
        { id: '2', title: 'Team Meeting', category: 'Leadership' }
      ]
    };
  }

  getComponentLayouts(page?: string) {
    if (page) {
      return this.componentLayouts.filter(layout => layout.page === page);
    }
    return this.componentLayouts;
  }

  updateComponentLayouts(layouts: ComponentLayout[]) {
    // Update existing layouts and add new ones
    layouts.forEach(newLayout => {
      const existingIndex = this.componentLayouts.findIndex(
        layout => layout.id === newLayout.id && layout.page === newLayout.page
      );
      
      if (existingIndex >= 0) {
        this.componentLayouts[existingIndex] = newLayout;
      } else {
        this.componentLayouts.push(newLayout);
      }
    });
    
    // Immediately push changes to React Native app
    this.pushChangesToApp(layouts);
    
    return { success: true, message: `Updated ${layouts.length} component layouts and pushed to app` };
  }

  // Push changes directly to React Native app
  async pushChangesToApp(layouts: ComponentLayout[]) {
    try {
      // In a real implementation, this would:
      // 1. Connect to your React Native app via WebSocket/HTTP
      // 2. Send the updated layouts
      // 3. Trigger a UI refresh in the app
      
      console.log('🔄 Pushing changes to React Native app:', layouts.length, 'components');
      
      // Simulate pushing to app (replace with actual app communication)
      const appUpdateResult = await this.simulateAppUpdate(layouts);
      
      if (appUpdateResult.success) {
        console.log('✅ Successfully updated React Native app');
      } else {
        console.error('❌ Failed to update React Native app:', appUpdateResult.error);
      }
      
      return appUpdateResult;
    } catch (error) {
      console.error('Error pushing changes to app:', error);
      return { success: false, error: error.message };
    }
  }

  // Simulate updating the React Native app
  private async simulateAppUpdate(layouts: ComponentLayout[]): Promise<{ success: boolean; error?: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate 95% success rate (realistic for app updates)
    const success = Math.random() > 0.05;
    
    if (success) {
      console.log(`📱 App updated with ${layouts.length} component changes`);
      return { success: true };
    } else {
      console.log('📱 App update failed (simulated)');
      return { success: false, error: 'App not responding' };
    }
  }

  getPages() {
    const pages = [...new Set(this.componentLayouts.map(layout => layout.page))];
    return pages.map(page => ({
      name: page,
      componentCount: this.componentLayouts.filter(layout => layout.page === page).length
    }));
  }

  // Real-time sync: Check for component changes from React Native app
  async syncWithApp() {
    try {
      // This would normally connect to your React Native app
      // For now, we'll simulate checking for changes
      const appComponents = await this.getAppComponents();
      
      // Compare with current layouts and update if needed
      const changes = this.detectChanges(appComponents);
      
      if (changes.length > 0) {
        this.updateFromApp(changes);
        return { 
          success: true, 
          message: `Synced ${changes.length} component changes from app`,
          changes 
        };
      }
      
      return { 
        success: true, 
        message: 'No changes detected - layouts are up to date',
        changes: []
      };
    } catch (error) {
      console.error('Sync error:', error);
      return { 
        success: false, 
        message: 'Failed to sync with app',
        error: error.message 
      };
    }
  }

  // Simulate getting components from React Native app
  private async getAppComponents(): Promise<ComponentLayout[]> {
    // In a real implementation, this would:
    // 1. Connect to your React Native app via WebSocket/HTTP
    // 2. Request current component layouts
    // 3. Return the actual layouts from the app
    
    // For now, return a modified version of current layouts to simulate changes
    const appComponents = [...this.componentLayouts];
    
    // Simulate some random changes
    const randomChange = Math.random() > 0.7; // 30% chance of change
    if (randomChange) {
      const randomIndex = Math.floor(Math.random() * appComponents.length);
      const component = appComponents[randomIndex];
      
      // Simulate a position change
      component.x += Math.floor(Math.random() * 10) - 5;
      component.y += Math.floor(Math.random() * 10) - 5;
      
      // Simulate a property change
      if (component.properties.value) {
        const currentValue = parseInt(component.properties.value.replace(/[^\d]/g, ''));
        component.properties.value = `${currentValue + Math.floor(Math.random() * 10)}%`;
      }
    }
    
    return appComponents;
  }

  private detectChanges(appComponents: ComponentLayout[]): ComponentLayout[] {
    const changes: ComponentLayout[] = [];
    
    appComponents.forEach(appComponent => {
      const existingComponent = this.componentLayouts.find(
        c => c.id === appComponent.id && c.page === appComponent.page
      );
      
      if (!existingComponent) {
        // New component from app
        changes.push(appComponent);
      } else if (
        existingComponent.x !== appComponent.x ||
        existingComponent.y !== appComponent.y ||
        existingComponent.width !== appComponent.width ||
        existingComponent.height !== appComponent.height ||
        JSON.stringify(existingComponent.properties) !== JSON.stringify(appComponent.properties)
      ) {
        // Component changed in app
        changes.push(appComponent);
      }
    });
    
    return changes;
  }

  private updateFromApp(changes: ComponentLayout[]) {
    changes.forEach(change => {
      const existingIndex = this.componentLayouts.findIndex(
        c => c.id === change.id && c.page === change.page
      );
      
      if (existingIndex >= 0) {
        this.componentLayouts[existingIndex] = change;
      } else {
        this.componentLayouts.push(change);
      }
    });
  }

  // Get sync status for dashboard
  getSyncStatus() {
    return {
      lastSync: new Date().toISOString(),
      totalComponents: this.componentLayouts.length,
      pages: this.getPages(),
      status: 'ready'
    };
  }
}
