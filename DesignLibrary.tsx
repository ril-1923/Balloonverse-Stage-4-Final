import { useState } from 'react';
import { Check, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { useBalloonStore } from '../../store/useBalloonStore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { SavedDesign } from '../../types/balloon';

function Row({ d, active, onMessage }: { d: SavedDesign; active: boolean; onMessage: (m: string) => void }) {
  const load = useBalloonStore((s) => s.loadDesign);
  const rename = useBalloonStore((s) => s.renameDesign);
  const remove = useBalloonStore((s) => s.deleteDesign);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(d.name);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  const commit = () => {
    const r = rename(d.id, name);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError('');
    setEditing(false);
    onMessage(r.renamed ? `That name was taken, so it is now “${r.name}”.` : `Renamed to “${r.name}”.`);
  };

  return (
    <li className={`design-row ${active ? 'is-current' : ''}`}>
      <span className="design-swatch" aria-hidden>
        {d.config.colors.map((c, i) => <i key={i} style={{ background: c }} />)}
      </span>
      {editing ? (
        <form className="design-edit" onSubmit={(e) => { e.preventDefault(); commit(); }}>
          <input className="form-control form-control-sm" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label={`New name for ${d.name}`} autoFocus aria-invalid={!!error} aria-describedby={error ? `err-${d.id}` : undefined} />
          <button type="submit" className="icon-btn" aria-label="Save name"><Check size={16} /></button>
          <button type="button" className="icon-btn" aria-label="Cancel rename" onClick={() => { setEditing(false); setName(d.name); setError(''); }}><X size={16} /></button>
          {error && <small id={`err-${d.id}`} className="design-error">{error}</small>}
        </form>
      ) : (
        <>
          <span className="design-name">{d.name}{active && <em> · current</em>}</span>
          <span className="design-actions">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => { load(d.id); onMessage(`Loaded “${d.name}”.`); }}>Load</button>
            <button type="button" className="icon-btn" aria-label={`Rename ${d.name}`} onClick={() => setEditing(true)}><Pencil size={15} /></button>
            <button type="button" className="icon-btn" aria-label={`Delete ${d.name}`} onClick={() => setConfirm(true)}><Trash2 size={15} /></button>
          </span>
        </>
      )}
      {confirm && (
        <ConfirmDialog
          title="Delete this design?"
          message={`“${d.name}” will be removed from your saved designs. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={() => { remove(d.id); setConfirm(false); onMessage(`Deleted “${d.name}”.`); }}
        />
      )}
    </li>
  );
}

export function DesignLibrary({ onMessage }: { onMessage: (m: string) => void }) {
  const designs = useBalloonStore((s) => s.designs);
  const current = useBalloonStore((s) => s.current);
  const restore = useBalloonStore((s) => s.restoreSamples);
  return (
    <div className="studio-group">
      {designs.length === 0 ? (
        <p className="studio-empty">No saved designs yet. Save the current balloon, or bring back the sample designs.</p>
      ) : (
        <ul className="design-list">
          {designs.map((d) => (
            <Row key={d.id} d={d} active={JSON.stringify(d.config) === JSON.stringify(current)} onMessage={onMessage} />
          ))}
        </ul>
      )}
      <button
        type="button"
        className="btn btn-sm btn-ghost mt-2"
        onClick={() => {
          const n = restore();
          onMessage(n === 0 ? 'All sample designs are already in your library.' : `Added ${n} sample design${n === 1 ? '' : 's'}.`);
        }}
      >
        <RotateCcw size={14} aria-hidden /> Restore sample designs
      </button>
    </div>
  );
}
