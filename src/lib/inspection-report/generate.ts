import { createElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import type { SupabaseClient } from '@supabase/supabase-js';
import { registerFonts } from './styles';
import { formatFilenameDate } from './formatters';
import type { ReportPayload } from './types';

/**
 * Generates the inspection report PDF, saves a record in inspection_reports,
 * and triggers a browser download.
 *
 * @param payload   All data needed to render the PDF.
 * @param supabase  Authenticated Supabase client from the calling component.
 * @param flush     Optional async callback to flush any pending debounced saves
 *                  before generating (avoids stale data in the PDF).
 */
export async function generateReportPdf(
  payload: ReportPayload,
  supabase: SupabaseClient,
  flush?: () => Promise<void>,
): Promise<void> {
  // 1. Flush pending saves so the PDF captures the latest state.
  if (flush) await flush();

  // 2. Resolve the current user for the audit row.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 3. Insert audit record — blocking. PDF must not be issued without a DB row.
  const { error: insertError } = await (supabase as any)
    .from('inspection_reports')
    .insert({
      inspection_id: payload.inspection.id,
      report_type: payload.reportType,
      generated_by: user.id,
      inspector_name_snapshot: payload.inspectorName,
    });

  if (insertError) {
    throw new Error(`Could not record report: ${(insertError as any).message}`);
  }

  // 4. Register fonts (idempotent).
  registerFonts();

  // 5. Lazy-import @react-pdf/renderer to keep it out of the initial bundle.
  const { pdf } = await import('@react-pdf/renderer');
  const { ReportDocument } = await import('./ReportDocument');

  // 6. Render PDF blob.
  const element = createElement(ReportDocument, { payload });
  const blob = await pdf(element as React.ReactElement<DocumentProps>).toBlob();

  // 7. Trigger download.
  const date = formatFilenameDate(payload.generatedAt);
  const shortId = payload.property.id.slice(0, 8);
  const filename = `${payload.reportType}_${shortId}_${date}.pdf`;
  saveAs(blob, filename);
}
