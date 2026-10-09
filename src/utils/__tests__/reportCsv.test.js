import { describe, expect, test } from 'vitest';
import { csvCell, reportFileName, reportToCsv } from '../reportCsv';

describe('csvCell', () => {
  test('leaves plain text alone and quotes what needs it', () => {
    expect(csvCell('Davao')).toBe('Davao');
    expect(csvCell('Davao, Tagum')).toBe('"Davao, Tagum"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(0)).toBe('0');
  });

  test('stops a spreadsheet running a cell as a formula', () => {
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe('"\'=HYPERLINK(""http://evil"",""x"")"');
    expect(csvCell('+1+1')).toBe("'+1+1");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('-2+3')).toBe("'-2+3");
    expect(csvCell('\tx')).toBe("'\tx");
  });

  test('keeps a negative number a number', () => {
    expect(csvCell(-12.5)).toBe('-12.5');
    expect(csvCell('-3')).toBe('-3');
  });
});

describe('reportToCsv', () => {
  test('writes a header with readable names, one line per row, CRLF line ends and a BOM', () => {
    const csv = reportToCsv(['route_name', 'adherence_rate'], [{ route_name: 'A, B', adherence_rate: 92.5 }, { route_name: '=bad', adherence_rate: null }]);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.slice(1)).toBe('route name,adherence rate\r\n"A, B",92.5\r\n\'=bad,\r\n');
  });

  test('uses the same text as the table when given a format', () => {
    const csv = reportToCsv(['n'], [{ n: 1234.5 }], (value) => value.toLocaleString('en-PH'));
    expect(csv).toContain('"1,234.5"');
  });

  test('has only a header when there are no rows', () => {
    expect(reportToCsv(['a', 'b'], []).slice(1)).toBe('a,b\r\n');
  });
});

describe('reportFileName', () => {
  test('names the report, the bus and the period, with safe characters only', () => {
    expect(reportFileName({ type: 'adherence', fleet: 'ABC 123', from: '2026-10-01', to: '2026-10-09' })).toBe('fleet-report-adherence-ABC-123-2026-10-01_to_2026-10-09.csv');
    expect(reportFileName({ type: 'daily', fleet: '../x/y', from: '', to: '' })).toBe('fleet-report-daily-x-y-month-to-date.csv');
    expect(reportFileName({ type: 'daily', fleet: 'B', from: '2026-10-01', to: '' })).toBe('fleet-report-daily-B-2026-10-01_to_today.csv');
  });
});
