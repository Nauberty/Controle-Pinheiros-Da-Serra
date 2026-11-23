export function downloadFile(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Gera CSV com ";" (abre direto no Excel em português) e BOM UTF-8 para acentos. */
export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  downloadFile(filename, csv, 'text/csv;charset=utf-8');
}

/** centavos -> "123,45" para planilhas */
export const csvMoney = (cents: number) => ((cents || 0) / 100).toFixed(2).replace('.', ',');
