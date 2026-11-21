/* The Circle OS — application de gestion (Supabase) */
const C = window.CIRCLE_CONFIG;
const sb = supabase.createClient(C.supabaseUrl, C.supabaseKey);
const S = { user: null, member: null, cache: {} };

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const EUR = n => n == null || n === '' ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(Number(n))) + ' €';
const fmtD = s => s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const today = () => new Date().toISOString().slice(0, 10);
const daysTo = s => Math.round((new Date(s + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5);
function toast(t, err) { const el = $('toast'); el.textContent = t; el.style.background = err ? 'var(--bad)' : ''; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }
function openDrawer(html) { const d = $('drawer'); d.innerHTML = html; d.classList.add('on'); $('scrim').classList.add('on'); }
function closeDrawer() { $('drawer').classList.remove('on'); $('scrim').classList.remove('on'); }
async function q(promise) { const { data, error } = await promise; if (error) { toast(error.message, true); throw error; } return data; }
async function load(table, order = 'created_at', asc = false) { const d = await q(sb.from(table).select('*').order(order, { ascending: asc, nullsFirst: false })); S.cache[table] = d; return d; }

/* ---------- Listes ---------- */
const ROOMS = ['Single', 'Partagée', 'Double'];
const SOURCES = ['Pub Meta', 'Instagram DM', 'Formulaire', 'WhatsApp', 'Parrainage', 'Événement', 'Autre'];
const LEAD_STATUSES = ['Nouveau', 'Qualifié', 'Appel planifié', 'Offre envoyée', 'Tranche 1', 'Payé', 'Perdu'];
const OWNERS = ['Youssef', 'Nahed', 'Les deux'];
const CURR = ['EUR', 'TND', 'IDR'];
const ACCOUNTS = ['BIAT Pro', 'BIAT Tun', 'Wise', 'Qonto', 'Revolut', 'Boursorama', 'Espèces', 'Autre'];
const EXP_CATS = ['Villa', 'Coach', 'Excursions', 'Dîners', 'Courses maison', 'Surf & activités', 'Transport', 'Matériel & cadeaux', 'Publicité', 'Contenu & sponsoring', 'Visas', 'Partenaire légal', 'Banque & outils', 'Charges sociales', 'Assurance', 'Fondateurs', 'À clarifier'];
const EXP_TYPES = ['Coût édition', 'Marketing', 'Structure', 'Frais fondateurs', 'À clarifier'];
const DOC_TYPES = ['Contrat', 'CGV', 'Code de conduite', 'Règlement villa', 'Décharge', 'Droit image', 'Passeport', 'Visa', 'Assurance', 'Billets', 'Contact urgence', 'Fiche médicale'];

/* Définition des formulaires : [clé, libellé, type, requis, options/défaut] */
const SCHEMAS = {
  leads: { title: 'Lead', fields: [['full_name', 'Nom', 'text', 1], ['phone', 'Téléphone', 'text'], ['email', 'E-mail', 'email'], ['country', 'Pays', 'text'], ['age', 'Âge', 'number'], ['edition_id', 'Édition', 'edition'], ['room_type', 'Chambre', 'select', 0, ROOMS], ['source', 'Source', 'select', 0, SOURCES], ['status', 'Statut', 'select', 1, LEAD_STATUSES], ['next_action', 'Prochaine action', 'text'], ['next_action_date', "Date de l'action", 'date'], ['proposed_price_eur', 'Prix proposé (€)', 'number'], ['owner', 'Responsable', 'select', 0, OWNERS], ['consent_contact', 'Accepte d’être contacté', 'bool'], ['lost_reason', 'Motif de refus', 'text'], ['notes', 'Notes', 'textarea']] },
  participants: { title: 'Participant', fields: [['full_name', 'Nom', 'text', 1], ['edition_id', 'Édition', 'edition', 1], ['room_type', 'Chambre', 'select', 0, ROOMS], ['price_eur', 'Prix (€)', 'number', 1], ['pay_currency', 'Paie en', 'select', 1, ['EUR', 'TND']], ['status', 'Statut', 'select', 1, ['Confirmé', 'Reporté', 'Annulé', 'Exclu']], ['phone', 'Téléphone', 'text'], ['email', 'E-mail', 'email'], ['country', 'Pays', 'text'], ['emergency_contact', "Contact d'urgence", 'text'], ['source', 'Source', 'select', 0, SOURCES], ['notes', 'Notes', 'textarea']] },
  payments: { title: 'Encaissement', fields: [['edition_id', 'Édition', 'edition', 1], ['participant_id', 'Participant', 'participant'], ['paid_on', 'Date', 'date', 1], ['tranche_no', 'Tranche', 'select', 0, ['1', '2', '3']], ['amount', 'Montant', 'number', 1], ['currency', 'Devise', 'select', 1, CURR], ['fx_rate', 'Taux (devise pour 1 €)', 'number', 1], ['account', 'Compte', 'select', 0, ACCOUNTS], ['invoice_no', 'N° de facture', 'text'], ['notes', 'Notes', 'textarea']] },
  expenses: { title: 'Dépense', fields: [['edition_id', 'Édition', 'edition'], ['spent_on', 'Date', 'date'], ['category', 'Catégorie', 'select', 1, EXP_CATS], ['description', 'Description', 'text'], ['amount', 'Montant', 'number', 1], ['currency', 'Devise', 'select', 1, CURR], ['fx_rate', 'Taux (devise pour 1 €)', 'number', 1], ['type', 'Type', 'select', 1, EXP_TYPES], ['paid_from', 'Payé depuis', 'select', 0, ACCOUNTS], ['notes', 'Notes', 'textarea']] },
  editions: { title: 'Édition', fields: [['id', 'Code (ex. TRAD-2027-03)', 'text', 1], ['skill', 'Formation', 'text', 1], ['start_date', 'Début', 'date'], ['end_date', 'Fin', 'date'], ['capacity', 'Capacité', 'number', 1], ['coach_id', 'Coach', 'coach'], ['status', 'Statut', 'select', 1, ['Projet', 'En vente', 'Complet', 'En cours', 'Terminée', 'Annulée']], ['notes', 'Notes', 'textarea']] },
  partners: { title: 'Partenaire', fields: [['type', 'Type', 'select', 1, ['Coach', 'Speaker', 'Villa', 'Légal', 'Prestataire', 'Assurance', 'Autre']], ['name', 'Nom', 'text', 1], ['role', 'Rôle / offre', 'text'], ['contact', 'Contact', 'text'], ['price', 'Prix', 'text'], ['status', 'Statut', 'text'], ['contract_signed', 'Contrat signé', 'bool'], ['notes', 'Notes', 'textarea']] },
  documents: { title: 'Document', fields: [['audience', 'Pour', 'select', 1, ['Vendre', 'Participants', 'Partenaires', 'Édition', 'Interne']], ['name', 'Nom', 'text', 1], ['status', 'État', 'select', 1, ['À rédiger', 'À corriger', 'Prête', 'À récupérer']], ['file', 'Fichier', 'file'], ['notes', 'Notes', 'textarea']] },
  incidents: { title: 'Incident', fields: [['occurred_on', 'Date', 'date', 1], ['edition_id', 'Édition', 'edition'], ['type', 'Type', 'select', 1, ['Violence', 'Harcèlement', 'Santé', 'Accident', 'Vol', 'Drogue', 'Conflit', 'Autre']], ['description', 'Faits', 'textarea', 1], ['people_involved', 'Personnes concernées', 'text'], ['decision', 'Décision', 'text'], ['status', 'Statut', 'select', 1, ['Ouvert', 'Clos']]] },
  alumni: { title: 'Alumni', fields: [['full_name', 'Nom', 'text', 1], ['edition_id', 'Édition', 'edition'], ['project', 'Projet', 'text'], ['referrals', 'Parrainages', 'number'], ['circle_club', 'Membre du Circle Club', 'bool'], ['notes', 'Notes', 'textarea']] },
  tasks: { title: 'Tâche', fields: [['title', 'Tâche', 'text', 1], ['due_date', 'Échéance', 'date'], ['owner', 'Responsable', 'select', 0, OWNERS], ['edition_id', 'Édition', 'edition'], ['done', 'Faite', 'bool'], ['notes', 'Notes', 'textarea']] },
  decisions: { title: 'Décision', fields: [['decided_on', 'Date', 'date', 1], ['subject', 'Sujet', 'text', 1], ['decision', 'Décision', 'textarea', 1], ['ref', 'Référence', 'text']] },
  edition_budget_lines: { title: 'Ligne de budget', fields: [['edition_id', 'Édition', 'edition', 1], ['category', 'Poste', 'text', 1], ['amount_eur', 'Montant (€)', 'number', 1]] }
};

function fieldHtml([k, label, type, req, opt], v) {
  const id = 'f_' + k, r = req ? 'required' : '';
  const val = v ?? (type === 'select' && req && Array.isArray(opt) ? opt[0] : '');
  if (type === 'bool') return `<label class="check" for="${id}"><input type="checkbox" id="${id}" name="${k}" ${v ? 'checked' : ''}> ${label}</label>`;
  if (type === 'textarea') return `<label class="field" for="${id}">${label}<textarea id="${id}" name="${k}" rows="3" ${r}>${esc(val)}</textarea></label>`;
  if (type === 'file') return `<label class="field" for="${id}">${label}<input type="file" id="${id}" name="${k}"></label>`;
  let options = null;
  if (type === 'select') options = opt.map(o => [o, o]);
  if (type === 'edition') options = (S.cache.editions || []).map(e => [e.id, `${e.id} · ${e.skill}`]);
  if (type === 'participant') options = (S.cache.participants || []).map(p => [p.id, `${p.full_name} · ${p.edition_id}`]);
  if (type === 'coach') options = (S.cache.partners || []).filter(p => p.type === 'Coach').map(p => [p.id, p.name]);
  if (options) return `<label class="field" for="${id}">${label}<select id="${id}" name="${k}" ${r}>${req ? '' : '<option value="">—</option>'}${options.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select></label>`;
  const t = type === 'number' ? 'number" step="any' : type;
  return `<label class="field" for="${id}">${label}<input type="${t}" id="${id}" name="${k}" value="${esc(val)}" ${r}></label>`;
}

async function ensureLookups() {
  const need = ['editions', 'participants', 'partners'].filter(t => !S.cache[t]);
  await Promise.all(need.map(t => load(t, t === 'editions' ? 'start_date' : 'created_at', t === 'editions')));
}

/* Formulaire générique : ajout / modification / suppression */
async function editRow(table, row = null, defaults = {}, after = null) {
  await ensureLookups();
  const sc = SCHEMAS[table], isNew = !row, data = row || defaults;
  openDrawer(`<div style="display:flex;gap:8px;align-items:center"><h2>${isNew ? 'Ajouter' : 'Modifier'} · ${sc.title}</h2><button class="btn" style="margin-left:auto" data-close type="button">Fermer</button></div>
  <form class="form" id="gform">${sc.fields.filter(f => !(f[0] === 'id' && !isNew)).map(f => fieldHtml(f, data[f[0]])).join('')}
  ${row && row.file_path ? `<button class="btn" type="button" id="openFile">Ouvrir le fichier joint</button>` : ''}
  <div class="row-actions">${isNew ? '' : '<button class="btn danger" type="button" id="del">Supprimer</button>'}<button class="btn primary" type="submit">Enregistrer</button></div></form>`);
  const form = $('gform');
  const cur = form.querySelector('[name=currency]'), fx = form.querySelector('[name=fx_rate]');
  if (cur && fx) cur.addEventListener('change', () => { fx.value = cur.value === 'TND' ? C.fxTnd : cur.value === 'EUR' ? 1 : fx.value; });
  if ($('openFile')) $('openFile').onclick = () => openFile(row.file_path);
  form.onsubmit = async ev => {
    ev.preventDefault();
    const rec = {};
    let file = null;
    for (const [k, , type] of sc.fields) {
      const el = form.elements[k]; if (!el) continue;
      if (type === 'bool') rec[k] = el.checked;
      else if (type === 'file') file = el.files[0] || null;
      else if (type === 'number') rec[k] = el.value === '' ? null : Number(el.value);
      else rec[k] = el.value === '' ? null : el.value;
    }
    if ('tranche_no' in rec && rec.tranche_no) rec.tranche_no = Number(rec.tranche_no);
    try {
      let saved;
      if (isNew) saved = (await q(sb.from(table).insert(rec).select()))[0];
      else saved = (await q(sb.from(table).update(rec).eq('id', row.id).select()))[0];
      if (file && saved) {
        const path = `${table}/${saved.id}/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`;
        await q(sb.storage.from('documents').upload(path, file));
        await q(sb.from(table).update({ file_path: path, updated_at: new Date().toISOString() }).eq('id', saved.id));
      }
      delete S.cache[table]; closeDrawer(); toast('Enregistré'); after ? after() : route();
    } catch (e) { /* toast déjà affiché */ }
  };
  if (!isNew) {
    const del = $('del');
    del.onclick = async () => {
      if (!del.dataset.armed) { del.dataset.armed = 1; del.textContent = 'Confirmer la suppression'; return; }
      try { await q(sb.from(table).delete().eq('id', row.id)); delete S.cache[table]; closeDrawer(); toast('Supprimé'); after ? after() : route(); } catch (e) { }
    };
  }
}
async function openFile(path) {
  const d = await q(sb.storage.from('documents').createSignedUrl(path, 300));
  window.open(d.signedUrl, '_blank', 'noopener');
}

/* ---------- Layout ---------- */
const VIEWS = [['accueil', 'Accueil'], ['crm', 'CRM'], ['editions', 'Éditions'], ['participants', 'Participants'], ['finances', 'Finances'], ['partenaires', 'Partenaires'], ['documents', 'Documents'], ['securite', 'Sécurité'], ['alumni', 'Alumni'], ['pilotage', 'Tâches & décisions']];
function shell() {
  $('root').innerHTML = `<aside id="side">
    <div class="brand"><svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="13" fill="none" stroke="#4FB3A9" stroke-width="3"/><circle cx="17" cy="17" r="6" fill="none" stroke="#E8B04F" stroke-width="2"/></svg><div><b>THE CIRCLE</b><small>Bali · espace de gestion</small></div></div>
    <nav id="nav"></nav>
    <div class="side-foot"><span>Connecté : ${esc(S.member?.display_name || S.user.email)}</span><button id="logout" type="button">Se déconnecter</button></div>
  </aside>
  <main><div class="top"><button class="btn menu-btn" id="menu" type="button" aria-label="Ouvrir le menu">Menu</button><div><h1 id="title"></h1><p id="subtitle"></p></div><div class="actions" id="actions"></div></div><div class="wrap" id="view"><div class="loading">Chargement…</div></div></main>`;
}
function setHead(t, s, actions = '') { $('title').textContent = t; $('subtitle').textContent = s; $('actions').innerHTML = actions; }
const pill = (t, c = '') => `<span class="pill ${c}">${esc(t)}</span>`;
const statusClass = s => ({ 'En cours': 'warn', 'Projet': 'mute', 'Terminée': 'good', 'Complet': 'good', 'Annulée': 'bad' }[s] || '');
const kpi = (l, v, s) => `<div class="card kpi"><span>${esc(l)}</span><b class="num">${esc(v)}</b><small>${esc(s)}</small></div>`;

/* ---------- Vues ---------- */
const V = {};

V.accueil = async () => {
  const name = S.member?.display_name || '';
  setHead(`Bonjour ${name}`, new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), `<button class="btn primary" type="button" data-add="tasks">Nouvelle tâche</button>`);
  const [stats, tasks, leads] = await Promise.all([
    q(sb.from('edition_stats').select('*').order('start_date', { nullsFirst: false })),
    q(sb.from('tasks').select('*').eq('done', false).order('due_date', { nullsFirst: false })),
    q(sb.from('leads').select('*').not('status', 'in', '("Payé","Perdu")'))
  ]);
  const t = today();
  const current = stats.find(e => e.start_date && e.end_date && e.start_date <= t && e.end_date >= t);
  const next = stats.filter(e => e.start_date && e.start_date > t).sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
  const rest = stats.reduce((s, e) => s + Number(e.reste_eur || 0), 0);
  const lateLeads = leads.filter(l => l.next_action_date && l.next_action_date < t);
  const lateTasks = tasks.filter(x => x.due_date && x.due_date < t);
  const cap = next?.capacity || 12;
  return `<div class="grid g4">
    ${next ? kpi('Prochaine édition', next.skill, `${fmtD(next.start_date)} · dans ${daysTo(next.start_date)} jours`) : kpi('Prochaine édition', '—', 'Aucune date')}
    ${next ? `<div class="card kpi"><span>Places vendues · ${esc(next.id)}</span><b class="num">${next.participants} / ${cap}</b><div class="bar"><i style="width:${Math.min(next.participants / cap * 100, 100)}%"></i><span class="mark" style="left:${Math.min(7 / cap * 100, 100)}%"></span></div><small>Seuil sans perte : 7 · objectif : 12</small></div>` : ''}
    ${kpi('Reste à encaisser', EUR(rest), 'Toutes éditions')}
    ${kpi('Leads ouverts', leads.length, `${lateLeads.length} relance(s) en retard`)}
  </div>
  <div class="split">
    <div class="card"><div class="head"><h2>Tâches</h2><span class="pill ${lateTasks.length ? 'bad' : 'good'}">${lateTasks.length} en retard</span></div>
      <div class="list">${tasks.map(x => `<div class="row"><span class="stripe ${x.due_date && x.due_date < t ? 'bad' : x.due_date && daysTo(x.due_date) <= 3 ? 'warn' : ''}"></span><input type="checkbox" data-done="${x.id}" aria-label="Marquer comme faite"><div style="cursor:pointer" data-edit-task="${x.id}"><div>${esc(x.title)}</div><div class="sub">${esc(x.owner || '')}${x.due_date ? ' · ' + fmtD(x.due_date) : ''}${x.edition_id ? ' · ' + esc(x.edition_id) : ''}</div></div></div>`).join('') || '<div class="empty-state">Aucune tâche ouverte</div>'}</div>
    </div>
    <div class="card">${current ? `<div class="head"><h2>Édition en cours</h2><a class="more" href="#editions">Ouvrir</a></div>
      <div class="kv"><span>Édition</span><b>${esc(current.skill)}</b><span>Dates</span><b>${fmtD(current.start_date)} → ${fmtD(current.end_date)}</b><span>Participants</span><b class="num">${current.participants} / ${current.capacity}</b><span>Encaissé</span><b class="num">${EUR(current.encaisse_eur)} / ${EUR(current.ca_eur)}</b><span>Reste</span><b class="num">${EUR(current.reste_eur)}</b><span>Coûts saisis</span><b class="num">${EUR(current.couts_eur)}</b></div>
      <div class="bar"><i style="width:${Math.min(Math.max(daysTo(current.start_date) * -1, 0) / Math.max(daysTo(current.end_date) - daysTo(current.start_date), 1) * 100, 100)}%"></i></div>` : `<div class="head"><h2>Aucune édition en cours</h2></div>`}
      <div class="head" style="margin-top:8px"><h2>Relances en retard</h2></div>
      <div class="list">${lateLeads.map(l => `<div class="row"><span class="stripe bad"></span><div><div>${esc(l.full_name)}</div><div class="sub">${esc(l.next_action || '')} · ${fmtD(l.next_action_date)}</div></div></div>`).join('') || '<div class="empty-state">Aucune</div>'}</div>
    </div>
  </div>
  <div class="card"><div class="head"><h2>Calendrier des éditions</h2><a class="more" href="#editions">Toutes les éditions</a></div>${timeline(stats)}</div>`;
};
function timeline(stats) {
  const eds = stats.filter(e => e.start_date && e.end_date);
  if (!eds.length) return '<div class="empty-state">Aucune édition datée</div>';
  const s0 = new Date(Math.min(...eds.map(e => +new Date(e.start_date)), Date.now())); s0.setDate(1);
  const s1 = new Date(Math.max(...eds.map(e => +new Date(e.end_date)))); s1.setMonth(s1.getMonth() + 1, 1);
  const W = 900, H = 40 + eds.length * 30, x = d => 40 + (new Date(d) - s0) / (s1 - s0) * (W - 60);
  let months = '', d = new Date(s0);
  while (d < s1) { months += `<line x1="${x(d)}" x2="${x(d)}" y1="22" y2="${H}" stroke="var(--line)"/><text x="${x(d) + 4}" y="16" font-size="11" fill="var(--muted)">${d.toLocaleDateString('fr-FR', { month: 'short' })}</text>`; d.setMonth(d.getMonth() + 1); }
  const bars = eds.map((e, i) => { const y = 32 + i * 30, c = e.status === 'Projet' ? 'var(--sun)' : e.status === 'Terminée' ? 'var(--muted)' : 'var(--accent)'; return `<rect x="${x(e.start_date)}" y="${y}" width="${Math.max(x(e.end_date) - x(e.start_date), 6)}" height="18" rx="9" fill="${c}" opacity=".85"/><text x="${x(e.end_date) + 8}" y="${y + 13}" font-size="12" fill="var(--ink)">${esc(e.skill)}</text>`; }).join('');
  const t = x(new Date());
  return `<div class="table-wrap"><svg class="chart" viewBox="0 0 ${W + 160} ${H + 8}" role="img" aria-label="Calendrier des éditions">${months}${bars}<line x1="${t}" x2="${t}" y1="22" y2="${H}" stroke="var(--bad)" stroke-dasharray="3 3"/><text x="${t + 4}" y="${H + 6}" font-size="11" fill="var(--bad)">aujourd'hui</text></svg></div>`;
}

let crmEdition = '';
V.crm = async () => {
  await ensureLookups();
  setHead('CRM', 'Faites glisser une carte pour changer son statut. Cliquez pour ouvrir la fiche.', `<button class="btn primary" type="button" data-add="leads">Nouveau lead</button>`);
  const leads = await load('leads');
  const list = crmEdition ? leads.filter(l => l.edition_id === crmEdition) : leads;
  const t = today();
  return `<div class="toolbar"><label for="crmEd" class="muted">Édition</label><select id="crmEd"><option value="">Toutes</option>${S.cache.editions.map(e => `<option ${e.id === crmEdition ? 'selected' : ''} value="${e.id}">${e.id}</option>`).join('')}</select></div>
  <div class="board">${LEAD_STATUSES.map(s => { const ls = list.filter(l => l.status === s); return `<div class="col" data-status="${s}"><h3>${s}<span>${ls.length}</span></h3>${ls.map(l => `<button type="button" class="lead ${l.next_action_date && l.next_action_date < t ? 'late' : ''}" draggable="true" data-lead="${l.id}"><b>${esc(l.full_name)}</b><span class="sub">${esc(l.edition_id || 'Sans édition')}${l.source ? ' · ' + esc(l.source) : ''}</span><span class="sub">${esc(l.next_action || '')}${l.next_action_date ? ' · ' + fmtD(l.next_action_date) : ''}</span></button>`).join('') || '<span class="empty">Vide</span>'}</div>`; }).join('')}</div>`;
};

V.editions = async () => {
  setHead('Éditions', 'Cliquez sur une édition pour son budget, son bénéfice et ses participants.', `<button class="btn primary" type="button" data-add="editions">Nouvelle édition</button>`);
  const stats = await q(sb.from('edition_stats').select('*').order('start_date', { nullsFirst: true }));
  return `<div class="grid g2">${stats.map(e => `<button type="button" class="card ed" data-ed="${e.id}">
    <div class="head"><h2>${esc(e.skill)}</h2>${pill(e.status, statusClass(e.status))}</div>
    <span class="dates">${fmtD(e.start_date)} → ${fmtD(e.end_date)} · ${esc(e.id)}</span>
    <div class="bar"><i style="width:${Math.min(e.participants / (e.capacity || 12) * 100, 100)}%"></i>${e.capacity <= 12 ? `<span class="mark" style="left:${7 / e.capacity * 100}%"></span>` : ''}</div>
    <div class="kv"><span>Places</span><b class="num">${e.participants} / ${e.capacity}</b><span>Inscriptions</span><b class="num">${EUR(e.ca_eur)}</b><span>Encaissé</span><b class="num">${EUR(e.encaisse_eur)}</b><span>Budget prévu</span><b class="num">${Number(e.budget_eur) ? EUR(e.budget_eur) : 'à faire'}</b></div>
  </button>`).join('')}</div>`;
};
async function editionDetail(id) {
  await ensureLookups();
  const [st, lines, parts] = await Promise.all([
    q(sb.from('edition_stats').select('*').eq('id', id).single()),
    q(sb.from('edition_budget_lines').select('*').eq('edition_id', id).order('amount_eur', { ascending: false })),
    q(sb.from('participants').select('*').eq('edition_id', id).order('full_name'))
  ]);
  const ed = S.cache.editions.find(e => e.id === id);
  const budget = Number(st.budget_eur), avg = st.participants ? st.ca_eur / st.participants : 2450;
  const margin12 = 12 * avg - budget;
  openDrawer(`<div style="display:flex;gap:8px;align-items:center"><h2>${esc(st.skill)}</h2>${pill(st.status, statusClass(st.status))}<button class="btn" style="margin-left:auto" data-close type="button">Fermer</button></div>
  <span class="muted">${fmtD(st.start_date)} → ${fmtD(st.end_date)} · ${esc(id)}</span>
  <div class="kv"><span>Participants</span><b>${st.participants} / ${st.capacity}</b><span>Inscriptions</span><b>${EUR(st.ca_eur)}</b><span>Encaissé</span><b>${EUR(st.encaisse_eur)}</b><span>Reste</span><b>${EUR(st.reste_eur)}</b><span>Coûts réels</span><b>${EUR(st.couts_eur)}</b><span>Bénéfice actuel</span><b>${EUR(st.marge_eur)}</b><span>Frais fondateurs</span><b>${EUR(st.frais_fondateurs_eur)}</b></div>
  <div class="row-actions"><button class="btn sm" type="button" data-edit-ed="${id}">Modifier l'édition</button></div>
  <div style="display:flex;align-items:center"><h3>Budget prévisionnel</h3><button class="btn sm" style="margin-left:auto" type="button" data-add-line="${id}">Ajouter un poste</button></div>
  <table><tbody>${lines.map(l => `<tr class="click" data-line="${l.id}"><td>${esc(l.category)}</td><td class="n">${EUR(l.amount_eur)}</td></tr>`).join('') || '<tr><td class="muted">Budget à construire</td></tr>'}
  ${budget ? `<tr><td><b>Total</b></td><td class="n"><b>${EUR(budget)}</b></td></tr><tr><td>Seuil sans perte</td><td class="n">${Math.ceil(budget / avg)} participants</td></tr><tr><td>Bénéfice à 12 participants</td><td class="n">${EUR(margin12)}</td></tr><tr><td>Soit par associé</td><td class="n">${EUR(margin12 / 2)}</td></tr>` : ''}</tbody></table>
  <div style="display:flex;align-items:center"><h3>Participants (${parts.length})</h3><button class="btn sm" style="margin-left:auto" type="button" data-add-part="${id}">Ajouter</button></div>
  <div class="list">${parts.map(p => `<div class="row" style="cursor:pointer" data-part="${p.id}"><div>${esc(p.full_name)}<div class="sub">${esc(p.room_type || '')} · ${EUR(p.price_eur)} · ${esc(p.status)}</div></div></div>`).join('') || '<span class="empty">Aucun participant</span>'}</div>`);
  S.lastEdition = id; S._edRef = ed;
}

let partEdition = '';
V.participants = async () => {
  await ensureLookups();
  setHead('Participants', 'Dossier de chaque participant : paiements et documents reçus.', `<button class="btn primary" type="button" data-add="participants">Nouveau participant</button>`);
  const [parts, docs, pays] = await Promise.all([load('participants'), q(sb.from('participant_documents').select('participant_id,doc_type,received')), q(sb.from('payments').select('participant_id,amount_eur'))]);
  const list = partEdition ? parts.filter(p => p.edition_id === partEdition) : parts;
  const paid = {}; pays.forEach(p => { if (p.participant_id) paid[p.participant_id] = (paid[p.participant_id] || 0) + Number(p.amount_eur); });
  const got = {}; docs.forEach(d => { if (d.received) (got[d.participant_id] ||= new Set()).add(d.doc_type); });
  const KEY = ['Contrat', 'Code de conduite', 'Passeport', 'Visa', 'Assurance', 'Droit image'];
  return `<div class="toolbar"><label for="partEd" class="muted">Édition</label><select id="partEd"><option value="">Toutes</option>${S.cache.editions.map(e => `<option ${e.id === partEdition ? 'selected' : ''} value="${e.id}">${e.id}</option>`).join('')}</select></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Participant</th><th>Édition</th><th>Chambre</th><th class="n">Prix</th><th class="n">Payé</th><th class="n">Reste</th><th>Documents clés</th></tr></thead><tbody>
  ${list.map(p => { const pd = paid[p.id] || 0, rest = Number(p.price_eur) - pd; return `<tr class="click" data-part="${p.id}"><td>${esc(p.full_name)}${p.status !== 'Confirmé' ? ' ' + pill(p.status, 'bad') : ''}</td><td>${esc(p.edition_id)}</td><td>${esc(p.room_type || '')}</td><td class="n">${EUR(p.price_eur)}</td><td class="n">${EUR(pd)}</td><td class="n">${rest > 1 ? `<span class="pill warn">${EUR(rest)}</span>` : pill('Soldé', 'good')}</td><td><div class="docs">${KEY.map(k => `<span class="doc ${got[p.id]?.has(k) ? 'ok' : ''}">${k}</span>`).join('')}</div></td></tr>`; }).join('') || '<tr><td colspan="7" class="empty-state">Aucun participant</td></tr>'}
  </tbody></table></div></div>`;
};
async function participantDetail(id) {
  await ensureLookups();
  const [p, docs, pays] = await Promise.all([
    q(sb.from('participants').select('*').eq('id', id).single()),
    q(sb.from('participant_documents').select('*').eq('participant_id', id)),
    q(sb.from('payments').select('*').eq('participant_id', id).order('paid_on'))
  ]);
  const got = new Set(docs.filter(d => d.received).map(d => d.doc_type));
  const paid = pays.reduce((s, x) => s + Number(x.amount_eur), 0);
  openDrawer(`<div style="display:flex;gap:8px;align-items:center"><h2>${esc(p.full_name)}</h2><button class="btn" style="margin-left:auto" data-close type="button">Fermer</button></div>
  <div class="kv"><span>Édition</span><b>${esc(p.edition_id)}</b><span>Chambre</span><b>${esc(p.room_type || '—')}</b><span>Prix</span><b>${EUR(p.price_eur)}</b><span>Payé</span><b>${EUR(paid)}</b><span>Reste</span><b>${EUR(Number(p.price_eur) - paid)}</b><span>Téléphone</span><b>${esc(p.phone || '—')}</b><span>E-mail</span><b>${esc(p.email || '—')}</b></div>
  <div class="row-actions"><button class="btn sm" type="button" data-edit-part="${id}">Modifier la fiche</button></div>
  <h3>Dossier (cliquez pour cocher)</h3>
  <div class="docgrid">${DOC_TYPES.map(d => `<button type="button" class="docbtn ${got.has(d) ? 'ok' : ''}" data-doc="${esc(d)}" data-pid="${id}">${esc(d)}<span>${got.has(d) ? 'Reçu' : 'Manquant'}</span></button>`).join('')}</div>
  <div style="display:flex;align-items:center"><h3>Paiements</h3><button class="btn sm" style="margin-left:auto" type="button" data-add-pay="${id}" data-ped="${esc(p.edition_id)}" data-pcur="${p.pay_currency}">Ajouter un paiement</button></div>
  <table><tbody>${pays.map(x => `<tr class="click" data-pay="${x.id}"><td>${fmtD(x.paid_on)}</td><td>${x.tranche_no ? 'Tranche ' + x.tranche_no : ''}</td><td class="n">${new Intl.NumberFormat('fr-FR').format(x.amount)} ${x.currency}</td><td class="n">${EUR(x.amount_eur)}</td></tr>`).join('') || '<tr><td class="muted">Aucun paiement</td></tr>'}</tbody></table>`);
}

let finTab = 'pay', finEdition = '';
V.finances = async () => {
  await ensureLookups();
  setHead('Finances', `Encaissements et dépenses. Conversion TND au taux de ${String(C.fxTnd).replace('.', ',')} par défaut.`, `<button class="btn" type="button" data-add="expenses">Nouvelle dépense</button><button class="btn primary" type="button" data-add="payments">Nouvel encaissement</button>`);
  const [pays, exps] = await Promise.all([load('payments', 'paid_on'), load('expenses', 'spent_on')]);
  const fp = finEdition ? pays.filter(p => p.edition_id === finEdition) : pays, fe = finEdition ? exps.filter(e => e.edition_id === finEdition) : exps;
  const enc = fp.reduce((s, x) => s + Number(x.amount_eur), 0), cost = fe.filter(x => x.type !== 'Frais fondateurs').reduce((s, x) => s + Number(x.amount_eur), 0), ff = fe.filter(x => x.type === 'Frais fondateurs').reduce((s, x) => s + Number(x.amount_eur), 0), clar = fe.filter(x => x.type === 'À clarifier');
  const pname = id => S.cache.participants.find(p => p.id === id)?.full_name || '—';
  const cats = {}; fe.forEach(x => cats[x.category] = (cats[x.category] || 0) + Number(x.amount_eur));
  const ent = Object.entries(cats).sort((a, b) => b[1] - a[1]), max = ent[0]?.[1] || 1;
  const chart = ent.length ? `<svg class="chart" viewBox="0 0 560 ${ent.length * 30 + 10}" role="img" aria-label="Dépenses par catégorie">${ent.map(([k, v], i) => `<text x="0" y="${i * 30 + 20}" font-size="12" fill="var(--muted)">${esc(k)}</text><rect x="160" y="${i * 30 + 8}" width="${v / max * 300}" height="16" rx="4" fill="${k === 'À clarifier' ? 'var(--bad)' : k === 'Fondateurs' ? 'var(--sun)' : 'var(--accent)'}"/><text x="${168 + v / max * 300}" y="${i * 30 + 21}" font-size="12" fill="var(--ink)">${EUR(v)}</text>`).join('')}</svg>` : '<div class="empty-state">Aucune dépense</div>';
  return `<div class="toolbar"><label for="finEd" class="muted">Édition</label><select id="finEd"><option value="">Toutes</option>${S.cache.editions.map(e => `<option ${e.id === finEdition ? 'selected' : ''} value="${e.id}">${e.id}</option>`).join('')}</select></div>
  <div class="grid g4">${kpi('Encaissé', EUR(enc), `${fp.length} paiements`)}${kpi('Coûts', EUR(cost), 'Hors frais fondateurs')}${kpi('Frais fondateurs', EUR(ff), 'À part')}${kpi('À clarifier', clar.length, EUR(clar.reduce((s, x) => s + Number(x.amount_eur), 0)))}</div>
  <div class="split"><div class="card"><div class="tabs"><button type="button" data-ft="pay" class="${finTab === 'pay' ? 'on' : ''}">Encaissements</button><button type="button" data-ft="exp" class="${finTab === 'exp' ? 'on' : ''}">Dépenses</button></div>
  <div class="table-wrap"><table>${finTab === 'pay'
      ? `<thead><tr><th>Date</th><th>Participant</th><th>Édition</th><th>Compte</th><th class="n">Montant</th><th class="n">EUR</th></tr></thead><tbody>${fp.map(x => `<tr class="click" data-pay="${x.id}"><td>${fmtD(x.paid_on)}</td><td>${esc(pname(x.participant_id))}</td><td>${esc(x.edition_id)}</td><td>${esc(x.account || '')}</td><td class="n">${new Intl.NumberFormat('fr-FR').format(x.amount)} ${x.currency}</td><td class="n">${EUR(x.amount_eur)}</td></tr>`).join('')}</tbody>`
      : `<thead><tr><th>Date</th><th>Catégorie</th><th>Description</th><th>Type</th><th class="n">EUR</th></tr></thead><tbody>${fe.map(x => `<tr class="click" data-exp="${x.id}"><td>${fmtD(x.spent_on)}</td><td>${esc(x.category)}</td><td>${esc(x.description || '')}</td><td>${pill(x.type, x.type === 'À clarifier' ? 'bad' : x.type === 'Frais fondateurs' ? 'warn' : 'mute')}</td><td class="n">${EUR(x.amount_eur)}</td></tr>`).join('')}</tbody>`}</table></div></div>
  <div class="card"><div class="head"><h2>Dépenses par catégorie</h2></div>${chart}</div></div>`;
};

function simpleList(table, title, sub, cols, order = 'created_at', asc = false) {
  return async () => {
    await ensureLookups();
    setHead(title, sub, `<button class="btn primary" type="button" data-add="${table}">Ajouter</button>`);
    const rows = await load(table, order, asc);
    return `<div class="card"><div class="table-wrap"><table><thead><tr>${cols.map(c => `<th class="${c[2] === 'n' ? 'n' : ''}">${c[0]}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => `<tr class="click" data-row="${table}:${r.id}">${cols.map(c => `<td class="${c[2] === 'n' ? 'n' : ''}">${c[1](r)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}" class="empty-state">Rien pour l'instant</td></tr>`}
    </tbody></table></div></div>`;
  };
}
V.partenaires = simpleList('partners', 'Partenaires', 'Coachs, villa, prestataires, partenaire légal.', [['Type', r => pill(r.type, 'mute')], ['Nom', r => `<b>${esc(r.name)}</b><div class="muted">${esc(r.role || '')}</div>`], ['Prix', r => esc(r.price || '')], ['Statut', r => esc(r.status || '')], ['Contrat', r => r.contract_signed ? pill('Signé', 'good') : pill('Non signé', 'warn')]], 'type', true);
V.documents = simpleList('documents', 'Documents', 'Bibliothèque rangée par destinataire. Joignez le fichier quand il est prêt.', [['Pour', r => pill(r.audience, 'mute')], ['Document', r => esc(r.name)], ['État', r => pill(r.status, r.status === 'Prête' ? 'good' : 'warn')], ['Fichier', r => r.file_path ? pill('Joint', 'good') : '<span class="muted">—</span>']], 'audience', true);
V.securite = simpleList('incidents', 'Sécurité', "Incidents (accès réservé à l'équipe). Urgences Bali : 112 · police 110 · ambulance 118 / 119 · BIMC Kuta +62 361 761263 · Siloam +62 361 779900.", [['Date', r => fmtD(r.occurred_on)], ['Type', r => pill(r.type, 'bad')], ['Faits', r => esc(r.description)], ['Décision', r => esc(r.decision || '')], ['Statut', r => pill(r.status, r.status === 'Clos' ? 'good' : 'warn')]], 'occurred_on');
V.alumni = simpleList('alumni', 'Alumni', 'Anciens participants, projets, parrainages, Circle Club.', [['Nom', r => esc(r.full_name)], ['Édition', r => esc(r.edition_id || '')], ['Projet', r => esc(r.project || '')], ['Parrainages', r => r.referrals, 'n'], ['Circle Club', r => r.circle_club ? pill('Oui', 'good') : '<span class="muted">Non</span>']]);
V.pilotage = async () => {
  setHead('Tâches & décisions', 'Toutes les tâches et le journal des décisions.', `<button class="btn" type="button" data-add="decisions">Nouvelle décision</button><button class="btn primary" type="button" data-add="tasks">Nouvelle tâche</button>`);
  const [tasks, decs] = await Promise.all([load('tasks', 'due_date', true), load('decisions', 'decided_on')]);
  return `<div class="split"><div class="card"><div class="head"><h2>Tâches</h2></div><div class="table-wrap"><table><thead><tr><th>Tâche</th><th>Qui</th><th>Échéance</th><th>État</th></tr></thead><tbody>${tasks.map(x => `<tr class="click" data-row="tasks:${x.id}"><td>${esc(x.title)}</td><td>${esc(x.owner || '')}</td><td>${fmtD(x.due_date)}</td><td>${x.done ? pill('Faite', 'good') : x.due_date && x.due_date < today() ? pill('En retard', 'bad') : pill('À faire', 'mute')}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><div class="head"><h2>Décisions</h2></div><div class="list">${decs.map(d => `<div class="row" style="cursor:pointer" data-row="decisions:${d.id}"><div><b>${esc(d.subject)}</b><div class="sub">${esc(d.decision)}</div><div class="sub">${fmtD(d.decided_on)}${d.ref ? ' · ' + esc(d.ref) : ''}</div></div></div>`).join('')}</div></div></div>`;
};

/* ---------- Routing ---------- */
async function route() {
  if (!S.member) return;
  const k = (location.hash || '#accueil').slice(1), view = V[k] ? k : 'accueil';
  $('nav').innerHTML = VIEWS.map(([key, l]) => `<a href="#${key}" class="${key === view ? 'on' : ''}"><span class="dot"></span>${l}</a>`).join('');
  $('side').classList.remove('open');
  try { $('view').innerHTML = await V[view](); } catch (e) { $('view').innerHTML = `<div class="msg err">Impossible de charger cette page : ${esc(e.message)}</div>`; }
}

document.addEventListener('click', async e => {
  const t = e.target.closest('[data-close],#scrim,#logout,#menu,[data-add],[data-lead],[data-ed],[data-edit-ed],[data-add-line],[data-line],[data-add-part],[data-part],[data-edit-part],[data-doc],[data-add-pay],[data-pay],[data-exp],[data-ft],[data-row],[data-done],[data-edit-task]');
  if (!t) return;
  const d = t.dataset;
  if (t.matches('[data-close],#scrim')) closeDrawer();
  else if (t.id === 'logout') { await sb.auth.signOut(); location.hash = ''; location.reload(); }
  else if (t.id === 'menu') $('side').classList.toggle('open');
  else if (d.add) { const defs = { leads: { status: 'Nouveau', edition_id: crmEdition || null }, payments: { currency: 'TND', fx_rate: C.fxTnd, paid_on: today(), edition_id: finEdition || null }, expenses: { currency: 'EUR', fx_rate: 1, spent_on: today(), type: 'Coût édition', edition_id: finEdition || null }, tasks: { owner: 'Les deux' }, decisions: { decided_on: today() }, participants: { status: 'Confirmé', pay_currency: 'TND', edition_id: partEdition || null }, editions: { status: 'Projet', capacity: 12 }, incidents: { occurred_on: today(), status: 'Ouvert' } }; editRow(d.add, null, defs[d.add] || {}); }
  else if (d.lead) editRow('leads', S.cache.leads.find(x => x.id === d.lead));
  else if (d.ed) editionDetail(d.ed);
  else if (d.editEd) { await ensureLookups(); editRow('editions', S.cache.editions.find(x => x.id === d.editEd), {}, () => { delete S.cache.editions; route(); }); }
  else if (d.addLine) editRow('edition_budget_lines', null, { edition_id: d.addLine }, () => editionDetail(d.addLine));
  else if (d.line) { const l = (await q(sb.from('edition_budget_lines').select('*').eq('id', d.line).single())); editRow('edition_budget_lines', l, {}, () => editionDetail(l.edition_id)); }
  else if (d.addPart) editRow('participants', null, { edition_id: d.addPart, status: 'Confirmé', pay_currency: 'TND' }, () => { delete S.cache.participants; route(); });
  else if (d.part) participantDetail(d.part);
  else if (d.editPart) { const p = await q(sb.from('participants').select('*').eq('id', d.editPart).single()); editRow('participants', p, {}, () => { delete S.cache.participants; route(); }); }
  else if (d.doc) { const has = t.classList.contains('ok'); await q(sb.from('participant_documents').upsert({ participant_id: d.pid, doc_type: d.doc, received: !has, received_at: has ? null : today() }, { onConflict: 'participant_id,doc_type' })); t.classList.toggle('ok'); t.querySelector('span').textContent = has ? 'Manquant' : 'Reçu'; route(); }
  else if (d.addPay) editRow('payments', null, { participant_id: d.addPay, edition_id: d.ped, currency: d.pcur, fx_rate: d.pcur === 'TND' ? C.fxTnd : 1, paid_on: today() }, () => { participantDetail(d.addPay); route(); });
  else if (d.pay) { const x = await q(sb.from('payments').select('*').eq('id', d.pay).single()); editRow('payments', x); }
  else if (d.exp) { const x = await q(sb.from('expenses').select('*').eq('id', d.exp).single()); editRow('expenses', x); }
  else if (d.ft) { finTab = d.ft; route(); }
  else if (d.row) { const [tb, id] = d.row.split(':'); const x = await q(sb.from(tb).select('*').eq('id', id).single()); editRow(tb, x); }
  else if (d.done) { await q(sb.from('tasks').update({ done: true }).eq('id', d.done)); toast('Tâche faite'); route(); }
  else if (d.editTask) { const x = await q(sb.from('tasks').select('*').eq('id', d.editTask).single()); editRow('tasks', x); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'crmEd') { crmEdition = e.target.value; route(); }
  if (e.target.id === 'partEd') { partEdition = e.target.value; route(); }
  if (e.target.id === 'finEd') { finEdition = e.target.value; route(); }
});
document.addEventListener('dragstart', e => { const c = e.target.closest('.lead'); if (c) e.dataTransfer.setData('text/plain', c.dataset.lead); });
document.addEventListener('dragover', e => { const c = e.target.closest('.col'); if (c) { e.preventDefault(); c.classList.add('over'); } });
document.addEventListener('dragleave', e => { const c = e.target.closest('.col'); if (c) c.classList.remove('over'); });
document.addEventListener('drop', async e => { const c = e.target.closest('.col'); if (!c) return; e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); await q(sb.from('leads').update({ status: c.dataset.status }).eq('id', id)); toast('Statut mis à jour : ' + c.dataset.status); route(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
window.addEventListener('hashchange', route);

/* ---------- Connexion ---------- */
function loginView(msg = '', err = false) {
  $('root').innerHTML = `<div class="login"><div class="card">
    <svg width="44" height="44" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="13" fill="none" stroke="var(--accent)" stroke-width="3"/><circle cx="17" cy="17" r="6" fill="none" stroke="var(--sun)" stroke-width="2"/></svg>
    <h1>The Circle OS</h1><p>Espace de gestion réservé à l'équipe. Entrez votre e-mail : vous recevrez un lien de connexion.</p>
    ${msg ? `<div class="msg ${err ? 'err' : ''}">${msg}</div>` : ''}
    <form class="form" id="loginForm"><label class="field" for="email">E-mail<input type="email" id="email" required autocomplete="email"></label><button class="btn primary" type="submit">Recevoir le lien de connexion</button></form>
  </div></div>`;
  $('loginForm').onsubmit = async ev => {
    ev.preventDefault();
    const email = $('email').value.trim();
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    loginView(error ? 'Envoi impossible : ' + esc(error.message) : `Lien envoyé à ${esc(email)}. Ouvrez l'e-mail sur cet appareil et cliquez sur le lien.`, !!error);
  };
}
function notAllowedView() {
  $('root').innerHTML = `<div class="login"><div class="card"><h1>Accès en attente</h1>
  <p>Vous êtes connecté avec <b>${esc(S.user.email)}</b>, mais ce compte n'est pas encore dans l'équipe The Circle.</p>
  <div class="msg">Demandez à un fondateur d'ajouter ce compte. Identifiant à transmettre : <br><code style="word-break:break-all">${esc(S.user.id)}</code></div>
  <button class="btn" id="logout" type="button">Se déconnecter</button></div></div>`;
}
async function start(session) {
  S.user = session?.user || null;
  if (!S.user) { S.member = null; return loginView(); }
  const { data } = await sb.from('team_members').select('*').eq('user_id', S.user.id).maybeSingle();
  S.member = data || null;
  if (!S.member) return notAllowedView();
  shell(); route();
}
let started = false;
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    if (event === 'SIGNED_IN' && started && S.member) return;
    started = true; start(session);
  }
});
