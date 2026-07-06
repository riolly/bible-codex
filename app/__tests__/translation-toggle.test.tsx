import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { TRANSLATIONS, TranslationToggle } from '@/ui/translation-toggle';

// The KJV|BSB control shared by the reader header and the picker (#12).
describe('TranslationToggle', () => {
  it('renders every bundled translation and marks the active one selected', async () => {
    await render(<TranslationToggle value="KJV" onChange={jest.fn()} />);
    for (const t of TRANSLATIONS) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getByLabelText('Show KJV').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Show BSB').props.accessibilityState.selected).toBe(false);
  });

  it('reports the chosen translation on press', async () => {
    const onChange = jest.fn();
    await render(<TranslationToggle value="KJV" onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('Show BSB'));
    expect(onChange).toHaveBeenCalledWith('BSB');
  });
});
