import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { THEMES } from '@/draw/style';
import { AdjustPanel, type AdjustPanelProps } from '@/ui/adjust-panel';

// Presentational panel under jest-expo: proves it renders the resolved values
// and reports every change through its callbacks, with no expo-sqlite client.
function props(over: Partial<AdjustPanelProps> = {}): AdjustPanelProps {
  return {
    visible: true,
    theme: 'light',
    palette: THEMES.light,
    values: { fontFamily: 'Cardo', fontSize: 18, lineHeight: 1.6, measure: 30, railWidth: 6 },
    fontFamilies: ['Cardo'],
    presets: [
      { id: 'a', name: 'Reading' },
      { id: 'b', name: 'Large Print' },
    ],
    activePresetId: 'a',
    onClose: jest.fn(),
    onTheme: jest.fn(),
    onSelectPreset: jest.fn(),
    onFontFamily: jest.fn(),
    onFontSize: jest.fn(),
    onLineHeight: jest.fn(),
    onMeasure: jest.fn(),
    onMargin: jest.fn(),
    onExport: jest.fn(),
    onImport: jest.fn(),
    ...over,
  };
}

describe('AdjustPanel', () => {
  it('renders nothing when hidden', async () => {
    await render(<AdjustPanel {...props({ visible: false })} />);
    expect(screen.queryByText('Adjust')).toBeNull();
  });

  it('shows the current size and preset choices', async () => {
    await render(<AdjustPanel {...props()} />);
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('Reading')).toBeTruthy();
    expect(screen.getByText('Large Print')).toBeTruthy();
  });

  it('increasing size reports fontSize + 1', async () => {
    const onFontSize = jest.fn();
    await render(<AdjustPanel {...props({ onFontSize })} />);
    fireEvent.press(screen.getByLabelText('Increase Size'));
    expect(onFontSize).toHaveBeenCalledWith(19);
  });

  it('increasing margin reports the rail width + 1 (ADR-0016 outward expansion)', async () => {
    const onMargin = jest.fn();
    await render(<AdjustPanel {...props({ onMargin })} />);
    fireEvent.press(screen.getByLabelText('Increase Margin'));
    expect(onMargin).toHaveBeenCalledWith(7);
  });

  it('selecting the dark theme reports it', async () => {
    const onTheme = jest.fn();
    await render(<AdjustPanel {...props({ onTheme })} />);
    fireEvent.press(screen.getByLabelText('Dark'));
    expect(onTheme).toHaveBeenCalledWith('dark');
  });

  it('selecting a preset reports its id', async () => {
    const onSelectPreset = jest.fn();
    await render(<AdjustPanel {...props({ onSelectPreset })} />);
    fireEvent.press(screen.getByText('Large Print'));
    expect(onSelectPreset).toHaveBeenCalledWith('b');
  });

  it('the Data buttons fire export and import (#13)', async () => {
    const onExport = jest.fn();
    const onImport = jest.fn();
    await render(<AdjustPanel {...props({ onExport, onImport })} />);
    fireEvent.press(screen.getByLabelText('Export'));
    fireEvent.press(screen.getByLabelText('Import'));
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledTimes(1);
  });
});
