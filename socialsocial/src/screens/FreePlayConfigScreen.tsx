// FILE: socialsocial/src/screens/FreePlayConfigScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import apiClient from '../api/apiClient';
import {
  FreePlayConfig,
  FreePlayDifficulty,
  FreePlayPlace,
  PracticeStackParamList,
} from '../navigation/types';
import { useRequireOnboardingComplete } from '../hooks/useRequireOnboardingComplete';

type Props = NativeStackScreenProps<PracticeStackParamList, 'FreePlayConfig'>;

type PersonaLite = {
  id: string;
  name?: string;
  title?: string;
  bio?: string;
  description?: string;
};

type AiStyleLite = { key: string; name: string; description?: string };

const PLACES: { key: FreePlayPlace; label: string; emoji: string }[] = [
  { key: 'TINDER', label: 'Tinder', emoji: '🔥' },
  { key: 'WHATSAPP', label: 'WhatsApp', emoji: '💬' },
  { key: 'INSTAGRAM', label: 'Instagram', emoji: '📸' },
  { key: 'DM', label: 'DM', emoji: '✉️' },
  { key: 'BAR', label: 'Bar', emoji: '🍸' },
  { key: 'COLD_APPROACH', label: 'Cold Approach', emoji: '🧊' },
];

const DIFFICULTIES: { key: FreePlayDifficulty; label: string; hint: string }[] = [
  { key: 'EASY', label: 'Easy', hint: 'Friendly, forgiving' },
  { key: 'MEDIUM', label: 'Medium', hint: 'Realistic' },
  { key: 'HARD', label: 'Hard', hint: 'Higher standards' },
  { key: 'ELITE', label: 'Elite', hint: 'Very picky / strict' },
];

/**
 * ✅ IMPORTANT:
 * Fallback keys MUST match backend AiStyle.key strings (usually AiStyleKey enum values).
 */
const FALLBACK_STYLES: AiStyleLite[] = [
  {
    key: 'WARM',
    name: 'Friendly & Warm',
    description: 'Supportive, casual, quick replies, low judgment.',
  },
  {
    key: 'COLD',
    name: 'Cold & Direct',
    description: 'Short, skeptical, harder to impress. Tests you.',
  },
  {
    key: 'PLAYFUL',
    name: 'Playful & Flirty',
    description: 'Light teasing, fun energy, flirty tension.',
  },
  {
    key: 'DIRECT',
    name: 'Serious (Low Patience)',
    description: 'No nonsense, evaluates quickly, dislikes cringe.',
  },
];

function chip(active: boolean) {
  return [styles.chip, active ? styles.chipActive : styles.chipInactive] as any;
}

type RequiredFieldKey = 'place' | 'difficulty' | 'aiStyle';

function validateFreePlayConfig(config: {
  place: string | null;
  difficulty: string | null;
  aiStyleKey: string | null;
}): { isValid: boolean; missing: RequiredFieldKey[] } {
  const missing: RequiredFieldKey[] = [];
  if (!config.place) missing.push('place');
  if (!config.difficulty) missing.push('difficulty');
  if (!config.aiStyleKey) missing.push('aiStyle');
  return { isValid: missing.length === 0, missing };
}

export default function FreePlayConfigScreen({ navigation }: Props) {
  useRequireOnboardingComplete();
  // Premium-only enforcement: allow while developing, block in production
  const hasPremium = (globalThis as any).__DEV__ === true; // TODO connect real entitlements later
  const premiumBlocked = !hasPremium;

  const [place, setPlace] = useState<FreePlayPlace | null>(null);
  const [difficulty, setDifficulty] = useState<FreePlayDifficulty | null>(null);

  const [personas, setPersonas] = useState<PersonaLite[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

  const [aiStyles, setAiStyles] = useState<AiStyleLite[]>(FALLBACK_STYLES);
  const [isLoadingStyles, setIsLoadingStyles] = useState(false);
  const [selectedStyleKey, setSelectedStyleKey] = useState<string | null>(null);

  const [situation, setSituation] = useState('');
  const [isSituationExpanded, setIsSituationExpanded] = useState(false);

  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);

  const [missingFields, setMissingFields] = useState({
    place: false,
    difficulty: false,
    aiStyle: false,
  });
  const [activeErrorHint, setActiveErrorHint] = useState<RequiredFieldKey | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPersonas() {
      try {
        setIsLoadingPersonas(true);
        const res = await apiClient.get('/personas');
        const list = Array.isArray(res?.data) ? res.data : res?.data?.items;
        const normalized: PersonaLite[] = Array.isArray(list) ? list : [];
        if (!cancelled) {
          setPersonas(normalized);
          if (!selectedPersonaId && normalized[0]?.id) setSelectedPersonaId(normalized[0].id);
        }
      } catch (e: any) {
        console.log('[FreePlayConfig] personas load failed', e?.message ?? e);
        if (!cancelled) {
          setPersonas([]);
          Alert.alert(
            'Could not load personas',
            'The personas list endpoint failed. We can still start without a persona, but it will feel less real.',
          );
        }
      } finally {
        if (!cancelled) setIsLoadingPersonas(false);
      }
    }

    async function loadAiStylesPublic() {
      try {
        setIsLoadingStyles(true);

        // ✅ Part 2: public endpoint (no /admin path)
        const res = await apiClient.get('/ai-styles');
        const raw =
          Array.isArray(res?.data)
            ? res.data
            : (res?.data?.items ?? res?.data?.aiStyles);

        if (Array.isArray(raw) && raw.length) {
          const mapped: AiStyleLite[] = raw
            .map((s: any) => ({
              key: String(s?.key ?? s?.id ?? ''),
              name: String(s?.name ?? s?.title ?? 'Style'),
              description: typeof s?.description === 'string' ? s.description : undefined,
            }))
            .filter((x) => x.key && x.name);

          if (!cancelled && mapped.length) {
            setAiStyles(mapped);
            // Don't auto-select - user must explicitly choose
          }
        }
      } catch (e: any) {
        console.log('[FreePlayConfig] ai-styles load failed, using fallback', e?.message ?? e);
      } finally {
        if (!cancelled) setIsLoadingStyles(false);
      }
    }

    loadPersonas();
    loadAiStylesPublic();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-close tooltip after 2.5 seconds
  useEffect(() => {
    if (activeErrorHint) {
      const timer = setTimeout(() => {
        setActiveErrorHint(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [activeErrorHint]);

  const selectedPersona = useMemo(() => {
    if (!selectedPersonaId) return null;
    return personas.find((p) => p.id === selectedPersonaId) ?? null;
  }, [personas, selectedPersonaId]);

  const selectedStyle = useMemo(() => {
    if (!selectedStyleKey) return null;
    return aiStyles.find((s) => s.key === selectedStyleKey) ?? null;
  }, [aiStyles, selectedStyleKey]);

  const placeLabel = useMemo(() => (place ? PLACES.find((p) => p.key === place)?.label ?? place : 'Select place'), [place]);
  const styleName = selectedStyle?.name ?? 'Select style';
  const personaName =
    selectedPersona?.name ?? selectedPersona?.title ?? (selectedPersonaId ? 'Persona' : 'Random');

  const title = useMemo(() => {
    const placePart = place ? PLACES.find((p) => p.key === place)?.label ?? place : 'Free Play';
    const diffPart = difficulty ?? '';
    return diffPart ? `${placePart} • ${diffPart}` : placePart;
  }, [place, difficulty]);

  const builtTopic = useMemo(() => {
    const cleanSituation = situation.trim();
    const situationText = cleanSituation.length ? cleanSituation : '(no situation provided)';
    const placePart = place ? PLACES.find((p) => p.key === place)?.label ?? place : 'Place';
    const diffPart = difficulty ?? 'Difficulty';
    const stylePart = selectedStyleKey ? `${styleName} (${selectedStyleKey})` : 'Style';

    return [
      'FREEPLAY SCENARIO',
      `Place: ${placePart}`,
      `Difficulty: ${diffPart}`,
      `AI Style: ${stylePart}`,
      `Persona: ${personaName}`,
      '',
      'Situation:',
      situationText,
      '',
      'Instruction:',
      'Stay consistent with the persona + style above. Reply naturally like real chat in that place.',
    ].join('\n');
  }, [place, difficulty, styleName, selectedStyleKey, personaName, situation]);

  const handleStart = () => {
    if (premiumBlocked) {
      Alert.alert(
        'Premium only',
        'Free Play is premium-only. You can keep dev access while building, but production must require premium.',
      );
      return;
    }

    const { isValid, missing } = validateFreePlayConfig({
      place,
      difficulty,
      aiStyleKey: selectedStyleKey,
    });

    if (isValid) {
      if (!place || !difficulty || !selectedStyleKey) {
        // TypeScript guard - should never happen if isValid is true
        return;
      }

      const fp: FreePlayConfig = {
        place,
        difficulty,
        situation: situation.trim(),
        aiStyleKey: selectedStyleKey,
        aiStyleName: styleName,
      };

      navigation.navigate('PracticeSession', {
        mode: 'freeplay',
        title,
        topic: builtTopic,
        personaId: selectedPersonaId ?? undefined,
        freeplay: fp,
      });
      return;
    }

    setMissingFields({
      place: missing.includes('place'),
      difficulty: missing.includes('difficulty'),
      aiStyle: missing.includes('aiStyle'),
    });
  };

  const SectionTitle = ({ children }: any) => (
    <Text style={styles.sectionTitle}>{children}</Text>
  );

  const FieldButton = ({
    label,
    value,
    onPress,
    badge,
    loading,
    hasError,
    onErrorIconPress,
    showTooltip,
    tooltipText,
  }: {
    label: string;
    value: string;
    onPress: () => void;
    badge?: string;
    loading?: boolean;
    hasError?: boolean;
    onErrorIconPress?: () => void;
    showTooltip?: boolean;
    tooltipText?: string;
  }) => (
    <View>
      <TouchableOpacity
        style={[
          styles.fieldButton,
          hasError && styles.fieldButtonError,
          hasError && styles.fieldButtonGlow,
        ]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={styles.fieldValue} numberOfLines={1}>
            {value}
          </Text>
        </View>

        <View style={styles.fieldRight}>
          {hasError && onErrorIconPress && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onErrorIconPress();
              }}
              style={styles.errorIcon}
            >
              <Text style={styles.errorIconText}>!</Text>
            </TouchableOpacity>
          )}
          {!!badge && <Text style={[styles.fieldBadge, { marginRight: 10 }]}>{badge}</Text>}
          {loading ? <ActivityIndicator style={{ marginLeft: 10 }} /> : <Text style={styles.chev}>›</Text>}
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{'←'}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.hTitle}>Free Play</Text>
          <Text style={styles.hSub}>Build a scenario • Persona + Style + Place + Difficulty</Text>
        </View>

        <View style={styles.premiumPill}>
          <Text style={styles.premiumText}>PREMIUM</Text>
        </View>
      </View>

      {premiumBlocked && (
        <View style={styles.lockBanner}>
          <Text style={styles.lockBannerTitle}>Premium-only (production)</Text>
          <Text style={styles.lockBannerBody}>
            You're in dev, so we keep access enabled while building. In production this must be gated by entitlements.
          </Text>
        </View>
      )}

      <View style={styles.contentWrapper}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" style={styles.mainContent}>
          <SectionTitle>Place</SectionTitle>
          <View
            style={[
              styles.chipsContainer,
              missingFields.place && styles.chipsContainerError,
              missingFields.place && styles.chipsContainerGlow,
            ]}
          >
            <View style={styles.chipsRow}>
              {PLACES.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={chip(place === p.key)}
                  activeOpacity={0.9}
                  onPress={() => {
                    setPlace(p.key);
                    setMissingFields((prev) => ({ ...prev, place: false }));
                    if (activeErrorHint === 'place') setActiveErrorHint(null);
                  }}
                >
                  <Text style={styles.chipText}>
                    {p.emoji} {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {missingFields.place && (
              <TouchableOpacity
                onPress={() => setActiveErrorHint('place')}
                style={styles.errorIconChip}
              >
                <Text style={styles.errorIconText}>!</Text>
              </TouchableOpacity>
            )}
          </View>

          <SectionTitle>Difficulty</SectionTitle>
          <View
            style={[
              styles.chipsContainer,
              missingFields.difficulty && styles.chipsContainerError,
              missingFields.difficulty && styles.chipsContainerGlow,
            ]}
          >
            <View style={styles.chipsRow}>
              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d.key}
                  style={chip(difficulty === d.key)}
                  activeOpacity={0.9}
                  onPress={() => {
                    setDifficulty(d.key);
                    setMissingFields((prev) => ({ ...prev, difficulty: false }));
                    if (activeErrorHint === 'difficulty') setActiveErrorHint(null);
                  }}
                >
                  <Text style={styles.chipText}>{d.label}</Text>
                  <Text style={styles.chipHint}>{d.hint}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {missingFields.difficulty && (
              <TouchableOpacity
                onPress={() => setActiveErrorHint('difficulty')}
                style={styles.errorIconChip}
              >
                <Text style={styles.errorIconText}>!</Text>
              </TouchableOpacity>
            )}
          </View>

        <SectionTitle>Persona + Style</SectionTitle>

        <FieldButton
          label="AI Persona"
          value={
            isLoadingPersonas
              ? 'Loading…'
              : selectedPersona
                ? (selectedPersona.name ?? selectedPersona.title ?? selectedPersona.id)
                : (selectedPersonaId ? selectedPersonaId : 'None')
          }
          onPress={() => setShowPersonaPicker(true)}
          badge="AI"
          loading={isLoadingPersonas}
        />

          <FieldButton
            label="AI Style"
            value={selectedStyle?.name ?? 'Select style'}
            onPress={() => setShowStylePicker(true)}
            badge={isLoadingStyles ? '...' : 'STYLE'}
            loading={isLoadingStyles}
            hasError={missingFields.aiStyle}
            onErrorIconPress={() => setActiveErrorHint('aiStyle')}
          />

          <SectionTitle>Situation</SectionTitle>
          <TouchableOpacity
            style={styles.fieldButton}
            onPress={() => setIsSituationExpanded(true)}
            activeOpacity={0.9}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Situation</Text>
              <Text style={styles.fieldValue} numberOfLines={1}>
                {situation.trim()
                  ? situation.length > 60
                    ? situation.substring(0, 60) + '...'
                    : situation
                  : 'Add a situation (optional)'}
              </Text>
              {!situation.trim() && (
                <Text style={styles.fieldSubtitle}>Optional – makes the AI more realistic</Text>
              )}
            </View>
            <View style={styles.fieldRight}>
              <Text style={styles.chev}>✏️</Text>
            </View>
          </TouchableOpacity>

          {isSituationExpanded && (
            <View style={styles.situationExpandedCard}>
              <View style={styles.inputWrap}>
                <TextInput
                  value={situation}
                  onChangeText={setSituation}
                  placeholder="Example: You matched on Tinder. She replied 'hey'. You want a confident playful opener…"
                  placeholderTextColor="#64748b"
                  style={styles.textArea}
                  multiline
                  textAlignVertical="top"
                  maxLength={800}
                  autoFocus
                />
                <Text style={styles.counter}>{situation.length}/800</Text>
              </View>
              <View style={styles.situationExpandedFooter}>
                <Text style={styles.helper}>Give context like a real scenario.</Text>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => setIsSituationExpanded(false)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>What will be sent to the AI (topic)</Text>
          <Text style={styles.previewBody} numberOfLines={10}>
            {builtTopic}
          </Text>
        </View>

          <TouchableOpacity
            style={styles.startBtn}
            activeOpacity={0.9}
            onPress={handleStart}
          >
            <Text style={styles.startBtnText}>{premiumBlocked ? 'Premium required' : 'Start Free Play'}</Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>
            Part 2 uses a public /ai-styles endpoint and will also send aiStyleKey as a real request field.
          </Text>
        </ScrollView>

        {activeErrorHint && (
          <>
            <Pressable
              onPress={() => setActiveErrorHint(null)}
              style={styles.tooltipOverlay}
            />
            {activeErrorHint === 'place' && (
              <View style={styles.tooltipAbsolute}>
                <Text style={styles.tooltipText}>
                  You have to choose where this happens (Tinder, WhatsApp, etc.).
                </Text>
              </View>
            )}
            {activeErrorHint === 'difficulty' && (
              <View style={styles.tooltipAbsolute}>
                <Text style={styles.tooltipText}>You have to choose a difficulty.</Text>
              </View>
            )}
            {activeErrorHint === 'aiStyle' && (
              <View style={styles.tooltipAbsolute}>
                <Text style={styles.tooltipText}>Pick how the AI should behave (Warm, Cold, etc.).</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Persona Picker */}
      <Modal
        visible={showPersonaPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPersonaPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose a persona</Text>

            {isLoadingPersonas ? (
              <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                <ActivityIndicator />
                <Text style={{ color: '#9ca3af', marginTop: 10 }}>Loading personas…</Text>
              </View>
            ) : personas.length === 0 ? (
              <Text style={{ color: '#9ca3af', marginTop: 10 }}>
                No personas found. (Endpoint failed or empty.)
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
                {personas.map((p) => {
                  const name = p.name ?? p.title ?? p.id;
                  const active = p.id === selectedPersonaId;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.itemRow, active && styles.itemRowActive]}
                      onPress={() => setSelectedPersonaId(p.id)}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.itemTitle, active && styles.itemTitleActive]}>{name}</Text>
                      {!!(p.bio ?? p.description) && (
                        <Text style={styles.itemSub} numberOfLines={2}>
                          {String(p.bio ?? p.description)}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowPersonaPicker(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Style Picker */}
      <Modal
        visible={showStylePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStylePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose an AI style</Text>

            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {aiStyles.map((s) => {
                const active = s.key === selectedStyleKey;
                return (
            <TouchableOpacity
              key={s.key}
              style={[styles.itemRow, active && styles.itemRowActive]}
              onPress={() => {
                setSelectedStyleKey(s.key);
                setMissingFields((prev) => ({ ...prev, aiStyle: false }));
                if (activeErrorHint === 'aiStyle') setActiveErrorHint(null);
                setShowStylePicker(false);
              }}
              activeOpacity={0.9}
            >
              <Text style={[styles.itemTitle, active && styles.itemTitleActive]}>{s.name}</Text>
              {!!s.description && (
                <Text style={styles.itemSub} numberOfLines={2}>
                  {s.description}
                </Text>
              )}
            </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowStylePicker(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#111827',
  },
  backBtn: { paddingRight: 10, paddingVertical: 6 },
  backText: { color: '#e5e7eb', fontSize: 22, fontWeight: '600' },
  hTitle: { color: '#f9fafb', fontSize: 18, fontWeight: '800' },
  hSub: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  premiumPill: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 10,
  },
  premiumText: { color: '#fbbf24', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  lockBanner: {
    margin: 14,
    marginBottom: 0,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  lockBannerTitle: { color: '#fbbf24', fontWeight: '800' },
  lockBannerBody: { color: '#9ca3af', marginTop: 4, fontSize: 12, lineHeight: 16 },

  body: { padding: 14, paddingBottom: 26 },

  sectionTitle: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 10,
    letterSpacing: 0.3,
  },

  chipsContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  chipsContainerError: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 8,
  },
  chipsContainerGlow: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    minWidth: 112,
    marginHorizontal: 5,
    marginBottom: 10,
  },
  chipActive: { backgroundColor: '#0b1220', borderColor: '#22c55e' },
  chipInactive: { backgroundColor: '#0b1220', borderColor: '#1f2937' },
  chipText: { color: '#f9fafb', fontWeight: '700', fontSize: 12 },
  chipHint: { color: '#9ca3af', fontSize: 10, marginTop: 3 },
  errorIconChip: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0b1220',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  fieldButtonError: {
    borderColor: '#ef4444',
  },
  fieldButtonGlow: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fieldLabel: { color: '#9ca3af', fontSize: 11, fontWeight: '700' },
  fieldValue: { color: '#f9fafb', fontSize: 14, fontWeight: '800', marginTop: 4 },
  fieldSubtitle: { color: '#64748b', fontSize: 11, marginTop: 2 },
  fieldRight: { flexDirection: 'row', alignItems: 'center' },
  fieldBadge: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    backgroundColor: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chev: { color: '#9ca3af', fontSize: 22, marginLeft: 4 },
  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  errorIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  mainContent: {
    zIndex: 0,
  },
  tooltipOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  tooltipAbsolute: {
    position: 'absolute',
    top: '50%',
    left: 14,
    right: 14,
    marginTop: -30,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    zIndex: 20,
  },
  tooltipText: {
    color: '#e5e7eb',
    fontSize: 12,
    lineHeight: 16,
  },

  helper: { color: '#9ca3af', fontSize: 12, marginBottom: 10, lineHeight: 16 },
  situationExpandedCard: {
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
  },
  situationExpandedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  doneButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  doneButtonText: {
    color: '#e5e7eb',
    fontWeight: '800',
    fontSize: 13,
  },

  inputWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0b1220',
    padding: 12,
  },
  textArea: { minHeight: 120, color: '#f9fafb', fontSize: 14, lineHeight: 18 },
  counter: { color: '#64748b', fontSize: 11, marginTop: 10, alignSelf: 'flex-end' },

  previewBox: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
  },
  previewTitle: { color: '#e5e7eb', fontWeight: '800', marginBottom: 6, fontSize: 12 },
  previewBody: { color: '#9ca3af', fontSize: 12, lineHeight: 16 },

  startBtn: {
    marginTop: 14,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  startBtnText: { color: '#022c22', fontWeight: '900', fontSize: 15 },

  footerNote: { color: '#64748b', fontSize: 11, marginTop: 10, lineHeight: 15 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: '#020617',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  modalTitle: { color: '#f9fafb', fontSize: 16, fontWeight: '900', marginBottom: 10 },

  itemRow: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#111827',
    backgroundColor: '#0b1220',
    marginBottom: 10,
  },
  itemRowActive: { borderColor: '#22c55e' },
  itemTitle: { color: '#f9fafb', fontWeight: '900', fontSize: 14 },
  itemTitleActive: { color: '#6ee7b7' },
  itemSub: { color: '#9ca3af', marginTop: 4, fontSize: 12, lineHeight: 16 },

  modalCloseBtn: {
    marginTop: 4,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: { color: '#e5e7eb', fontWeight: '800' },
});
