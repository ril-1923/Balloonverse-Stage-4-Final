import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/figtree';
import './styles/global.css';
import './styles/home.css';
import './styles/simulator.css';
import './styles/pages.css';
import App from './App';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
