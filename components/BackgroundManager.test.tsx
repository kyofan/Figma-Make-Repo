import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BackgroundManager } from './BackgroundManager';
import { MotionValue } from 'motion/react';
import * as motionReact from 'motion/react';

// Mock motion/react
vi.mock('motion/react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    motion: {
        ...actual.motion,
        div: vi.fn((props: any) => <div data-testid="motion-div" />),
        img: (props: any) => <img {...props} />,
    },
    useSpring: (v: any) => v,
    useTransform: (v: any) => v,
  };
});

describe('BackgroundManager Performance', () => {
  it('uses stable random values across renders (optimized)', () => {
    // Mock props
    const headX = { get: () => 0, set: () => {}, onChange: () => () => {} } as unknown as MotionValue<number>;
    const headY = { get: () => 0, set: () => {}, onChange: () => () => {} } as unknown as MotionValue<number>;

    const { rerender } = render(
      <BackgroundManager
        type="original"
        headX={headX}
        headY={headY}
      />
    );

    // Get the spy from the mocked module
    const motionDivSpy = motionReact.motion.div as unknown as ReturnType<typeof vi.fn>;

    // motionDivSpy is called 8 times (length 8 array)
    expect(motionDivSpy).toHaveBeenCalledTimes(8);
    const firstRenderProps = motionDivSpy.mock.calls[0][0];
    const initial1 = firstRenderProps.initial;
    const animate1 = firstRenderProps.animate;

    // Clear mock to isolate next render
    motionDivSpy.mockClear();

    // Rerender with same props (or different to force update)
    rerender(
      <BackgroundManager
        type="original"
        headX={headX}
        headY={headY}
        parallaxIntensity={51}
      />
    );

    expect(motionDivSpy).toHaveBeenCalledTimes(8);
    const secondRenderProps = motionDivSpy.mock.calls[0][0];
    const initial2 = secondRenderProps.initial;
    const animate2 = secondRenderProps.animate;

    // The Fix: These should now be identical because of useMemo
    expect(initial1).toEqual(initial2);
    expect(animate1).toEqual(animate2);
  });
});
