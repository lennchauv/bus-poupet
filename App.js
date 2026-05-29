import { useState, useEffect } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Config ───────────────────────────────────────────────────────────────────
const EVENTS = {
  mercredi: {
    id: "mercredi",
    label: "Mercredi 22 juillet",
    heure: "18h15",
    retour: "Retour départ festival ~2h30",
    nom: "Poupée Rap",
    sousTitre: "GIMS · Théodora · L2B · La Mano 1.9",
    nbBus: 1,
  },
  vendredi: {
    id: "vendredi",
    label: "Vendredi 24 juillet",
    heure: "18h15",
    retour: "Retour départ festival ~2h30",
    nom: "Poupet Déraille",
    sousTitre: "20+ artistes · DJ Fanou",
    nbBus: 2,
  },
};

const CONFIG = {
  lieuDepart: "La Loge, Beaupréau",
  prixPlace: 15,
  iban: "FR76 3000 4013 4400 0001 8048 763",
};

const ADMIN_PASSWORD = "festival2025";
const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --black: #0a0a0a; --white: #f5f0e8; --orange: #ff5c00; --orange-dim: #cc4900;
    --gray: #2a2a2a; --muted: #888; --green: #2ecc71; --red: #e74c3c; --yellow: #f1c40f;
    --blue: #4a9eff; --purple: #a855f7;
  }
  body { background: var(--black); color: var(--white); font-family: 'DM Sans', sans-serif; min-height: 100vh; }

  .nav { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; border-bottom: 1px solid #222; position: sticky; top: 0; background: rgba(10,10,10,0.95); backdrop-filter: blur(8px); z-index: 100; }
  .nav-logo { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; letter-spacing: 0.1em; color: var(--orange); }
  .nav-tabs { display: flex; gap: 0.5rem; }
  .nav-tab { padding: 0.4rem 1rem; border-radius: 99px; border: 1px solid transparent; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s; background: none; color: var(--muted); }
  .nav-tab.active { background: var(--orange); color: var(--black); border-color: var(--orange); }
  .nav-tab:hover:not(.active) { border-color: #444; color: var(--white); }

  .hero { text-align: center; padding: 3.5rem 1.5rem 2.5rem; position: relative; overflow: hidden; }
  .hero::before { content: 'BUS'; font-family: 'Bebas Neue', sans-serif; font-size: 20vw; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); color: rgba(255,92,0,0.04); pointer-events: none; white-space: nowrap; }
  .hero h1 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(2.2rem,7vw,4.5rem); letter-spacing: 0.05em; line-height: 1; margin-bottom: 0.75rem; }
  .hero h1 span { color: var(--orange); }
  .hero-sub { color: var(--muted); font-size: 0.9rem; max-width: 420px; margin: 0 auto 2rem; line-height: 1.6; }

  .info-pill-row { display: flex; justify-content: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 2.5rem; }
  .info-pill { background: var(--gray); border: 1px solid #333; border-radius: 99px; padding: 0.4rem 1rem; font-size: 0.8rem; display: flex; align-items: center; gap: 0.4rem; }
  .info-pill span { color: var(--muted); }

  .events-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; max-width: 500px; margin: 0 auto 2.5rem; }
  @media(max-width:480px) { .events-grid { grid-template-columns: 1fr; } }
  .event-card { border: 2px solid #333; border-radius: 16px; padding: 1.25rem; cursor: pointer; transition: all 0.2s; background: var(--gray); position: relative; text-align: left; }
  .event-card:hover { border-color: #555; }
  .event-card.selected-mercredi { border-color: var(--blue); background: rgba(74,158,255,0.08); }
  .event-card.selected-vendredi { border-color: var(--purple); background: rgba(168,85,247,0.08); }
  .event-check { position: absolute; top: 0.75rem; right: 0.75rem; width: 22px; height: 22px; border-radius: 50%; border: 2px solid #555; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; transition: all 0.2s; }
  .selected-mercredi .event-check { background: var(--blue); border-color: var(--blue); }
  .selected-vendredi .event-check { background: var(--purple); border-color: var(--purple); }
  .event-name { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 0.05em; margin-bottom: 0.2rem; }
  .event-date { font-size: 0.75rem; color: var(--muted); }
  .event-heure { font-size: 0.75rem; color: var(--muted); }

  .form-card { max-width: 500px; margin: 0 auto; background: var(--gray); border: 1px solid #333; border-radius: 20px; padding: 2rem; }
  .form-title { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; letter-spacing: 0.05em; margin-bottom: 1.25rem; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .form-field { display: flex; flex-direction: column; gap: 0.4rem; }
  .form-field.full { grid-column: 1/-1; }
  .form-label { font-size: 0.72rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .form-input { background: var(--black); border: 1px solid #444; border-radius: 10px; padding: 0.7rem 1rem; color: var(--white); font-family: 'DM Sans', sans-serif; font-size: 0.95rem; transition: border-color 0.2s; outline: none; }
  .form-input:focus { border-color: var(--orange); }
  .form-input::placeholder { color: #555; }

  .btn-submit { width: 100%; margin-top: 1.25rem; padding: 1rem; background: var(--orange); color: var(--black); border: none; border-radius: 12px; font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; letter-spacing: 0.1em; cursor: pointer; transition: all 0.2s; }
  .btn-submit:hover { background: var(--orange-dim); transform: translateY(-1px); }
  .btn-submit:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .form-note { margin-top: 0.75rem; font-size: 0.75rem; color: var(--muted); text-align: center; line-height: 1.5; }

  .price-summary { margin-top: 1rem; background: #1a1a1a; border-radius: 10px; padding: 0.85rem 1rem; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; }
  .price-summary strong { color: var(--orange); font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; }

  .success-card { max-width: 460px; margin: 2rem auto; background: var(--gray); border: 1px solid #333; border-radius: 20px; padding: 3rem 2rem; text-align: center; }
  .success-icon { width: 64px; height: 64px; background: rgba(46,204,113,0.15); border: 2px solid var(--green); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 1.8rem; }
  .success-card h2 { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
  .success-card p { color: var(--muted); line-height: 1.7; font-size: 0.9rem; }
  .success-events { margin: 1rem 0; display: flex; flex-direction: column; gap: 0.4rem; }
  .success-event-badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 1rem; border-radius: 99px; font-size: 0.8rem; font-weight: 600; }

  .admin-wrap { max-width: 1100px; margin: 0 auto; padding: 2rem 1.5rem; }
  .admin-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
  .admin-header h2 { font-family: 'Bebas Neue', sans-serif; font-size: 2.5rem; letter-spacing: 0.05em; }

  .event-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .event-tab { padding: 0.5rem 1.25rem; border-radius: 10px; border: 1px solid #333; background: none; color: var(--muted); font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .event-tab.active-mercredi { background: rgba(74,158,255,0.15); color: var(--blue); border-color: var(--blue); }
  .event-tab.active-vendredi { background: rgba(168,85,247,0.15); color: var(--purple); border-color: var(--purple); }
  .event-tab.active-tous { background: var(--orange); color: var(--black); border-color: var(--orange); }
  .event-tab:hover:not([class*="active"]) { border-color: #555; color: var(--white); }

  .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px,1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
  .stat-card { background: var(--gray); border: 1px solid #333; border-radius: 12px; padding: 1rem 1.1rem; }
  .stat-label { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.3rem; }
  .stat-value { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; color: var(--orange); }
  .stat-sub { font-size: 0.7rem; color: var(--muted); margin-top: 0.15rem; }

  .filter-row { display: flex; gap: 0.4rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center; }
  .filter-btn { padding: 0.3rem 0.8rem; border-radius: 99px; border: 1px solid #444; background: none; color: var(--muted); font-size: 0.78rem; cursor: pointer; transition: all 0.15s; }
  .filter-btn.active { background: var(--orange); color: var(--black); border-color: var(--orange); }
  .filter-btn:hover:not(.active) { border-color: #666; color: var(--white); }

  .table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid #222; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  thead th { text-align: left; padding: 0.7rem 1rem; font-size: 0.67rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #2a2a2a; white-space: nowrap; background: #111; }
  tbody tr { border-bottom: 1px solid #1a1a1a; transition: background 0.15s; }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:hover { background: rgba(255,255,255,0.02); }
  tbody td { padding: 0.8rem 1rem; vertical-align: middle; }
  .td-name { font-weight: 600; }
  .td-muted { color: var(--muted); font-size: 0.82rem; }

  .event-dot-label { font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 4px; white-space: nowrap; display: inline-block; margin: 0.1rem; }
  .label-mercredi { background: rgba(74,158,255,0.12); color: var(--blue); }
  .label-vendredi { background: rgba(168,85,247,0.12); color: var(--purple); }

  .status-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.22rem 0.6rem; border-radius: 99px; font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
  .status-badge.en-attente { background: rgba(241,196,15,0.12); color: var(--yellow); }
  .status-badge.valide { background: rgba(46,204,113,0.12); color: var(--green); }
  .status-badge.refuse { background: rgba(231,76,60,0.12); color: var(--red); }

  .bus-pills { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .bus-pill { padding: 0.2rem 0.55rem; border-radius: 99px; border: 1px solid #444; background: none; color: var(--muted); font-size: 0.72rem; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
  .bus-pill.sel-mercredi { background: var(--blue); color: var(--black); border-color: var(--blue); font-weight: 700; }
  .bus-pill.sel-vendredi { background: var(--purple); color: var(--white); border-color: var(--purple); font-weight: 700; }
  .bus-pill:hover:not([class*="sel-"]) { border-color: #666; color: var(--white); }

  .action-btns { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .btn-action { padding: 0.25rem 0.55rem; border-radius: 6px; border: none; font-size: 0.72rem; font-weight: 600; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
  .btn-valider { background: rgba(46,204,113,0.15); color: var(--green); }
  .btn-valider:hover { background: var(--green); color: var(--black); }
  .btn-refuser { background: rgba(231,76,60,0.15); color: var(--red); }
  .btn-refuser:hover { background: var(--red); color: var(--white); }
  .btn-reset { background: rgba(241,196,15,0.15); color: var(--yellow); }
  .btn-reset:hover { background: var(--yellow); color: var(--black); }
  .btn-delete { background: rgba(100,100,100,0.12); color: var(--muted); }
  .btn-delete:hover { background: #444; color: var(--white); }
  .btn-sms { background: rgba(0,180,255,0.12); color: #00b4ff; }
  .btn-sms:hover { background: #00b4ff; color: var(--black); }
  .btn-export { background: rgba(46,204,113,0.12); color: var(--green); padding: 0.5rem 1rem; border-radius: 10px; }
  .btn-export:hover { background: var(--green); color: var(--black); }
  .btn-paye-on { background: rgba(46,204,113,0.15); color: var(--green); }
  .btn-paye-off { background: rgba(241,196,15,0.12); color: var(--yellow); }
  .wa-note { font-size: 0.68rem; color: var(--muted); margin-top: 0.3rem; }

  .admin-login { max-width: 360px; margin: 6rem auto; background: var(--gray); border: 1px solid #333; border-radius: 20px; padding: 2.5rem; text-align: center; }
  .admin-login h2 { font-family: 'Bebas Neue', sans-serif; font-size: 2rem; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
  .admin-login p { color: var(--muted); font-size: 0.85rem; margin-bottom: 1.5rem; }

  .toast { position: fixed; bottom: 2rem; right: 2rem; background: #1e1e1e; border: 1px solid #444; border-radius: 12px; padding: 0.85rem 1.4rem; font-size: 0.85rem; box-shadow: 0 8px 32px rgba(0,0,0,0.6); z-index: 999; animation: slideIn 0.3s ease; }
  @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

  .loading { display: flex; align-items: center; justify-content: center; height: 100vh; color: var(--muted); font-family: 'DM Sans', sans-serif; }

  @media(max-width:600px) { .form-grid { grid-template-columns: 1fr; } .nav { padding: 0.75rem 1rem; } .hero { padding: 2rem 1rem 1.5rem; } }
`;

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className="toast">{msg}</div>;
}

// ─── PAGE INSCRIPTION ─────────────────────────────────────────────────────────
function PageInscription({ inscriptions, onInscrit }) {
  const [form, setForm] = useState({ prenom: "", nom: "", telephone: "" });
  const [choix, setChoix] = useState({ mercredi: false, vendredi: false });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleChoix = (ev) => setChoix(c => ({ ...c, [ev]: !c[ev] }));
  const nbChoix = Object.values(choix).filter(Boolean).length;
  const prix = nbChoix * CONFIG.prixPlace;

  const handleSubmit = async () => {
    if (!form.prenom || !form.nom || !form.telephone) { setError("Merci de remplir tous les champs."); return; }
    if (!choix.mercredi && !choix.vendredi) { setError("Sélectionne au moins un festival."); return; }
    if (!/^[0-9+\s]{7,15}$/.test(form.telephone.trim())) { setError("Numéro de téléphone invalide."); return; }
    setError(""); setLoading(true);
    await onInscrit({
      prenom: form.prenom.trim(),
      nom: form.nom.trim().toUpperCase(),
      telephone: form.telephone.trim(),
      events: choix,
      bus: { mercredi: null, vendredi: null },
      statut: "en-attente",
      paye: false,
      createdAt: serverTimestamp(),
    });
    setLoading(false); setSubmitted(true);
  };

  if (submitted) return (
    <div style={{ padding: "1rem" }}>
      <div className="success-card">
        <div className="success-icon">✓</div>
        <h2>Demande envoyée !</h2>
        <div className="success-events">
          {choix.mercredi && <span className="success-event-badge" style={{ background: "rgba(74,158,255,0.15)", color: "var(--blue)", margin: "0 auto" }}>Mercredi 22 juillet – Poupée Rap</span>}
          {choix.vendredi && <span className="success-event-badge" style={{ background: "rgba(168,85,247,0.15)", color: "var(--purple)", margin: "0 auto" }}>Vendredi 24 juillet – Poupet Déraille</span>}
        </div>
        <p>
          Ta demande a bien été reçue.<br /><br />
          Une fois validée par l'organisateur, tu recevras un <strong>SMS au {form.telephone}</strong> avec les infos pour payer ta place ({prix}€).<br /><br />
          Plus qu'à attendre ! 🎉
        </p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="hero">
        <h1>Réserve ton <span>bus</span></h1>
        <p className="hero-sub">Choisis ton ou tes festivals, remplis tes infos. L'organisateur valide et te contacte par SMS.</p>
        <div className="info-pill-row">
          <div className="info-pill">📍 <span>{CONFIG.lieuDepart}</span></div>
          <div className="info-pill">🕑 <span>Départ 18h15</span></div>
          <div className="info-pill">💶 <span>{CONFIG.prixPlace}€ / festival</span></div>
        </div>
        <div className="events-grid">
          {Object.values(EVENTS).map(ev => (
            <div key={ev.id}
              className={`event-card ${choix[ev.id] ? `selected-${ev.id}` : ""}`}
              onClick={() => toggleChoix(ev.id)}>
              <div className="event-check">{choix[ev.id] ? "✓" : ""}</div>
              <div className="event-name">{ev.nom}</div>
              {ev.sousTitre && <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.25rem" }}>{ev.sousTitre}</div>}
              <div className="event-date">{ev.label}</div>
              <div className="event-heure">Départ {ev.heure} · {ev.retour}</div>
              <div style={{ marginTop: "0.4rem", fontSize: "0.7rem", color: "var(--muted)" }}>🚌 {ev.nbBus} bus</div>
            </div>
          ))}
        </div>
      </div>

      <div className="form-card" style={{ marginBottom: "4rem" }}>
        <div className="form-title">Tes infos</div>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">Prénom</label>
            <input className="form-input" placeholder="Mathieu" value={form.prenom}
              onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
          </div>
          <div className="form-field">
            <label className="form-label">Nom</label>
            <input className="form-input" placeholder="DUPONT" value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
          </div>
          <div className="form-field full">
            <label className="form-label">Téléphone</label>
            <input className="form-input" placeholder="06 12 34 56 78" value={form.telephone}
              onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
          </div>
        </div>
        {nbChoix > 0 && (
          <div className="price-summary">
            <span>{nbChoix} festival{nbChoix > 1 ? "s" : ""} sélectionné{nbChoix > 1 ? "s" : ""}</span>
            <strong>{prix}€</strong>
          </div>
        )}
        {error && <p style={{ color: "var(--red)", fontSize: "0.82rem", marginTop: "0.75rem" }}>{error}</p>}
        <button className="btn-submit" onClick={handleSubmit} disabled={loading || nbChoix === 0}>
          {loading ? "Envoi en cours..." : nbChoix === 0 ? "SÉLECTIONNE UN FESTIVAL" : `ENVOYER MA DEMANDE — ${prix}€`}
        </button>
        <p className="form-note">⚠️ Soumis à validation. Le paiement se fait après confirmation par l'organisateur.</p>
      </div>
    </div>
  );
}

// ─── PAGE ADMIN ───────────────────────────────────────────────────────────────
function PageAdmin({ inscriptions, onUpdate, onDelete, showToast }) {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState(false);
  const [activeEvent, setActiveEvent] = useState("tous");
  const [statusFilter, setStatusFilter] = useState("tous");

  const login = () => { if (pwd === ADMIN_PASSWORD) setAuthed(true); else setPwdError(true); };

  if (!authed) return (
    <div className="admin-login">
      <h2>Admin 🔒</h2>
      <p>Espace réservé à l'organisateur</p>
      <input className="form-input" type="password" placeholder="Mot de passe"
        value={pwd} onChange={e => setPwd(e.target.value)}
        onKeyDown={e => e.key === "Enter" && login()}
        style={{ marginBottom: "0.75rem", width: "100%" }} />
      {pwdError && <p style={{ color: "var(--red)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>Mot de passe incorrect</p>}
      <button className="btn-submit" onClick={login}>Connexion</button>
      <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "1rem" }}>Mot de passe : festival2025</p>
    </div>
  );

  let filtered = [...inscriptions];
  if (activeEvent === "mercredi") filtered = filtered.filter(i => i.events?.mercredi);
  if (activeEvent === "vendredi") filtered = filtered.filter(i => i.events?.vendredi);
  if (statusFilter !== "tous") filtered = filtered.filter(i => i.statut === statusFilter);

  const nbAttente = inscriptions.filter(i => i.statut === "en-attente").length;
  const nbValide = inscriptions.filter(i => i.statut === "valide").length;
  const nbPaye = inscriptions.filter(i => i.paye).length;
  const nbMerc = inscriptions.filter(i => i.events?.mercredi).length;
  const nbVen = inscriptions.filter(i => i.events?.vendredi).length;
  const nbBus1Merc = inscriptions.filter(i => i.bus?.mercredi === "Bus 1" && i.statut === "valide").length;
  const nbBus2Merc = inscriptions.filter(i => i.bus?.mercredi === "Bus 2" && i.statut === "valide").length;
  const nbBus1Ven = inscriptions.filter(i => i.bus?.vendredi === "Bus 1" && i.statut === "valide").length;
  const nbBus2Ven = inscriptions.filter(i => i.bus?.vendredi === "Bus 2" && i.statut === "valide").length;

  const handleBusAssign = (id, eventId, bus) => {
    const insc = inscriptions.find(i => i.id === id);
    const newBus = insc.bus?.[eventId] === bus ? null : bus;
    onUpdate(id, { bus: { ...insc.bus, [eventId]: newBus } });
    showToast(newBus ? `🚌 ${bus} assigné` : "Bus retiré");
  };

  const handlePaye = (id) => {
    const insc = inscriptions.find(i => i.id === id);
    onUpdate(id, { paye: !insc.paye });
    showToast(insc.paye ? "↩ Non payé" : "💶 Marqué payé");
  };

  const envoyerSMS = (insc) => {
    const festivals = [
      insc.events?.mercredi ? "Poupée Rap – GIMS (mercredi 22/07)" : null,
      insc.events?.vendredi ? "Poupet Déraille (vendredi 24/07)" : null,
    ].filter(Boolean).join(" + ");
    const total = [insc.events?.mercredi, insc.events?.vendredi].filter(Boolean).length * CONFIG.prixPlace;
    const texte = `Bonjour ${insc.prenom} ! 🎉 Ta place de bus pour le festival est validée !\n\n${festivals}\n\nPour payer tes ${total}€, fais un virement bancaire :\nIBAN : ${CONFIG.iban}\n\n⚠️ Mets ton prénom et nom dans le motif du virement.\n\nMerci et à bientôt ! 🚌`;
    const tel = insc.telephone.replace(/\s/g, "");
    window.location.href = `sms:${tel}?body=${encodeURIComponent(texte)}`;
    setTimeout(() => {
      navigator.clipboard.writeText(texte).catch(() => {});
      showToast(`📋 Message copié pour ${insc.prenom}`);
    }, 800);
  };

  const exportCSV = () => {
    const rows = [["Prénom", "Nom", "Téléphone", "Mercredi 22/07", "Vendredi 24/07", "Bus Mercredi", "Bus Vendredi", "Statut", "Payé", "Date"]];
    inscriptions.forEach(i => rows.push([
      i.prenom, i.nom, i.telephone,
      i.events?.mercredi ? "Oui" : "Non",
      i.events?.vendredi ? "Oui" : "Non",
      i.bus?.mercredi || "—", i.bus?.vendredi || "—",
      i.statut, i.paye ? "Oui" : "Non", fmtDate(i.createdAt)
    ]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "inscriptions-bus-poupet.csv"; a.click();
    showToast("⬇ Export CSV téléchargé !");
  };

  const evLabel = (ev) => ev === "mercredi" ? "active-mercredi" : ev === "vendredi" ? "active-vendredi" : "active-tous";

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <div>
          <h2>Dashboard Admin</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>La Loge, Beaupréau – Poupée Rap (22/07) & Poupet Déraille (24/07)</p>
        </div>
        <button className="btn-action btn-export" onClick={exportCSV}>⬇ Export CSV</button>
      </div>

      <div className="stats-row">
        <div className="stat-card"><div className="stat-label">En attente</div><div className="stat-value" style={{ color: "var(--yellow)" }}>{nbAttente}</div></div>
        <div className="stat-card"><div className="stat-label">Validés</div><div className="stat-value" style={{ color: "var(--green)" }}>{nbValide}</div></div>
        <div className="stat-card"><div className="stat-label">Payés</div><div className="stat-value" style={{ color: "var(--green)" }}>{nbPaye}</div><div className="stat-sub">{nbPaye * CONFIG.prixPlace}€</div></div>
        <div className="stat-card"><div className="stat-label">Mercredi</div><div className="stat-value" style={{ color: "var(--blue)" }}>{nbMerc}</div></div>
        <div className="stat-card"><div className="stat-label">Vendredi</div><div className="stat-value" style={{ color: "var(--purple)" }}>{nbVen}</div></div>
        <div className="stat-card"><div className="stat-label">Bus Merc.</div><div className="stat-value">{nbBus1Merc}</div><div className="stat-sub">Bus 1 · {nbBus2Merc} Bus 2</div></div>
        <div className="stat-card"><div className="stat-label">Bus Ven.</div><div className="stat-value">{nbBus1Ven}</div><div className="stat-sub">Bus 1 · {nbBus2Ven} Bus 2</div></div>
      </div>

      <div className="event-tabs">
        {["tous", "mercredi", "vendredi"].map(ev => (
          <button key={ev} className={`event-tab ${activeEvent === ev ? evLabel(ev) : ""}`} onClick={() => setActiveEvent(ev)}>
            {ev === "tous" ? "🚌 Tous" : ev === "mercredi" ? "🎤 Poupée Rap – 22/07" : "🎸 Poupet Déraille – 24/07"}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {["tous", "en-attente", "valide", "refuse"].map(s => (
          <button key={s} className={`filter-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
            {s === "tous" ? "Tous" : s === "en-attente" ? "⏳ En attente" : s === "valide" ? "✅ Validés" : "❌ Refusés"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--muted)" }}>
          <div style={{ fontSize: "3rem", opacity: 0.3, marginBottom: "1rem" }}>📋</div>
          <p>Aucune inscription ici.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Festivals</th>
                <th>Bus Mercredi</th>
                <th>Bus Vendredi</th>
                <th>Statut</th>
                <th>Payé</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => (
                <tr key={i.id}>
                  <td className="td-name">{i.prenom} {i.nom}<br /><span className="td-muted">{fmtDate(i.createdAt)}</span></td>
                  <td className="td-muted">{i.telephone}</td>
                  <td>
                    {i.events?.mercredi && <span className="event-dot-label label-mercredi">Merc.</span>}
                    {i.events?.vendredi && <span className="event-dot-label label-vendredi">Ven.</span>}
                  </td>
                  <td>
                    {i.events?.mercredi ? (
                      <div className="bus-pills">
                        <button className={`bus-pill ${i.bus?.mercredi === "Bus 1" ? "sel-mercredi" : ""}`}
                          onClick={() => handleBusAssign(i.id, "mercredi", "Bus 1")}>Bus 1</button>
                      </div>
                    ) : <span className="td-muted">—</span>}
                  </td>
                  <td>
                    {i.events?.vendredi ? (
                      <div className="bus-pills">
                        {["Bus 1", "Bus 2"].map(b => (
                          <button key={b} className={`bus-pill ${i.bus?.vendredi === b ? "sel-vendredi" : ""}`}
                            onClick={() => handleBusAssign(i.id, "vendredi", b)}>{b}</button>
                        ))}
                      </div>
                    ) : <span className="td-muted">—</span>}
                  </td>
                  <td>
                    <span className={`status-badge ${i.statut}`}>
                      {i.statut === "en-attente" ? "⏳ En attente" : i.statut === "valide" ? "✅ Validé" : "❌ Refusé"}
                    </span>
                  </td>
                  <td>
                    <button className={`btn-action ${i.paye ? "btn-paye-on" : "btn-paye-off"}`} onClick={() => handlePaye(i.id)}>
                      {i.paye ? "💶 Payé" : "En attente"}
                    </button>
                  </td>
                  <td>
                    <div className="action-btns">
                      {i.statut !== "valide" && <button className="btn-action btn-valider" onClick={() => { onUpdate(i.id, { statut: "valide" }); showToast("✅ Validé"); }}>✓</button>}
                      {i.statut !== "refuse" && <button className="btn-action btn-refuser" onClick={() => { onUpdate(i.id, { statut: "refuse" }); showToast("❌ Refusé"); }}>✗</button>}
                      {i.statut !== "en-attente" && <button className="btn-action btn-reset" onClick={() => { onUpdate(i.id, { statut: "en-attente" }); showToast("↩ En attente"); }}>↩</button>}
                      {i.statut === "valide" && !i.paye && <button className="btn-action btn-sms" onClick={() => envoyerSMS(i)}>📱 SMS</button>}
                      <button className="btn-action btn-delete" onClick={() => onDelete(i.id)}>🗑</button>
                    </div>
                    {i.statut === "valide" && i.paye && <div className="wa-note">✅ Ajouter au groupe WhatsApp</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("inscription");
  const [inscriptions, setInscriptions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => setToast(msg);

  // Écoute temps réel Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inscriptions"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });
      setInscriptions(data);
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  const handleInscrit = async (data) => {
    await addDoc(collection(db, "inscriptions"), data);
    showToast("✅ Inscription enregistrée !");
  };

  const handleUpdate = async (id, fields) => {
    await updateDoc(doc(db, "inscriptions", id), fields);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette inscription ?")) return;
    await deleteDoc(doc(db, "inscriptions", id));
    showToast("🗑 Supprimé");
  };

  if (!loaded) return <div className="loading">Chargement...</div>;

  return (
    <>
      <style>{css}</style>
      <nav className="nav">
        <div className="nav-logo">🚌 Bus Poupet</div>
        <div className="nav-tabs">
          <button className={`nav-tab ${page === "inscription" ? "active" : ""}`} onClick={() => setPage("inscription")}>Inscription</button>
          <button className={`nav-tab ${page === "admin" ? "active" : ""}`} onClick={() => setPage("admin")}>Admin</button>
        </div>
      </nav>
      {page === "inscription"
        ? <PageInscription inscriptions={inscriptions} onInscrit={handleInscrit} />
        : <PageAdmin inscriptions={inscriptions} onUpdate={handleUpdate} onDelete={handleDelete} showToast={showToast} />
      }
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </>
  );
}
