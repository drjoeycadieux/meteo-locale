import React, { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { ArrowDown, ArrowUp, Cloud, CloudDrizzle, CloudRain, CloudSun, Droplets, LockKeyhole, LogOut, MapPin, Menu, Plus, Sun, Wind, X } from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { auth, db, firebaseReady } from './firebase.js';

const LOCATION = [45.5019, -73.5674];
const weatherTypes = {
  'Ensoleillé': Sun,
  'Partiellement nuageux': CloudSun,
  'Nuageux': Cloud,
  'Averses': CloudDrizzle,
  'Pluie': CloudRain,
};

function dateOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Montreal' });
}

function formatDay(value, options = { weekday: 'long', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('fr-CA', { ...options, timeZone: 'America/Montreal' }).format(new Date(`${value}T12:00:00`));
}

function Header({ user, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="Météo Montréal, accueil">
        <span className="brand-mark"><CloudSun size={21} strokeWidth={1.8} /></span>
        <span>Météo<span className="brand-light"> Montréal</span></span>
      </Link>
      <button className="menu-toggle" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'}>
        <Link to="/" onClick={() => setMenuOpen(false)}>Prévisions</Link>
        {user ? (
          <><Link className="nav-editor" to="/meteorologue" onClick={() => setMenuOpen(false)}>Espace météorologue</Link><button className="nav-signout" onClick={onSignOut}><LogOut size={15} /> Déconnexion</button></>
        ) : <Link className="nav-login" to="/connexion" onClick={() => setMenuOpen(false)}><LockKeyhole size={15} /> Connexion</Link>}
      </nav>
    </header>
  );
}

function useForecasts() {
  const [forecasts, setForecasts] = useState([]);
  useEffect(() => {
    if (!db) return undefined;
    return onSnapshot(query(collection(db, 'forecasts'), orderBy('date')), (snapshot) => {
      setForecasts(snapshot.docs.map((entry) => entry.data()));
    }, () => setForecasts([]));
  }, []);
  return forecasts;
}

function WeatherIcon({ condition, size = 22 }) {
  const Icon = weatherTypes[condition] || Cloud;
  return <Icon size={size} strokeWidth={1.7} />;
}

function CurrentConditions({ forecasts }) {
  const forecast = forecasts.find((item) => item.date === dateOffset(0));
  const condition = forecast?.condition || 'Nuageux';
  return (
    <section className="current-panel" aria-label="Prévision du jour">
      <div className="current-main">
        <div className="eyebrow"><span className="live-dot" /> Montréal, Québec <span className="eyebrow-divider">/</span> Prévision du jour</div>
        <div className="temperature-row">
          <div className="temperature">{forecast ? forecast.high : '—'}<span>°</span></div>
          <div className="current-description"><WeatherIcon condition={condition} size={36} /><span>{forecast ? condition : 'En attente'}</span></div>
        </div>
        <p className="feels-like">{forecast ? `Minimum prévu ${forecast.low}°` : 'Aucune prévision publiée pour aujourd’hui'} <span>·</span> {new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Montreal' }).format(new Date())}</p>
      </div>
      <div className="current-stats">
        <div className="stat"><Droplets size={17} /><span>Précipitations</span><strong>{forecast ? `${forecast.precipitation}%` : '—'}</strong></div>
        <div className="stat"><Wind size={17} /><span>Vent</span><strong>{forecast ? `${forecast.wind} km/h` : '—'}</strong></div>
      </div>
      <div className="sun-graphic" aria-hidden="true"><span className="sun-disc" /><span className="sun-halo" /><Cloud size={90} strokeWidth={1.2} /></div>
      <div className="current-source">Prévisions saisies par l’équipe météo</div>
    </section>
  );
}

function ForecastMap() {
  return (
    <div className="map-frame">
      <MapContainer center={LOCATION} zoom={11} scrollWheelZoom={false} zoomControl={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
        <CircleMarker center={LOCATION} radius={9} pathOptions={{ color: '#faf9f6', weight: 4, fillColor: '#e65f3e', fillOpacity: 1 }}>
          <Popup>Montréal, Québec</Popup>
        </CircleMarker>
      </MapContainer>
      <div className="map-caption"><MapPin size={14} /> Montréal et environs <span>45.50° N&nbsp; 73.57° O</span></div>
    </div>
  );
}

function ForecastTable({ forecasts }) {
  return (
    <div className="forecast-table-wrap">
      <table className="forecast-table">
        <thead><tr><th>Journée</th><th>Conditions</th><th>Précip.</th><th>Vent</th><th className="right">Température</th></tr></thead>
        <tbody>{forecasts.length === 0 ? <tr><td colSpan="5">Aucune prévision publiée pour le moment.</td></tr> : forecasts.map((item, index) => (
          <tr key={item.date} className={index === 0 ? 'today-row' : ''}>
            <td className="day-cell"><strong>{index === 0 ? 'Aujourd’hui' : formatDay(item.date, { weekday: 'long' })}</strong><span>{formatDay(item.date, { day: 'numeric', month: 'long' })}</span></td>
            <td><span className="condition-cell"><WeatherIcon condition={item.condition} /><span>{item.condition}</span></span></td>
            <td><span className="rain-cell"><Droplets size={15} />{item.precipitation}%</span></td>
            <td><span className="wind-cell"><Wind size={15} />{item.wind} km/h</span></td>
            <td className="temp-cell"><span><ArrowUp size={14} />{item.high}°</span><span><ArrowDown size={14} />{item.low}°</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function HomePage({ forecasts }) {
  return (
    <main className="page-shell home-page">
      <div className="section-heading"><div><p className="section-kicker">LE TEMPS, ICI ET MAINTENANT</p><h1>La météo à Montréal<span className="heading-period">.</span></h1></div><div className="updated-label"><span className="live-dot" /> Prévisions locales</div></div>
      <CurrentConditions />
      <section className="forecast-section">
        <div className="forecast-heading"><div><p className="section-kicker">REPÈRES LOCAUX</p><h2>Montréal sur la carte</h2></div><span className="map-note">Île de Montréal et Rive-Sud</span></div>
        <ForecastMap />
      </section>
      <section className="forecast-section table-section">
        <div className="forecast-heading"><div><p className="section-kicker">LES PROCHAINS JOURS</p><h2>Prévisions détaillées</h2></div><span className="table-range">Prévisions publiées</span></div>
        <ForecastTable forecasts={forecasts} />
      </section>
      <footer className="site-footer"><span>Météo Montréal <span className="footer-separator">/</span> Montréal, Québec</span><span>Conditions actuelles par Open-Meteo</span></footer>
    </main>
  );
}

function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!auth) return setError('La connexion Firebase n’est pas encore configurée.');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/meteorologue');
    } catch {
      setError('Adresse courriel ou mot de passe invalide.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-aside"><Link to="/" className="brand auth-brand"><span className="brand-mark"><CloudSun size={21} /></span><span>Météo<span className="brand-light"> Montréal</span></span></Link><div className="auth-aside-copy"><p className="section-kicker">ESPACE RÉSERVÉ</p><h1>Les prévisions,<br />à la source.</h1><p>Un accès réservé à l’équipe météo de Montréal.</p></div><div className="auth-coordinate">45° 30′ N &nbsp; 73° 34′ O</div></div>
      <div className="auth-content"><Link to="/" className="back-link">← Retour aux prévisions</Link><form className="signin-form" onSubmit={handleSubmit}><div className="lock-icon"><LockKeyhole size={20} /></div><p className="section-kicker">CONNEXION SÉCURISÉE</p><h2>Espace météorologue</h2><p className="form-intro">Connectez-vous avec votre compte professionnel.</p>
        <label htmlFor="email">Adresse courriel</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@exemple.ca" required />
        <label htmlFor="password">Mot de passe</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Votre mot de passe" required />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="submit-button" type="submit" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'} <span>→</span></button>
        <p className="signin-note"><LockKeyhole size={13} /> Connexion par courriel uniquement</p>
      </form></div>
    </main>
  );
}

function EditorPage({ user }) {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [form, setForm] = useState({ date: dateOffset(0), condition: '', high: '', low: '', precipitation: '', wind: '', summary: '' });

  useEffect(() => {
    if (!user || !db) { setAuthorized(false); return undefined; }
    let active = true;
    getDoc(doc(db, 'users', user.uid)).then((entry) => {
      if (!active) return;
      if (entry.data()?.role === 'meteorologist') setAuthorized(true);
      else { setAuthorized(false); signOut(auth); }
    }).catch(() => { if (active) setAuthorized(false); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!db || !authorized) return undefined;
    return onSnapshot(query(collection(db, 'forecasts'), orderBy('date')), (snapshot) => setForecasts(snapshot.docs.map((entry) => entry.data())));
  }, [authorized]);

  if (authorized === null) return <main className="loading-page">Vérification de l’accès…</main>;
  if (!authorized) return <Navigate to="/connexion" replace />;

  async function saveForecast(event) {
    event.preventDefault();
    setError(''); setSaved('');
    if (!form.condition) { setError('Choisissez une icône et une condition météo.'); return; }
    if (Number(form.low) > Number(form.high)) { setError('La température minimale doit être inférieure ou égale à la maximale.'); return; }
    try {
      const forecast = { ...form, high: Number(form.high), low: Number(form.low), precipitation: Number(form.precipitation), wind: Number(form.wind), updatedAt: new Date().toISOString(), updatedBy: user.uid };
      await setDoc(doc(db, 'forecasts', forecast.date), forecast);
      setSaved('Prévision enregistrée.');
    } catch {
      setError('Impossible d’enregistrer. Vérifiez les règles Firestore et votre accès.');
    }
  }

  async function removeForecast(date) {
    try { await deleteDoc(doc(db, 'forecasts', date)); }
    catch { setError('Impossible de supprimer cette prévision.'); }
  }

  function editForecast(forecast) { setForm(forecast); setSaved(''); }
  function updateField(event) { setForm({ ...form, [event.target.name]: event.target.value }); }

  return (
    <main className="page-shell editor-page">
      <div className="section-heading editor-title"><div><p className="section-kicker">TABLEAU DE BORD</p><h1>Prévisions<span className="heading-period">.</span></h1><p className="editor-subtitle">Connecté en tant que {user.email}</p></div><button className="back-dashboard" onClick={() => navigate('/')}>Voir le site public <span>↗</span></button></div>
      <div className="editor-layout">
        <form className="editor-form" onSubmit={saveForecast}><p className="section-kicker">ÉDITION QUOTIDIENNE</p><h2>Prévision du jour</h2>
          <label htmlFor="date">Date</label><input id="date" name="date" type="date" value={form.date} onChange={updateField} required />
          <fieldset style={{ border: 0, padding: 0, margin: '0 0 16px' }}><legend style={{ marginBottom: 8, fontSize: 12, fontWeight: 600 }}>Icône et condition météo</legend><div role="group" aria-label="Choisir l’icône et la condition météo" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(116px, 1fr))', gap: 8 }}>{Object.entries(weatherTypes).map(([condition, Icon]) => <button key={condition} type="button" aria-pressed={form.condition === condition} onClick={() => setForm({ ...form, condition })} style={{ minHeight: 76, display: 'grid', justifyItems: 'center', alignContent: 'center', gap: 6, padding: 8, border: `1px solid ${form.condition === condition ? '#466a5d' : '#dce2dc'}`, borderRadius: 5, background: form.condition === condition ? '#e8eee8' : '#fbfcf9', color: form.condition === condition ? '#385749' : '#52615b', cursor: 'pointer' }}><Icon size={22} /><span style={{ fontSize: 11 }}>{condition}</span></button>)}</div></fieldset>
          <div className="form-grid"><div><label htmlFor="high">Maximum (°C)</label><input id="high" name="high" type="number" value={form.high} onChange={updateField} required /></div><div><label htmlFor="low">Minimum (°C)</label><input id="low" name="low" type="number" value={form.low} onChange={updateField} required /></div></div>
          <div className="form-grid"><div><label htmlFor="precipitation">Précipitations (%)</label><input id="precipitation" name="precipitation" type="number" min="0" max="100" value={form.precipitation} onChange={updateField} required /></div><div><label htmlFor="wind">Vent (km/h)</label><input id="wind" name="wind" type="number" min="0" value={form.wind} onChange={updateField} required /></div></div>
          <label htmlFor="summary">Note</label><textarea id="summary" name="summary" rows="3" value={form.summary} onChange={updateField} placeholder="Un détail sur la journée…" />
          {error && <p className="form-error" role="alert">{error}</p>}{saved && <p className="form-success" role="status">{saved}</p>}
          <button className="submit-button" type="submit"><span className="button-leading"><Plus size={17} /></span> Enregistrer la prévision <span>→</span></button>
        </form>
        <section className="entry-list"><div className="entry-list-heading"><div><p className="section-kicker">FIRESTORE</p><h2>Prévisions publiées</h2></div><span>{forecasts.length} jours</span></div>
          {forecasts.length === 0 ? <p className="empty-list">Aucune prévision publiée pour le moment.</p> : forecasts.map((item) => <article className="entry-row" key={item.date}><div className="entry-icon"><WeatherIcon condition={item.condition} /></div><div className="entry-info"><strong>{formatDay(item.date)}</strong><span>{item.condition} · {item.low}° / {item.high}°</span></div><button className="text-action" onClick={() => editForecast(item)}>Modifier</button><button className="delete-action" aria-label={`Supprimer la prévision du ${formatDay(item.date)}`} onClick={() => removeForecast(item.date)}>×</button></article>)}
        </section>
      </div>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const forecasts = useForecasts();
  useEffect(() => {
    if (!auth) return undefined;
    return onAuthStateChanged(auth, setUser);
  }, []);
  async function handleSignOut() { if (auth) await signOut(auth); }

  return <><Header user={user} onSignOut={handleSignOut} />{!firebaseReady && <div className="config-banner">Configurez Firebase pour publier et consulter les prévisions.</div>}<Routes><Route path="/" element={<HomePage forecasts={forecasts} />} /><Route path="/connexion" element={user ? <Navigate to="/meteorologue" replace /> : <SignInPage />} /><Route path="/meteorologue" element={user ? <EditorPage user={user} /> : <Navigate to="/connexion" replace />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></>;
}