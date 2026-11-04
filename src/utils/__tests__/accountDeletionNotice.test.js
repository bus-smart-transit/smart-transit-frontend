import { beforeEach, describe, expect, it } from 'vitest';
import { leaveAccountDeletionNotice, takeAccountDeletionNotice } from '../accountDeletionNotice';

describe('accountDeletionNotice', () => {
  beforeEach(() => sessionStorage.clear());

  it('gives the notice back once, then nothing', () => {
    leaveAccountDeletionNotice({ deletesOn: '2026-11-12' });

    expect(takeAccountDeletionNotice()).toEqual({ deletesOn: '2026-11-12' });
    expect(takeAccountDeletionNotice()).toBeNull();
  });

  it('is empty when nothing was left', () => {
    expect(takeAccountDeletionNotice()).toBeNull();
  });
});
