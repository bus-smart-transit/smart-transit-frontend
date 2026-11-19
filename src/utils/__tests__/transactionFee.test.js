import { describe, expect, it } from 'vitest';
import { ratePercentLabel, transactionFee } from '../transactionFee';

const rates = { gcash: 2.4976, maya: 2.0048 };

describe('transaction fee shown before paying (Batch 75)', () => {
  it('follows the chosen e-wallet rate on the fares, rounded to the centavo, like the server', () => {
    expect(transactionFee(rates, 'gcash', 100)).toBe(2.5);
    expect(transactionFee(rates, 'maya', 100)).toBe(2);
    expect(transactionFee(rates, 'gcash', 114)).toBe(2.85);
  });

  it('is not guessed before the rates load, and charges on at least PHP 1', () => {
    expect(transactionFee(null, 'gcash', 100)).toBeNull();
    expect(transactionFee(rates, 'gcash', 0)).toBe(0.02);
    expect(ratePercentLabel(rates, 'maya')).toBe('2.00%');
  });
});
