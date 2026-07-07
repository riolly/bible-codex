import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useUiStore } from '@/store/ui-store';

// Component test under jest-expo: a RN component reads the Zustand store and
// renders. Proves the RN runtime + store wiring without touching Skia.
function SettingsSurfaceLabel() {
  const open = useUiStore((s) => s.settingsSurfaceOpen);
  return <Text>{open ? 'open' : 'closed'}</Text>;
}

describe('SettingsSurfaceLabel', () => {
  it('renders the initial store state', async () => {
    await render(<SettingsSurfaceLabel />);
    expect(screen.getByText('closed')).toBeTruthy();
  });
});
