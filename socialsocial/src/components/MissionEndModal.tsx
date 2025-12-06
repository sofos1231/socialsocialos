// FILE: socialsocial/src/components/MissionEndModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { getEndReasonCopy, type MissionStatePayload } from '../logic/missionEndReasons';

type Props = {
  visible: boolean;
  missionState?: MissionStatePayload | null;
  onClose: () => void;
  onTryAgain?: () => void;
  onRules?: () => void;
  onViewStats?: () => void;
  onBackToMissions?: () => void;
  primaryLabel?: string; // default "Continue"
  tryAgainLabel?: string; // default "Try again"
  rulesLabel?: string; // default "Rules"
  viewStatsLabel?: string; // default "View stats"
  backToMissionsLabel?: string; // default "Back to missions"
};

export default function MissionEndModal({
  visible,
  missionState,
  onClose,
  onTryAgain,
  onRules,
  onViewStats,
  onBackToMissions,
  primaryLabel = 'Continue',
  tryAgainLabel = 'Try again',
  rulesLabel = 'Rules',
  viewStatsLabel = 'View stats',
  backToMissionsLabel = 'Back to missions',
}: Props) {
  const copy = getEndReasonCopy(missionState);

  const tone = copy.tone;
  const toneColors = {
    success: { bg: '#0f5132', border: '#198754' },
    fail: { bg: '#5a1a1a', border: '#dc3545' },
    warning: { bg: '#5c4b00', border: '#ffc107' },
    danger: { bg: '#5a0b14', border: '#ff3b30' },
    neutral: { bg: '#1f2937', border: '#334155' },
  }[tone] ?? { bg: '#1f2937', border: '#334155' };

  const isDisqualified =
    (missionState?.status === 'DISQUALIFIED') || copy.code === 'ABORT_DISQUALIFIED';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderColor: toneColors.border }]}>
          {isDisqualified ? (
            <View style={[styles.bannerDanger, { borderColor: toneColors.border }]}>
              <Text style={styles.bannerDangerTitle}>DISQUALIFIED</Text>
              <Text style={styles.bannerDangerText}>
                {copy.disqualifyNote ?? 'You broke a mission rule.'}
              </Text>
            </View>
          ) : null}

          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>

          {/* future-proof area: timer/strikes/mood collapse/gate sequence */}
          <View style={styles.metaRow}>
            {!!missionState?.progressPct && (
              <Text style={styles.metaText}>Progress: {Math.round(missionState.progressPct)}%</Text>
            )}
          </View>

          <View style={styles.actions}>
            {onTryAgain ? (
              <Pressable
                onPress={onTryAgain}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryBtnText}>{tryAgainLabel}</Text>
              </Pressable>
            ) : null}

            {copy.showRulesCTA && onRules ? (
              <Pressable
                onPress={onRules}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryBtnText}>{rulesLabel}</Text>
              </Pressable>
            ) : null}

            {onViewStats ? (
              <Pressable
                onPress={onViewStats}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryBtnText}>{viewStatsLabel}</Text>
              </Pressable>
            ) : null}

            {onBackToMissions ? (
              <Pressable
                onPress={onBackToMissions}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryBtnText}>{backToMissionsLabel}</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: toneColors.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
            </Pressable>
          </View>

          <Text style={styles.footerNote}>
            {Platform.OS === 'ios' ? 'Tap outside to close' : 'Press back to close'}
          </Text>
        </View>

        <Pressable style={styles.outsideTapArea} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  outsideTapArea: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0b1220',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    zIndex: 2,
  },
  bannerDanger: {
    backgroundColor: '#13030a',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  bannerDangerTitle: {
    color: '#ff3b30',
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  bannerDangerText: {
    color: '#ffd6d6',
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: '#b7c2d4',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metaText: {
    color: '#93a4bd',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#0b1220',
    fontWeight: '800',
  },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0b1220',
    minWidth: 110,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  footerNote: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 11,
    textAlign: 'right',
  },
});
