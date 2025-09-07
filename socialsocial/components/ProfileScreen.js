import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles, { CARD_BORDER, CARD_BG, GLASS_BG, GLASS_BORDER } from './ProfileStyles';
import ProfileTopBar from '../src/components/ProfileTopBar';
import { usePlayerProgress } from '../src/state/playerProgress';
import theme from '../theme';

const LevelPill = ({ level = 3 }) => (
  <View style={styles.levelPill}>
    <LinearGradient colors={['#8b5cf6', '#6366f1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.levelPillGrad}>
      <Text style={styles.levelPillText}>Level {level}</Text>
    </LinearGradient>
  </View>
);

const ShareButton = ({ onPress }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.iconBtn}>
    <Ionicons name="share-social-outline" size={20} color="#fff" />
  </TouchableOpacity>
);

const GradientButton = ({ title, icon, onPress, variant = 'primary' }) => {
  const gradient = variant === 'primary' ? ['#8b5cf6', '#6366f1'] : ['#FACC15', '#9333EA'];
  const textColor = variant === 'primary' ? '#fff' : '#0a0a0a';
  const iconColor = textColor;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={{ borderRadius: 16, overflow: 'hidden' }}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradBtn}>
        {icon ? <Ionicons name={icon} size={18} color={iconColor} style={{ marginRight: 8 }} /> : null}
        <Text style={[styles.gradBtnText, { color: textColor }]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const Avatar = ({ initials = 'JS', size = 64 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}>
    <LinearGradient colors={['#8b5cf6', '#6366f1']} style={{ ...styles.avatarGrad, width: size, height: size, borderRadius: size / 2 }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.35 }}>{initials}</Text>
    </LinearGradient>
    <View style={[styles.avatarRing, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }]} />
  </View>
);

const EditProfileModal = ({ visible, onClose, form, setForm, onSave }) => {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: visible ? 1 : 0.96, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: visible ? 1 : 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.modalWrap} pointerEvents="box-none">
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <Animated.View style={[styles.modalCard, { transform: [{ scale }], opacity }]}>        
        <View style={styles.modalHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="pencil" size={18} color={theme.colors.primaryForeground} style={{ marginRight: 8 }} />
            <Text style={styles.modalTitle}>Edit Profile</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.iconBtnSmall}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 14 }}>
          {/* Avatar row */}
          <View style={styles.rowCard}>
            <Avatar initials={form.avatar} size={56} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.rowTitle}>Profile Picture</Text>
              <Text style={styles.caption}>Tap to change your avatar</Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} style={styles.outlineBtn}>
              <Ionicons name="camera-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.outlineBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <View style={{ marginTop: 10 }}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="Enter your full name" placeholderTextColor="rgba(255,255,255,0.45)" style={styles.textInput} />
          </View>

          {/* Email */}
          <View style={{ marginTop: 10 }}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(t) => setForm({ ...form, email: t })} placeholder="Enter your email" placeholderTextColor="rgba(255,255,255,0.45)" style={styles.textInput} />
          </View>

          {/* Role */}
          <View style={{ marginTop: 10 }}>
            <Text style={styles.inputLabel}>Role/Title</Text>
            <TextInput value={form.role} onChangeText={(t) => setForm({ ...form, role: t })} placeholder="Enter your role or title" placeholderTextColor="rgba(255,255,255,0.45)" style={styles.textInput} />
          </View>

          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <GradientButton title="Save Changes" icon="checkmark" onPress={onSave} />
            </View>
            <TouchableOpacity style={[styles.outlineBtn, { flex: 1, justifyContent: 'center' }]} onPress={onClose}>
              <Ionicons name="close" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.outlineBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const UserProfileCard = () => {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: 'Jordan Smith', email: 'jordan.smith@email.com', level: 3, role: 'Rising Charmer', avatar: 'JS' });

  return (
    <View style={styles.cardPrimary}>
      <LinearGradient colors={['rgba(99,102,241,0.12)', 'rgba(139,92,246,0.06)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGrad} />

      <View style={{ padding: 16 }}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar initials={form.avatar} />
            <View style={{ marginLeft: 14 }}>
              <Text style={styles.profileName}>{form.name}</Text>
              <Text style={styles.caption}>{form.email}</Text>
              <View style={styles.levelRow}>
                <LevelPill level={form.level} />
                <Text style={styles.roleText}>{form.role}</Text>
              </View>
            </View>
          </View>
          <ShareButton onPress={() => {}} />
        </View>

        <GradientButton title={editMode ? 'Close Editor' : 'Edit Profile'} icon="create-outline" onPress={() => setEditMode((v) => !v)} />
      </View>

      <EditProfileModal visible={editMode} onClose={() => setEditMode(false)} form={form} setForm={setForm} onSave={() => setEditMode(false)} />
    </View>
  );
};

const SettingsSection = () => {
  const [daily, setDaily] = useState(true);
  const [dark] = useState(true);

  return (
    <View style={styles.cardSection}>
      <Text style={styles.sectionTitle}>Settings</Text>

      {/* Daily practice reminders */}
      <View style={styles.itemRow}>
        <View style={styles.itemLeft}>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(251,146,60,0.2)' }]}>
            <Ionicons name="notifications" size={18} color="#FB923C" />
          </View>
          <View>
            <Text style={styles.itemTitle}>Daily Practice Reminders</Text>
            <Text style={styles.caption}>Receive daily practice motivation</Text>
          </View>
        </View>
        <Switch value={daily} onValueChange={setDaily} thumbColor="#fff" trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#6366f1' }} />
      </View>

      {/* Dark mode */}
      <View style={styles.itemRow}>
        <View style={styles.itemLeft}>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(99,102,241,0.18)' }]}>
            <Ionicons name="moon" size={18} color="#A78BFA" />
          </View>
          <View>
            <Text style={styles.itemTitle}>Dark Mode</Text>
            <Text style={styles.caption}>Dark mode is currently the default theme</Text>
          </View>
        </View>
        <Switch value={dark} disabled thumbColor="#fff" trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#6366f1' }} />
      </View>

      {/* Notification Preferences (future) */}
      <TouchableOpacity activeOpacity={0.85} style={styles.linkRow}>
        <View style={styles.itemLeft}>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(156,163,175,0.18)' }]}>
            <Ionicons name="notifications-outline" size={18} color="rgba(156,163,175,1)" />
          </View>
          <View>
            <Text style={[styles.itemTitle, { color: 'rgba(255,255,255,0.6)' }]}>Notification Preferences</Text>
            <Text style={[styles.caption, { fontStyle: 'italic' }]}>Coming soon</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(156,163,175,1)" />
      </TouchableOpacity>

      {/* Edit Profile Info */}
      <TouchableOpacity activeOpacity={0.85} style={styles.linkRow}>
        <View style={styles.itemLeft}>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(99,102,241,0.18)' }]}>
            <Ionicons name="create-outline" size={18} color="#6366f1" />
          </View>
          <View>
            <Text style={styles.itemTitle}>Edit Profile Info</Text>
            <Text style={styles.caption}>Manage your account details</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(156,163,175,1)" />
      </TouchableOpacity>
    </View>
  );
};

const AccountManagement = () => (
  <View style={[styles.cardSection, { borderColor: 'rgba(239,68,68,0.2)' }]}>    
    <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Account Management</Text>

    <TouchableOpacity activeOpacity={0.85} style={styles.itemRow}>
      <View style={styles.itemLeft}>
        <View style={[styles.iconBadge, { backgroundColor: 'rgba(147,197,253,0.18)' }]}>
          <Ionicons name="download-outline" size={18} color="#93C5FD" />
        </View>
        <View>
          <Text style={styles.itemTitle}>Export My Data</Text>
          <Text style={styles.caption}>Download your practice history</Text>
        </View>
      </View>
    </TouchableOpacity>

    <TouchableOpacity activeOpacity={0.85} style={[styles.itemRow, { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' }]}>      
      <View style={styles.itemLeft}>
        <View style={[styles.iconBadge, { backgroundColor: 'rgba(239,68,68,0.18)' }]}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        </View>
        <View>
          <Text style={[styles.itemTitle, { color: '#ef4444' }]}>Sign Out</Text>
          <Text style={styles.caption}>Sign out of your account</Text>
        </View>
      </View>
    </TouchableOpacity>

    <TouchableOpacity activeOpacity={0.85} style={[styles.itemCompact]}>      
      <View style={[styles.iconBadgeSm, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>        
        <Ionicons name="trash-outline" size={14} color="#ef4444" />
      </View>
      <View>
        <Text style={styles.itemSmallTitle}>Delete Account</Text>
        <Text style={styles.itemSmallCaption}>This will permanently delete your account and data</Text>
      </View>
    </TouchableOpacity>
  </View>
);

const Subscription = () => {
  const features = useMemo(() => [
    { icon: 'flash', title: 'Premium Scenarios', desc: 'Access 10 exclusive practice scenarios' },
    { icon: 'bulb', title: 'AI Coach Feedback', desc: 'Enhanced feedback for sessions' },
  ], []);

  return (
    <View style={styles.cardSection}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <LinearGradient colors={['#F59E0B', '#FACC15']} style={styles.crownBadge}>
                  <Ionicons name="star" size={22} color="#0f0f0f" />
                </LinearGradient>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.cardTitle}>Subscription</Text>
            <Text style={styles.caption}>Plan: <Text style={styles.subtitleBold}>Free</Text></Text>
          </View>
        </View>
        <GradientButton title="Upgrade" onPress={() => {}} variant="secondary" />
      </View>

      <View>
        <Text style={[styles.caption, { marginBottom: 6 }]}>Premium Features:</Text>
        {features.map((f) => (
          <View key={f.title} style={styles.premiumRow}>
            <View style={[styles.iconBadgeSm, { backgroundColor: 'rgba(147,51,234,0.15)' }]}>              
              <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.7)" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemSmallTitle}>
                <Ionicons name={f.icon} size={14} color="#F59E0B" />{'  '}{f.title}
              </Text>
              <Text style={styles.itemSmallCaption}>{f.desc}</Text>
            </View>
            <Text style={styles.premiumBadge}>Premium</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const JourneyPanel = () => (
  <View style={styles.cardSection}>
    <View style={{ alignItems: 'center' }}>
      <LinearGradient colors={['rgba(34,197,94,0.25)', 'rgba(99,102,241,0.22)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.journeyCircle}>
        <Ionicons name="trending-up" size={42} color="#22c55e" />
      </LinearGradient>
      <Text style={[styles.cardTitle, { color: '#22c55e', marginTop: 8 }]}>My Journey</Text>
      <Text style={styles.subtitle}>Your growth journey starts here</Text>

      <View style={styles.progressPlaceholders}>
        <View style={styles.progressBar} />
        <View style={styles.progressBar} />
        <View style={styles.progressBar} />
        <View style={styles.progressBar} />
      </View>

      <Text style={[styles.caption, { fontStyle: 'italic' }]}>More coming soon</Text>

      <View style={styles.journeyIcons}>
        <Ionicons name="star" size={16} color="#22c55e" />
        <Ionicons name="radio-button-on" size={16} color="#6366f1" />
        <Ionicons name="star" size={16} color="#A78BFA" />
      </View>
    </View>
  </View>
);

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const progress = usePlayerProgress();

  return (
    <>
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
      <ProfileTopBar
        userName={'Username'}
        coins={progress.coins}
        gems={progress.diamonds}
        streak={progress.streakDays}
        inStreak={progress.streakDays > 0}
        onPressMembership={() => {}}
        onPressCoins={() => {}}
        onPressGems={() => {}}
        onPressStreak={() => {}}
      />
    </View>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: Math.max(64, insets.top + 8),
        paddingBottom: Math.max(24, insets.bottom + 18),
        paddingHorizontal: 16,
      }}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Text style={styles.heading}>Profile & Settings</Text>
        <Text style={styles.subtitle}>Manage your account and preferences</Text>
      </View>

      <UserProfileCard />
      <SettingsSection />
      <AccountManagement />
      <Subscription />
      <JourneyPanel />
    </ScrollView>
    </>
  );
};

export default ProfileScreen;


