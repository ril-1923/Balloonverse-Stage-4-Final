import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Flame } from 'lucide-react';
import { runtime, startFlight } from '../../simulation/flightController';
import { setHeld, type HeldControl } from '../../hooks/useKeyboardControls';
import { useFlightStore } from '../../store/useFlightStore';

interface HoldButtonProps {
  control: HeldControl;
  label: string;
  className?: string;
  startsFlight?: boolean;
  children: ReactNode;
}

/** Press-and-hold button using pointer events with capture, so it keeps working if the finger slides off. */
function HoldButton({ control, label, className = '', startsFlight, children }: HoldButtonProps) {
  const source = (e: ReactPointerEvent) => `ptr-${e.pointerId}`;
  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (useFlightStore.getState().paused) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (startsFlight && runtime.state.phase === 'grounded') startFlight();
    setHeld(control, source(e), true);
  };
  const up = (e: ReactPointerEvent<HTMLButtonElement>) => setHeld(control, source(e), false);
  return (
    <button
      type="button"
      className={`hold-btn ${className}`}
      aria-label={label}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onLostPointerCapture={up}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
      <span className="hold-btn__label">{label}</span>
    </button>
  );
}

/** On-screen controls for touch and mouse: steer on the left, burner and vent on the right. */
export function FlightControls() {
  return (
    <>
      <div className="touch-pad touch-pad--left" role="group" aria-label="Steering controls">
        <HoldButton control="left" label="Left">
          <ArrowLeft size={26} aria-hidden />
        </HoldButton>
        <HoldButton control="right" label="Right">
          <ArrowRight size={26} aria-hidden />
        </HoldButton>
      </div>
      <div className="touch-pad touch-pad--right" role="group" aria-label="Altitude controls">
        <HoldButton control="ascend" label="Burner" startsFlight className="hold-btn--burner">
          <Flame size={28} aria-hidden />
        </HoldButton>
        <HoldButton control="descend" label="Vent">
          <ChevronDown size={28} aria-hidden />
        </HoldButton>
      </div>
    </>
  );
}
