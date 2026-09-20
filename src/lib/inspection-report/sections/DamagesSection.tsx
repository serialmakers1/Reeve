import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { SectionHeading, StatusChip } from './PdfPrimitives';
import { PdfIcon } from './PdfIcon';
import { normalizeSeverity, nextAction, SEVERITY_LABEL, SEVERITY_TONE } from './issueDisplay';
import type { DamageItem } from '@/types/inspection';

const s = StyleSheet.create({
  section: { marginBottom: 18 },
  empty: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BRAND.goodBg, borderRadius: 8, padding: 12,
  },
  emptyText: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRAND.goodText, marginLeft: 8 },

  card: {
    backgroundColor: BRAND.white,
    borderWidth: 1, borderColor: BRAND.borderSoft,
    borderRadius: 8, marginBottom: 8, overflow: 'hidden',
  },
  accentBar: { height: 4 },
  cardInner: { padding: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headIcon: { marginRight: 6 },
  headText: { flex: 1 },
  location: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: BRAND.foreground },
  type: { fontSize: 8, color: BRAND.mutedForeground, marginTop: 1 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  metaItem: { marginRight: 14, marginBottom: 2 },
  metaLabel: { fontSize: 7, color: BRAND.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.3 },
  metaValue: { fontSize: 9, color: BRAND.foreground },

  notes: { fontSize: 9, color: BRAND.foreground, marginTop: 4, lineHeight: 1.4 },

  actionPanel: { marginTop: 6, backgroundColor: BRAND.coolGray, borderRadius: 6, padding: 6 },
  actionText: { fontSize: 9, color: BRAND.foreground, lineHeight: 1.4 },
  actionLabelInline: { fontFamily: 'Helvetica-Bold', color: BRAND.mutedForeground },
});

export function DamagesSection({ damages }: { damages: DamageItem[] }) {
  if (damages.length === 0) {
    return (
      <View style={s.section}>
        <SectionHeading
          icon="warning" title="Issues Requiring Attention" accent={BRAND.blue}
          id="sec-issues" bookmark="Issues Requiring Attention"
          descriptor="Items recorded for review, maintenance or urgent attention."
        />
        <View style={s.empty}>
          <PdfIcon name="check" size={14} color={BRAND.goodText} />
          <Text style={s.emptyText}>No issues requiring attention were recorded.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.section}>
      <SectionHeading
        icon="warning" title="Issues Requiring Attention" accent={BRAND.blue}
        id="sec-issues" bookmark="Issues Requiring Attention"
        descriptor="Items recorded for review, maintenance or urgent attention."
      />
      {damages.map((d, i) => {
        const key = normalizeSeverity(d.severity);
        const tone = key ? SEVERITY_TONE[key] : { text: BRAND.mutedForeground, bg: BRAND.coolGray };
        const action = nextAction(d);
        return (
          <View key={d.localId ?? i} style={s.card}>
            <View style={[s.accentBar, { backgroundColor: tone.text }]} />
            <View style={s.cardInner}>
              {/* Short identity block: header + condition kept together, and
                  minPresenceAhead reserves room for following notes/action so a
                  card cannot begin with only its header at a page bottom. */}
              <View wrap={false} minPresenceAhead={48}>
                <View style={s.headRow}>
                  <View style={s.headIcon}>
                    <PdfIcon name="warning" size={12} color={tone.text} />
                  </View>
                  <View style={s.headText}>
                    <Text style={s.location}>{d.location || d.damage_type || 'Recorded item'}</Text>
                    <Text style={s.type}>
                      {d.damage_type || '—'}{d.is_auto_generated ? '  ·  Auto' : ''}
                    </Text>
                  </View>
                  {key ? <StatusChip text={SEVERITY_LABEL[key]} tone={tone} /> : null}
                </View>
                {d.source_condition ? (
                  <View style={s.metaRow}>
                    <View style={s.metaItem}>
                      <Text style={s.metaLabel}>Condition</Text>
                      <Text style={s.metaValue}>{d.source_condition}</Text>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* wrappable body */}
              {d.notes ? <Text style={s.notes}>{d.notes}</Text> : null}
              {action ? (
                <View style={s.actionPanel}>
                  <Text style={s.actionText}>
                    <Text style={s.actionLabelInline}>Next Action: </Text>{action}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
