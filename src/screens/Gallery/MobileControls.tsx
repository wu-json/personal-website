import type { RefObject } from 'react';

import { useRef, useCallback } from 'react';

import type { MobileInput } from './index';

const JOYSTICK_SIZE = 120;
const KNOB_SIZE = 48;
const MAX_RADIUS = (JOYSTICK_SIZE - KNOB_SIZE) / 2;
const LOOK_SENSITIVITY = 0.003;

const MobileControls = ({
  inputRef,
  onMoveStart,
  onLookStart,
}: {
  inputRef: RefObject<MobileInput | null>;
  onMoveStart?: () => void;
  onLookStart?: () => void;
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const joystickTouchId = useRef<number | null>(null);
  const joystickCenter = useRef({ x: 0, y: 0 });

  const lookTouchId = useRef<number | null>(null);
  const lookLastPos = useRef({ x: 0, y: 0 });

  // --- Joystick handlers ---
  const onJoystickTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (joystickTouchId.current !== null) return;
      const touch = e.changedTouches[0]!;
      joystickTouchId.current = touch.identifier;
      const rect = joystickRef.current!.getBoundingClientRect();
      joystickCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      onMoveStart?.();
    },
    [onMoveStart],
  );

  const onJoystickTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]!;
        if (touch.identifier !== joystickTouchId.current) continue;

        let dx = touch.clientX - joystickCenter.current.x;
        let dy = touch.clientY - joystickCenter.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > MAX_RADIUS) {
          dx = (dx / dist) * MAX_RADIUS;
          dy = (dy / dist) * MAX_RADIUS;
        }

        // Update knob position directly (no React state)
        if (knobRef.current) {
          knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
        }

        // Normalize to -1..1
        if (inputRef.current) {
          inputRef.current.moveX = dx / MAX_RADIUS;
          inputRef.current.moveY = -(dy / MAX_RADIUS); // invert: up = forward
        }
      }
    },
    [inputRef],
  );

  const onJoystickTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i]!.identifier === joystickTouchId.current) {
          joystickTouchId.current = null;
          if (knobRef.current) {
            knobRef.current.style.transform = 'translate(0px, 0px)';
          }
          if (inputRef.current) {
            inputRef.current.moveX = 0;
            inputRef.current.moveY = 0;
          }
        }
      }
    },
    [inputRef],
  );

  // --- Look handlers ---
  const onLookTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (lookTouchId.current !== null) return;
      const touch = e.changedTouches[0]!;
      lookTouchId.current = touch.identifier;
      lookLastPos.current = { x: touch.clientX, y: touch.clientY };
      onLookStart?.();
    },
    [onLookStart],
  );

  const onLookTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i]!;
        if (touch.identifier !== lookTouchId.current) continue;

        const dx = touch.clientX - lookLastPos.current.x;
        const dy = touch.clientY - lookLastPos.current.y;
        lookLastPos.current = { x: touch.clientX, y: touch.clientY };

        if (inputRef.current) {
          inputRef.current.lookDeltaX += dx * LOOK_SENSITIVITY;
          inputRef.current.lookDeltaY += dy * LOOK_SENSITIVITY;
        }
      }
    },
    [inputRef],
  );

  const onLookTouchEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i]!.identifier === lookTouchId.current) {
        lookTouchId.current = null;
      }
    }
  }, []);

  return (
    <>
      {/* Look area — right ~65% of screen */}
      <div
        className='fixed top-0 right-0 bottom-0 touch-none'
        style={{ left: '35%' }}
        onTouchStart={onLookTouchStart}
        onTouchMove={onLookTouchMove}
        onTouchEnd={onLookTouchEnd}
        onTouchCancel={onLookTouchEnd}
      />
      {/* Joystick — bottom-left */}
      <div
        ref={joystickRef}
        className='fixed bottom-6 left-6 touch-none rounded-full border border-[color:var(--color-ink-ghost)]'
        style={{ width: JOYSTICK_SIZE, height: JOYSTICK_SIZE }}
        onTouchStart={onJoystickTouchStart}
        onTouchMove={onJoystickTouchMove}
        onTouchEnd={onJoystickTouchEnd}
        onTouchCancel={onJoystickTouchEnd}
      >
        <div
          ref={knobRef}
          className='absolute rounded-full bg-[color:var(--color-ink-faint)]'
          style={{
            width: KNOB_SIZE,
            height: KNOB_SIZE,
            left: (JOYSTICK_SIZE - KNOB_SIZE) / 2,
            top: (JOYSTICK_SIZE - KNOB_SIZE) / 2,
          }}
        />
      </div>
    </>
  );
};

export { MobileControls };
