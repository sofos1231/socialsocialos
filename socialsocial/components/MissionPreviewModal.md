# MissionPreviewModal Component

A premium, gamified modal component for previewing practice missions in the SocialGym app. Features glassmorphism design, smooth animations, haptic feedback, and support for both unlocked and locked mission states.

## ✨ Features

- **Glassmorphism Design**: Beautiful blurred background with subtle glow effects
- **Smooth Animations**: Fade + scale entrance/exit animations (800ms)
- **Haptic Feedback**: iOS and Android vibration feedback on interactions
- **Gamified Elements**: XP rewards with pulsing star animations
- **Difficulty Badges**: Color-coded difficulty levels (Beginner/Intermediate/Advanced)
- **Locked State Support**: Dimmed UI with lock icon for unavailable missions
- **Responsive Design**: Adapts to different screen sizes
- **Expo Go Compatible**: No native dependencies required

## 🎯 Design Standards

This component follows the ultra high-quality standards for SocialGym:
- Premium visual quality with glassmorphism effects
- Microinteractions and smooth transitions
- Emotional feedback through animations and haptics
- Consistent with Duolingo, Clash Royale, and Apple design language
- Mobile-optimized touch interactions

## 📦 Installation

The component requires the following dependencies (already included in the project):

```json
{
  "expo-blur": "~14.1.4",
  "expo-haptics": "~14.1.4",
  "expo-linear-gradient": "~14.1.5",
  "@expo/vector-icons": "^14.0.0"
}
```

## 🚀 Basic Usage

```jsx
import React, { useState } from 'react';
import MissionPreviewModal from './components/MissionPreviewModal';

const MyComponent = () => {
  const [modalVisible, setModalVisible] = useState(false);
  
  const mission = {
    title: 'Flirt Like a Pro',
    subtitle: 'Learn how to deliver a bold line under pressure',
    difficulty: 'Intermediate',
    timeEstimate: '2 min',
    xpReward: 20,
    isLocked: false,
  };

  const handleStartMission = () => {
    console.log('Starting mission!');
    setModalVisible(false);
  };

  return (
    <MissionPreviewModal
      visible={modalVisible}
      mission={mission}
      onClose={() => setModalVisible(false)}
      onStartMission={handleStartMission}
    />
  );
};
```

## 📋 Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `visible` | `boolean` | `false` | Controls modal visibility |
| `mission` | `object` | `{}` | Mission data object |
| `onClose` | `function` | - | Called when modal is closed |
| `onStartMission` | `function` | - | Called when "Start Mission" is pressed |
| `style` | `object` | - | Additional styles for modal container |

## 🎮 Mission Object Structure

```typescript
interface Mission {
  title?: string;           // Mission title
  subtitle?: string;        // Mission description
  difficulty?: string;      // 'Beginner' | 'Intermediate' | 'Advanced'
  timeEstimate?: string;    // e.g., '2 min', '5 min'
  xpReward?: number;        // XP points to award
  isLocked?: boolean;       // Whether mission is locked
  lockMessage?: string;     // Message shown for locked missions
}
```

## 🎨 Customization Examples

### Different Difficulty Levels

```jsx
const beginnerMission = {
  title: 'First Steps',
  subtitle: 'Start your social journey',
  difficulty: 'Beginner', // Green gradient
  timeEstimate: '1 min',
  xpReward: 10,
  isLocked: false,
};

const advancedMission = {
  title: 'Master Class',
  subtitle: 'Advanced social techniques',
  difficulty: 'Advanced', // Red gradient
  timeEstimate: '10 min',
  xpReward: 50,
  isLocked: false,
};
```

### Locked Mission

```jsx
const lockedMission = {
  title: 'Elite Challenge',
  subtitle: 'Unlock advanced techniques',
  difficulty: 'Advanced',
  timeEstimate: '15 min',
  xpReward: 100,
  isLocked: true,
  lockMessage: 'Complete 10 intermediate missions to unlock',
};
```

## 🎭 Animation Details

### Entrance Animation
- **Duration**: 800ms total
- **Background**: Fade in (300ms)
- **Modal**: Fade + spring scale (400ms)
- **Haptic**: Medium impact on iOS, 100ms vibration on Android

### Exit Animation
- **Duration**: 200ms
- **All elements**: Fade out + scale down simultaneously

### Interactive Animations
- **XP Star**: Continuous pulsing (1.5s cycle)
- **Glow Outline**: Breathing effect for unlocked missions (2s cycle)
- **Button Press**: Scale down to 0.95 (100ms)

## 🎯 Integration with Practice Cards

```jsx
import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import MissionPreviewModal from './MissionPreviewModal';

const PracticeCard = ({ mission }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleCardPress = () => {
    if (!mission.isLocked) {
      setModalVisible(true);
    }
  };

  return (
    <>
      <TouchableOpacity onPress={handleCardPress}>
        {/* Your practice card content */}
      </TouchableOpacity>
      
      <MissionPreviewModal
        visible={modalVisible}
        mission={mission}
        onClose={() => setModalVisible(false)}
        onStartMission={() => {
          // Navigate to mission screen
          setModalVisible(false);
        }}
      />
    </>
  );
};
```

## 🎨 Theme Integration

The component automatically uses the SocialGym theme system:

- **Colors**: Primary purple gradients, success/warning/error for difficulties
- **Spacing**: Consistent spacing scale (xs, sm, md, lg, xl, xxl, xxxl)
- **Typography**: Responsive font sizes and weights
- **Shadows**: Glow effects and depth shadows
- **Border Radius**: Consistent rounded corners

## 🔧 Advanced Customization

### Custom Styling

```jsx
<MissionPreviewModal
  visible={modalVisible}
  mission={mission}
  onClose={handleClose}
  onStartMission={handleStart}
  style={{
    width: '95%',
    maxWidth: 450,
  }}
/>
```

### Custom Mission Data

```jsx
const customMission = {
  title: 'Custom Mission',
  subtitle: 'Your custom description here',
  difficulty: 'Intermediate',
  timeEstimate: '3 min',
  xpReward: 25,
  isLocked: false,
  lockMessage: 'Custom unlock requirement',
};
```

## 🎮 Demo Component

Use the included `MissionPreviewDemo` component to test different mission states:

```jsx
import MissionPreviewDemo from './components/MissionPreviewDemo';

// In your app
<MissionPreviewDemo />
```

## 🚨 Error Handling

The component gracefully handles missing or invalid data:

- **Missing mission**: Uses default placeholder values
- **Invalid difficulty**: Falls back to primary color
- **Missing callbacks**: No-op functions prevent crashes
- **Animation errors**: Graceful fallbacks to static states

## 📱 Accessibility

- **Screen Reader Support**: Proper labels and roles
- **Touch Targets**: Minimum 44pt touch areas
- **Color Contrast**: Meets WCAG AA standards
- **Focus Management**: Proper focus handling for navigation

## 🎯 Performance Considerations

- **Animation Optimization**: Uses native driver where possible
- **Memory Management**: Proper cleanup of animation loops
- **Rendering**: Minimal re-renders with proper state management
- **Bundle Size**: Lightweight with no heavy dependencies

## 🔄 State Management

The component is stateless and relies on parent state management:

```jsx
const [modalState, setModalState] = useState({
  visible: false,
  currentMission: null,
});

const showMission = (mission) => {
  setModalState({
    visible: true,
    currentMission: mission,
  });
};

const hideModal = () => {
  setModalState({
    visible: false,
    currentMission: null,
  });
};
```

## 🎨 Design System Compliance

This component follows all SocialGym design standards:

✅ **Visual Quality**: Premium glassmorphism with gradients and glow  
✅ **Interactivity**: Smooth animations and haptic feedback  
✅ **Component Structure**: Clean, modular, and reusable  
✅ **Expo Compatibility**: 100% Expo Go compatible  
✅ **Design System**: Consistent with app theme and language  
✅ **User Experience**: Delightful and emotionally satisfying  

## 🚀 Future Enhancements

Potential improvements for future versions:

- **Mission Progress**: Show completion percentage
- **Streak Indicators**: Display current streak status
- **Sound Effects**: Audio feedback for interactions
- **Custom Animations**: Configurable animation presets
- **Dark/Light Themes**: Automatic theme switching
- **Localization**: Multi-language support 