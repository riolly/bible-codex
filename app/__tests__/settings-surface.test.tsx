import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { THEMES } from '@/draw/style';
import { SettingsSurface, type SettingsSurfaceProps } from '@/ui/settings-surface';

function props(over: Partial<SettingsSurfaceProps> = {}): SettingsSurfaceProps {
  return {
    visible: true,
    theme: 'light',
    palette: THEMES.light,
    presets: [
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional print Bible.',
        paperTint: '#F6F0E4',
      },
      {
        id: 'modern',
        name: 'Modern',
        description: 'Contemporary reading.',
        paperTint: '#FAFAF8',
      },
    ],
    activePresetId: 'classic',
    fontScale: 1,
    onClose: jest.fn(),
    onTheme: jest.fn(),
    onSelectPreset: jest.fn(),
    onFontScale: jest.fn(),
    ...over,
  };
}

describe('SettingsSurface', () => {
  it('renders nothing when hidden', async () => {
    await render(<SettingsSurface {...props({ visible: false })} />);
    expect(screen.queryByText('Settings')).toBeNull();
  });

  it('renders both preset personalities as selectable cards', async () => {
    await render(<SettingsSurface {...props()} />);
    expect(screen.getByLabelText('Classic preset')).toBeTruthy();
    expect(screen.getByLabelText('Modern preset')).toBeTruthy();
    expect(screen.getByText('Traditional print Bible.')).toBeTruthy();
    expect(screen.getByText('Contemporary reading.')).toBeTruthy();
  });

  it('selecting a preset reports its slug', async () => {
    const onSelectPreset = jest.fn();
    await render(<SettingsSurface {...props({ onSelectPreset })} />);
    fireEvent.press(screen.getByLabelText('Modern preset'));
    expect(onSelectPreset).toHaveBeenCalledWith('modern');
  });

  it('steps fontScale directly', async () => {
    const onFontScale = jest.fn();
    await render(<SettingsSurface {...props({ fontScale: 1, onFontScale })} />);
    fireEvent.press(screen.getByLabelText('Increase Font scale'));
    expect(onFontScale).toHaveBeenCalledWith(1.05);
  });

  it('keeps fontScale stepping independent from the active preset', async () => {
    const onFontScale = jest.fn();
    await render(<SettingsSurface {...props({ activePresetId: 'modern', fontScale: 1.2, onFontScale })} />);
    fireEvent.press(screen.getByLabelText('Decrease Font scale'));
    expect(onFontScale).toHaveBeenCalledWith(1.15);
  });

  it('selecting the dark theme reports it', async () => {
    const onTheme = jest.fn();
    await render(<SettingsSurface {...props({ onTheme })} />);
    fireEvent.press(screen.getByLabelText('Dark'));
    expect(onTheme).toHaveBeenCalledWith('dark');
  });

  it('closes through the Done button', async () => {
    const onClose = jest.fn();
    await render(<SettingsSurface {...props({ onClose })} />);
    fireEvent.press(screen.getByLabelText('Close settings'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
