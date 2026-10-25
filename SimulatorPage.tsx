import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { FlightScene } from '../components/simulator/FlightScene';
import { FlightHUD } from '../components/simulator/FlightHUD';
import { FlightControls } from '../components/simulator/FlightControls';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { WebGLFallback } from '../components/common/WebGLFallback';
import { applyConditions, getSnapshot, setWorld } from '../simulation/flightController';
import { abortCurrentFlight } from '../simulation/sessionRuntime';
import { getWorld } from '../simulation/worldDefinitions';
import { useEnvironmentStore } from '../store/useEnvironmentStore';
import { releaseAll, useKeyboardControls } from '../hooks/useKeyboardControls';
import { useFlightStore } from '../store/useFlightStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { isWebGLAvailable } from '../utils/webgl';

export default function SimulatorPage() {
  const webgl = useMemo(isWebGLAvailable, []);
  const [contextLost, setContextLost] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useKeyboardControls(webgl && !contextLost);
  const worldId = useEnvironmentStore((s) => s.worldId);

  // Keep the simulation's world in step with the selected world (switching resets the flight).
  useLayoutEffect(() => {
    releaseAll();
    setWorld(getWorld(worldId));
    useFlightStore.setState({ paused: false, snapshot: getSnapshot() });
  }, [worldId]);

  // Weather and wind overrides feed the simulation's wind.
  useEffect(() => {
    const apply = (s: ReturnType<typeof useEnvironmentStore.getState>) => applyConditions(s.weather, s.windDirectionDeg, s.windStrength);
    apply(useEnvironmentStore.getState());
    return useEnvironmentStore.subscribe(apply);
  }, []);

  useEffect(() => {
    document.title = 'Flight Simulator — BalloonVerse 3D';
    useFlightStore.getState().setCameraMode(useSettingsStore.getState().cameraPreference);
    const onHide = () => {
      if (document.hidden) useFlightStore.getState().setPaused(true);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      releaseAll();
      abortCurrentFlight();
    };
  }, []);

  if (!webgl) {
    return (
      <WebGLFallback
        message="This browser or device could not start WebGL, which the flight simulator needs. Try a current version of Chrome, Edge, Firefox or Safari, and make sure hardware acceleration is on."
      />
    );
  }

  if (contextLost) {
    return (
      <WebGLFallback
        title="The 3D view stopped"
        message="The graphics context was lost, which can happen when the GPU is busy or the tab was in the background for a while."
        action={{ label: 'Restart the view', onClick: () => { setContextLost(false); setAttempt((n) => n + 1); } }}
      />
    );
  }

  return (
    <div className="sim-root">
      <ErrorBoundary
        fallback={(error, reset) => (
          <WebGLFallback
            title="Something went wrong"
            message={`The simulator hit an error: ${error.message}`}
            action={{ label: 'Try again', onClick: () => { setWorld(getWorld(useEnvironmentStore.getState().worldId)); reset(); } }}
          />
        )}
      >
        <FlightScene key={attempt} onContextLost={() => setContextLost(true)} />
        <FlightHUD />
        <FlightControls />
      </ErrorBoundary>
    </div>
  );
}
