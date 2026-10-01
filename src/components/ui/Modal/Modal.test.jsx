import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import Modal, { ModalShell } from './index';

afterEach(cleanup);

describe('shared Modal / ModalShell', () => {
  it('renders into the document body, not inside the page container, so no ancestor can clip or cover it', () => {
    const { container } = render(<div data-testid="page"><Modal open onClose={() => {}} title="Hello">body</Modal></div>);

    const dialog = screen.getByRole('dialog', { name: 'Hello' });
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it('centres with min-h-full instead of items-center on the scrolling overlay, so a tall dialog starts at its top', () => {
    render(<Modal open onClose={() => {}} title="Tall">content</Modal>);
    const overlay = screen.getByRole('dialog').parentElement.parentElement;

    expect(overlay.className).toMatch(/overflow-y-auto/);
    expect(overlay.className).not.toMatch(/items-center/); // the clipped-top bug
    expect(screen.getByRole('dialog').parentElement.className).toMatch(/min-h-full/);
  });

  it('keeps the title row fixed and scrolls the body, within the dynamic viewport', () => {
    render(<Modal open onClose={() => {}} title="Scrolling">content</Modal>);
    const panel = screen.getByRole('dialog').firstElementChild;

    expect(panel.className).toMatch(/max-h-\[calc\(100dvh-2rem\)\]/);
    expect(panel.lastElementChild.className).toMatch(/overflow-y-auto/);
    expect(panel.firstElementChild.className).toMatch(/shrink-0/);
  });

  it('fills the screen on mobile when asked', () => {
    render(<Modal open onClose={() => {}} title="Full" fullScreenOnMobile>x</Modal>);
    expect(screen.getByRole('dialog').firstElementChild.className).toMatch(/h-dvh/);
  });

  it('closes on Escape and on the overlay, not on the dialog itself; locks scroll and restores focus', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal open={open} onClose={() => setOpen(false)} title="Dlg"><input aria-label="Name" /></Modal>
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);

    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByLabelText('Name'));
    expect(screen.queryByRole('dialog')).not.toBeNull();

    fireEvent.click(screen.getByRole('dialog').parentElement.parentElement); // the overlay
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(document.activeElement).toBe(opener);

    fireEvent.click(opener);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('traps Tab inside the dialog', () => {
    render(<Modal open onClose={() => {}} title="Trap"><button>First</button><button>Last</button></Modal>);
    const buttons = [...screen.getByRole('dialog').querySelectorAll('button')];
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(buttons[0]);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });

  it('ModalShell with closeOnOverlay off ignores overlay clicks (a dialog that must be answered)', () => {
    const onClose = vi.fn();
    render(<ModalShell label="Confirm" onClose={onClose} closeOnOverlay={false}><div>panel</div></ModalShell>);

    fireEvent.click(screen.getByRole('dialog').parentElement.parentElement);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not steal focus on re-render', () => {
    function Harness() {
      const [text, setText] = useState('');
      return <Modal open onClose={() => {}} title="Form"><input aria-label="Name" value={text} onChange={(e) => setText(e.target.value)} /></Modal>;
    }
    render(<Harness />);
    const input = screen.getByLabelText('Name');
    input.focus();
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(document.activeElement).toBe(input);
  });
});
