import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useState } from 'react';
import PhoneInput from '../PhoneInput';

function Harness() {
  const [value, setValue] = useState({ callingCode: '+63', local: '' });
  return (
    <>
      <PhoneInput id="p" callingCode={value.callingCode} local={value.local} onChange={setValue} />
      <output>{value.callingCode}|{value.local}</output>
    </>
  );
}

const shown = () => document.querySelector('output').textContent;

// 2026-11-06 (passenger redesign): the calling-code choice with flags.
describe('PhoneInput', () => {
  it('shows the Philippine flag and +63 first, and picks another country with the mouse', () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Phone: country calling code' });
    expect(button).toHaveTextContent('+63');
    expect(button.querySelector('img')).toHaveAttribute('src', '/flags/ph.svg');

    fireEvent.click(button);
    const list = screen.getByRole('listbox');
    expect(within(list).getByRole('option', { name: /Philippines/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.mouseDown(within(list).getByRole('option', { name: /Japan/ }));
    expect(shown()).toBe('+81|');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('works with the keyboard: arrows move, Enter picks, Escape closes', () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Phone: country calling code' });
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(shown()).toBe('+65|');
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    fireEvent.keyDown(button, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(shown()).toBe('+65|');
  });

  it('keeps the typed number when the country changes', () => {
    const onChange = vi.fn();
    render(<PhoneInput id="q" callingCode="+63" local="9171234567" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Phone: country calling code' }));
    fireEvent.mouseDown(screen.getByRole('option', { name: /Singapore/ }));
    expect(onChange).toHaveBeenCalledWith({ callingCode: '+65', local: '9171234567' });
  });
});
