import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, RotateCcw, Save } from 'lucide-react';
import { BalloonMark } from '../components/common/BalloonMark';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { BalloonPreview } from '../components/studio/BalloonPreview';
import { ColorPicker } from '../components/studio/ColorPicker';
import { DesignLibrary } from '../components/studio/DesignLibrary';
import { OptionButtons, PatternSelector } from '../components/studio/PatternSelector';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { BALLOON_PRESETS } from '../simulation/balloonPresets';
import { useBalloonStore, MAX_NAME } from '../store/useBalloonStore';
import { BASKETS, BURNERS, MATERIALS } from '../types/balloon';
import { isWebGLAvailable } from '../utils/webgl';

function PreviewFallback({ message }: { message: string }) {
  return (
    <div className="preview-fallback" role="status">
      <BalloonMark size={110} />
      <p>{message}</p>
    </div>
  );
}

export default function BalloonStudioPage() {
  const { current, update, setColor, applyPreset, resetCurrent, saveCurrent } = useBalloonStore();
  const reduced = useReducedMotion();
  const [rotate, setRotate] = useState(!reduced);
  const [message, setMessage] = useState('');
  const webgl = useMemo(isWebGLAvailable, []);

  useEffect(() => {
    document.title = 'Balloon Studio — BalloonVerse 3D';
  }, []);

  const save = () => {
    const r = saveCurrent();
    setMessage(r.ok ? (r.renamed ? `That name was taken, so it was saved as “${r.name}”.` : `Saved “${r.name}”.`) : r.error);
  };

  return (
    <main className="studio">
      <section className="studio__preview" aria-label="Balloon preview">
        {webgl ? (
          <ErrorBoundary fallback={() => <PreviewFallback message="The 3D preview hit an error, but you can keep customising." />}>
            <BalloonPreview config={current} autoRotate={rotate} />
          </ErrorBoundary>
        ) : (
          <PreviewFallback message="WebGL is unavailable, so the 3D preview is off. Your changes still save and apply in flight when WebGL works." />
        )}
        <div className="studio__preview-bar">
          <strong>{current.name}</strong>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRotate((r) => !r)} aria-pressed={rotate}>
            {rotate ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />} Rotation
          </button>
          <span className="studio__hint">Drag to look around, scroll to zoom</span>
        </div>
      </section>

      <section className="studio__panel" aria-label="Customisation">
        <header className="studio__head">
          <h1>Balloon Studio</h1>
          <p>Design your balloon. Your current design is used for every flight.</p>
        </header>

        <div className="studio-section">
          <h2>Presets</h2>
          <ul className="preset-grid">
            {BALLOON_PRESETS.map((p) => (
              <li key={p.name}>
                <button type="button" className={`preset ${current.name === p.name ? 'is-active' : ''}`} onClick={() => applyPreset(p.name)} aria-label={`Apply preset ${p.name}`} aria-pressed={current.name === p.name}>
                  <span className="preset__swatch" aria-hidden>
                    {p.pattern === 'rainbow'
                      ? <i style={{ background: 'conic-gradient(red, orange, yellow, green, cyan, blue, violet, red)', flex: 3 }} />
                      : p.colors.map((c, i) => <i key={i} style={{ background: c }} />)}
                  </span>
                  <span>{p.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="studio-section">
          <h2>Name</h2>
          <label className="studio-name">
            <span className="visually-hidden">Balloon name</span>
            <input className="form-control" value={current.name} maxLength={MAX_NAME} onChange={(e) => update({ name: e.target.value })} placeholder="Name your balloon" />
          </label>
        </div>

        <div className="studio-section"><h2>Colours</h2><ColorPicker colors={current.colors} onChange={setColor} /></div>
        <div className="studio-section"><h2>Pattern</h2><PatternSelector value={current.pattern} colors={current.colors} onChange={(pattern) => update({ pattern })} /></div>
        <div className="studio-section"><h2>Material</h2><OptionButtons label="Material" options={MATERIALS} value={current.material} onChange={(material) => update({ material })} /></div>
        <div className="studio-section"><h2>Basket</h2><OptionButtons label="Basket" options={BASKETS} value={current.basket} onChange={(basket) => update({ basket })} /></div>
        <div className="studio-section"><h2>Burner effect</h2><OptionButtons label="Burner effect" options={BURNERS} value={current.burner} onChange={(burner) => update({ burner })} /></div>

        <div className="studio-section studio-actions">
          <button type="button" className="btn btn-ember" onClick={save}><Save size={16} aria-hidden /> Save design</button>
          <button type="button" className="btn btn-ghost" onClick={() => { resetCurrent(); setMessage('Reset to the default balloon.'); }}><RotateCcw size={16} aria-hidden /> Reset</button>
          <Link to="/simulator" className="btn btn-ghost">Fly with this balloon</Link>
        </div>
        <p className="studio-message" role="status" aria-live="polite">{message}</p>

        <div className="studio-section"><h2>Saved designs</h2><DesignLibrary onMessage={setMessage} /></div>
      </section>
    </main>
  );
}
