import { Link } from 'react-router-dom';
import { BalloonMark } from './BalloonMark';

interface Props {
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
}

export function WebGLFallback({ title = '3D view unavailable', message, action }: Props) {
  return (
    <div className="fallback-screen" role="alert">
      <BalloonMark size={96} />
      <h1>{title}</h1>
      <p>{message}</p>
      <div className="d-flex flex-wrap gap-2 justify-content-center">
        {action && (
          <button type="button" className="btn btn-ember" onClick={action.onClick}>
            {action.label}
          </button>
        )}
        <Link to="/" className="btn btn-ghost">Back to home</Link>
      </div>
    </div>
  );
}
