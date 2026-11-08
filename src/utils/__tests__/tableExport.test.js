import { describe, expect, it } from 'vitest';
import { buildPdf, csvBlocks, fileNameFor, parseCsv } from '../tableExport';

// 2026-11-08 (advisor, user): report downloads offer PDF or CSV; the PDF holds the same cells as the CSV.
describe('report file types', () => {
  it('reads CSV with quotes, doubled quotes, commas and CRLF', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n1,2,3\r\n')).toEqual([['a', 'b, c', 'say "hi"'], ['1', '2', '3']]);
    expect(parseCsv('\uFEFFx\n\ny')).toEqual([['x'], [''], ['y']]);
  });

  it('splits a report into headings, label/value pairs and tables', () => {
    const rows = parseCsv('Shift summary\r\nChauffeur,Stella\r\nDate,2026-11-08\r\n\r\nTrip,From,To\r\n40,Stop A,Stop B\r\n');
    expect(csvBlocks(rows)).toEqual([
      { kind: 'heading', text: 'Shift summary' },
      { kind: 'pairs', body: [['Chauffeur', 'Stella'], ['Date', '2026-11-08']] },
      { kind: 'table', head: ['Trip', 'From', 'To'], body: [['40', 'Stop A', 'Stop B']] },
    ]);
  });

  it('shows the plain value of a cell the server guarded against formulas', () => {
    expect(csvBlocks([['Ref', 'Amount', 'Note'], ["'-12.00", "'=SUM(A1)", 'ok']])[0].body).toEqual([['-12.00', '=SUM(A1)', 'ok']]);
  });

  it('names the file for the chosen type', () => {
    expect(fileNameFor('financial-daily-2026-11-08.csv', 'pdf')).toBe('financial-daily-2026-11-08.pdf');
    expect(fileNameFor('shift-summary-2026-11-08.csv', 'csv')).toBe('shift-summary-2026-11-08.csv');
    expect(fileNameFor('', 'pdf')).toBe('report.pdf');
  });

  it('builds a PDF from the CSV', async () => {
    const doc = await buildPdf('Trip,From,To\r\n40,Stop A,Stop B\r\n', { title: 'Sample report' });
    const bytes = doc.output('arraybuffer');
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
