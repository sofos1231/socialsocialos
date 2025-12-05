// FILE: socialsocial/src/screens/FreePlayConfigScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

export default function FreePlayConfigScreen({ navigation }: Props) {
  // Premium-only enforcement: allow while developing, block in production
  const hasPremium = (globalThis as any).__DEV__ === true; // TODO connect real entitlements later
  const premiumBlocked = !hasPremium;

  const [place, setPlace] = useState<FreePlayPlace>('TINDER');
  const [difficulty, setDifficulty] = useState<FreePlayDifficulty>('EASY');

  const [personas, setPersonas] = useState<PersonaLite[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

  const [aiStyles, setAiStyles] = useState<AiStyleLite[]>(FALLBACK_STYLES);
  const [isLoadingStyles, setIsLoadingStyles] = useState(false);
  const [selectedStyleKey, setSelectedStyleKey] = useState<string>(
    FALLBACK_STYLES[0]?.key ?? 'WARM',
  );

  const [situation, setSituation] = useState('');

  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);

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
            if (!mapped.find((x) => x.key === selectedStyleKey)) {
              setSelectedStyleKey(mapped[0].key);
            }
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

  const selectedPersona = useMemo(() => {
    if (!selectedPersonaId) return null;
    return personas.find((p) => p.id === selectedPersonaId) ?? null;
  }, [personas, selectedPersonaId]);

  const selectedStyle = useMemo(() => {
    return aiStyles.find((s) => s.key === selectedStyleKey) ?? aiStyles[0] ?? null;
  }, [aiStyles, selectedStyleKey]);

  const placeLabel = useMemo(() => PLACES.find((p) => p.key === place)?.label ?? place, [place]);
  const styleName = selectedStyle?.name ?? 'Style';
  const personaName =
    selectedPersona?.name ?? selectedPersona?.title ?? (selectedPersonaId ? 'Persona' : 'Random');

  const title = useMemo(() => `Free Play • ${placeLabel} • ${difficulty}`, [placeLabel, difficulty]);

  const builtTopic = useMemo(() => {
    const cleanSituation = situation.trim();
    const situationText = cleanSituation.length ? cleanSituation : '(no situation provided)';

    return [
      'FREEPLAY SCENARIO',
      `Place: ${placeLabel}`,
      `Difficulty: ${difficulty}`,
      `AI Style: ${styleName} (${selectedStyleKey})`,
      `Persona: ${personaName}`,
      '',
      'Situation:',
      situationText,
      '',
      'Instruction:',
      'Stay consistent with the persona + style above. Reply naturally like real chat in that place.',
    ].join('\n');
  }, [placeLabel, difficulty, styleName, selectedStyleKey, personaName, situation]);

  const canStart = useMemo(() => situation.trim().length >= 10, [situation]);

  const handleStart = () => {
    if (premiumBlocked) {
      Alert.alert(
        'Premium only',
        'Free Play is premium-only. You can keep dev access while building, but production must require premium.',
      );
      return;
    }

    if (!canStart) {
      Alert.alert('Add a situation', 'Write at least 10 characters so the AI actually has context.');
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
  }: {
    label: string;
    value: string;
    onPress: () => void;
    badge?: string;
    loading?: boolean;
  }) => (
    <TouchableOpacity style={styles.fieldButton} onPress={onPress} activeOpacity={0.9}>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue} numberOfLines={1}>
          {value}
        </Text>
      </View>

      <View style={styles.fieldRight}>
        {!!badge && <Text style={styles.fieldBadge}>{badge}</Text>}
        {loading ? <ActivityIndicator /> : <Text style={styles.chev}>›</Text>}
      </View>
    </TouchableOpacity>
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

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <SectionTitle>Place</SectionTitle>
        <View style={styles.chipsRow}>
          {PLACES.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={chip(place === p.key)}
              activeOpacity={0.9}
              onPress={() => setPlace(p.key)}
            >
              <Text style={styles.chipText}>
                {p.emoji} {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionTitle>Difficulty</SectionTitle>
        <View style={styles.chipsRow}>
          {DIFFICULTIES.map((d) => (
            <TouchableOpacity
              key={d.key}
              style={chip(difficulty === d.key)}
              activeOpacity={0.9}
              onPress={() => setDifficulty(d.key)}
            >
              <Text style={styles.chipText}>{d.label}</Text>
              <Text style={styles.chipHint}>{d.hint}</Text>
            </TouchableOpacity>
          ))}
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
        />

        <SectionTitle>Situation</SectionTitle>
        <Text style={styles.helper}>
          Give context like a real scenario. The better this is, the more realistic the AI behaves.
        </Text>

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
          />
          <Text style={styles.counter}>{situation.length}/800</Text>
        </View>

        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>What will be sent to the AI (topic)</Text>
          <Text style={styles.previewBody} numberOfLines={10}>
            {builtTopic}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.startBtn, !canStart && styles.startBtnDisabled]}
          activeOpacity={0.9}
          onPress={handleStart}
        >
          <Text style={styles.startBtnText}>{premiumBlocked ? 'Premium required' : 'Start Free Play'}</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Part 2 uses a public /ai-styles endpoint and will also send aiStyleKey as a real request field.
        </Text>
      </ScrollView>

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
                    onPress={() => setSelectedStyleKey(s.key)}
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

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    minWidth: 112,
  },
  chipActive: { backgroundColor: '#0b1220', borderColor: '#22c55e' },
  chipInactive: { backgroundColor: '#0b1220', borderColor: '#1f2937' },
  chipText: { color: '#f9fafb', fontWeight: '700', fontSize: 12 },
  chipHint: { color: '#9ca3af', fontSize: 10, marginTop: 3 },

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
  fieldLabel: { color: '#9ca3af', fontSize: 11, fontWeight: '700' },
  fieldValue: { color: '#f9fafb', fontSize: 14, fontWeight: '800', marginTop: 4 },
  fieldRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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

  helper: { color: '#9ca3af', fontSize: 12, marginBottom: 10, lineHeight: 16 },

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
  startBtnDisabled: { opacity: 0.45 },
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
