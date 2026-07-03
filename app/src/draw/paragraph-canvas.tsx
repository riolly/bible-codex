import { Canvas, Paragraph, Skia, TextAlign } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * THE draw layer — the ONLY place a Skia / CanvasKit import is allowed
 * (ADR-0008). Everything upstream (engine, model, db) is framework-agnostic and
 * a lint guard fails the build if Skia leaks into those dirs.
 *
 * #5 proof: paint one line via the Skia `Paragraph` API. The real typesetting
 * (engine-driven, scroll modes, cascade) arrives in #7–#9.
 */
export function ParagraphCanvas({ text }: { text: string }) {
  const { width } = useWindowDimensions();

  const paragraph = useMemo(() => {
    const para = Skia.ParagraphBuilder.Make({ textAlign: TextAlign.Left })
      .pushStyle({
        color: Skia.Color('black'),
        fontSize: 28,
        fontFamilies: ['serif'],
      })
      .addText(text)
      .build();
    return para;
  }, [text]);

  return (
    <Canvas style={{ flex: 1 }}>
      <Paragraph paragraph={paragraph} x={24} y={24} width={width - 48} />
    </Canvas>
  );
}
