import { describe, expect, it } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { DEFAULT_POSITION } from '@/model/reading-position';
import { useReadingPosition } from '@/store/reading-position';

// The reader reads the current position from the store; the picker and the
// flip gesture (#9) both write it via goTo. This proves the single source:
// a goTo re-renders the reader-facing view — the two affordances cannot
// disagree because there is only one place to read from.
function PositionLabel() {
  const { book, chapter } = useReadingPosition((s) => s.position);
  return <Text>{`${book} ${chapter}`}</Text>;
}

describe('reading-position store', () => {
  it('seeds the default position and re-renders readers on goTo', async () => {
    useReadingPosition.setState({ position: DEFAULT_POSITION });
    await render(<PositionLabel />);
    expect(screen.getByText('Genesis 1')).toBeTruthy();

    await act(async () => {
      useReadingPosition.getState().goTo({ translation: 'BSB', book: 'John', chapter: 3 });
    });
    expect(screen.getByText('John 3')).toBeTruthy();
  });
});
