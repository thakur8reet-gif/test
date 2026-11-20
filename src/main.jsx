import React from 'react';
import { createRoot } from 'react-dom/client';
import WhaleExperience from './WhaleExperience.jsx';
import './styles.css';
function App() { return <main className="page-shell"><WhaleExperience/><div className="signature" aria-hidden="true">PELAGIC / 001</div></main>; }
createRoot(document.getElementById('root')).render(<App/>);