import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LanguageSettings from './LanguageSettings.jsx';

const updatePreferredLanguage = vi.fn(() => Promise.resolve());
const state = {
  currentUser: { id: 'me', preferredLanguage: 'fr' },
  updatePreferredLanguage,
};

vi.mock('../../../lib/stores/userStore.js', () => ({
  useUserStore: (selector) => selector(state),
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('LanguageSettings', () => {
  beforeEach(() => {
    updatePreferredLanguage.mockClear();
  });

  it("shows the user's preferred language", () => {
    render(<LanguageSettings onClose={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveValue('fr');
  });

  it('saves the new language when the select changes', async () => {
    render(<LanguageSettings onClose={() => {}} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'rw' } });
    await waitFor(() => expect(updatePreferredLanguage).toHaveBeenCalledWith('rw'));
  });

  it('calls onClose when Done is clicked', () => {
    const onClose = vi.fn();
    render(<LanguageSettings onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
