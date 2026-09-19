import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { formatINDateTimeIST, shortPropertyId as shortRefId } from '../formatters';

const s = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    backgroundColor: '#ffffff',
  },
  col: { flex: 1 },
  colCenter: { flex: 1, alignItems: 'center' },
  colRight: { flex: 1, alignItems: 'flex-end' },
  text: { fontSize: 7, color: BRAND.mutedForeground },
});

interface Props {
  inspectionId: string;
  buildingName: string | null;
  generatedAt: Date;
}

export function PageFooter({ inspectionId, buildingName, generatedAt }: Props) {
  const left = `${shortRefId(inspectionId)}${buildingName ? ' · ' + buildingName : ''}`;
  const right = `Generated ${formatINDateTimeIST(generatedAt)}`;
  return (
    <View style={s.footer} fixed>
      <View style={s.col}>
        <Text style={s.text}>{left}</Text>
      </View>
      <View style={s.colCenter}>
        <Text
          style={s.text}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </View>
      <View style={s.colRight}>
        <Text style={s.text}>{right}</Text>
      </View>
    </View>
  );
}
