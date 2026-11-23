/* The Circle OS — application de gestion (Supabase) — v2 */
const C = window.CIRCLE_CONFIG;
const sb = supabase.createClient(C.supabaseUrl, C.supabaseKey);
const S = { user: null, member: null, cache: {}, settings: {} };

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const N = v => Number(v || 0);
const EUR = n => n == null || n === '' || isNaN(n) ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(Number(n))) + ' €';
const NUM = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
const fmtD = s => s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const daysTo = s => Math.round((new Date(s + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5);
const sum = (arr, f) => arr.reduce((s, x) => s + N(f(x)), 0);
const fx = () => N(S.settings.fx_tnd) || C.fxTnd || 3.55;
const rate = cur => cur === 'TND' ? fx() : cur === 'IDR' ? (N(S.settings.fx_idr) || 20150) : 1;
const toEur = (amt, cur) => N(amt) / rate(cur || 'EUR');
const IDR = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' Rp';
const money = (n, cur) => cur === 'EUR' || !cur ? EUR(n) : cur === 'IDR' ? IDR(n) : NUM(Math.round(n)) + ' ' + cur;
const J = o => esc(JSON.stringify(o));
function toast(t, err) { const el = $('toast'); el.textContent = t; el.style.background = err ? 'var(--bad)' : ''; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }
function openDrawer(html) { const d = $('drawer'); d.innerHTML = html; d.classList.add('on'); $('scrim').classList.add('on'); d.scrollTop = 0; }
function closeDrawer() { $('drawer').classList.remove('on'); $('scrim').classList.remove('on'); }
async function q(promise) { const { data, error } = await promise; if (error) { toast(error.message, true); throw error; } return data; }
async function load(table, order = 'created_at', asc = false) { const d = await q(sb.from(table).select('*').order(order, { ascending: asc, nullsFirst: false })); S.cache[table] = d; return d; }
const drawerHead = (title, extra = '') => `<div class="dhead"><h2>${title}</h2>${extra}<button class="btn" data-act="close" type="button">Fermer</button></div>`;
const pill = (t, c = '') => `<span class="pill ${c}">${esc(t)}</span>`;
const kpi = (l, v, s, c = '') => `<div class="card kpi ${c}"><span>${esc(l)}</span><b class="num">${v}</b><small>${s}</small></div>`;
const wa = p => p ? `https://wa.me/${String(p).replace(/\D/g, '').replace(/^(\d{8})$/, '216$1')}` : '';
const statusClass = s => ({ 'En cours': 'warn', 'Projet': 'mute', 'Terminée': 'good', 'Complet': 'good', 'Annulée': 'bad' }[s] || '');
function pbar(pct, label = '') { const p = Math.max(0, Math.min(pct, 1)) * 100; return `<div class="pbar ${p >= 99.5 ? 'full' : p < 34 ? 'low' : ''}"><i style="width:${p}%"></i>${label ? `<span>${label}</span>` : ''}</div>`; }

/* ---------- Listes ---------- */
const ROOMS = ['Single', 'Partagée', 'Double'];
const SOURCES = [['Formulaire', 'Formulaire pub (ads)'], ['Pub Meta', 'Pub Meta (message)'], ['Instagram DM', 'Instagram DM'], ['WhatsApp', 'WhatsApp'], ['Parrainage', 'Parrainage'], ['Événement', 'Événement'], ['Autre', 'Autre']];
const LEAD_STATUSES = ['Nouveau', 'Qualifié', 'Appel planifié', 'Offre envoyée', 'Tranche 1', 'Payé', 'Perdu'];
const OWNERS = ['Youssef', 'Nahed', 'Les deux'];
const CURR = ['EUR', 'TND', 'IDR'];
const EXP_CATS = ['Villa', 'Coach', 'Excursions', 'Dîners', 'Courses maison', 'Petites dépenses', 'Surf & activités', 'Transport', 'Matériel & cadeaux', 'Publicité', 'Contenu & sponsoring', 'Visas', 'Banque & outils', 'Charges sociales', 'Assurance', 'Frais de change', 'Événements & meetups', 'Outils formation', 'Parrainage', 'Gain fondateurs', 'À clarifier'];
const EXP_TYPES = [['Coût édition', 'Coût de l’édition'], ['Marketing', 'Marketing'], ['Structure', 'Structure (banque, charges…)'], ['Frais fondateurs', 'Avance sur gain d’un fondateur'], ['À clarifier', 'À clarifier']];
const typeLabel = t => (EXP_TYPES.find(x => x[0] === t) || [t, t])[1];
const DOC_TYPES = ['Contrat', 'CGV', 'Code de conduite', 'Règlement villa', 'Décharge', 'Droit image', 'Passeport', 'Visa', 'Assurance', 'Billets', 'Contact urgence', 'Fiche médicale'];
const JOURNAL_KINDS = ['Remarque', 'Problème', 'Contenu filmé', 'Changement', 'Bonne idée', 'Retour participant'];
const PAID_BY = [['Caisse Circle', 'Argent de The Circle'], ['Youssef', 'Youssef (de sa poche)'], ['Nahed', 'Nahed (de sa poche)']];

/* Définition des formulaires : [clé, libellé, type, requis, options] */
const SCHEMAS = {
  leads: { title: 'Personne / lead', fields: [['full_name', 'Nom et prénom', 'text', 1], ['phone', 'Téléphone / WhatsApp', 'text'], ['email', 'E-mail', 'email'], ['source', 'Vient de', 'select', 1, SOURCES], ['edition_id', 'Édition visée', 'edition'], ['status', 'Statut', 'select', 1, LEAD_STATUSES], ['country', 'Pays', 'text'], ['age', 'Âge', 'number'], ['room_type', 'Chambre', 'select', 0, ROOMS], ['proposed_price_eur', 'Prix proposé (€)', 'number'], ['referral_code_used', 'Code de parrainage utilisé', 'text'], ['next_action', 'Prochaine action', 'text'], ['next_action_date', "Date de l'action", 'date'], ['owner', 'Responsable', 'select', 0, OWNERS], ['consent_contact', 'Accepte d’être contacté', 'bool'], ['lost_reason', 'Motif de refus', 'text'], ['notes', 'Notes', 'textarea']] },
  participants: { title: 'Participant', fields: [['full_name', 'Nom et prénom', 'text', 1], ['edition_id', 'Bootcamp', 'edition', 1], ['room_type', 'Chambre', 'select', 0, ROOMS], ['price_eur', 'Prix total à payer (€)', 'number', 1], ['pay_currency', 'Paie en', 'select', 1, ['EUR', 'TND']], ['status', 'Statut', 'select', 1, ['Confirmé', 'Reporté', 'Annulé', 'Exclu']], ['phone', 'Téléphone / WhatsApp', 'text'], ['email', 'E-mail', 'email'], ['instagram', 'Instagram', 'text'], ['birth_date', 'Date de naissance', 'date'], ['country', 'Pays', 'text'], ['city', 'Ville', 'text'], ['profession', 'Profession', 'text'], ['emergency_contact', "Contact d'urgence (nom, lien, téléphone)", 'text'], ['source', 'Vient de', 'select', 0, SOURCES], ['referred_by', 'Parrainé par (code)', 'text'], ['project', 'Projet / objectif', 'text'], ['last_contact', 'Dernier contact', 'date'], ['next_followup', 'Prochaine relance', 'date'], ['club_status', 'Circle Club', 'select', 0, ['Pas encore invité', 'Invité', 'Membre', 'Ne souhaite pas']], ['circle_club', 'Membre actif du Circle Club', 'bool'], ['ambassador', 'Ambassadeur', 'bool'], ['consent_marketing', 'Accepte de recevoir nos nouvelles', 'bool'], ['notes', 'Notes', 'textarea']] },
  payments: { title: 'Encaissement', fields: [['edition_id', 'Bootcamp', 'edition', 1], ['participant_id', 'Participant', 'participant'], ['kind', 'Type', 'select', 1, ['Paiement', 'Remboursement']], ['paid_on', 'Date', 'date', 1], ['amount', 'Montant reçu', 'number', 1], ['currency', 'Devise', 'select', 1, CURR], ['fx_rate', 'Taux (devise pour 1 €)', 'number', 1], ['eur_received', 'Euros réellement obtenus après le change (si connu)', 'number'], ['account', 'Arrivé sur quel compte', 'account'], ['method', 'Comment', 'select', 0, ['Virement', 'Espèces', 'Carte', 'USDT', 'Autre']], ['tranche_no', 'Tranche', 'select', 0, ['1', '2', '3']], ['invoice_no', 'N° de facture', 'text'], ['file', 'Preuve (capture, reçu)', 'file', 0, 'proof_path'], ['notes', 'Notes', 'textarea']] },
  expenses: { title: 'Dépense', fields: [['edition_id', 'Bootcamp', 'edition'], ['spent_on', 'Date', 'date'], ['description', 'Quoi', 'text', 1], ['category', 'Catégorie', 'select', 1, EXP_CATS], ['amount', 'Montant', 'number', 1], ['currency', 'Devise', 'select', 1, CURR], ['fx_rate', 'Taux (devise pour 1 €)', 'number', 1], ['type', 'Type', 'select', 1, EXP_TYPES], ['founder', 'Fondateur concerné (si avance sur gain)', 'select', 0, ['Youssef', 'Nahed']], ['paid_from', 'Sorti de quel compte', 'account'], ['paid_by', 'Qui a payé', 'select', 0, PAID_BY], ['reimbursed', 'Déjà remboursé à la personne', 'bool'], ['file', 'Facture / photo', 'file', 0, 'receipt_path'], ['notes', 'Détails', 'textarea']] },
  expense_lines: { title: 'Détail de la transaction', fields: [['label', 'Quoi', 'text', 1], ['category', 'Catégorie', 'select', 0, EXP_CATS], ['amount_eur', 'Montant (€)', 'number', 1], ['file', 'Facture / photo', 'file', 0, 'file_path']] },
  editions: { title: 'Édition', fields: [['id', 'Code (ex. TRAD-2027-03)', 'text', 1], ['skill', 'Formation', 'text', 1], ['start_date', 'Début', 'date'], ['end_date', 'Fin', 'date'], ['capacity', 'Capacité', 'number', 1], ['coach_id', 'Coach', 'coach'], ['status', 'Statut', 'select', 1, ['Projet', 'En vente', 'Complet', 'En cours', 'Terminée', 'Annulée']], ['hidden', 'Masquer cette édition', 'bool'], ['notes', 'Notes', 'textarea']] },
  edition_journal: { title: 'Note d’édition', fields: [['edition_id', 'Bootcamp', 'edition', 1], ['happened_on', 'Date', 'date'], ['kind', 'Type', 'select', 1, JOURNAL_KINDS], ['title', 'Titre', 'text', 1], ['body', 'Détails', 'textarea'], ['link_url', 'Lien (Drive, vidéo…)', 'text'], ['file', 'Pièce jointe', 'file', 0, 'file_path'], ['author', 'Écrit par', 'select', 0, OWNERS]] },
  participant_files: { title: 'Fichier', fields: [['doc_type', 'Type de document', 'select', 1, [...DOC_TYPES, 'Autre']], ['file', 'Fichier', 'file', 1, 'file_path'], ['notes', 'Notes', 'text']] },
  partners: { title: 'Partenaire', fields: [['type', 'Type', 'select', 1, ['Coach', 'Speaker', 'Villa', 'Légal', 'Prestataire', 'Assurance', 'Autre']], ['name', 'Nom', 'text', 1], ['role', 'Rôle / offre', 'text'], ['contact', 'Contact', 'text'], ['price', 'Prix', 'text'], ['status', 'Statut', 'text'], ['contract_signed', 'Contrat signé', 'bool'], ['notes', 'Notes', 'textarea']] },
  documents: { title: 'Document', fields: [['audience', 'Pour', 'select', 1, ['Vendre', 'Participants', 'Partenaires', 'Édition', 'Interne']], ['name', 'Nom', 'text', 1], ['status', 'État', 'select', 1, ['À rédiger', 'À corriger', 'Prête', 'À récupérer']], ['file', 'Fichier', 'file', 0, 'file_path'], ['notes', 'Notes', 'textarea']] },
  incidents: { title: 'Incident', fields: [['occurred_on', 'Date', 'date', 1], ['edition_id', 'Bootcamp', 'edition'], ['type', 'Type', 'select', 1, ['Violence', 'Harcèlement', 'Santé', 'Accident', 'Vol', 'Drogue', 'Conflit', 'Autre']], ['description', 'Faits', 'textarea', 1], ['people_involved', 'Personnes concernées', 'text'], ['decision', 'Décision', 'textarea'], ['status', 'Statut', 'select', 1, ['Ouvert', 'Clos']], ['file', 'Rapport / preuve', 'file', 0, 'report_path']] },
  tasks: { title: 'Tâche', fields: [['title', 'Tâche', 'text', 1], ['due_date', 'Échéance', 'date'], ['owner', 'Responsable', 'select', 0, OWNERS], ['edition_id', 'Bootcamp', 'edition'], ['done', 'Faite', 'bool'], ['notes', 'Notes', 'textarea']] },
  decisions: { title: 'Décision', fields: [['decided_on', 'Date', 'date', 1], ['subject', 'Sujet', 'text', 1], ['decision', 'Décision', 'textarea', 1], ['ref', 'Référence', 'text']] },
  edition_budget_lines: { title: 'Poste de coût', fields: [['edition_id', 'Bootcamp', 'edition', 1], ['category', 'Nom du poste (ex. Villa)', 'text', 1], ['amount_eur', 'Prévu (€)', 'number', 1], ['paid', 'Payé (soldé)', 'bool'], ['paid_on', 'Payé le', 'date'], ['due_date', 'À payer avant le', 'date'], ['match_categories', 'Catégories de dépenses rattachées (séparées par des virgules)', 'text'], ['actual_manual', 'Réel forcé à la main (€) — sinon calculé depuis les dépenses', 'number'], ['notes', 'Notes', 'textarea'], ['sort', 'Ordre', 'number']] },
  referral_rewards: { title: 'Récompense de parrainage', fields: [['referrer_id', 'Parrain', 'participant', 1], ['referred_participant_id', 'Filleul inscrit', 'participant'], ['referred_name', 'Nom du filleul', 'text'], ['amount_eur', 'Montant (€)', 'number', 1], ['status', 'Statut', 'select', 1, ['À verser', 'Versé', 'Déduit du prochain bootcamp', 'Annulé']], ['paid_on', 'Versé le', 'date'], ['notes', 'Notes', 'textarea']] },
  club_events: { title: 'Événement du Circle Club', fields: [['title', 'Titre', 'text', 1], ['event_on', 'Date', 'date'], ['kind', 'Type', 'select', 1, ['Live en ligne', 'Meetup Tunis', 'Meetup Bali', 'Réunion annuelle', 'Afterwork', 'Masterclass alumni', 'Autre']], ['place', 'Lieu', 'text'], ['link', 'Lien (live, inscription)', 'text'], ['attendees', 'Participants (nombre)', 'number'], ['notes', 'Notes', 'textarea']] },
  transfers: { title: 'Retrait, change ou virement', fields: [['kind', 'Type', 'select', 1, ['Retrait espèces', 'Change de devises', 'Virement interne', 'Dépôt espèces']], ['done_on', 'Date', 'date'], ['edition_id', 'Bootcamp', 'edition'], ['from_account', 'Sorti de', 'account'], ['from_amount', 'Montant sorti', 'number'], ['from_currency', 'Devise sortie', 'select', 1, CURR], ['to_account', 'Arrivé sur', 'account'], ['to_amount', 'Montant arrivé', 'number'], ['to_currency', 'Devise arrivée', 'select', 1, CURR], ['file', 'Reçu / capture', 'file', 0, 'file_path'], ['notes', 'Notes', 'textarea']] },
  cash_counts: { title: 'Comptage de caisse', fields: [['account', 'Caisse', 'account', 1], ['counted_on', 'Date', 'date', 1], ['amount', 'Montant compté (dans la devise de la caisse)', 'number', 1], ['notes', 'Notes', 'text']] },
  accounts: { title: 'Compte', key: 'name', fields: [['name', 'Nom du compte', 'text', 1], ['holder', 'Titulaire', 'text'], ['currency', 'Devise', 'text'], ['notes', 'Notes', 'textarea'], ['sort', 'Ordre', 'number']] }
};

function fieldHtml(f, v) { const [, , type, , opt] = f; const half = ['date', 'number', 'bool', 'coach'].includes(type) || (type === 'select' && opt.length <= 7 && !opt.some(o => (Array.isArray(o) ? o[1] : o).length > 22)); return `<div class="fwrap ${half ? 'half' : 'full'}">${fieldHtml0(f, v)}</div>`; }
function fieldHtml0([k, label, type, req, opt], v) {
  const id = 'f_' + k, r = req ? 'required' : '';
  let options = null;
  if (type === 'select') options = opt.map(o => Array.isArray(o) ? o : [o, o]);
  if (type === 'edition') options = (S.cache.editions || []).filter(e => !e.hidden || e.id === v).map(e => [e.id, `${e.skill} · ${e.id}`]);
  if (type === 'participant') options = (S.cache.participants || []).map(p => [p.id, `${p.full_name} · ${p.edition_id}`]);
  if (type === 'coach') options = (S.cache.partners || []).filter(p => p.type === 'Coach').map(p => [p.id, p.name]);
  if (type === 'account') options = (S.cache.accounts || []).map(a => [a.name, a.holder ? `${a.name} · ${a.holder}` : a.name]);
  const val = v ?? (options && req ? options[0]?.[0] : '');
  if (type === 'bool') return `<label class="check" for="${id}"><input type="checkbox" id="${id}" name="${k}" ${v ? 'checked' : ''}> ${label}</label>`;
  if (type === 'textarea') return `<label class="field" for="${id}">${label}<textarea id="${id}" name="${k}" rows="3" ${r}>${esc(val)}</textarea></label>`;
  if (type === 'file') return `<label class="field" for="${id}">${label}${v ? ' <span class="muted">(un fichier est déjà joint, en choisir un autre le remplace)</span>' : ''}<input type="file" id="${id}" name="${k}" accept="image/*,.pdf,.doc,.docx" ${req && !v ? 'required' : ''}></label>`;
  if (options) return `<label class="field" for="${id}">${label}<select id="${id}" name="${k}" ${r}>${req ? '' : '<option value="">—</option>'}${options.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select></label>`;
  const t = type === 'number' ? 'number" step="any' : type;
  return `<label class="field" for="${id}">${label}<input type="${t}" id="${id}" name="${k}" value="${esc(val)}" ${r}></label>`;
}

async function ensureLookups(force) {
  const need = [['editions', 'start_date', true], ['participants', 'full_name', true], ['partners', 'name', true], ['accounts', 'sort', true]].filter(t => force || !S.cache[t[0]]);
  await Promise.all(need.map(t => load(...t)));
  if (force || !S.settingsLoaded) { const st = await q(sb.from('settings').select('*')); S.settingsRows = st; st.forEach(s => S.settings[s.key] = s.value); S.settingsLoaded = true; }
}
async function upload(file, folder) {
  const path = `${folder}/${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`;
  await q(sb.storage.from('documents').upload(path, file));
  return path;
}
async function openFile(path) {
  const w = window.open('', '_blank');
  const d = await q(sb.storage.from('documents').createSignedUrl(path, 600));
  if (w) w.location = d.signedUrl; else location.href = d.signedUrl;
}

/* Formulaire générique : ajout / modification / suppression */
async function editRow(table, row = null, defaults = {}, after = null) {
  await ensureLookups();
  const sc = SCHEMAS[table], key = sc.key || 'id', isNew = !row, data = row || defaults;
  const fileCols = sc.fields.filter(f => f[2] === 'file').map(f => f[4]);
  const extra = !isNew && sc.extra ? await sc.extra(row) : '';
  const top = !isNew && sc.extraTop && sc.extraTop(row);
  openDrawer(`${drawerHead(`${isNew ? 'Ajouter' : 'Modifier'} · ${sc.title}`)}${top ? extra : ''}
  <form class="form" id="gform">${sc.fields.filter(f => !(f[0] === key && !isNew && table === 'editions')).map(f => fieldHtml(f, f[2] === 'file' ? data[f[4]] : data[f[0]])).join('')}
  ${fileCols.filter(c => row && row[c]).map(c => `<button class="btn" type="button" data-act="file" data-path="${esc(row[c])}">Ouvrir la pièce jointe</button>`).join('')}
  <div class="row-actions">${isNew ? '' : '<button class="btn danger" type="button" id="del">Supprimer</button>'}<button class="btn primary" type="submit">Enregistrer</button></div></form>${top ? '' : extra}`);
  const form = $('gform');
  const cur = form.querySelector('[name=currency]'), fxr = form.querySelector('[name=fx_rate]');
  if (cur && fxr) cur.addEventListener('change', () => { fxr.value = rate(cur.value); });
  ['from', 'to'].forEach(side => { const a = form.querySelector(`[name=${side}_account]`), c = form.querySelector(`[name=${side}_currency]`); if (a && c) a.addEventListener('change', () => { const acc = S.cache.accounts.find(x => x.name === a.value); if (acc && CURR.includes(acc.currency)) c.value = acc.currency; }); });
  const done = () => { delete S.cache[table]; closeDrawer(); toast('Enregistré'); (after || route)(); };
  form.onsubmit = async ev => {
    ev.preventDefault();
    const btn = form.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Enregistrement…';
    const rec = {};
    try {
      for (const [k, , type, , opt] of sc.fields) {
        const el = form.elements[k]; if (!el) continue;
        if (type === 'bool') rec[k] = el.checked;
        else if (type === 'file') { if (el.files[0]) { rec[opt] = await upload(el.files[0], table); if (table === 'participant_files') rec.file_name = el.files[0].name; } }
        else if (type === 'number') rec[k] = el.value === '' ? null : Number(el.value);
        else rec[k] = el.value === '' ? null : el.value;
      }
      if (isNew) Object.keys(defaults).forEach(k => { if (!(k in rec) && !sc.fields.some(f => f[0] === k)) rec[k] = defaults[k]; });
      if ('tranche_no' in rec && rec.tranche_no) rec.tranche_no = Number(rec.tranche_no);
      if (table === 'documents') rec.updated_at = new Date().toISOString();
      if (isNew) await q(sb.from(table).insert(rec));
      else await q(sb.from(table).update(rec).eq(key, row[key]));
      if (sc.afterSave) await sc.afterSave({ ...(row || {}), ...rec }, row);
      done();
    } catch (e) { btn.disabled = false; btn.textContent = 'Enregistrer'; }
  };
  if (!isNew) {
    const del = $('del');
    del.onclick = async () => {
      if (!del.dataset.armed) { del.dataset.armed = 1; del.textContent = 'Confirmer la suppression'; return; }
      try { await q(sb.from(table).delete().eq(key, row[key])); delete S.cache[table]; closeDrawer(); toast('Supprimé'); (after || route)(); } catch (e) { }
    };
  }
}
async function editById(table, id, after) { const sc = SCHEMAS[table]; const x = await q(sb.from(table).select('*').eq(sc.key || 'id', id).single()); editRow(table, x, {}, after); }

/* Détail d'une transaction dans la fiche dépense */
SCHEMAS.expenses.extra = async row => {
  const lines = await q(sb.from('expense_lines').select('*').eq('expense_id', row.id).order('created_at'));
  const det = sum(lines, l => l.amount_eur), rest = N(row.amount_eur) - det;
  const ex = lines.map(l => `${l.label} ${String(Math.round(N(l.amount_eur) * 100) / 100).replace('.', ',')}€`).join(', ');
  return `<div class="sub-section splitbox"><div class="head"><h3>Répartir ce montant en mini-dépenses</h3></div>
  <p class="muted">Écrivez simplement à quoi a servi l’argent, séparé par des virgules. Montants en € ou en roupies (150k, 2M), ou en % du total. « reste … » prend ce qui manque. Ex. : <code>ads 200, courses 150k, essence 50, nahed perso 100, reste courses</code></p>
  <textarea id="splitIn" rows="2" data-total="${N(row.amount_eur)}" data-cur="${esc(row.currency)}" placeholder="ads 200, courses 150k, reste essence">${esc(ex)}</textarea>
  <div id="splitPrev">${lines.length ? splitPreview(lines.map(l => ({ label: l.label, eur: N(l.amount_eur), ...lineMeta(l.label, l.category) })), N(row.amount_eur)) : splitPreview([], N(row.amount_eur))}</div>
  <div class="inline"><button class="btn primary" type="button" data-act="splitsave" data-id="${row.id}">Enregistrer la répartition</button>${lines.length ? `<button class="btn" type="button" data-act="splitclear" data-id="${row.id}">Tout effacer</button>` : ''}</div></div>
  <div class="sub-section"><div class="head"><h3>Détail de cette transaction</h3><button class="btn sm" type="button" data-act="add" data-t="expense_lines" data-def="${J({ expense_id: row.id })}" data-back="exp:${row.id}">Ajouter une ligne</button></div>
  <p class="muted">Utile pour un retrait Bourso, un paiement carte ou un retrait d’espèces qui a servi à plusieurs choses. Écrivez à quoi a servi l’argent : la différence non détaillée reste « à clarifier ».</p>
  <table><tbody>${lines.map(l => `<tr class="click" data-act="edit" data-t="expense_lines" data-id="${l.id}" data-back="exp:${row.id}"><td>${esc(l.label)}<div class="muted">${esc(l.category || '')}</div></td><td>${l.file_path ? pill('Justif.', 'good') : ''}</td><td class="n">${EUR(l.amount_eur)}</td></tr>`).join('')}
  <tr><td><b>Total détaillé</b></td><td></td><td class="n"><b>${EUR(det)}</b> / ${EUR(row.amount_eur)}</td></tr>
  ${lines.length ? `<tr><td>${Math.abs(rest) < 1 ? 'Tout est détaillé' : rest > 0 ? 'Reste à détailler' : 'Détail supérieur au montant'}</td><td></td><td class="n">${Math.abs(rest) < 1 ? pill('OK', 'good') : pill(EUR(rest), 'bad')}</td></tr>` : ''}</tbody></table></div>`;
};
SCHEMAS.expenses.extraTop = row => row.type === 'À clarifier' || row.category === 'À clarifier' || /bourso|retrait|carte|cash/i.test(`${row.description} ${row.paid_from}`);
SCHEMAS.participant_files.afterSave = async rec => { if (rec.participant_id && DOC_TYPES.includes(rec.doc_type)) await q(sb.from('participant_documents').upsert({ participant_id: rec.participant_id, doc_type: rec.doc_type, received: true, received_at: today() }, { onConflict: 'participant_id,doc_type' })); };
/* Fiche lead : inscrire comme participant */
SCHEMAS.leads.extra = async row => `<div class="sub-section"><h3>Inscription</h3><p class="muted">Quand la personne a payé sa première tranche, créez sa fiche participant en un clic (les infos sont reprises).</p><button class="btn primary" type="button" data-act="convert" data-id="${row.id}">Inscrire comme participant</button></div>`;

/* ---------- Données & calculs financiers ---------- */
async function loadData() {
  await ensureLookups();
  const [parts, pays0, exps0, lines, budget, transfers, counts, sched] = await Promise.all([
    load('participants', 'full_name', true), load('payments', 'paid_on'), load('expenses', 'spent_on'),
    q(sb.from('expense_lines').select('*')), q(sb.from('edition_budget_lines').select('*')),
    q(sb.from('transfers').select('*').order('done_on', { ascending: false, nullsFirst: false })), q(sb.from('cash_counts').select('*').order('counted_on', { ascending: false })), q(sb.from('payment_schedule').select('*').order('due_on'))
  ]);
  const pays = pays0.filter(x => x.kind !== 'Annulé'), exps = exps0.filter(x => !x.cancelled); const split = explode(exps, lines); S.cache.payments = pays; S.cache.expenses = exps;
  return { eds: S.cache.editions, parts, pays, exps, split, lines, budget, transfers, counts, sched };
}
const INACTIVE = ['Exclu', 'Annulé'];
function partBal(p, pays) {
  const ps = pays.filter(x => x.participant_id === p.id);
  const paid = sum(ps.filter(x => x.kind !== 'Remboursement'), x => x.eur_final);
  const refund = -sum(ps.filter(x => x.kind === 'Remboursement'), x => x.eur_final);
  const net = paid - refund;
  const due = INACTIVE.includes(p.status) || p.status === 'Reporté' ? net : N(p.price_eur);
  const reste = Math.max(due - net, 0);
  return { p, pays: ps, paid, refund, net, due, reste, pct: due > 0 ? net / due : 1 };
}
const isEnded = e => e && (e.status === 'Terminée' || (e.end_date && e.end_date < today()));
function edStats(id, D) {
  const ed = D.eds.find(e => e.id === id) || { id, skill: id };
  const parts = D.parts.filter(p => p.edition_id === id).map(p => partBal(p, D.pays));
  const active = parts.filter(b => !INACTIVE.includes(b.p.status) && b.p.status !== 'Reporté');
  const reported = parts.filter(b => b.p.status === 'Reporté'), repIds = reported.map(b => b.p.id);
  const avoirs = sum(reported, b => b.net);
  const pays = D.pays.filter(x => x.edition_id === id), exps = (D.split || D.exps).filter(x => x.edition_id === id), rawExps = D.exps.filter(x => x.edition_id === id);
  const enc = sum(pays.filter(x => !repIds.includes(x.participant_id)), x => x.eur_final);
  const attendu = sum(parts.filter(b => b.p.status !== 'Reporté'), b => b.due), reste = sum(parts, b => b.reste);
  const costs = exps.filter(x => x.type !== 'Frais fondateurs'), adv = exps.filter(x => x.type === 'Frais fondateurs');
  const couts = sum(costs, x => x.amount_eur);
  const avY = sum(adv.filter(x => x.founder === 'Youssef'), x => x.amount_eur), avN = sum(adv.filter(x => x.founder === 'Nahed'), x => x.amount_eur), avX = sum(adv.filter(x => !x.founder), x => x.amount_eur);
  const budget = sum(D.budget.filter(b => b.edition_id === id), b => b.amount_eur);
  const pct = (N(S.settings.investissement_pct) || 0) / 100;
  const split = res => { const invest = res > 0 ? res * pct : 0, gain = res > 0 ? res - invest : res; return { res, invest, gain, part: gain / 2, resteY: gain / 2 - avY - avX / 2, resteN: gain / 2 - avN - avX / 2 }; };
  const tr = (D.transfers || []).filter(t => t.edition_id === id && t.from_amount != null && t.to_amount != null);
  const fraisChange = sum(tr, t => toEur(t.from_amount, t.from_currency) - toEur(t.to_amount, t.to_currency));
  const now = split(enc - couts - fraisChange);
  const P = postes(id, D); const coutsPrev = P.has ? Math.max(P.totPrev, couts) : couts;
  const prev = split(enc + reste - coutsPrev - fraisChange);
  return { ed, parts, active, reported, avoirs, fraisChange, pays, exps: rawExps, costs, adv, enc, attendu, reste, couts, avY, avN, avX, budget, coutsPrev, now, prev, pct };
}
/* Soldes par compte, dans la devise du compte (encaissements, dépenses, transferts) */
function accountBalances(D, upto = null) {
  const acc = {};
  const ok = d => !upto || !d || d <= upto;
  const get = n => { const name = n || 'Non renseigné'; if (!acc[name]) { const a = S.cache.accounts.find(x => x.name === name); acc[name] = { name, cur: a?.currency && CURR.includes(a.currency) ? a.currency : 'EUR', holder: a?.holder || '', in: 0, out: 0, inEur: 0, outEur: 0 }; } return acc[name]; };
  const conv = (amt, from, to) => toEur(amt, from) * rate(to);
  D.pays.filter(x => ok(x.paid_on)).forEach(x => { const a = get(x.account); const eur = N(x.eur_final); const nat = x.currency === a.cur ? N(x.amount) * Math.sign(eur || 1) : a.cur === 'EUR' ? eur : eur * rate(a.cur); if (eur >= 0) { a.in += nat; a.inEur += eur; } else { a.out -= nat; a.outEur -= eur; } });
  D.exps.filter(x => ok(x.spent_on)).forEach(x => { const a = get(x.paid_from); a.out += x.currency === a.cur ? N(x.amount) : conv(x.amount, x.currency, a.cur); a.outEur += N(x.amount_eur); });
  (D.transfers || []).filter(t => ok(t.done_on)).forEach(t => {
    if (t.from_account && t.from_amount != null) { const a = get(t.from_account); a.out += t.from_currency === a.cur ? N(t.from_amount) : conv(t.from_amount, t.from_currency, a.cur); a.outEur += toEur(t.from_amount, t.from_currency); }
    if (t.to_account && t.to_amount != null) { const a = get(t.to_account); a.in += t.to_currency === a.cur ? N(t.to_amount) : conv(t.to_amount, t.to_currency, a.cur); a.inEur += toEur(t.to_amount, t.to_currency); }
  });
  Object.values(acc).forEach(a => { a.bal = a.in - a.out; a.balEur = toEur(a.bal, a.cur); });
  return Object.values(acc).sort((a, b) => b.balEur - a.balEur);
}
const ZONE = a => a.cur === 'TND' ? 'tn' : a.cur === 'IDR' ? 'bali' : 'eu';
const isCash = name => /esp[eè]ces|caisse/i.test(name || '');
function cashStatus(D) {
  return S.cache.accounts.filter(a => isCash(a.name)).map(a => {
    const c = (D.counts || []).find(x => x.account === a.name);
    const cur = CURR.includes(a.currency) ? a.currency : 'EUR';
    const now = accountBalances(D).find(x => x.name === a.name)?.bal || 0;
    let ecart = null, expectedAt = null;
    if (c) { expectedAt = accountBalances(D, c.counted_on).find(x => x.name === a.name)?.bal || 0; ecart = N(c.amount) - expectedAt; }
    return { a, cur, now, c, expectedAt, ecart };
  });
}
function whoOwes(D, edId) {
  const ex = (edId ? D.exps.filter(x => x.edition_id === edId) : D.exps).filter(x => x.paid_by && x.paid_by !== 'Caisse Circle' && !x.reimbursed);
  const by = {}; ex.forEach(x => { (by[x.paid_by] ||= { who: x.paid_by, total: 0, n: 0 }); by[x.paid_by].total += N(x.amount_eur); by[x.paid_by].n++; });
  return Object.values(by);
}
function clarify(D, edId) {
  const pays = edId ? D.pays.filter(x => x.edition_id === edId) : D.pays, exps = edId ? D.exps.filter(x => x.edition_id === edId) : D.exps;
  const parts = (edId ? D.parts.filter(p => p.edition_id === edId) : D.parts).map(p => partBal(p, D.pays));
  const pn = id => D.parts.find(p => p.id === id)?.full_name || 'Sans participant';
  const linesOf = id => D.lines.filter(l => l.expense_id === id);
  const groups = [];
  const add = (title, explain, items, kind = 'warn') => { if (items.length) groups.push({ title, explain, items, kind, total: sum(items, i => i.amount) }); };
  add('Participants qui n’ont pas tout payé', 'Montant encore attendu par personne.', parts.filter(b => b.reste > 1).map(b => ({ label: `${b.p.full_name} · ${b.p.edition_id}`, amount: b.reste, act: `data-act="part" data-id="${b.p.id}"` })));
  add('Avoirs : tranches gardées pour une prochaine édition', 'Personnes qui ne sont pas venues. Quand elles choisissent leur nouvelle édition, changez le bootcamp dans leur fiche et dans leurs paiements.', parts.filter(b => b.p.status === 'Reporté' && b.net > 0).map(b => ({ label: `${b.p.full_name} · ${b.p.edition_id}`, amount: b.net, act: `data-act="part" data-id="${b.p.id}"` })));
  add('Encaissements sans compte', 'On ne sait pas sur quel compte l’argent est arrivé.', pays.filter(x => !x.account).map(x => ({ label: `${pn(x.participant_id)} · ${fmtD(x.paid_on)}`, amount: x.eur_final, act: `data-act="edit" data-t="payments" data-id="${x.id}"` })));
  add('Dinars pas encore convertis', `Calculés au taux fixe de ${NUM(fx())} TND pour 1 €. Indiquez les euros réellement obtenus après le change.`, pays.filter(x => x.currency !== 'EUR' && x.eur_received == null).map(x => ({ label: `${pn(x.participant_id)} · ${NUM(x.amount)} ${x.currency}`, amount: Math.abs(N(x.eur_final)), act: `data-act="edit" data-t="payments" data-id="${x.id}"` })));
  add('Dates approximatives', 'Encaissements dont la date ou le mois est estimé.', pays.filter(x => /approx/i.test(x.notes || '')).map(x => ({ label: `${pn(x.participant_id)} · ${fmtD(x.paid_on)}`, amount: x.eur_final, act: `data-act="edit" data-t="payments" data-id="${x.id}"` })), 'mute');
  add('Dépenses marquées « à clarifier »', 'On ne sait pas encore à quoi elles correspondent. Ouvrez-les et écrivez le détail en une ligne (ex. « ads 200, courses 150, reste essence »).', exps.filter(x => (x.type === 'À clarifier' || x.category === 'À clarifier') && !linesOf(x.id).length).map(x => ({ label: `${x.description || 'Sans description'} · ${fmtD(x.spent_on)}`, amount: x.amount_eur, act: `data-act="edit" data-t="expenses" data-id="${x.id}"` })), 'bad');
  add('Transactions pas entièrement détaillées', 'Retraits, paiements Bourso ou carte : la partie non détaillée.', exps.filter(x => /bourso|retrait|carte|cash|espèce/i.test(`${x.description} ${x.paid_from} ${x.category}`) || linesOf(x.id).length).map(x => ({ x, rest: N(x.amount_eur) - sum(linesOf(x.id), l => l.amount_eur) })).filter(o => o.rest > 1).map(o => ({ label: `${o.x.description || o.x.category} · ${o.x.paid_from || ''} · ${fmtD(o.x.spent_on)}`, amount: o.rest, act: `data-act="edit" data-t="expenses" data-id="${o.x.id}"` })), 'bad');
  add('Dépenses sans justificatif', 'Ajoutez une photo ou une facture.', exps.filter(x => !x.receipt_path && x.type !== 'Frais fondateurs').map(x => ({ label: `${x.description || x.category} · ${fmtD(x.spent_on)}`, amount: x.amount_eur, act: `data-act="edit" data-t="expenses" data-id="${x.id}"` })), 'mute');
  add('Avancé de sa poche, pas encore remboursé', 'La caisse The Circle doit cet argent à la personne.', exps.filter(x => x.paid_by && x.paid_by !== 'Caisse Circle' && !x.reimbursed).map(x => ({ label: `${x.paid_by} · ${x.description || x.category}`, amount: x.amount_eur, act: `data-act="edit" data-t="expenses" data-id="${x.id}"` })));
  add('Avances sur gain sans fondateur', 'Indiquez si c’est Youssef ou Nahed (sinon partagé 50/50).', exps.filter(x => x.type === 'Frais fondateurs' && !x.founder).map(x => ({ label: x.description || 'Sans description', amount: x.amount_eur, act: `data-act="edit" data-t="expenses" data-id="${x.id}"` })));
  const trs = (D.transfers || []).filter(t => !edId || t.edition_id === edId);
  add('Retraits et changes incomplets', 'Il manque le montant sorti ou le montant arrivé : sans les deux, la perte de change ne peut pas être calculée.', trs.filter(t => t.from_amount == null || t.to_amount == null).map(t => ({ label: `${t.kind} · ${t.from_account || '?'} → ${t.to_account || '?'} · ${fmtD(t.done_on)}`, amount: t.from_amount != null ? toEur(t.from_amount, t.from_currency) : toEur(t.to_amount, t.to_currency), act: `data-act="edit" data-t="transfers" data-id="${t.id}"` })), 'bad');
  if (!edId) add('Écarts de caisse', 'Différence entre l’argent compté et ce que l’app attendait à cette date. Un écart = une dépense oubliée (ou un comptage faux).', cashStatus(D).filter(c => c.ecart != null && Math.abs(toEur(c.ecart, c.cur)) > 2).map(c => ({ label: `${c.a.name} · compté ${money(c.c.amount, c.cur)} le ${fmtD(c.c.counted_on)} · attendu ${money(c.expectedAt, c.cur)}`, amount: toEur(c.ecart, c.cur), act: `data-act="go" data-href="#finances" ` })), 'bad');
  add('Dépenses sans date', 'Ajoutez la date, même approximative.', exps.filter(x => !x.spent_on).map(x => ({ label: x.description || x.category, amount: x.amount_eur, act: `data-act="edit" data-t="expenses" data-id="${x.id}"` })), 'mute');
  add('Été 2026 : édition à vérifier', 'Dépenses importées du Drive, réparties entre l’E-com et le Trading de l’été par date. Changez le bootcamp si besoin, puis effacez la phrase « à vérifier » des notes.', exps.filter(x => /à vérifier/i.test(x.notes || '')).map(x => ({ label: `${x.description} · ${x.edition_id}`, amount: x.amount_eur, act: `data-act="edit" data-t="expenses" data-id="${x.id}"` })), 'mute');
  return groups;
}
function clarifyHtml(groups) {
  if (!groups.length) return '<div class="card"><div class="empty-state">Rien à clarifier. Tout est propre.</div></div>';
  return groups.map(g => `<details class="card clar" ${g.kind === 'mute' ? '' : 'open'}><summary><span class="stripe ${g.kind}"></span><b>${esc(g.title)}</b><span class="pill ${g.kind}">${g.items.length}</span><span class="tot num">${EUR(g.total)}</span></summary><p class="muted">${esc(g.explain)}</p>
  <div class="list">${g.items.map(i => `<button type="button" class="row click" ${i.act}><span>${esc(i.label)}</span><b class="num">${EUR(i.amount)}</b></button>`).join('')}</div></details>`).join('');
}
function gainTable(st, title = 'Calcul du gain') {
  const g = st.now, p = st.prev, pc = Math.round(st.pct * 100);
  const row = (l, a, b, cls = '') => `<tr class="${cls}"><td>${l}</td><td class="n">${a}</td><td class="n">${b}</td></tr>`;
  return `<div class="card"><div class="head"><h2>${title}</h2><span class="muted">Investissement gardé : ${pc} % (modifiable dans Réglages)</span></div><div class="table-wrap"><table class="gain"><thead><tr><th></th><th class="n">Aujourd’hui</th><th class="n">Si tout est payé</th></tr></thead><tbody>
  ${row('Argent encaissé (réel, après remboursements)', EUR(st.enc), EUR(st.enc + st.reste))}
  ${row('Dépenses' + (st.budget > st.couts ? ' <span class="muted">(prévision = budget prévu)</span>' : ''), '− ' + EUR(st.couts), '− ' + EUR(st.coutsPrev))}
  ${st.fraisChange ? row('Pertes de change et retraits <span class="muted">(calculées depuis les transferts)</span>', '− ' + EUR(st.fraisChange), '− ' + EUR(st.fraisChange)) : ''}
  ${row('<b>Résultat</b>', `<b>${EUR(g.res)}</b>`, `<b>${EUR(p.res)}</b>`, 'sep')}
  ${row(`Investissement gardé (${pc} %)`, '− ' + EUR(g.invest), '− ' + EUR(p.invest))}
  ${row('<b>Gain à partager</b>', `<b>${EUR(g.gain)}</b>`, `<b>${EUR(p.gain)}</b>`, 'sep')}
  ${row('Part de chacun (50/50)', EUR(g.part), EUR(p.part))}
  ${row('Youssef : déjà pris', '− ' + EUR(st.avY + st.avX / 2), '− ' + EUR(st.avY + st.avX / 2))}
  ${row('<b>Youssef : reste à toucher</b>', `<b class="${g.resteY < 0 ? 'neg' : ''}">${EUR(g.resteY)}</b>`, `<b>${EUR(p.resteY)}</b>`, 'hl')}
  ${row('Nahed : déjà pris', '− ' + EUR(st.avN + st.avX / 2), '− ' + EUR(st.avN + st.avX / 2))}
  ${row('<b>Nahed : reste à toucher</b>', `<b class="${g.resteN < 0 ? 'neg' : ''}">${EUR(g.resteN)}</b>`, `<b>${EUR(p.resteN)}</b>`, 'hl')}
  </tbody></table></div>${st.avoirs ? `<p class="muted">${EUR(st.avoirs)} payés par ${st.reported.map(b => esc(b.p.full_name)).join(', ')} (reporté) : gardés pour une prochaine édition, non comptés ici.</p>` : ''}${st.avX ? `<p class="muted">${EUR(st.avX)} d’avances sans fondateur indiqué : comptées moitié-moitié.</p>` : ''}<p class="muted">« Déjà pris » = dépenses de type « Avance sur gain » (argent de The Circle utilisé pour un fondateur). Un montant négatif veut dire que la personne a pris plus que sa part pour l’instant.</p></div>`;
}

/* ---------- Layout ---------- */
const IC = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const portalUrl = p => `${location.origin}${location.pathname.replace(/index\.html$/, '').replace(/\/$/, '')}/portal.html#${p.portal_token}`;
const ICON = {
  accueil: IC('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  crm: IC('<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>'),
  annuaire: IC('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.5-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.6c2.6-.2 4.8 1.3 5.5 4.4"/>'),
  editions: IC('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  participants: IC('<circle cx="10" cy="8" r="4"/><path d="M3 21c.9-4 3.7-6 7-6 1.5 0 2.9.4 4 1.2"/><path d="m15 19 2 2 4-4"/>'),
  finances: IC('<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M16 13h2M3 10h18M6 6V4.5A1.5 1.5 0 0 1 7.5 3H17"/>'),
  alumni: IC('<path d="m12 3 10 5-10 5L2 8z"/><path d="M6 10.5V15c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5"/>'),
  partenaires: IC('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
  documents: IC('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  securite: IC('<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  pilotage: IC('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>'),
  historique: IC('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  reglages: IC('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  search: IC('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  plus: IC('<path d="M12 5v14M5 12h14"/>'),
  check: IC('<path d="m5 12 5 5 9-10"/>'),
  sun: IC('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: IC('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  menu: IC('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  whatsapp: IC('<path d="M20 11.6a8 8 0 0 1-11.8 7L4 20l1.4-4.1A8 8 0 1 1 20 11.6z"/><path d="M9 9.5c.3 1.6 1.9 3.6 3.6 4.3l1.2-1.1 1.7.8c-.2.9-1 1.6-2 1.5C10.8 14.8 8.6 12.6 8.4 10.9c-.1-1 .6-1.8 1.5-2l.8 1.7z"/>')
};
const NAV = [['', [['accueil', 'Accueil'], ['pilotage', 'Tâches & décisions']]], ['Personnes', [['crm', 'Prospects (CRM)'], ['annuaire', 'Annuaire'], ['participants', 'Participants'], ['alumni', 'Alumni & Circle Club']]], ['Bootcamps & argent', [['editions', 'Éditions'], ['finances', 'Finances']]], ['Organisation', [['partenaires', 'Partenaires'], ['documents', 'Documents'], ['securite', 'Sécurité'], ['historique', 'Historique'], ['reglages', 'Réglages']]]];
const VIEWS = [['accueil', 'Accueil'], ['crm', 'CRM · prospects'], ['annuaire', 'Annuaire'], ['editions', 'Éditions'], ['participants', 'Participants'], ['finances', 'Finances'], ['alumni', 'Alumni & parrainage'], ['partenaires', 'Partenaires'], ['documents', 'Documents'], ['securite', 'Sécurité'], ['pilotage', 'Tâches & décisions'], ['reglages', 'Réglages']];
function shell() {
  $('root').innerHTML = `<aside id="side">
    <div class="brand"><svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="13" fill="none" stroke="#4FB3A9" stroke-width="3"/><circle cx="17" cy="17" r="6" fill="none" stroke="#E8B04F" stroke-width="2"/></svg><div><b>THE CIRCLE</b><small>Bali · espace de gestion</small></div></div>
    <button class="searchbtn" type="button" data-act="palette">${ICON.search}<span>Rechercher…</span><kbd>Ctrl K</kbd></button>
    <nav id="nav"></nav>
    <div class="side-foot"><div class="me"><div class="avatar sm">${esc((S.member?.display_name || '?').slice(0, 1))}</div><div class="grow"><b>${esc(S.member?.display_name || S.user.email)}</b><small>${esc(S.user.email)}</small></div><button class="iconbtn" type="button" data-act="theme" title="Thème clair / sombre" aria-label="Changer de thème">${document.documentElement.dataset.theme === 'light' ? ICON.moon : ICON.sun}</button></div><button data-act="logout" type="button" class="logout">Se déconnecter</button></div>
  </aside>
  <main><div class="top"><button class="iconbtn menu-btn" data-act="menu" type="button" aria-label="Ouvrir le menu">${ICON.menu}</button><div class="titles"><div class="crumb" id="crumb"></div><h1 id="title"></h1><p id="subtitle"></p></div><div class="actions" id="actions"></div></div><div class="wrap" id="view"></div></main>
  <nav class="bottombar"><a href="#accueil" data-k="accueil">${ICON.accueil}<span>Accueil</span></a><a href="#participants" data-k="participants">${ICON.participants}<span>Participants</span></a><button type="button" class="fabmini" data-act="fab" aria-label="Ajouter">${ICON.plus}</button><a href="#finances" data-k="finances">${ICON.finances}<span>Finances</span></a><button type="button" data-act="menu">${ICON.menu}<span>Menu</span></button></nav>
  <div class="fab-wrap"><div class="fab-menu" id="fabMenu">
    <div class="fm-h">Ajouter</div>
    <button type="button" data-act="add" data-t="leads" data-def="${J({ status: 'Nouveau', source: 'Formulaire' })}">${ICON.crm}<span><b>Une personne</b><small>venue d’un formulaire, d’une pub, d’un DM</small></span></button>
    <button type="button" data-act="add" data-t="participants" data-def="${J({ status: 'Confirmé', pay_currency: 'TND' })}">${ICON.participants}<span><b>Un participant</b><small>inscrit à un bootcamp</small></span></button>
    <button type="button" data-act="add" data-t="payments" data-def="paydef">${ICON.finances}<span><b>Un encaissement</b><small>paiement d’un participant</small></span></button>
    <button type="button" data-act="add" data-t="expenses" data-def="expdef">${ICON.documents}<span><b>Une dépense</b><small>formulaire complet</small></span></button>
    <button type="button" data-act="photo">${ICON.documents}<span><b>Photo d’un ticket</b><small>montant à compléter plus tard</small></span></button>
    <button type="button" data-act="add" data-t="transfers" data-def="trdef">${ICON.finances}<span><b>Retrait, change, virement</b><small>argent qui change de compte</small></span></button>
    <button type="button" data-act="add" data-t="edition_journal" data-def="jdef">${ICON.editions}<span><b>Note d’édition</b><small>remarque, problème, contenu filmé</small></span></button>
    <button type="button" data-act="add" data-t="tasks" data-def="${J({ owner: 'Les deux' })}">${ICON.pilotage}<span><b>Tâche</b></span></button>
  </div><button class="fab" type="button" data-act="fab" aria-label="Ajouter">${ICON.plus}</button></div><input type="file" id="photoIn" accept="image/*,.pdf" capture="environment" hidden>
  <div id="pal" class="pal" hidden><div class="pal-box" role="dialog" aria-label="Recherche"><div class="pal-in">${ICON.search}<input id="palIn" placeholder="Chercher une personne, une édition, une page, une action…" autocomplete="off"><kbd>Échap</kbd></div><div id="palList" class="pal-list"></div></div></div>`;
}
const skeleton = () => `<div class="grid g4">${'<div class="card sk"><i></i><i></i><i></i></div>'.repeat(4)}</div><div class="card sk tall"><i></i><i></i><i></i><i></i></div>`;
function setHead(t, s, actions = '', crumb = '') { $('crumb').innerHTML = crumb; $('title').textContent = t; $('subtitle').textContent = s; $('actions').innerHTML = actions; }
const edOpts = (cur, all = 'Toutes') => `<option value="">${all}</option>` + S.cache.editions.filter(e => !e.hidden).map(e => `<option ${e.id === cur ? 'selected' : ''} value="${e.id}">${esc(e.skill)} · ${e.id}</option>`).join('');
const currentEd = () => { const t = today(); const eds = S.cache.editions.filter(e => !e.hidden); return eds.find(e => e.start_date && e.end_date && e.start_date <= t && e.end_date >= t)?.id || eds.filter(e => e.start_date >= t).sort((a, b) => a.start_date.localeCompare(b.start_date))[0]?.id || ''; };
function defaultsFor(kind) {
  const e = S.ctxEdition || currentEd();
  if (kind === 'paydef') return { currency: 'TND', fx_rate: fx(), paid_on: today(), kind: 'Paiement', edition_id: e };
  if (kind === 'expdef') return { currency: 'EUR', fx_rate: 1, spent_on: today(), type: 'Coût édition', paid_by: 'Caisse Circle', edition_id: e };
  if (kind === 'trdef') return { kind: 'Retrait espèces', done_on: today(), edition_id: e, from_account: 'Boursorama', from_currency: 'EUR', to_account: 'Caisse Bali (IDR)', to_currency: 'IDR' };
  if (kind === 'jdef') return { happened_on: today(), kind: 'Remarque', edition_id: e, author: S.member?.display_name };
  return {};
}


/* ---------- Saisie rapide ---------- */
const CAT_KW = [
  ['Courses maison', /cours|kadhya|[eé]picer|supermarch|pepito|frisian|indomaret|alfamart|\beau\b|water|galon|snack|fruit|tokopedia|groceries/i],
  ['Villa', /villa|loyer|rent|airbnb|piscine|m[eé]nage|laundry|lessive/i],
  ['Coach', /coach|chahir|oussema|formateur/i],
  ['Excursions', /excursion|\btour\b|batur|nusa|ubud|jeep|rafting|guide|temple|cascade|waterfall/i],
  ['Surf & activités', /surf|yoga|padel|gym|plong|snorkel|massage|spa/i],
  ['Dîners', /d[iî]ner|dinner|resto|restaurant|repas|lunch|d[eé]j|beach club|caf[eé]/i],
  ['Transport', /essence|bensin|scooter|moto|grab|gojek|taxi|\bvan\b|driver|chauffeur|pick.?up|parking|transport|risman|a[eé]roport/i],
  ['Matériel & cadeaux', /cadeau|gift|tote|gourde|tumbler|agenda|stylo|post-?it|projecteur|mat[eé]riel|print|impression|multiprise/i],
  ['Publicité', /\bpub\b|\bads?\b|sponsor|meta|boost/i],
  ['Visas', /visa|immigration|kitas/i],
  ['Événements & meetups', /meet.?up|event|[eé]v[eé]nement|olga|speaker|conf[eé]rence/i],
  ['Outils formation', /funding|abonnement|shopify|outil|logiciel|canva/i],
  ['Banque & outils', /frais bancaire|carte qonto|domaine|domain|banque/i],
  ['Frais de change', /frais de change|commission/i]
];
function parseAmounts(txt) {
  const re = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)*)\s*(k|m|jt|juta|rb|ribu)?\b\s*(€|eur(?:os?)?\b|idr\b|rp\b|rupiah\b|tnd\b|dt\b|dinars?\b)?/gi;
  const out = []; let m;
  while ((m = re.exec(txt))) {
    let raw = m[1], val;
    if (/^\d{1,3}(\.\d{3})+$/.test(raw)) val = Number(raw.replace(/\./g, ''));
    else val = Number(raw.replace(',', '.'));
    if (isNaN(val)) continue;
    const mult = (m[2] || '').toLowerCase(); if (['k', 'rb', 'ribu'].includes(mult)) val *= 1e3; if (['m', 'jt', 'juta'].includes(mult)) val *= 1e6;
    let cur = null; const c = (m[3] || '').toLowerCase(); const pre = /^rp/i.test(m[0]);
    if (c.startsWith('€') || c.startsWith('eur')) cur = 'EUR'; else if (c === 'idr' || c === 'rp' || c === 'rupiah' || pre) cur = 'IDR'; else if (c === 'tnd' || c === 'dt' || c.startsWith('dinar')) cur = 'TND';
    out.push({ val, cur, mult: !!mult, explicit: !!cur, text: m[0] });
  }
  return out;
}
function parseQuick(txt) {
  const t = txt.trim(); if (!t) return null;
  const low = t.toLowerCase();
  let date = today(); if (/\bhier\b/.test(low)) date = new Date(Date.now() - 864e5).toISOString().slice(0, 10); if (/avant.?hier/.test(low)) date = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  const amts = parseAmounts(t);
  amts.forEach(a => { if (!a.cur) a.cur = /\b(tnd|dt|dinars?)\b/i.test(low) ? 'TND' : /€|\beur/i.test(low) && amts.length === 1 ? 'EUR' : (a.mult || a.val >= 10000) ? 'IDR' : 'EUR'; });
  let account = null;
  if (/bourso/.test(low)) account = 'Boursorama'; else if (/\bwise\b/.test(low)) account = 'Wise'; else if (/revolut/.test(low)) account = 'Revolut'; else if (/qonto/.test(low)) account = 'Qonto'; else if (/biat/.test(low)) account = 'BIAT Tun'; else if (/path ?to ?travel/.test(low)) account = 'PathToTravel';
  const cashWord = /\bcash\b|esp[eè]ce|liquide/.test(low);
  let paid_by = 'Caisse Circle';
  if (/perso|poche|avanc|pay[eé] par/.test(low)) { if (/youssef|ysf/.test(low)) paid_by = 'Youssef'; else if (/nah?e?d|nehed/.test(low)) paid_by = 'Nahed'; }
  const isTransfer = /^(retrait|atm|dab|change|virement|d[eé]p[oô]t)\b/i.test(t);
  let desc = t; amts.forEach(a => desc = desc.replace(a.text, ' ')); desc = desc.replace(/\b(hier|avant-hier|cash|bourso(rama)?|wise|revolut|qonto|biat|perso|poche|pay[eé] par|youssef|nahed|nehed|idr|rp|eur|euros?|tnd|dt)\b/gi, ' ').replace(/€/g, ' ').replace(/\s+/g, ' ').trim();
  desc = desc ? desc[0].toUpperCase() + desc.slice(1) : '';
  const ed = $('qEd')?.value || S.ctxEdition || currentEd() || null;
  if (isTransfer) {
    const kind = /^change/i.test(t) ? 'Change de devises' : /^virement/i.test(t) ? 'Virement interne' : /^d[eé]p[oô]t/i.test(t) ? 'Dépôt espèces' : 'Retrait espèces';
    let from = null, to = null;
    if (kind === 'Retrait espèces') { to = amts.find(a => a.cur === 'IDR') || amts.find(a => a.cur === 'TND'); from = amts.find(a => a !== to); }
    else { from = amts[0]; to = amts[1]; if (!account && from?.cur === 'TND') account = 'BIAT Tun'; }
    const toCur = to?.cur || (kind === 'Retrait espèces' ? 'IDR' : 'EUR');
    const toAcc = kind === 'Retrait espèces' ? (toCur === 'TND' ? 'Espèces TND' : toCur === 'EUR' ? 'Espèces' : 'Caisse Bali (IDR)') : null;
    return { type: 'transfer', rec: { kind, done_on: date, edition_id: ed, from_account: account || (kind === 'Retrait espèces' ? 'Boursorama' : null), from_amount: from ? from.val : null, from_currency: from?.cur || 'EUR', to_account: toAcc || (kind === 'Change de devises' && to?.cur === 'EUR' ? 'Boursorama' : null), to_amount: to ? to.val : null, to_currency: toCur, notes: `Saisie rapide : « ${t} »` } };
  }
  const a = amts.find(x => x.explicit || x.mult) || [...amts].sort((x, y) => y.val - x.val)[0]; if (!a) return { type: 'error', msg: 'Ajoutez un montant (ex. 350k, 45€, 2,4M)' };
  if (!account && (cashWord || a.cur === 'IDR')) account = a.cur === 'TND' ? 'Espèces TND' : a.cur === 'EUR' ? 'Espèces' : 'Caisse Bali (IDR)';
  if (paid_by !== 'Caisse Circle') account = null;
  const cat = (CAT_KW.find(([, r]) => r.test(t)) || [null])[0];
  const eur = toEur(a.val, a.cur);
  const category = cat || (eur < 15 ? 'Petites dépenses' : 'À clarifier');
  return { type: 'expense', rec: { edition_id: ed, spent_on: date, description: desc || category, category, amount: a.val, currency: a.cur, fx_rate: rate(a.cur), type: category === 'À clarifier' ? 'À clarifier' : category === 'Publicité' ? 'Marketing' : 'Coût édition', paid_from: account, paid_by, reimbursed: false, notes: `Saisie rapide : « ${t} »` }, eur };
}
function quickPreview(p) {
  if (!p) return '<span class="muted">Tapez une dépense, un retrait ou un change. Entrée pour enregistrer.</span>';
  if (p.type === 'error') return `<span class="warn-t">${esc(p.msg)}</span>`;
  const r = p.rec;
  if (p.type === 'transfer') { const loss = r.from_amount != null && r.to_amount != null ? toEur(r.from_amount, r.from_currency) - toEur(r.to_amount, r.to_currency) : null; return `${pill(r.kind, 'warn')} <b>${r.from_amount != null ? money(r.from_amount, r.from_currency) : '? ' + r.from_currency}</b> depuis <b>${esc(r.from_account || '?')}</b> → <b>${r.to_amount != null ? money(r.to_amount, r.to_currency) : '? ' + r.to_currency}</b> sur <b>${esc(r.to_account || '?')}</b>${loss != null ? ` · perte de change ${EUR(loss)} (taux obtenu ${NUM(r.to_amount / r.from_amount)})` : ' · <span class="warn-t">indiquez les deux montants pour calculer la perte</span>'} · ${fmtD(r.done_on)}`; }
  return `${pill(r.category, r.category === 'À clarifier' ? 'bad' : 'mute')} <b>${esc(r.description)}</b> · <b>${money(r.amount, r.currency)}</b>${r.currency !== 'EUR' ? ` ≈ ${EUR(p.eur)}` : ''} · ${r.paid_by !== 'Caisse Circle' ? `avancé par <b>${r.paid_by}</b>` : `compte : <b>${esc(r.paid_from || 'à préciser')}</b>`} · ${fmtD(r.spent_on)}`;
}
function quickBar(ed) {
  return `<div class="card quick"><div class="qhead"><b>Saisie rapide</b><span class="muted">Exemples : « courses 350k » · « essence 45€ bourso » · « surf 2,4M » · « dîner 1,2M perso youssef hier » · « retrait 2M bourso 101€ » · « change 1000 dt 280€ »</span></div>
  <div class="qrow"><input id="qIn" autocomplete="off" placeholder="Ex. courses 350k cash"><select id="qEd" aria-label="Bootcamp">${edOpts(ed || '', 'Sans édition')}</select><button class="btn primary" type="button" data-act="qsave">Ajouter</button><button class="btn" type="button" data-act="photo">Photo d’un ticket</button><button class="btn" type="button" data-act="add" data-t="transfers" data-def="trdef">Retrait / change</button></div>
  <div id="qPrev" class="qprev">${quickPreview(null)}</div></div>`;
}
async function quickSave() {
  const el = $('qIn'); const p = parseQuick(el.value);
  if (!p || p.type === 'error') { toast(p ? p.msg : 'Rien à enregistrer', true); return; }
  await q(sb.from(p.type === 'transfer' ? 'transfers' : 'expenses').insert(p.rec));
  toast(p.type === 'transfer' ? 'Transfert enregistré' : `Dépense enregistrée : ${p.rec.description}`);
  const ed = $('qEd')?.value; await route(); const n = $('qIn'); if (n) { n.focus(); if ($('qEd')) $('qEd').value = ed; }
}

/* ---------- Budget prévu / réel ---------- */
const BUDGET_MAP = { 'Visas C9 + coach': ['Visas'], 'Surf, meet-ups, pick-ups': ['Surf & activités', 'Événements & meetups', 'Transport'], 'Courses maison': ['Courses maison', 'Petites dépenses'] };
function budgetVsReal(s, D) {
  const P = postes(s.ed.id, D);
  const copy = `<div class="inline"><select id="cbFrom">${D.eds.filter(e => e.id !== s.ed.id && D.budget.some(b => b.edition_id === e.id)).map(e => `<option value="${e.id}">${esc(e.skill)} · ${e.id}</option>`).join('')}</select><button class="btn sm" type="button" data-act="copybudget" data-id="${s.ed.id}">Copier ces postes ici</button></div>`;
  return `<div class="card"><div class="head"><h2>Coûts fixes : prévu, réel, prévision</h2><span class="pill ${P.paidN === P.rows.length && P.has ? 'good' : 'mute'}">${P.paidN} / ${P.rows.length} soldés</span><button class="btn sm" type="button" data-act="add" data-t="edition_budget_lines" data-def="${J({ edition_id: s.ed.id, paid: false, sort: 50 })}">+ Poste</button></div>
  <p class="muted">Cochez un poste quand il est payé : si les dépenses saisies n’atteignent pas le prévu, la différence est ajoutée toute seule aux dépenses, et tout se met à jour (dépenses, gain, prévision, comptes). Si les dépenses saisies sont déjà justes, rien n’est ajouté. Décocher retire ce solde automatique.</p>
  ${P.has ? '' : `<div class="msg">Pas encore de postes pour cette édition. Copiez ceux d’une autre édition, puis ajustez.</div>${copy}`}
  <div class="postes">${P.rows.map(r => { const over = r.plan && r.real > r.plan; return `<div class="poste ${r.l.paid ? 'paid' : ''}">
    <button type="button" class="tick" data-act="togglepaid" data-id="${r.l.id}" data-v="${r.l.paid ? 0 : 1}" aria-label="${r.l.paid ? 'Marquer non payé' : 'Marquer payé'}">${r.l.paid ? ICON.check : ''}</button>
    <div class="grow click" data-act="edit" data-t="edition_budget_lines" data-id="${r.l.id}"><div class="ph"><b>${esc(r.l.category)}</b>${r.manual ? pill('réel saisi à la main', 'mute') : ''}${D.exps.some(x => (x.notes || '').startsWith(`auto-poste:${r.l.id}`)) ? pill('solde ajouté en cochant', 'good') : ''}${r.l.due_date && !r.l.paid ? pill('avant le ' + fmtD(r.l.due_date), daysTo(r.l.due_date) < 0 ? 'bad' : 'warn') : ''}</div>
    ${r.plan ? pbar(r.real / r.plan, `${EUR(r.real)} / ${EUR(r.plan)}`).replace('class="pbar', `class="pbar ${over ? 'over' : ''}`) : ''}
    <div class="sub">${r.cats.length ? 'Dépenses : ' + esc(r.cats.join(', ')) : 'Tout ce qui n’entre dans aucun autre poste'}${r.detail ? ' · ' + esc(r.detail) : ''}</div></div>
    <div class="pv"><small>Prévision</small><b class="num">${EUR(r.prev)}</b><small class="${over ? 'neg' : r.real < r.plan && r.l.paid ? 'good-t' : ''}">${r.plan ? (r.real - r.plan > 0 ? '+' : '') + EUR(r.real - r.plan) : ''}</small></div></div>`; }).join('')}
  ${P.extra.map(x => `<div class="poste"><button type="button" class="tick dis" data-act="mkposte" data-ed="${s.ed.id}" data-cat="${esc(x.name)}" data-amt="${Math.round(x.real)}" title="Créer ce poste et le marquer payé" aria-label="Créer le poste ${esc(x.name)} et le marquer payé"></button><div class="grow click" data-act="mkposte" data-ed="${s.ed.id}" data-cat="${esc(x.name)}" data-amt="${Math.round(x.real)}" data-unpaid="1"><b>${esc(x.name)}</b><div class="sub">Pas encore un poste fixe. Cochez pour le créer et le marquer payé, ou cliquez pour le créer à payer.</div></div><div class="pv"><small>Réel</small><b class="num">${EUR(x.real)}</b></div></div>`).join('')}</div>
  ${P.has ? `<div class="ptot"><div><small>Prévu</small><b>${EUR(P.totPlan)}</b></div><div><small>Réel à ce jour</small><b>${EUR(P.totReal)}</b></div><div><small>Prévision finale</small><b>${EUR(P.totPrev)}</b></div><div><small>Écart prévu</small><b class="${P.totPrev > P.totPlan ? 'neg' : 'good-t'}">${(P.totPrev - P.totPlan > 0 ? '+' : '') + EUR(P.totPrev - P.totPlan)}</b></div></div>` : ''}</div>`;
}
const fraisOf = s => N(s.fraisChange);
function postes(id, D) {
  const costs = (D.split || D.exps).filter(x => x.edition_id === id && x.type !== 'Frais fondateurs');
  const real = {}; costs.forEach(x => real[x.category] = (real[x.category] || 0) + N(x.amount_eur));
  const lines = D.budget.filter(b => b.edition_id === id).sort((a, b) => (a.sort ?? 100) - (b.sort ?? 100) || b.amount_eur - a.amount_eur);
  const used = new Set();
  const catsOf = l => (l.match_categories ? l.match_categories.split(',').map(x => x.trim()).filter(Boolean) : (/impr[eé]vu/i.test(l.category) ? [] : [l.category]));
  const rows = lines.map(l => { const cats = catsOf(l); cats.forEach(c => used.add(c)); const calc = sum(cats, c => real[c] || 0); return { l, cats, calc, real: l.actual_manual != null ? N(l.actual_manual) : calc, manual: l.actual_manual != null, plan: N(l.amount_eur) }; });
  const others = Object.entries(real).filter(([c]) => !used.has(c));
  const imp = rows.find(r => !r.cats.length);
  if (imp) { const o = sum(others, x => x[1]); imp.calc += o; if (!imp.manual) imp.real += o; imp.detail = others.map(([c, v]) => `${c} ${EUR(v)}`).join(' · '); }
  rows.forEach(r => { r.prev = r.l.paid ? r.real : Math.max(r.plan, r.real); });
  const extra = imp ? [] : others.map(([c, v]) => ({ name: c, real: v }));
  const totPlan = sum(rows, r => r.plan), totReal = sum(rows, r => r.real) + sum(extra, x => x.real), totPrev = sum(rows, r => r.prev) + sum(extra, x => x.real);
  return { rows, extra, totPlan, totReal, totPrev, has: rows.length > 0, paidN: rows.filter(r => r.l.paid).length };
}
function envelope(s) {
  const e = s.ed; if (!e.start_date || !e.end_date) return '';
  const envIdr = N(S.settings.enveloppe_courses_idr) || 4000000, envEur = toEur(envIdr, 'IDR');
  const start = new Date(e.start_date + 'T00:00:00Z'), weeks = Math.ceil((new Date(e.end_date + 'T00:00:00Z') - start) / 864e5 / 7) || 1;
  const ex = s.costs.filter(x => ['Courses maison', 'Petites dépenses'].includes(x.category));
  const rows = []; for (let i = 0; i < weeks; i++) { const a = new Date(+start + i * 7 * 864e5).toISOString().slice(0, 10), b = new Date(+start + (i + 1) * 7 * 864e5).toISOString().slice(0, 10); const wk = ex.filter(x => x.spent_on && x.spent_on >= a && x.spent_on < b); rows.push({ i, a, v: sum(wk, x => x.amount_eur), n: wk.length }); }
  const outside = sum(ex.filter(x => !x.spent_on || x.spent_on < e.start_date || x.spent_on >= new Date(+start + weeks * 7 * 864e5).toISOString().slice(0, 10)), x => x.amount_eur);
  return `<div class="card"><div class="head"><h2>Enveloppe courses & petites dépenses</h2><span class="muted">${IDR(envIdr)} ≈ ${EUR(envEur)} par semaine · modifiable dans Réglages</span></div>
  <div class="paybars">${rows.map(r => `<button type="button" class="paybar click" data-act="week" data-ed="${e.id}" data-i="${r.i}" data-a="${r.a}" data-b="${new Date(+start + (r.i + 1) * 7 * 864e5).toISOString().slice(0, 10)}"><div class="pb-head"><b>Semaine ${r.i + 1}</b><span class="muted">dès le ${fmtD(r.a)}</span><span class="num">${EUR(r.v)} / ${EUR(envEur)}</span></div>${pbar(r.v / envEur).replace('class="pbar', `class="pbar ${r.v > envEur ? 'over' : ''}`)}<div class="pb-foot">${r.n} achat(s) · cliquez pour voir, ajouter ou modifier</div></button>`).join('')}</div>
  ${outside ? `<p class="muted">${EUR(outside)} de courses hors des semaines du bootcamp (avant, après ou sans date).</p>` : ''}<p class="muted">Cliquez sur une semaine pour voir le détail des achats, en ajouter ou les corriger. Pas besoin de noter chaque bouteille d’eau : une ligne par passage au magasin suffit.</p></div>`;
}
function owesBox(D, edId) {
  const o = whoOwes(D, edId);
  return `<div class="card owes"><div class="head"><h2>Qui doit quoi à qui</h2></div>${o.length ? o.map(x => `<div class="row"><div class="grow">La caisse The Circle doit <b>${EUR(x.total)}</b> à <b>${esc(x.who)}</b><div class="sub">${x.n} dépense(s) avancée(s) de sa poche</div></div><button class="btn sm" type="button" data-act="reimburse" data-who="${esc(x.who)}" data-ed="${esc(edId || '')}">Marquer remboursé</button></div>`).join('') : '<div class="empty-state">Personne n’a d’argent à récupérer</div>'}</div>`;
}

async function weekDrawer(ed, i, a, b) {
  const items = await q(sb.from('expenses').select('*').eq('edition_id', ed).in('category', ['Courses maison', 'Petites dépenses']).gte('spent_on', a).lt('spent_on', b).order('spent_on'));
  const envEur = toEur(N(S.settings.enveloppe_courses_idr) || 4000000, 'IDR'), tot = sum(items, x => x.amount_eur);
  const last = new Date(new Date(b + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10), d0 = today() >= a && today() < b ? today() : a;
  openDrawer(`${drawerHead(`Courses · semaine ${Number(i) + 1}`)}
  <div class="muted">${fmtD(a)} → ${fmtD(last)}</div>
  ${pbar(tot / envEur, `${EUR(tot)} / ${EUR(envEur)}`).replace('class="pbar', `class="pbar ${tot > envEur ? 'over' : ''}`)}
  <form class="form addline" id="wkForm"><div class="fwrap full"><label class="field">Ce qui a été acheté<input name="d" required placeholder="Ex. eau, fruits, œufs, café"></label></div>
  <div class="fwrap half"><label class="field">Prix<input name="m" required placeholder="Ex. 350k ou 85000 ou 12€"></label></div>
  <div class="fwrap half"><label class="field">Date<input type="date" name="t" value="${d0}" min="${a}" max="${last}"></label></div>
  <div class="fwrap half"><label class="field">Catégorie<select name="c"><option>Courses maison</option><option>Petites dépenses</option></select></label></div>
  <div class="fwrap half"><label class="field">Payé avec<select name="f">${S.cache.accounts.map(x => `<option ${x.name === 'Caisse Bali (IDR)' ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label></div>
  <div class="fwrap full"><label class="field">Photo du ticket (facultatif)<input type="file" name="p" accept="image/*,.pdf" capture="environment"></label></div>
  <button class="btn primary" type="submit">+ Ajouter cet achat</button></form>
  <div class="head"><h3>Achats de la semaine (${items.length})</h3><b class="num">${EUR(tot)}</b></div>
  <div class="list">${items.map(x => `<button type="button" class="row click" data-act="edit" data-t="expenses" data-id="${x.id}" data-back="week:${ed}|${i}|${a}|${b}"><div class="grow"><b>${esc(x.description || x.category)}</b><div class="sub">${fmtD(x.spent_on)} · ${esc(x.paid_from || '')}${x.receipt_path ? ' · ticket joint' : ''}</div></div><div class="r"><b class="num">${money(x.amount, x.currency)}</b>${x.currency !== 'EUR' ? `<div class="sub">${EUR(x.amount_eur)}</div>` : ''}</div></button>`).join('') || '<div class="empty-state">Aucun achat noté cette semaine</div>'}</div>
  <p class="muted">Cliquez sur un achat pour changer le prix, la date, l’article ou le supprimer.</p>`);
  $('wkForm').onsubmit = async ev => {
    ev.preventDefault(); const f = ev.target, btn = f.querySelector('[type=submit]'); btn.disabled = true;
    try {
      const am = parseAmounts(f.m.value)[0]; if (!am) { toast('Prix non compris : écrivez par ex. 350k, 85000 ou 12€', true); btn.disabled = false; return; }
      const cur = am.cur || (am.mult || am.val >= 1000 ? 'IDR' : 'EUR');
      const acc = S.cache.accounts.find(x => x.name === f.f.value);
      const rec = { edition_id: ed, spent_on: f.t.value || d0, description: f.d.value.trim(), category: f.c.value, amount: am.val, currency: cur, fx_rate: rate(cur), type: 'Coût édition', paid_from: f.f.value, paid_by: 'Caisse Circle', notes: 'Ajouté depuis les courses de la semaine' };
      if (f.p.files[0]) rec.receipt_path = await upload(f.p.files[0], 'expenses');
      await q(sb.from('expenses').insert(rec)); toast(`Ajouté : ${rec.description} · ${money(am.val, cur)}`);
      await weekDrawer(ed, i, a, b); route(); setTimeout(() => $('wkForm')?.d?.focus(), 50);
    } catch (e) { btn.disabled = false; }
  };
  setTimeout(() => $('wkForm')?.d?.focus(), 250);
}



/* ---------- Dispersion d'une transaction en mini-dépenses ---------- */
const FOUNDER_RE = /\b(perso|masrouf|pris par|retir[eé] par|pour (youssef|nahed|nehed))\b/i;
function lineMeta(label, cat) {
  const l = label || '';
  const founder = /youssef|ysf/i.test(l) ? 'Youssef' : /nah?e?d|nehed/i.test(l) ? 'Nahed' : null;
  if ((cat === 'Gain fondateurs') || (founder && FOUNDER_RE.test(l))) return { category: 'Gain fondateurs', type: 'Frais fondateurs', founder };
  const c = cat || (CAT_KW.find(([, r]) => r.test(l)) || [null])[0];
  return { category: c || 'À clarifier', type: !c || c === 'À clarifier' ? 'À clarifier' : c === 'Publicité' ? 'Marketing' : 'Coût édition', founder: null };
}
function explode(exps, lines) {
  const by = {}; (lines || []).forEach(l => (by[l.expense_id] ||= []).push(l));
  const out = [];
  exps.forEach(x => {
    const ls = by[x.id]; if (!ls || !ls.length) { out.push(x); return; }
    ls.forEach(l => { const m = lineMeta(l.label, l.category); out.push({ ...x, _line: l.id, description: l.label, category: m.category, type: m.type, founder: m.founder || (m.type === 'Frais fondateurs' ? x.founder : null), amount_eur: N(l.amount_eur) }); });
    const rest = N(x.amount_eur) - sum(ls, l => l.amount_eur);
    if (rest > 0.5) out.push({ ...x, _line: 'rest', description: (x.description || '') + ' (non détaillé)', category: 'À clarifier', type: 'À clarifier', amount_eur: rest });
  });
  return out;
}
/* « ads 200, courses 150k, essence 50€, nahed perso 100, reste courses » → lignes */
function parseSplit(text, total, cur0) {
  const segs = text.split(/[,;\n+]|\bet\b/i).map(x => x.trim()).filter(Boolean);
  const rows = []; let restSeg = null;
  segs.forEach(sg => {
    if (/\b(le )?reste\b/i.test(sg)) { restSeg = sg.replace(/\b(le )?reste( en| pour| :)?\b/i, '').trim() || 'reste'; return; }
    const pc = sg.match(/(\d+(?:[.,]\d+)?)\s*%/);
    let eur = null, label = sg;
    if (pc) { eur = total * Number(pc[1].replace(',', '.')) / 100; label = sg.replace(pc[0], ''); }
    else { const a = parseAmounts(sg)[0]; if (a) { const cur = a.cur || (a.mult || a.val >= 10000 ? 'IDR' : cur0 === 'TND' ? 'TND' : 'EUR'); eur = toEur(a.val, cur); label = sg.replace(a.text, ''); } }
    label = label.replace(/\s+/g, ' ').trim() || 'Sans nom';
    rows.push({ label: label[0].toUpperCase() + label.slice(1), eur });
  });
  const known = sum(rows.filter(r => r.eur != null), r => r.eur);
  if (restSeg) rows.push({ label: restSeg[0].toUpperCase() + restSeg.slice(1), eur: null, isRest: true });
  const open = rows.filter(r => r.eur == null), left = Math.max(total - known, 0);
  open.forEach(r => { r.eur = left / open.length; if (!r.isRest) r.auto = true; });
  rows.forEach(r => { r.eur = Math.round(N(r.eur) * 100) / 100; Object.assign(r, lineMeta(r.label)); });
  return rows;
}
function splitPreview(rows, total) {
  const done = sum(rows, r => r.eur), rest = total - done;
  if (!rows.length) return '<span class="muted">Écrivez le détail ci-dessus, l’app répartit et classe tout seul.</span>';
  return `<div class="splitprev">${rows.map(r => `<div class="spl"><span class="grow"><b>${esc(r.label)}</b> ${pill(r.type === 'Frais fondateurs' ? 'Avance sur gain' + (r.founder ? ' · ' + r.founder : '') : r.category, r.category === 'À clarifier' ? 'bad' : r.type === 'Frais fondateurs' ? 'warn' : 'mute')}${r.auto ? ' <small class="muted">montant réparti</small>' : ''}${r.isRest ? ' <small class="muted">le reste</small>' : ''}</span><b class="num">${EUR(r.eur)}</b></div>`).join('')}
  <div class="spl tot"><span class="grow">${Math.abs(rest) < 1 ? '<span class="good-t">Tout est réparti ✓</span>' : rest > 0 ? `<span class="warn-t">Il reste ${EUR(rest)} non détaillés (ils resteront « à clarifier »)</span>` : `<span class="neg">Le détail dépasse le total de ${EUR(-rest)}</span>`}</span><b class="num">${EUR(done)} / ${EUR(total)}</b></div></div>`;
}

/* ---------- Échéancier des tranches ---------- */
function schedOf(p, D) {
  const rows = (D.sched || []).filter(x => x.participant_id === p.id).sort((a, b) => a.due_on.localeCompare(b.due_on));
  const b = partBal(p, D.pays); let cum = 0; const t = today();
  const items = rows.map(r => { const before = cum; cum += N(r.amount_eur); const covered = Math.max(0, Math.min(N(r.amount_eur), b.net - before)); const rest = N(r.amount_eur) - covered; return { ...r, covered, rest, st: rest < 1 ? 'Payée' : r.due_on < t ? 'En retard' : covered > 0 ? 'Partielle' : 'À venir' }; });
  const late = sum(items.filter(i => i.st === 'En retard'), i => i.rest);
  return { items, late, has: rows.length > 0, b };
}
function allSchedules(D) {
  return D.parts.filter(p => !INACTIVE.includes(p.status) && p.status !== 'Reporté').map(p => ({ p, s: schedOf(p, D) })).filter(x => x.s.has);
}
const relanceMsg = (p, amount, due) => `Salut ${p.full_name.split(' ')[0]} ! Petit rappel The Circle : la tranche de ${EUR(amount)} prévue le ${fmtD(due)} n’est pas encore arrivée. Tu nous dis quand tu peux l’envoyer ? Merci 🙏`;
function schedSection(p, D, back) {
  const s = schedOf(p, D);
  const cls = { 'Payée': 'good', 'En retard': 'bad', 'Partielle': 'warn', 'À venir': 'mute' };
  return `<div class="sub-section"><div class="head"><h3>Échéancier</h3>${s.late ? pill(`${EUR(s.late)} en retard`, 'bad') : s.has ? pill('à jour', 'good') : ''}<button class="btn sm" type="button" data-act="mksched" data-id="${p.id}">${s.has ? 'Refaire' : 'Créer l’échéancier'}</button></div>
  ${s.has ? `<div class="sched">${s.items.map(i => `<div class="si ${cls[i.st]}"><span class="sd">${fmtD(i.due_on)}</span><span class="grow">${esc(i.label || 'Tranche')}</span><b class="num">${EUR(i.amount_eur)}</b>${pill(i.st, cls[i.st])}${i.st === 'En retard' && p.phone ? `<a class="btn sm" target="_blank" rel="noopener" href="${wa(p.phone)}?text=${encodeURIComponent(relanceMsg(p, i.rest, i.due_on))}">Relancer</a>` : ''}</div>`).join('')}</div>` : '<p class="muted">Pas encore d’échéancier : fixez les dates et montants prévus, l’app dira qui est en retard.</p>'}</div>`;
}
function schedForm(p) {
  const b = partBal(p, S.cache.payments || []);
  const d1 = new Date(); d1.setDate(1); d1.setMonth(d1.getMonth() + 1);
  openDrawer(`${drawerHead('Échéancier · ' + esc(p.full_name))}
  <p class="muted">Prix total ${EUR(p.price_eur)} · déjà payé ${EUR(b.net)}. L’app répartit le prix total en tranches égales (les paiements déjà reçus couvrent les premières).</p>
  <form class="form" id="schForm"><div class="fwrap half"><label class="field">Nombre de tranches<input type="number" name="n" min="1" max="12" value="3" required></label></div>
  <div class="fwrap half"><label class="field">Tous les combien de mois<input type="number" name="every" min="1" max="6" value="1" required></label></div>
  <div class="fwrap half"><label class="field">Date de la 1re tranche<input type="date" name="d" value="${p.created_at ? p.created_at.slice(0, 10) : today()}" required></label></div>
  <div class="fwrap half"><label class="field">Montant total (€)<input type="number" step="any" name="tot" value="${N(p.price_eur)}" required></label></div>
  <div class="row-actions"><button class="btn primary" type="submit">Créer l’échéancier</button></div></form>`);
  $('schForm').onsubmit = async ev => {
    ev.preventDefault(); const f = ev.target; const n = Number(f.n.value), every = Number(f.every.value), tot = Number(f.tot.value);
    const old = (await q(sb.from('payment_schedule').select('id').eq('participant_id', p.id))).map(x => x.id);
    if (old.length) await q(sb.from('payment_schedule').delete().in('id', old));
    const base = Math.floor(tot / n * 100) / 100, rows = [];
    for (let i = 0; i < n; i++) { const d = new Date(f.d.value + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + i * every); rows.push({ participant_id: p.id, due_on: d.toISOString().slice(0, 10), amount_eur: i === n - 1 ? Math.round((tot - base * (n - 1)) * 100) / 100 : base, label: `Tranche ${i + 1}/${n}` }); }
    await q(sb.from('payment_schedule').insert(rows)); toast('Échéancier créé'); route(); participantDetail(p.id);
  };
}
function echeancesCard(D, edId) {
  const t = today(), m0 = t.slice(0, 7), m1 = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 7); })();
  const all = allSchedules(D).filter(x => !edId || x.p.edition_id === edId);
  const items = all.flatMap(x => x.s.items.filter(i => i.rest > 1).map(i => ({ ...i, p: x.p })));
  const late = items.filter(i => i.st === 'En retard'), now = items.filter(i => i.st !== 'En retard' && i.due_on.slice(0, 7) === m0), next = items.filter(i => i.due_on.slice(0, 7) === m1);
  const noSched = D.parts.filter(p => (!edId || p.edition_id === edId) && !INACTIVE.includes(p.status) && p.status !== 'Reporté' && partBal(p, D.pays).reste > 1 && !all.some(x => x.p.id === p.id));
  const li = i => `<div class="row"><div class="grow click" data-act="part" data-id="${i.p.id}"><b>${esc(i.p.full_name)}</b><div class="sub">${esc(i.label || '')} · prévue le ${fmtD(i.due_on)}</div></div><b class="num">${EUR(i.rest)}</b>${i.st === 'En retard' && i.p.phone ? `<a class="btn sm" target="_blank" rel="noopener" href="${wa(i.p.phone)}?text=${encodeURIComponent(relanceMsg(i.p, i.rest, i.due_on))}">Relancer</a>` : ''}</div>`;
  return `<div class="card"><div class="head"><h2>Échéances des participants</h2></div><div class="grid g3 inner">${kpi('En retard', EUR(sum(late, i => i.rest)), `${late.length} tranche(s)`)}${kpi('Attendu ce mois-ci', EUR(sum(now, i => i.rest)), `${now.length} tranche(s)`)}${kpi('Le mois prochain', EUR(sum(next, i => i.rest)), `${next.length} tranche(s)`)}</div>
  ${late.length ? `<h3 class="neg">En retard</h3><div class="list">${late.map(li).join('')}</div>` : ''}${now.length ? `<h3>Ce mois-ci</h3><div class="list">${now.map(li).join('')}</div>` : ''}
  ${noSched.length ? `<p class="muted">Sans échéancier mais pas tout payé : ${noSched.map(p => `<a href="#" data-act="part" data-id="${p.id}">${esc(p.full_name)}</a>`).join(', ')}. Ouvrez la fiche → « Créer l’échéancier ».</p>` : ''}</div>`;
}

/* ---------- Trésorerie à venir ---------- */
function tresorerie(D) {
  const t = today(), mKey = d => (d && d > t ? d : t).slice(0, 7);
  const months = []; const d0 = new Date(); d0.setDate(1); for (let i = 0; i < 7; i++) { const d = new Date(d0); d.setMonth(d0.getMonth() + i); months.push(d.toISOString().slice(0, 7)); }
  const M = Object.fromEntries(months.map(m => [m, { m, inn: 0, out: 0, inD: [], outD: [] }]));
  const put = (m, k, v, label) => { const x = M[m] || (m < months[0] ? M[months[0]] : null); if (!x || v < 1) return; x[k] += v; x[k === 'inn' ? 'inD' : 'outD'].push(`${label} ${EUR(v)}`); };
  const all = allSchedules(D);
  all.forEach(({ p, s }) => s.items.filter(i => i.rest > 1).forEach(i => put(mKey(i.due_on), 'inn', i.rest, p.full_name.split(' ')[0])));
  D.parts.filter(p => !INACTIVE.includes(p.status) && p.status !== 'Reporté' && !all.some(x => x.p.id === p.id)).forEach(p => { const b = partBal(p, D.pays); if (b.reste > 1) { const e = D.eds.find(x => x.id === p.edition_id); put(mKey(e?.start_date), 'inn', b.reste, p.full_name.split(' ')[0]); } });
  D.eds.filter(e => !e.hidden && !isEnded(e)).forEach(e => postes(e.id, D).rows.filter(r => !r.l.paid).forEach(r => { const left = Math.max(r.plan - r.real, 0); put(mKey(r.l.due_date || e.start_date), 'out', left, `${r.l.category} (${e.skill.slice(0, 4)}. ${fmtD(e.start_date).split(' ').slice(1).join(' ')})`); }));
  const start = sum(accountBalances(D), a => a.balEur);
  let cash = start; const rows = months.map(m => { const x = M[m]; cash += x.inn - x.out; return { ...x, cash }; });
  const max = Math.max(...rows.map(r => Math.max(r.inn, r.out, Math.abs(r.cash))), 1);
  const W = 760, H = 220, bw = W / rows.length, y = v => H / 2 - v / max * (H / 2 - 16);
  const svg = `<svg class="chart" viewBox="0 0 ${W} ${H + 24}" role="img" aria-label="Trésorerie prévue par mois"><line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="var(--line)"/>${rows.map((r, i) => `<rect x="${i * bw + bw * .18}" y="${y(r.inn)}" width="${bw * .28}" height="${H / 2 - y(r.inn)}" rx="4" fill="var(--good)" opacity=".85"><title>Entrées ${EUR(r.inn)}</title></rect><rect x="${i * bw + bw * .5}" y="${H / 2}" width="${bw * .28}" height="${H / 2 - y(r.out)}" rx="4" fill="var(--bad)" opacity=".8"><title>Sorties ${EUR(r.out)}</title></rect><text x="${i * bw + bw / 2}" y="${H + 18}" font-size="12" text-anchor="middle" fill="var(--muted)">${new Date(r.m + '-01T00:00:00').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}</text>`).join('')}<polyline fill="none" stroke="var(--accent)" stroke-width="2.5" points="${rows.map((r, i) => `${i * bw + bw / 2},${y(r.cash)}`).join(' ')}"/>${rows.map((r, i) => `<circle cx="${i * bw + bw / 2}" cy="${y(r.cash)}" r="4" fill="${r.cash < 0 ? 'var(--bad)' : 'var(--accent)'}"><title>Trésorerie fin de mois ${EUR(r.cash)}</title></circle>`).join('')}</svg>`;
  const neg = rows.find(r => r.cash < 0);
  return `<div class="grid g4">${kpi('Trésorerie aujourd’hui', EUR(start), 'somme de tous les comptes (taux de référence)')}${kpi('Entrées attendues', EUR(sum(rows, r => r.inn)), '7 prochains mois')}${kpi('Sorties prévues', EUR(sum(rows, r => r.out)), 'postes fixes non payés')}${kpi('Dans 7 mois', EUR(rows[rows.length - 1].cash), neg ? `⚠ négatif en ${new Date(neg.m + '-01T00:00:00').toLocaleDateString('fr-FR', { month: 'long' })}` : 'jamais négatif', neg ? '' : '')}</div>
  ${neg ? `<div class="msg err">Attention : la trésorerie passe sous zéro en ${new Date(neg.m + '-01T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}. Il faudra faire rentrer des paiements avant, ou décaler une sortie.</div>` : ''}
  <div class="card"><div class="head"><h2>Mois par mois</h2><span class="muted">vert = entrées attendues · rouge = sorties prévues · ligne = argent en fin de mois</span></div>${svg}
  <div class="table-wrap"><table><thead><tr><th>Mois</th><th class="n">Entrées</th><th class="n">Sorties</th><th class="n">Fin de mois</th><th>Détail</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${new Date(r.m + '-01T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</b></td><td class="n good-t">${r.inn ? '+' + EUR(r.inn) : '—'}</td><td class="n neg">${r.out ? '−' + EUR(r.out) : '—'}</td><td class="n"><b class="${r.cash < 0 ? 'neg' : ''}">${EUR(r.cash)}</b></td><td class="muted">${esc([...r.inD, ...r.outD].join(' · '))}</td></tr>`).join('')}</tbody></table></div>
  <p class="muted">Entrées : tranches non payées de l’échéancier (ou le reste dû au début de l’édition si pas d’échéancier). Sorties : postes fixes non cochés des éditions à venir, au mois « à payer avant le » du poste, sinon au mois de début de l’édition. Le point de départ dépend de la justesse des comptes (onglet Comptes).</p></div>`;
}

/* ---------- Rappels du jour ---------- */
function rappels(D, leads, tasks) {
  const t = today(), in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), in15 = new Date(Date.now() + 15 * 864e5).toISOString().slice(0, 10);
  const R = [];
  allSchedules(D).forEach(({ p, s }) => s.items.filter(i => i.st === 'En retard').forEach(i => R.push({ k: 'bad', t: `Tranche en retard : ${p.full_name}`, s: `${EUR(i.rest)} prévus le ${fmtD(i.due_on)}`, act: `data-act="part" data-id="${p.id}"` })));
  allSchedules(D).forEach(({ p, s }) => s.items.filter(i => i.rest > 1 && i.due_on >= t && i.due_on <= in7).forEach(i => R.push({ k: 'warn', t: `Tranche attendue : ${p.full_name}`, s: `${EUR(i.rest)} le ${fmtD(i.due_on)}`, act: `data-act="part" data-id="${p.id}"` })));
  D.eds.filter(e => !e.hidden && !isEnded(e)).forEach(e => postes(e.id, D).rows.filter(r => !r.l.paid && r.l.due_date && r.l.due_date <= in7).forEach(r => R.push({ k: r.l.due_date < t ? 'bad' : 'warn', t: `À payer : ${r.l.category} (${e.skill})`, s: `${EUR(Math.max(r.plan - r.real, 0))} avant le ${fmtD(r.l.due_date)}`, act: `data-act="go" data-href="#edition/${e.id}"` })));
  leads.filter(l => l.next_action_date && l.next_action_date <= t).forEach(l => R.push({ k: l.next_action_date < t ? 'bad' : 'warn', t: `Relancer ${l.full_name}`, s: `${l.next_action || 'prospect'} · ${fmtD(l.next_action_date)}`, act: `data-act="edit" data-t="leads" data-id="${l.id}"` }));
  tasks.filter(x => x.due_date && x.due_date <= t).forEach(x => R.push({ k: x.due_date < t ? 'bad' : 'warn', t: x.title, s: `${x.owner || ''} · ${fmtD(x.due_date)}`, act: `data-act="edit" data-t="tasks" data-id="${x.id}"` }));
  const soon = D.eds.filter(e => e.start_date && e.start_date >= t && e.start_date <= in15);
  soon.forEach(e => { const KEY = ['Contrat', 'Passeport', 'Visa', 'Assurance', 'Billets']; R.push({ k: 'warn', t: `${e.skill} commence le ${fmtD(e.start_date)}`, s: `vérifier les dossiers : ${KEY.join(', ')}`, act: `data-act="go" data-href="#edition/${e.id}"` }); });
  D.parts.filter(p => isEnded(D.eds.find(e => e.id === p.edition_id)) && !INACTIVE.includes(p.status) && p.next_followup && p.next_followup <= t).slice(0, 5).forEach(p => R.push({ k: 'mute', t: `Alumni à recontacter : ${p.full_name}`, s: `relance prévue le ${fmtD(p.next_followup)}`, act: `data-act="part" data-id="${p.id}"` }));
  return R;
}

/* ---------- Bilan d'édition ---------- */
function bilanHtml(id, D, journal, incidents) {
  const s = edStats(id, D), e = s.ed, P = postes(id, D);
  const cmp = D.eds.filter(x => !x.hidden && (x.status === 'Terminée' || x.status === 'En cours' || x.id === id)).map(x => { const y = edStats(x.id, D); return { x, y, cpp: y.couts / (y.active.length || 1), avg: y.active.length ? y.attendu / y.active.length : 0 }; });
  const kinds = {}; journal.forEach(j => (kinds[j.kind] ||= []).push(j));
  const cats = {}; s.costs.forEach(x => cats[x.category] = (cats[x.category] || 0) + N(x.amount_eur));
  return `<div class="bilan"><div class="card"><div class="head"><h2>Bilan · ${esc(e.skill)} · ${fmtD(e.start_date)} → ${fmtD(e.end_date)}</h2><button class="btn sm primary noprint" type="button" data-act="print">Imprimer / PDF</button></div>
  <div class="grid g4 inner">${kpi('Participants', `${s.active.length} / ${e.capacity}`, `remplissage ${Math.round(s.active.length / (e.capacity || 12) * 100)} %`)}${kpi('Encaissé', EUR(s.enc), `prix moyen ${EUR(s.active.length ? s.attendu / s.active.length : 0)}`)}${kpi('Dépenses', EUR(s.couts), `${EUR(s.couts / (s.active.length || 1))} par participant`)}${kpi('Gain chacun', EUR(s.now.part), `résultat ${EUR(s.now.res)} · investissement ${EUR(s.now.invest)}`)}</div></div>
  <div class="split"><div class="card"><div class="head"><h2>Comparaison avec les autres éditions</h2></div><div class="table-wrap"><table><thead><tr><th>Édition</th><th class="n">Part.</th><th class="n">Prix moyen</th><th class="n">Encaissé</th><th class="n">Dépenses</th><th class="n">Coût / part.</th><th class="n">Résultat</th><th class="n">Gain chacun</th></tr></thead><tbody>${cmp.map(c => `<tr class="${c.x.id === id ? 'hl' : ''}"><td><b>${esc(c.x.skill)}</b><div class="muted">${fmtD(c.x.start_date)}</div></td><td class="n">${c.y.active.length}</td><td class="n">${EUR(c.avg)}</td><td class="n">${EUR(c.y.enc)}</td><td class="n">${EUR(c.y.couts)}</td><td class="n">${EUR(c.cpp)}</td><td class="n ${c.y.now.res < 0 ? 'neg' : ''}">${EUR(c.y.now.res)}</td><td class="n">${EUR(c.y.now.part)}</td></tr>`).join('')}</tbody></table></div>
  <div class="head"><h2>Coûts : prévu et réel</h2></div><div class="table-wrap"><table><tbody>${P.rows.map(r => `<tr><td>${esc(r.l.category)}</td><td class="n">${EUR(r.plan)}</td><td class="n">${EUR(r.real)}</td><td class="n ${r.real > r.plan ? 'neg' : 'good-t'}">${(r.real - r.plan > 0 ? '+' : '') + EUR(r.real - r.plan)}</td></tr>`).join('') || Object.entries(cats).map(([k, v]) => `<tr><td>${esc(k)}</td><td></td><td class="n">${EUR(v)}</td><td></td></tr>`).join('')}</tbody></table></div></div>
  <div><div class="card"><div class="head"><h2>Ce qu’on retient</h2></div>${['Bonne idée', 'Problème', 'Retour participant', 'Changement', 'Remarque'].filter(k => kinds[k]).map(k => `<h3>${k}s</h3><ul class="steps">${kinds[k].map(j => `<li><b>${esc(j.title)}</b>${j.body ? ' : ' + esc(j.body) : ''}</li>`).join('')}</ul>`).join('') || '<p class="muted">Rien d’écrit dans le journal. Ajoutez remarques, problèmes et retours au fil de l’édition : ils apparaîtront ici.</p>'}</div>
  <div class="card"><div class="head"><h2>Contenu filmé</h2></div>${(kinds['Contenu filmé'] || []).map(j => `<div class="row">${esc(j.title)}${j.link_url ? ` · <a href="${esc(j.link_url)}" target="_blank" rel="noopener">lien</a>` : ''}</div>`).join('') || '<p class="muted">Aucun contenu noté.</p>'}</div>
  <div class="card"><div class="head"><h2>Incidents</h2></div>${incidents.map(x => `<p><b>${esc(x.type)}</b> · ${fmtD(x.occurred_on)} : ${esc(x.decision || x.description)}</p>`).join('') || '<p class="muted">Aucun incident.</p>'}</div></div></div></div>`;
}

/* ---------- Historique & export ---------- */
const TBL = { participants: 'Participant', payments: 'Encaissement', expenses: 'Dépense', edition_budget_lines: 'Poste fixe', transfers: 'Transfert', leads: 'Prospect', editions: 'Édition', incidents: 'Incident', referral_rewards: 'Parrainage', settings: 'Réglage', accounts: 'Compte', payment_schedule: 'Échéance', partners: 'Partenaire', cash_counts: 'Comptage caisse' };
const SKIP = ['created_at', 'updated_at', 'amount_eur', 'eur_final', 'referral_code', 'portal_token'];
const FIELD = { full_name: 'nom', phone: 'téléphone', email: 'e-mail', price_eur: 'prix', status: 'statut', room_type: 'chambre', edition_id: 'bootcamp', amount: 'montant', currency: 'devise', paid_on: 'date', spent_on: 'date', account: 'compte', paid_from: 'compte', paid_by: 'payé par', category: 'catégorie', description: 'description', type: 'type', notes: 'notes', kind: 'type', due_on: 'échéance', amount_eur: 'montant', label: 'libellé', paid: 'payé', founder: 'fondateur', eur_received: 'euros obtenus', reimbursed: 'remboursé', emergency_contact: 'contact d’urgence', instagram: 'Instagram', birth_date: 'naissance', next_followup: 'prochaine relance', last_contact: 'dernier contact', club_status: 'Circle Club', referred_by: 'parrainé par', value: 'valeur', cancelled: 'annulée', match_categories: 'catégories liées', actual_manual: 'réel forcé', due_date: 'à payer avant' };
const fmtV = (k, v) => v == null || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'oui' : 'non') : /(_on|date|followup|contact)$/.test(k) && /^\d{4}-\d{2}-\d{2}/.test(v) ? fmtD(String(v).slice(0, 10)) : /^(price_eur|amount_eur|eur_received|actual_manual)$/.test(k) ? EUR(v) : String(v).length > 60 ? String(v).slice(0, 60) + '…' : String(v);
function auditLabel(a) {
  const r = a.new || a.old || {};
  const name = r.full_name || r.description || r.category || r.title || r.name || r.label || r.key || r.kind || '';
  let ch = '';
  if (a.action === 'UPDATE' && a.old && a.new) ch = Object.keys(a.new).filter(k => !SKIP.includes(k) && JSON.stringify(a.new[k]) !== JSON.stringify(a.old[k])).slice(0, 5).map(k => `${FIELD[k] || k} : ${fmtV(k, a.old[k])} → ${fmtV(k, a.new[k])}`).join(' · ');
  else if (r.amount != null) ch = `${NUM(r.amount)} ${r.currency || ''}${r.paid_on || r.spent_on ? ' · ' + fmtD(r.paid_on || r.spent_on) : ''}`; else if (r.amount_eur != null) ch = `${EUR(r.amount_eur)}${r.due_on ? ' · échéance ' + fmtD(r.due_on) : ''}`;
  return { name, ch };
}
const ACTION_FR = { INSERT: 'a ajouté', UPDATE: 'a modifié', DELETE: 'a supprimé' };
async function auditFor(pid) {
  const [rows, team] = await Promise.all([q(sb.from('audit_log').select('*').or(`row_id.eq.${pid},new->>participant_id.eq.${pid},old->>participant_id.eq.${pid}`).order('at', { ascending: false }).limit(40)), q(sb.from('team_members').select('user_id,display_name'))]);
  const who = id => team.find(m => m.user_id === id)?.display_name || 'Claude (import)';
  return rows.map(a => { const { name, ch } = auditLabel(a); return { at: a.at, who: who(a.user_id), txt: `${who(a.user_id)} ${ACTION_FR[a.action]} ${(TBL[a.tbl] || a.tbl).toLowerCase()}${name && a.tbl !== 'participants' ? ' « ' + name + ' »' : ''}${ch ? ' : ' + ch : ''}` }; });
}
/* Envoi du lien : aperçu clair avant d'envoyer */
async function sendPortalDrawer(pid) {
  const D = await loadData(); const p = D.parts.find(x => x.id === pid) || await q(sb.from('participants').select('*').eq('id', pid).single());
  const s = schedOf(p, D), b = s.b, ed = D.eds.find(e => e.id === p.edition_id);
  const files = await q(sb.from('participant_files').select('doc_type').eq('participant_id', pid)), docs = await q(sb.from('participant_documents').select('doc_type,received').eq('participant_id', pid));
  const got = new Set([...files.map(f => f.doc_type), ...docs.filter(d => d.received).map(d => d.doc_type)]);
  const miss = ['Passeport', 'Billets', 'Contrat', 'Assurance'].filter(k => !got.has(k));
  const hist = await auditFor(pid);
  const first = p.full_name.split(' ')[0];
  const next = s.items.filter(i => i.rest > 1);
  const msg = [`Salut ${first} ! Voici ton espace The Circle (${ed?.skill || ''}, ${fmtD(ed?.start_date)}) :`, portalUrl(p), '', `Payé : ${EUR(b.net)} sur ${EUR(b.due)}${b.reste > 1 ? ` · reste ${EUR(b.reste)}` : ' ✅'}`, ...(next.length ? ['Prochaines échéances :', ...next.slice(0, 4).map(i => `• ${fmtD(i.due_on)} : ${EUR(i.rest)}${i.st === 'En retard' ? ' (en retard)' : ''}`)] : []), ...(miss.length ? ['', `À déposer dans ton espace : ${miss.join(', ')}.`] : []), '', 'Le lien est personnel, ne le partage pas. À très vite à Bali 🌴'].join('\n');
  openDrawer(`${drawerHead('Envoyer son espace à ' + esc(first))}
  <div class="sub-section"><h3>Ce que ${esc(first)} va voir</h3><div class="kv"><span>Payé</span><b>${EUR(b.net)} / ${EUR(b.due)}</b><span>Reste</span><b>${b.reste > 1 ? EUR(b.reste) : 'rien ✅'}</b><span>Échéancier</span><b>${s.has ? `${s.items.length} tranches · ${s.late ? `<span class="neg">${EUR(s.late)} en retard</span>` : 'à jour'}` : '<span class="warn-t">pas encore créé</span>'}</b><span>Documents manquants</span><b>${miss.join(', ') || 'aucun'}</b></div>${s.has ? '' : `<p class="muted">Sans échéancier, il verra seulement le total et le reste. <a href="#" data-act="mksched" data-id="${pid}">Créer l’échéancier d’abord</a></p>`}</div>
  <div class="sub-section"><h3>Dernières modifications de sa fiche</h3><p class="muted">Ce qui a été changé, par qui, avant d’envoyer.</p><div class="hist">${hist.slice(0, 12).map(h => `<div class="hi"><span class="sd">${new Date(h.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${new Date(h.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span><span class="grow">${esc(h.txt)}</span></div>`).join('') || '<div class="muted">Aucune modification depuis la mise en place de l’historique.</div>'}</div></div>
  <div class="sub-section"><h3>Le message</h3><textarea id="portalMsg" rows="11">${esc(msg)}</textarea>
  <div class="inline">${p.phone ? `<a class="btn primary" id="sendWa" target="_blank" rel="noopener" href="${wa(p.phone)}?text=${encodeURIComponent(msg)}">Envoyer sur WhatsApp</a>` : ''}${p.email ? `<a class="btn" id="sendMail" href="mailto:${esc(p.email)}?subject=${encodeURIComponent('Ton espace The Circle Bali')}&body=${encodeURIComponent(msg)}">Envoyer par e-mail</a>` : ''}<button class="btn" type="button" data-act="copymsg">Copier le message</button></div>
  <p class="muted">WhatsApp s’ouvre depuis votre numéro, et l’e-mail depuis la messagerie de cet ordinateur : rien ne part sans que vous appuyiez sur Envoyer.</p></div>`);
  $('portalMsg').oninput = e => { const v = e.target.value; if ($('sendWa')) $('sendWa').href = `${wa(p.phone)}?text=${encodeURIComponent(v)}`; if ($('sendMail')) $('sendMail').href = `mailto:${p.email}?subject=${encodeURIComponent('Ton espace The Circle Bali')}&body=${encodeURIComponent(v)}`; };
}
const historiqueView = async () => {
  setHead('Historique', 'Qui a modifié quoi et quand. Rien ne peut être effacé de cet historique.');
  const [rows, team] = await Promise.all([q(sb.from('audit_log').select('*').order('at', { ascending: false }).limit(300)), q(sb.from('team_members').select('user_id,display_name'))]);
  const who = id => team.find(m => m.user_id === id)?.display_name || (id ? 'Compte inconnu' : 'Claude / système');
  const act = { INSERT: ['Ajout', 'good'], UPDATE: ['Modif.', 'warn'], DELETE: ['Suppression', 'bad'] };
  let day = '';
  return `<div class="card"><div class="feed">${rows.map(a => { const { name, ch } = auditLabel(a); const d = a.at.slice(0, 10); const head = d !== day ? `<div class="pal-g">${new Date(a.at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>` : ''; day = d; return `${head}<div class="feed-item"><div class="fi-date">${new Date(a.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div><div class="grow"><div>${pill(act[a.action][0], act[a.action][1])} <b>${esc(TBL[a.tbl] || a.tbl)}</b> · ${esc(name)}</div>${ch ? `<div class="sub">${esc(ch)}</div>` : ''}</div><div class="fi-amt"><span class="pill mute">${esc(who(a.user_id))}</span></div></div>`; }).join('') || '<div class="empty-state">Rien pour l’instant : chaque ajout, modification ou suppression apparaîtra ici.</div>'}</div></div>`;
};
async function exportAll(fmt) {
  const tables = ['editions', 'participants', 'payments', 'payment_schedule', 'expenses', 'expense_lines', 'edition_budget_lines', 'transfers', 'cash_counts', 'accounts', 'leads', 'partners', 'documents', 'participant_documents', 'participant_files', 'incidents', 'edition_journal', 'referral_rewards', 'club_events', 'tasks', 'decisions', 'settings'];
  toast('Export en cours…');
  const out = {}; for (const t of tables) out[t] = await q(sb.from(t).select('*'));
  const stamp = today();
  const dl = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
  if (fmt === 'json') dl(`the-circle-sauvegarde-${stamp}.json`, JSON.stringify({ exported_at: new Date().toISOString(), tables: out }, null, 1), 'application/json');
  else { const csv = rows => { if (!rows.length) return ''; const cols = Object.keys(rows[0]); const c = v => v == null ? '' : /[;"\n]/.test(String(typeof v === 'object' ? JSON.stringify(v) : v)) ? `"${String(typeof v === 'object' ? JSON.stringify(v) : v).replace(/"/g, '""')}"` : String(v); return '﻿' + cols.join(';') + '\n' + rows.map(r => cols.map(k => c(r[k])).join(';')).join('\n'); }; for (const t of ['participants', 'payments', 'expenses', 'edition_budget_lines', 'transfers']) dl(`${t}-${stamp}.csv`, csv(out[t]), 'text/csv'); }
  toast('Sauvegarde téléchargée');
}

/* ---------- Comptes & circuit de l'argent ---------- */
function comptesHtml(D) {
  const acc = accountBalances(D);
  const zones = { tn: { t: 'Tunisie · dinars', sub: 'Les participants paient en TND. Le dinar ne sort pas : il faut le changer ou le dépenser sur place.', list: [] }, eu: { t: 'Europe · euros', sub: 'Bourso (Nahed), Qonto (société de Nahed), Wise, Revolut, espèces €.', list: [] }, bali: { t: 'Bali · roupies', sub: 'Caisse cash de la villa, alimentée par les retraits.', list: [] } };
  acc.filter(a => a.name !== 'Non renseigné').forEach(a => zones[ZONE(a)].list.push(a)); const nr = acc.find(a => a.name === 'Non renseigné');
  const tr = D.transfers || [];
  const flows = {}; tr.forEach(t => { const fa = S.cache.accounts.find(x => x.name === t.from_account), ta = S.cache.accounts.find(x => x.name === t.to_account); const fz = fa ? ZONE({ cur: fa.currency }) : '?', tz = ta ? ZONE({ cur: ta.currency }) : '?'; const k = fz + '>' + tz; const f = flows[k] ||= { n: 0, out: 0, inn: 0, loss: 0, complete: 0 }; f.n++; if (t.from_amount != null) f.out += toEur(t.from_amount, t.from_currency); if (t.to_amount != null) f.inn += toEur(t.to_amount, t.to_currency); if (t.from_amount != null && t.to_amount != null) { f.loss += toEur(t.from_amount, t.from_currency) - toEur(t.to_amount, t.to_currency); f.complete++; } });
  const fl = (k, label) => { const f = flows[k]; return `<div class="flow"><span>${label}</span>${f ? `<b>${EUR(f.out)}</b><small>${f.n} opération(s) · perte ${EUR(f.loss)}${f.out ? ` (${NUM(f.loss / f.out * 100)} %)` : ''}</small>` : '<small>aucune opération saisie</small>'}</div>`; };
  const totalLoss = sum(Object.values(flows), f => f.loss), feeExp = sum(D.exps.filter(x => x.category === 'Frais de change'), x => x.amount_eur);
  const zoneCard = z => `<div class="card zone"><div class="head"><h2>${z.t}</h2><b class="num">${EUR(sum(z.list, a => a.balEur))}</b></div><p class="muted">${z.sub}</p>${z.list.map(a => `<div class="acct"><div class="grow"><b>${esc(a.name)}</b><div class="sub">${esc(a.holder)} · entrées ${money(a.in, a.cur)} · sorties ${money(a.out, a.cur)}</div></div><div class="r"><b class="num ${a.bal < 0 ? 'neg' : ''}">${money(a.bal, a.cur)}</b>${a.cur !== 'EUR' ? `<small>≈ ${EUR(a.balEur)}</small>` : ''}</div></div>`).join('') || '<div class="empty-state">—</div>'}</div>`;
  const cash = cashStatus(D);
  return `<p class="muted">Soldes calculés à partir de tout ce qui est saisi : encaissements, dépenses, retraits et changes. Un solde négatif veut dire qu’une entrée ou un transfert manque. « Non renseigné » doit tendre vers zéro.</p>
  <div class="circuit">${zoneCard(zones.tn)}<div class="arrows">${fl('tn>eu', 'Change TND → €')}${fl('tn>bali', 'TND → roupies')}</div>${zoneCard(zones.eu)}<div class="arrows">${fl('eu>bali', 'Retraits € → roupies')}${fl('eu>eu', 'Virements entre comptes €')}</div>${zoneCard(zones.bali)}</div>
  ${nr ? `<a class="card warnbox" href="#finances/clarifier"><b>Compte non renseigné : ${EUR(nr.inEur)} d’entrées et ${EUR(nr.outEur)} de sorties sans compte indiqué.</b><span class="muted">Tant que ces lignes n’ont pas de compte, les soldes ci-dessus sont faux. Cliquez pour les compléter dans « À clarifier ».</span></a>` : ''}
  <div class="grid g3">${kpi('Pertes de change calculées', EUR(totalLoss), 'retraits et changes avec les deux montants')}${kpi('Frais de change notés en dépenses', EUR(feeExp), 'anciennes saisies (été 2026)')}${kpi('Argent total, toutes zones', EUR(sum(acc, a => a.balEur)), 'au taux de référence')}</div>
  <div class="split"><div class="card"><div class="head"><h2>Retraits, changes, virements</h2><button class="btn sm primary" type="button" data-act="add" data-t="transfers" data-def="trdef">+ Ajouter</button></div>
  <div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>De → vers</th><th class="n">Sorti</th><th class="n">Arrivé</th><th class="n">Taux obtenu</th><th class="n">Perte</th></tr></thead><tbody>${tr.map(t => { const ok = t.from_amount != null && t.to_amount != null, loss = ok ? toEur(t.from_amount, t.from_currency) - toEur(t.to_amount, t.to_currency) : null; return `<tr class="click" data-act="edit" data-t="transfers" data-id="${t.id}"><td>${fmtD(t.done_on)}</td><td>${esc(t.kind)}</td><td>${esc(t.from_account || '?')} → ${esc(t.to_account || '?')}</td><td class="n">${t.from_amount != null ? money(t.from_amount, t.from_currency) : pill('à compléter', 'bad')}</td><td class="n">${t.to_amount != null ? money(t.to_amount, t.to_currency) : pill('à compléter', 'bad')}</td><td class="n">${ok && t.from_currency !== t.to_currency ? NUM(t.to_amount / t.from_amount) : ''}</td><td class="n">${ok ? EUR(loss) : ''}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty-state">Aucun retrait ou change saisi. Exemple : « retrait 2M bourso 101€ » dans la saisie rapide.</td></tr>'}</tbody></table></div>
  <p class="muted">Taux de référence : ${NUM(fx())} TND et ${IDR(rate('IDR'))} pour 1 €. La perte = valeur sortie − valeur arrivée à ces taux (frais du distributeur, commission, mauvais taux).</p></div>
  <div class="card"><div class="head"><h2>Caisses cash</h2></div>${cash.map(c => `<div class="acct"><div class="grow"><b>${esc(c.a.name)}</b><div class="sub">${c.c ? `Compté ${money(c.c.amount, c.cur)} le ${fmtD(c.c.counted_on)} · attendu ${money(c.expectedAt, c.cur)} · ${Math.abs(c.ecart) < rate(c.cur) * 2 ? '<span class="good-t">juste</span>' : `<span class="warn-t">écart ${money(c.ecart, c.cur)}</span>`}` : 'Jamais comptée'}</div></div><div class="r"><b class="num">${money(c.now, c.cur)}</b><small>devrait être dans la caisse</small><button class="btn sm" type="button" data-act="add" data-t="cash_counts" data-def="${J({ account: c.a.name, counted_on: today() })}">Compter</button></div></div>`).join('')}<p class="muted">Une fois par semaine, comptez le cash et notez-le : l’écart montre ce qui n’a pas été noté.</p></div></div>`;
}

/* ---------- Import d'un relevé bancaire (CSV) ---------- */
function parseCsv(text) {
  const first = text.split(/\r?\n/)[0] || ''; const sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], cell = '', inQ = false;
  for (let i = 0; i < text.length; i++) { const ch = text[i]; if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += ch; } else if (ch === '"') inQ = true; else if (ch === sep) { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += ch; }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}
const numFr = v => { if (v == null) return NaN; const s = String(v).replace(/[\s €]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'); return s === '' ? NaN : Number(s); };
const dateFr = v => { v = String(v || '').trim(); let m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/); if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; m = v.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : null; };
let IMP = [];
function importDrawer() {
  openDrawer(`${drawerHead('Importer un relevé bancaire')}
  <p class="muted">Dans l’appli Boursorama (ou Wise, Revolut, Qonto) : téléchargez les opérations du mois au format CSV, puis déposez le fichier ici. Les opérations déjà saisies sont reconnues et décochées. Les retraits deviennent des retraits vers la caisse Bali.</p>
  <div class="form"><label class="field">Compte<select id="impAcc">${S.cache.accounts.map(a => `<option ${a.name === 'Boursorama' ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></label>
  <label class="field">Bootcamp<select id="impEd">${edOpts(S.ctxEdition || currentEd(), 'Sans édition')}</select></label>
  <label class="field">Fichier CSV<input type="file" id="impFile" accept=".csv,text/csv"></label></div><div id="impPrev"></div>`);
}
async function importPreview(file) {
  const buf = await file.arrayBuffer(); let text = new TextDecoder('utf-8').decode(buf); if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf);
  const rows = parseCsv(text); if (rows.length < 2) { $('impPrev').innerHTML = '<div class="msg err">Fichier vide ou illisible.</div>'; return; }
  const h = rows[0].map(x => x.toLowerCase().trim());
  const ci = re => h.findIndex(x => re.test(x));
  let iD = ci(/date ?op|dateop|^date$|date/), iL = ci(/libell|label|description|wording|d[eé]tail|merchant|payee/), iA = ci(/^montant$|amount|^montant/), iDeb = ci(/d[eé]bit/), iCre = ci(/cr[eé]dit/);
  if (iL < 0) iL = 2;
  const acc = $('impAcc').value, D = await loadData();
  IMP = rows.slice(1).map((r, n) => {
    const date = dateFr(r[iD]); let amt = iA >= 0 ? numFr(r[iA]) : (numFr(r[iCre]) || 0) - (numFr(r[iDeb]) || 0);
    const label = (r[iL] || '').replace(/\s+/g, ' ').trim();
    const retrait = /retrait|\bdab\b|\batm\b|cash withdrawal|withdraw/i.test(label);
    const dup = D.exps.some(x => x.paid_from === acc && x.spent_on === date && Math.abs(N(x.amount_eur) + amt) < 0.01) || (D.transfers || []).some(t => t.from_account === acc && t.done_on === date && Math.abs(N(t.from_amount) + amt) < 0.01);
    const cat = (CAT_KW.find(([, re]) => re.test(label)) || [null])[0];
    return { n, date, label, amt, retrait, dup, cat, take: amt < 0 && !dup };
  }).filter(x => x.date && !isNaN(x.amt));
  const neg = IMP.filter(x => x.amt < 0), pos = IMP.filter(x => x.amt > 0);
  $('impPrev').innerHTML = `<div class="head"><h3>${neg.length} sorties · ${pos.length} entrées</h3></div>
  <div class="table-wrap"><table><tbody>${neg.map(x => `<tr><td><input type="checkbox" data-imp="${x.n}" ${x.take ? 'checked' : ''}></td><td>${fmtD(x.date)}</td><td>${esc(x.label)}<div class="muted">${x.dup ? 'déjà saisie' : x.retrait ? 'retrait → caisse Bali' : esc(x.cat || 'à clarifier')}</div></td><td class="n">${EUR(-x.amt)}</td></tr>`).join('')}</tbody></table></div>
  ${pos.length ? `<p class="muted">Entrées non importées (à saisir comme encaissements si ce sont des participants) : ${pos.map(x => `${fmtD(x.date)} ${esc(x.label)} ${EUR(x.amt)}`).join(' · ')}</p>` : ''}
  <button class="btn primary" type="button" data-act="impgo">Importer les lignes cochées</button>`;
}
async function importGo() {
  const acc = $('impAcc').value, ed = $('impEd').value || null;
  const sel = IMP.filter(x => document.querySelector(`[data-imp="${x.n}"]`)?.checked);
  const exps = sel.filter(x => !x.retrait).map(x => ({ edition_id: ed, spent_on: x.date, description: x.label.slice(0, 120), category: x.cat || 'À clarifier', amount: -x.amt, currency: 'EUR', fx_rate: 1, type: x.cat ? (x.cat === 'Publicité' ? 'Marketing' : 'Coût édition') : 'À clarifier', paid_from: acc, paid_by: 'Caisse Circle', notes: 'Import relevé ' + acc }));
  const trs = sel.filter(x => x.retrait).map(x => ({ kind: 'Retrait espèces', done_on: x.date, edition_id: ed, from_account: acc, from_amount: -x.amt, from_currency: 'EUR', to_account: 'Caisse Bali (IDR)', to_amount: null, to_currency: 'IDR', notes: `Import relevé ${acc} : ${x.label}. Indiquez les roupies reçues.` }));
  if (exps.length) await q(sb.from('expenses').insert(exps));
  if (trs.length) await q(sb.from('transfers').insert(trs));
  closeDrawer(); toast(`${exps.length} dépense(s) et ${trs.length} retrait(s) importés`); route();
}

/* ---------- Vues ---------- */
const V = {};
V.historique = () => historiqueView();

V.accueil = async () => {
  setHead(`Bonjour ${S.member?.display_name || ''}`, new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  const D = await loadData();
  const [tasks, leads] = await Promise.all([q(sb.from('tasks').select('*').eq('done', false).order('due_date', { nullsFirst: false })), q(sb.from('leads').select('*').not('status', 'in', '("Payé","Perdu")'))]);
  const t = today(), eds = D.eds.filter(e => !e.hidden);
  const curId = currentEd(), cur = curId ? edStats(curId, D) : null;
  const rest = sum(eds, e => edStats(e.id, D).reste);
  const lateLeads = leads.filter(l => l.next_action_date && l.next_action_date < t), lateTasks = tasks.filter(x => x.due_date && x.due_date < t);
  const nextSale = eds.filter(e => e.start_date > t).sort((a, b) => a.start_date.localeCompare(b.start_date));
  const clar = clarify(D);
  const RAP = rappels(D, leads, tasks);
  return `<div class="card rappels"><div class="head"><h2>À faire aujourd’hui</h2>${pill(RAP.length ? `${RAP.length} rappel(s)` : 'rien d’urgent', RAP.some(r => r.k === 'bad') ? 'bad' : RAP.length ? 'warn' : 'good')}</div>${RAP.length ? `<div class="rlist">${RAP.slice(0, 12).map(r => `<button type="button" class="rp ${r.k}" ${r.act}><span class="stripe ${r.k}"></span><span class="grow"><b>${esc(r.t)}</b><small>${esc(r.s)}</small></span></button>`).join('')}</div>${RAP.length > 12 ? `<p class="muted">+ ${RAP.length - 12} autres</p>` : ''}` : '<p class="muted">Aucune tranche en retard, aucun paiement urgent, aucune relance due. 🌴</p>'}</div>
  <div class="grid g4">
    ${cur ? kpi(cur.ed.status === 'En cours' ? 'Édition en cours' : 'Prochaine édition', esc(cur.ed.skill), `${fmtD(cur.ed.start_date)} → ${fmtD(cur.ed.end_date)}`) : kpi('Édition', '—', 'Aucune')}
    ${kpi('Reste à encaisser', EUR(rest), 'Toutes éditions')}
    ${kpi('Prospects ouverts', leads.length, `${lateLeads.length} relance(s) en retard`)}
    <a class="card kpi click" href="#finances/clarifier"><span>À clarifier</span><b class="num">${sum(clar.filter(g => g.kind !== 'mute'), g => g.items.length)}</b><small>points importants à régler (+ ${sum(clar.filter(g => g.kind === 'mute'), g => g.items.length)} mineurs)</small></a>
  </div>
  ${cur ? `<div class="card"><div class="head"><h2>${esc(cur.ed.skill)} · ${esc(cur.ed.id)}</h2><a class="more" href="#edition/${cur.ed.id}">Ouvrir la page de l’édition</a></div>
    <div class="grid g4 inner">${kpi('Participants', `${cur.active.length} / ${cur.ed.capacity}`, '')}${kpi('Encaissé', EUR(cur.enc), `sur ${EUR(cur.attendu)} attendus`)}${kpi('Dépenses', EUR(cur.couts), '')}${kpi('Gain prévu chacun', EUR(cur.prev.part), 'si tout est payé')}</div>
    ${pbar(cur.attendu ? cur.enc / cur.attendu : 0, `${Math.round(cur.attendu ? cur.enc / cur.attendu * 100 : 0)} % encaissé`)}</div>` : ''}
  <div class="split">
    <div class="card"><div class="head"><h2>Tâches</h2><span class="pill ${lateTasks.length ? 'bad' : 'good'}">${lateTasks.length} en retard</span></div>
      <div class="list">${tasks.map(x => `<div class="row"><span class="stripe ${x.due_date && x.due_date < t ? 'bad' : x.due_date && daysTo(x.due_date) <= 3 ? 'warn' : ''}"></span><input type="checkbox" data-act="done" data-id="${x.id}" aria-label="Marquer comme faite"><div class="click grow" data-act="edit" data-t="tasks" data-id="${x.id}"><div>${esc(x.title)}</div><div class="sub">${esc(x.owner || '')}${x.due_date ? ' · ' + fmtD(x.due_date) : ''}${x.edition_id ? ' · ' + esc(x.edition_id) : ''}</div></div></div>`).join('') || '<div class="empty-state">Aucune tâche ouverte</div>'}</div></div>
    <div class="card"><div class="head"><h2>Relances en retard</h2><a class="more" href="#crm">CRM</a></div>
      <div class="list">${lateLeads.map(l => `<button type="button" class="row click" data-act="edit" data-t="leads" data-id="${l.id}"><span class="stripe bad"></span><div><div>${esc(l.full_name)}</div><div class="sub">${esc(l.next_action || '')} · ${fmtD(l.next_action_date)}</div></div></button>`).join('') || '<div class="empty-state">Aucune</div>'}</div>
      <div class="head" style="margin-top:10px"><h2>Ventes à venir</h2></div>
      <div class="list">${nextSale.map(e => { const s = edStats(e.id, D); return `<a class="row click" href="#edition/${e.id}"><div class="grow"><div>${esc(e.skill)} · ${fmtD(e.start_date)}</div>${pbar(s.active.length / (e.capacity || 12), `${s.active.length} / ${e.capacity} places`)}</div></a>`; }).join('') || '<div class="empty-state">Aucune</div>'}</div></div>
  </div>
  <div class="card"><div class="head"><h2>Calendrier des éditions</h2></div>${timeline(eds)}</div>`;
};
function timeline(eds) {
  eds = eds.filter(e => e.start_date && e.end_date);
  if (!eds.length) return '<div class="empty-state">Aucune édition datée</div>';
  const s0 = new Date(Math.min(...eds.map(e => +new Date(e.start_date)), Date.now())); s0.setDate(1);
  const s1 = new Date(Math.max(...eds.map(e => +new Date(e.end_date)))); s1.setMonth(s1.getMonth() + 1, 1);
  const W = 900, H = 40 + eds.length * 30, x = d => 40 + (new Date(d) - s0) / (s1 - s0) * (W - 60);
  let months = '', d = new Date(s0);
  while (d < s1) { months += `<line x1="${x(d)}" x2="${x(d)}" y1="22" y2="${H}" stroke="var(--line)"/><text x="${x(d) + 4}" y="16" font-size="11" fill="var(--muted)">${d.toLocaleDateString('fr-FR', { month: 'short' })}</text>`; d.setMonth(d.getMonth() + 1); }
  const bars = eds.map((e, i) => { const y = 32 + i * 30, c = e.status === 'Terminée' ? 'var(--muted)' : 'var(--accent)'; return `<a href="#edition/${e.id}"><rect x="${x(e.start_date)}" y="${y}" width="${Math.max(x(e.end_date) - x(e.start_date), 6)}" height="18" rx="9" fill="${c}" opacity=".85"/><text x="${x(e.end_date) + 8}" y="${y + 13}" font-size="12" fill="var(--ink)">${esc(e.skill)}</text></a>`; }).join('');
  const t = x(new Date());
  return `<div class="table-wrap"><svg class="chart" viewBox="0 0 ${W + 160} ${H + 8}" role="img" aria-label="Calendrier des éditions">${months}${bars}<line x1="${t}" x2="${t}" y1="22" y2="${H}" stroke="var(--bad)" stroke-dasharray="3 3"/><text x="${t + 4}" y="${H + 6}" font-size="11" fill="var(--bad)">aujourd'hui</text></svg></div>`;
}

/* CRM */
let crmEdition = '';
V.crm = async () => {
  await ensureLookups();
  setHead('CRM · prospects', 'Faites glisser une carte pour changer son statut. Le bouton + ajoute une personne venue d’un formulaire ou d’une pub.', `<button class="btn primary" type="button" data-act="add" data-t="leads" data-def="${J({ status: 'Nouveau', source: 'Formulaire', edition_id: crmEdition || null })}">+ Nouvelle personne</button>`);
  const leads = await load('leads');
  const list = crmEdition ? leads.filter(l => l.edition_id === crmEdition) : leads, t = today();
  const srcL = s => (SOURCES.find(x => x[0] === s) || [s, s])[1];
  return `<div class="toolbar"><label for="crmEd" class="muted">Édition</label><select id="crmEd" data-var="crmEdition">${edOpts(crmEdition)}</select></div>
  <div class="board">${LEAD_STATUSES.map(s => { const ls = list.filter(l => l.status === s); return `<div class="col" data-status="${s}"><h3>${s}<span>${ls.length}</span></h3>${ls.map(l => `<button type="button" class="lead ${l.next_action_date && l.next_action_date < t ? 'late' : ''}" draggable="true" data-lead="${l.id}" data-act="edit" data-t="leads" data-id="${l.id}"><b>${esc(l.full_name)}</b><span class="sub">${esc(l.edition_id || 'Sans édition')}${l.source ? ' · ' + esc(srcL(l.source)) : ''}</span><span class="sub">${esc(l.next_action || '')}${l.next_action_date ? ' · ' + fmtD(l.next_action_date) : ''}</span></button>`).join('') || '<span class="empty">Vide</span>'}</div>`; }).join('')}</div>`;
};

/* Annuaire */
let annQ = '';
V.annuaire = async () => {
  setHead('Annuaire', 'Tous les noms, rangés par catégorie. Cliquez pour ouvrir la fiche.');
  const D = await loadData();
  const leads = await load('leads');
  const team = await q(sb.from('team_members').select('display_name,role'));
  const edOf = id => D.eds.find(e => e.id === id);
  const P = D.parts;
  const cats = [
    ['Participants en cours et à venir', 'participants', { status: 'Confirmé', pay_currency: 'TND', edition_id: currentEd() }, P.filter(p => !INACTIVE.includes(p.status) && !isEnded(edOf(p.edition_id))).map(p => ({ n: p.full_name, s: `${edOf(p.edition_id)?.skill || ''} · ${p.edition_id}`, ph: p.phone, em: p.email, act: `data-act="part" data-id="${p.id}"` }))],
    ['Alumni', 'participants', { status: 'Confirmé', pay_currency: 'TND', edition_id: D.eds.find(isEnded)?.id }, P.filter(p => !INACTIVE.includes(p.status) && isEnded(edOf(p.edition_id))).map(p => ({ n: p.full_name, s: `${edOf(p.edition_id)?.skill || ''} · ${p.edition_id}`, ph: p.phone, em: p.email, act: `data-act="part" data-id="${p.id}"` }))],
    ['Prospects', 'leads', { status: 'Nouveau', source: 'Formulaire' }, leads.filter(l => !['Payé', 'Perdu'].includes(l.status)).map(l => ({ n: l.full_name, s: `${l.status}${l.edition_id ? ' · ' + l.edition_id : ''}`, ph: l.phone, em: l.email, act: `data-act="edit" data-t="leads" data-id="${l.id}"` }))],
    ['Coachs', 'partners', { type: 'Coach' }, S.cache.partners.filter(p => p.type === 'Coach' && p.status !== 'Retiré').map(p => ({ n: p.name, s: p.role || 'Coach', ph: p.contact, act: `data-act="edit" data-t="partners" data-id="${p.id}"` }))],
    ['Partenaires et prestataires', 'partners', { type: 'Prestataire' }, S.cache.partners.filter(p => p.type !== 'Coach' && p.status !== 'Retiré').map(p => ({ n: p.name, s: `${p.type}${p.role ? ' · ' + p.role : ''}`, ph: p.contact, act: `data-act="edit" data-t="partners" data-id="${p.id}"` }))],
    ['Équipe', null, null, team.map(m => ({ n: m.display_name, s: m.role || '' }))],
    ['Exclus, annulés, perdus', null, null, [...P.filter(p => INACTIVE.includes(p.status)).map(p => ({ n: p.full_name, s: `${p.status} · ${p.edition_id}`, ph: p.phone, act: `data-act="part" data-id="${p.id}"` })), ...leads.filter(l => l.status === 'Perdu').map(l => ({ n: l.full_name, s: `Prospect perdu${l.lost_reason ? ' · ' + l.lost_reason : ''}`, ph: l.phone, act: `data-act="edit" data-t="leads" data-id="${l.id}"` }))]]
  ];
  const qq = annQ.toLowerCase();
  const match = x => !qq || `${x.n} ${x.s} ${x.ph || ''} ${x.em || ''}`.toLowerCase().includes(qq);
  return `<div class="toolbar"><input type="search" id="annQ" placeholder="Rechercher un nom, un numéro, un e-mail…" value="${esc(annQ)}" class="search"></div>
  <div class="grid g2">${cats.map(([title, tbl, def, items]) => { const it = items.filter(match).sort((a, b) => a.n.localeCompare(b.n)); return `<div class="card"><div class="head"><h2>${title}</h2>${pill(it.length, 'mute')}${tbl ? `<button class="iconbtn add" type="button" data-act="add" data-t="${tbl}" data-def="${J(def)}" title="Ajouter" aria-label="Ajouter dans ${esc(title)}">${ICON.plus}</button>` : ''}</div><div class="list">${it.map(x => `<div class="row person"><div class="avatar">${esc((x.n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase())}</div><div class="grow ${x.act ? 'click' : ''}" ${x.act || ''}><div>${esc(x.n)}</div><div class="sub">${esc(x.s)}</div></div>${x.ph && /\d{6,}/.test(x.ph) ? `<a class="btn sm" href="${wa(x.ph)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}${x.em ? `<a class="btn sm" href="mailto:${esc(x.em)}">E-mail</a>` : ''}</div>`).join('') || '<div class="empty-state">Personne</div>'}</div></div>`; }).join('')}</div>`;
};

/* Éditions */
V.editions = async () => {
  setHead('Éditions', 'Cliquez sur une édition pour ouvrir sa page complète.', `<button class="btn primary" type="button" data-act="add" data-t="editions" data-def="${J({ status: 'Projet', capacity: 12 })}">Nouvelle édition</button>`);
  const D = await loadData();
  return `<div class="grid g2">${D.eds.filter(e => !e.hidden).map(e => { const s = edStats(e.id, D); return `<a class="card ed" href="#edition/${e.id}">
    <div class="head"><h2>${esc(e.skill)}</h2>${pill(e.status, statusClass(e.status))}</div>
    <span class="dates">${fmtD(e.start_date)} → ${fmtD(e.end_date)} · ${esc(e.id)}</span>
    ${pbar(s.active.length / (e.capacity || 12), `${s.active.length} / ${e.capacity} participants`)}
    ${pbar(s.attendu ? s.enc / s.attendu : 0, `${EUR(s.enc)} encaissés sur ${EUR(s.attendu)}`)}
    <div class="kv"><span>Dépenses</span><b class="num">${EUR(s.couts)}</b><span>Résultat actuel</span><b class="num">${EUR(s.now.res)}</b><span>Gain prévu chacun</span><b class="num">${EUR(s.prev.part)}</b></div>
  </a>`; }).join('')}</div>`;
};

let edTab = 'resume';
V.edition = async id => {
  const D = await loadData();
  const s = edStats(id, D), e = s.ed; S.ctxEdition = id;
  const [journal, incidents] = await Promise.all([q(sb.from('edition_journal').select('*').eq('edition_id', id).order('happened_on', { ascending: false })), q(sb.from('incidents').select('*').eq('edition_id', id).order('occurred_on', { ascending: false }))]);
  const coach = S.cache.partners.find(p => p.id === e.coach_id);
  setHead(`${e.skill} · ${fmtD(e.start_date)}`, `${fmtD(e.start_date)} → ${fmtD(e.end_date)}${coach ? ' · coach : ' + coach.name : ''} · ${e.status}`, `<button class="btn" type="button" data-act="edit" data-t="editions" data-id="${id}">Modifier l’édition</button>`, `<a href="#editions">Éditions</a> / ${esc(e.id)}`);
  const tabs = [['resume', 'Résumé'], ['participants', `Participants (${s.parts.length})`], ['entrees', `Entrées (${s.pays.length})`], ['depenses', `Dépenses (${s.exps.length})`], ['journal', `Journal (${journal.length})`], ['incidents', `Incidents (${incidents.length})`], ['bilan', 'Bilan'], ['budget', 'Coûts fixes']];
  const pn = pid => D.parts.find(p => p.id === pid)?.full_name || '—';
  let body = '';
  if (edTab === 'resume') {
    const cats = {}; s.costs.forEach(x => cats[x.category] = (cats[x.category] || 0) + N(x.amount_eur));
    body = `<div class="grid g4">${kpi('Participants', `${s.active.length} / ${e.capacity}`, s.parts.length - s.active.length ? `${s.parts.length - s.active.length} absent(s) : exclu, annulé ou reporté` : '')}${kpi('Encaissé', EUR(s.enc), `sur ${EUR(s.attendu)} attendus · reste ${EUR(s.reste)}`)}${kpi('Dépenses', EUR(s.couts), `${EUR(s.couts / (s.active.length || 1))} par participant${s.budget ? ` · budget ${EUR(s.budget)}` : ''}`)}${kpi('Gain chacun aujourd’hui', EUR(s.now.part), `prévu : ${EUR(s.prev.part)}`)}</div>
    <div class="split"><div>${gainTable(s)}</div><div class="card"><div class="head"><h2>Encaissement par participant</h2></div>${payBars(s.parts)}
    <div class="head" style="margin-top:12px"><h2>Dépenses par catégorie</h2></div>${catChart(cats)}
    <div class="head" style="margin-top:12px"><h2>Dernières notes</h2><button class="btn sm" type="button" data-act="tab" data-v="journal">Tout le journal</button></div>${journalFeed(journal.slice(0, 4))}</div></div>`;
  }
  if (edTab === 'participants') body = `<div class="card"><div class="head"><h2>Participants</h2><button class="btn primary sm" type="button" data-act="add" data-t="participants" data-def="${J({ edition_id: id, status: 'Confirmé', pay_currency: 'TND' })}">+ Participant</button></div>${await partTable(s.parts)}</div>`;
  if (edTab === 'entrees') body = `${echeancesCard(D, id)}<div class="card"><div class="head"><h2>Ce que chacun doit payer</h2></div>${payBars(s.parts)}</div><div class="card"><div class="head"><h2>Tous les encaissements en détail</h2><button class="btn primary sm" type="button" data-act="add" data-t="payments" data-def="paydef">+ Encaissement</button></div>${payTable(s.pays, pn)}</div>`;
  if (edTab === 'depenses') body = `${quickBar(id)}${budgetVsReal(s, D)}<div class="split"><div class="card"><div class="head"><h2>Journal des dépenses</h2><button class="btn primary sm" type="button" data-act="add" data-t="expenses" data-def="expdef">+ Dépense détaillée</button></div>${expFeed(s.exps, D)}</div><div>${owesBox(D, id)}${envelope(s)}</div></div>`;
  if (edTab === 'journal') body = `<div class="card"><div class="head"><h2>Journal de l’édition</h2><button class="btn primary sm" type="button" data-act="add" data-t="edition_journal" data-def="jdef">+ Note</button></div><p class="muted">Remarques, problèmes, contenu filmé (avec le lien Drive), changements, retours des participants.</p>${journalFeed(journal)}</div>`;
  if (edTab === 'bilan') body = bilanHtml(id, D, journal, incidents);
  if (edTab === 'incidents') body = `<div class="card"><div class="head"><h2>Incidents</h2><button class="btn primary sm" type="button" data-act="add" data-t="incidents" data-def="${J({ edition_id: id, occurred_on: today(), status: 'Ouvert' })}">+ Incident</button></div><div class="list">${incidents.map(x => `<button type="button" class="row click" data-act="edit" data-t="incidents" data-id="${x.id}"><span class="stripe ${x.status === 'Clos' ? '' : 'bad'}"></span><div class="grow"><div><b>${esc(x.type)}</b> · ${fmtD(x.occurred_on)} ${pill(x.status, x.status === 'Clos' ? 'good' : 'warn')}</div><div class="sub">${esc(x.description)}</div>${x.decision ? `<div class="sub">Décision : ${esc(x.decision)}</div>` : ''}</div></button>`).join('') || '<div class="empty-state">Aucun incident</div>'}</div></div>`;
  if (edTab === 'budget') body = budgetVsReal(s, D);

  return `<div class="tabs page-tabs"><label class="tabctx sel"><span class="dotc ${statusClass(e.status)}"></span><select data-go="edition" aria-label="Changer de bootcamp">${D.eds.filter(x => !x.hidden).map(x => `<option value="${x.id}" ${x.id === id ? 'selected' : ''}>${esc(x.skill)} · ${fmtD(x.start_date)}</option>`).join('')}</select></label>${tabs.map(([k, l]) => `<button type="button" data-act="tab" data-v="${k}" class="${edTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
};
function payBars(parts) {
  if (!parts.length) return '<div class="empty-state">Aucun participant</div>';
  return `<div class="paybars">${parts.sort((a, b) => a.pct - b.pct).map(b => `<button type="button" class="paybar click" data-act="part" data-id="${b.p.id}"><div class="pb-head"><b>${esc(b.p.full_name)}</b>${INACTIVE.includes(b.p.status) ? pill(b.p.status, 'bad') : b.p.status === 'Reporté' ? pill('Reporté', 'warn') : ''}<span class="num">${EUR(b.net)} / ${EUR(b.due)}</span></div>${pbar(b.pct)}<div class="pb-foot">${b.p.status === 'Reporté' ? `<span class="warn-t">${EUR(b.net)} gardés pour une prochaine édition</span>` : b.reste > 1 ? `<span class="warn-t">Manque ${EUR(b.reste)}</span>` : '<span class="good-t">Soldé</span>'}${b.refund ? ` · remboursé ${EUR(b.refund)}` : ''} · ${b.pays.length} versement(s)</div></button>`).join('')}</div>`;
}
function payTable(pays, pn) {
  return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Participant</th><th>Type</th><th>Compte</th><th class="n">Montant</th><th class="n">En euros</th><th></th></tr></thead><tbody>${pays.map(x => `<tr class="click" data-act="edit" data-t="payments" data-id="${x.id}"><td>${fmtD(x.paid_on)}</td><td>${esc(pn(x.participant_id))}</td><td>${x.kind === 'Remboursement' ? pill('Remboursement', 'bad') : esc(x.method || 'Paiement')}</td><td>${esc(x.account || '—')}</td><td class="n">${NUM(x.amount)} ${x.currency}</td><td class="n">${EUR(x.eur_final)}${x.currency !== 'EUR' ? `<div class="muted">${x.eur_received != null ? 'réel' : 'estimé'}</div>` : ''}</td><td>${x.proof_path ? pill('Preuve', 'good') : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="empty-state">Aucun encaissement</td></tr>'}</tbody></table></div>`;
}
function catChart(cats) {
  const ent = Object.entries(cats).sort((a, b) => b[1] - a[1]), max = ent[0]?.[1] || 1;
  if (!ent.length) return '<div class="empty-state">Aucune dépense</div>';
  return `<div class="hbars">${ent.map(([k, v]) => `<div class="hb"><span>${esc(k)}</span><div><i style="width:${v / max * 100}%" class="${k === 'À clarifier' ? 'bad' : ''}"></i></div><b class="num">${EUR(v)}</b></div>`).join('')}</div>`;
}
function expFeed(exps, D) {
  if (!exps.length) return '<div class="empty-state">Aucune dépense</div>';
  return `<div class="feed">${exps.map(x => { const lines = D.lines.filter(l => l.expense_id === x.id), det = sum(lines, l => l.amount_eur), rest = N(x.amount_eur) - det; return `<button type="button" class="feed-item click" data-act="edit" data-t="expenses" data-id="${x.id}">
    <div class="fi-date">${x.spent_on ? new Date(x.spent_on + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'sans date'}</div>
    <div class="grow"><div><b>${esc(x.description || x.category)}</b> ${x.type === 'Frais fondateurs' ? pill('Avance sur gain' + (x.founder ? ' · ' + x.founder : ''), 'warn') : x.type === 'À clarifier' ? pill('À clarifier', 'bad') : pill(x.category, 'mute')}</div>
    <div class="sub">${x.paid_from ? 'Compte : ' + esc(x.paid_from) : 'Compte non renseigné'}${x.paid_by && x.paid_by !== 'Caisse Circle' ? ` · avancé par ${esc(x.paid_by)}${x.reimbursed ? ' (remboursé)' : ' (à rembourser)'}` : ''}${x.notes ? ' · ' + esc(x.notes) : ''}</div>
    ${lines.length ? `<div class="sub">Réparti : ${lines.map(l => `${esc(l.label)} ${EUR(l.amount_eur)}`).join(' · ')}${rest > 1 ? ` · <span class="warn-t">${EUR(rest)} non détaillés</span>` : ' ✓'}</div>` : (x.type === 'À clarifier' || x.category === 'À clarifier') ? '<div class="sub warn-t">Cliquez pour répartir ce montant (ads, courses, essence…)</div>' : ''}</div>
    <div class="fi-amt"><b class="num">${EUR(x.amount_eur)}</b>${x.currency !== 'EUR' ? `<div class="muted">${NUM(x.amount)} ${x.currency}</div>` : ''}${x.receipt_path ? pill('Justif.', 'good') : pill('Sans justif.', 'mute')}</div></button>`; }).join('')}</div>`;
}
function journalFeed(items) {
  if (!items.length) return '<div class="empty-state">Rien d’écrit pour l’instant</div>';
  const cls = { 'Problème': 'bad', 'Contenu filmé': 'good', 'Changement': 'warn', 'Bonne idée': 'good' };
  return `<div class="feed">${items.map(j => `<button type="button" class="feed-item click" data-act="edit" data-t="edition_journal" data-id="${j.id}"><div class="fi-date">${j.happened_on ? new Date(j.happened_on + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}</div><div class="grow"><div>${pill(j.kind, cls[j.kind] || 'mute')} <b>${esc(j.title)}</b></div>${j.body ? `<div class="sub">${esc(j.body)}</div>` : ''}<div class="sub">${j.author ? esc(j.author) : ''}${j.link_url ? ' · lien joint' : ''}${j.file_path ? ' · pièce jointe' : ''}</div></div></button>`).join('')}</div>`;
}
async function partTable(parts) {
  const ids = parts.map(b => b.p.id);
  const files = ids.length ? await q(sb.from('participant_files').select('participant_id,doc_type').in('participant_id', ids)) : [];
  const docs = ids.length ? await q(sb.from('participant_documents').select('participant_id,doc_type,received').in('participant_id', ids)) : [];
  const got = {}; files.forEach(f => (got[f.participant_id] ||= new Set()).add(f.doc_type)); docs.forEach(d => { if (d.received) (got[d.participant_id] ||= new Set()).add(d.doc_type); });
  const KEY = ['Contrat', 'Passeport', 'Code de conduite', 'Visa', 'Assurance', 'Contact urgence'];
  return `<div class="table-wrap"><table><thead><tr><th>Participant</th><th>Chambre</th><th style="min-width:180px">Paiement</th><th>Dossier</th><th>Contact</th></tr></thead><tbody>${parts.map(b => `<tr class="click" data-act="part" data-id="${b.p.id}"><td><b>${esc(b.p.full_name)}</b>${b.p.status !== 'Confirmé' ? ' ' + pill(b.p.status, 'bad') : ''}</td><td>${esc(b.p.room_type || '')}</td><td>${pbar(b.pct, `${EUR(b.net)} / ${EUR(b.due)}`)}</td><td><div class="docs">${KEY.map(k => `<span class="doc ${got[b.p.id]?.has(k) ? 'ok' : ''}">${k}</span>`).join('')}</div></td><td class="muted">${esc(b.p.phone || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="empty-state">Aucun participant</td></tr>'}</tbody></table></div>`;
}

/* Participants, regroupés par bootcamp */
let partMode = 'actifs';
V.participants = async () => {
  setHead('Participants', 'Séparés par bootcamp. Cliquez sur un nom pour sa fiche complète, ses fichiers et ses paiements.', `<button class="btn primary" type="button" data-act="add" data-t="participants" data-def="${J({ status: 'Confirmé', pay_currency: 'TND', edition_id: currentEd() })}">+ Participant</button>`);
  const D = await loadData();
  const eds = D.eds.filter(e => !e.hidden && (partMode === 'tous' || !isEnded(e)));
  const sections = await Promise.all(eds.map(async e => { const s = edStats(e.id, D); if (!s.parts.length && partMode !== 'tous') return ''; return `<div class="card"><div class="head"><h2>${esc(e.skill)} · ${fmtD(e.start_date)}</h2>${pill(e.status, statusClass(e.status))}<span class="muted">${s.active.length} / ${e.capacity} · ${EUR(s.enc)} encaissés sur ${EUR(s.attendu)}</span><a class="more" href="#edition/${e.id}">Page de l’édition</a></div>${await partTable(s.parts)}</div>`; }));
  return `<div class="toolbar"><div class="tabs"><button type="button" data-act="setvar" data-k="partMode" data-v="actifs" class="${partMode === 'actifs' ? 'on' : ''}">En cours et à venir</button><button type="button" data-act="setvar" data-k="partMode" data-v="tous" class="${partMode === 'tous' ? 'on' : ''}">Tous (avec les anciens)</button></div></div>${sections.join('') || '<div class="card"><div class="empty-state">Aucun participant</div></div>'}`;
};
async function participantDetail(id) {
  await ensureLookups();
  const [p, docs, files, allPays] = await Promise.all([
    q(sb.from('participants').select('*').eq('id', id).single()),
    q(sb.from('participant_documents').select('*').eq('participant_id', id)),
    q(sb.from('participant_files').select('*').eq('participant_id', id).order('uploaded_at', { ascending: false })),
    q(sb.from('payments').select('*').eq('participant_id', id).order('paid_on'))
  ]);
  const b = partBal(p, allPays), ed = S.cache.editions.find(e => e.id === p.edition_id);
  const refLeads = p.referral_code ? await q(sb.from('leads').select('full_name,status').ilike('referral_code_used', p.referral_code)) : [];
  const refParts = p.referral_code ? S.cache.participants.filter(x => (x.referred_by || '').toUpperCase() === p.referral_code) : [];
  const got = new Set([...docs.filter(d => d.received).map(d => d.doc_type), ...files.map(f => f.doc_type)]);
  const back = `part:${id}`;
  openDrawer(`${drawerHead(esc(p.full_name), INACTIVE.includes(p.status) ? pill(p.status, 'bad') : isEnded(ed) ? pill('Alumni', 'good') : '')}
  <div class="muted">${esc(ed?.skill || '')} · ${esc(p.edition_id)} · ${esc(p.room_type || '')}</div>
  <div class="sub-section"><div class="head"><h3>Paiement</h3><span class="num">${EUR(b.net)} / ${EUR(b.due)}</span></div>${pbar(b.pct)}<div class="muted">${b.reste > 1 ? `Il manque <b>${EUR(b.reste)}</b>` : 'Tout est payé'}${b.refund ? ` · remboursé ${EUR(b.refund)}` : ''}</div>
  <table><tbody>${b.pays.map(x => `<tr class="click" data-act="edit" data-t="payments" data-id="${x.id}" data-back="${back}"><td>${fmtD(x.paid_on)}</td><td>${x.kind === 'Remboursement' ? pill('Remboursement', 'bad') : esc(x.account || '')}</td><td class="n">${NUM(x.amount)} ${x.currency}</td><td class="n">${EUR(x.eur_final)}</td></tr>`).join('') || '<tr><td class="muted">Aucun paiement</td></tr>'}</tbody></table>
  <button class="btn sm" type="button" data-act="add" data-t="payments" data-def="${J({ participant_id: id, edition_id: p.edition_id, currency: p.pay_currency, fx_rate: p.pay_currency === 'TND' ? fx() : 1, paid_on: today(), kind: 'Paiement' })}" data-back="${back}">+ Paiement</button></div>
  ${schedSection(p, { pays: allPays.concat((S.cache.payments || []).filter(x => x.participant_id !== id)), sched: await q(sb.from('payment_schedule').select('*').eq('participant_id', id)), parts: [p], eds: S.cache.editions }, back)}
  <div class="sub-section portal"><div class="head"><h3>Son espace personnel</h3></div><p class="muted">Un lien privé où ${esc(p.full_name.split(' ')[0])} voit ce qu’il a payé, ce qui reste, son échéancier, et dépose lui-même passeport, billets et contrat signé.</p>
  <div class="inline"><input readonly value="${esc(portalUrl(p))}" id="portalUrl" aria-label="Lien de l’espace personnel"><button class="btn sm" type="button" data-act="copyportal">Copier</button><button class="btn sm primary" type="button" data-act="sendportal" data-id="${id}">Vérifier et envoyer</button></div></div>
  <div class="sub-section"><div class="head"><h3>Fichiers personnels</h3><button class="btn sm primary" type="button" data-act="add" data-t="participant_files" data-def="${J({ participant_id: id })}" data-back="${back}">+ Joindre un fichier</button></div>
  <div class="list">${files.map(f => `<div class="row"><div class="grow click" data-act="file" data-path="${esc(f.file_path)}"><b>${esc(f.doc_type)}</b><div class="sub">${esc(f.file_name || f.file_path.split('/').pop())} · ${fmtD((f.uploaded_at || '').slice(0, 10))}${f.notes ? ' · ' + esc(f.notes) : ''}</div></div><button class="btn sm" type="button" data-act="file" data-path="${esc(f.file_path)}">Ouvrir</button><button class="btn sm" type="button" data-act="edit" data-t="participant_files" data-id="${f.id}" data-back="${back}">Modifier</button></div>`).join('') || '<div class="empty-state">Aucun fichier joint (contrat, passeport, billets…)</div>'}</div>
  <h3 style="margin-top:12px">Dossier (cliquez pour cocher si reçu sans fichier)</h3>
  <div class="docgrid">${DOC_TYPES.map(d => `<button type="button" class="docbtn ${got.has(d) ? 'ok' : ''}" data-act="doc" data-doc="${esc(d)}" data-id="${id}">${esc(d)}<span>${files.some(f => f.doc_type === d) ? 'Fichier joint' : got.has(d) ? 'Reçu' : 'Manquant'}</span></button>`).join('')}</div></div>
  <div class="sub-section"><div class="head"><h3>Informations</h3><button class="btn sm" type="button" data-act="edit" data-t="participants" data-id="${id}" data-back="${back}">Modifier la fiche</button></div>
  <div class="kv"><span>Téléphone</span><b>${p.phone ? `<a href="${wa(p.phone)}" target="_blank" rel="noopener">${esc(p.phone)}</a>` : '—'}</b><span>E-mail</span><b>${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : '—'}</b><span>Instagram</span><b>${esc(p.instagram || '—')}</b><span>Naissance</span><b>${fmtD(p.birth_date)}</b><span>Pays / ville</span><b>${esc([p.country, p.city].filter(Boolean).join(' · ') || '—')}</b><span>Profession</span><b>${esc(p.profession || '—')}</b><span>Contact d'urgence</span><b>${esc(p.emergency_contact || '—')}</b><span>Projet</span><b>${esc(p.project || '—')}</b><span>Notes</span><b>${esc(p.notes || '—')}</b></div></div>
  <div class="sub-section"><h3>Parrainage et suivi</h3><div class="kv"><span>Code de parrainage</span><b><code>${esc(p.referral_code || '—')}</code></b><span>Filleuls</span><b>${refParts.length + refLeads.length ? [...refParts.map(x => x.full_name + ' (inscrit)'), ...refLeads.map(x => `${x.full_name} (${x.status})`)].map(esc).join(', ') : 'Aucun pour l’instant'}</b><span>Parrainé par</span><b>${esc(p.referred_by || '—')}</b><span>Dernier contact</span><b>${fmtD(p.last_contact)}</b><span>Prochaine relance</span><b>${fmtD(p.next_followup)}</b><span>Circle Club</span><b>${p.circle_club ? 'Oui' : 'Non'}</b><span>Ambassadeur</span><b>${p.ambassador ? 'Oui' : 'Non'}</b></div>
  ${p.phone ? `<a class="btn sm" target="_blank" rel="noopener" href="${wa(p.phone)}?text=${encodeURIComponent(`Salut ${p.full_name.split(' ')[0]} ! Ton code de parrainage The Circle : ${p.referral_code}. Chaque ami inscrit avec ce code a ${S.settings.parrainage_filleul_eur || 150} € de réduction, et toi tu gagnes ${S.settings.parrainage_parrain_eur || 150} €.`)}">Envoyer son code par WhatsApp</a>` : ''}
  <button class="btn sm" type="button" data-act="contacted" data-id="${id}">Marquer « contacté aujourd’hui »</button></div>`);
  S.ctxEdition = p.edition_id;
}

/* Finances */
let finTab = 'resume', finEdition = '', expCat = '';
V.finances = async arg => {
  if (arg === 'clarifier') finTab = 'clarifier';
  const D = await loadData();
  S.ctxEdition = finEdition || null;
  setHead('Finances', `Tout est converti en euros. Dinars : taux réel si indiqué, sinon ${NUM(fx())} TND pour 1 €.`, `<button class="btn" type="button" data-act="add" data-t="expenses" data-def="expdef">+ Dépense</button><button class="btn primary" type="button" data-act="add" data-t="payments" data-def="paydef">+ Encaissement</button>`);
  const eds = D.eds.filter(e => !e.hidden && (!finEdition || e.id === finEdition));
  const all = eds.map(e => edStats(e.id, D));
  const tot = k => sum(all, s => k(s));
  const clar = clarify(D, finEdition);
  const pn = id => D.parts.find(p => p.id === id)?.full_name || '—';
  const tabs = [['resume', 'Vue d’ensemble'], ['entrees', 'Entrées'], ['depenses', 'Dépenses'], ['gain', 'Gain fondateurs'], ['tresorerie', 'Trésorerie à venir'], ['comptes', 'Comptes & circuit de l’argent'], ['clarifier', `À clarifier (${sum(clar.filter(g => g.kind !== 'mute'), g => g.items.length)})`]];
  let body = '';
  if (finTab === 'resume') body = `<div class="grid g4">${kpi('Encaissé', EUR(tot(s => s.enc)), `sur ${EUR(tot(s => s.attendu))} attendus`)}${kpi('Reste à encaisser', EUR(tot(s => s.reste)), `${sum(all, s => s.parts.filter(b => b.reste > 1).length)} personne(s)`)}${kpi('Dépenses', EUR(tot(s => s.couts)), 'hors avances sur gain')}${kpi('Gain chacun aujourd’hui', EUR(tot(s => s.now.part)), `prévu : ${EUR(tot(s => s.prev.part))}`)}</div>
    <div class="card"><div class="head"><h2>Par édition</h2></div><div class="table-wrap"><table><thead><tr><th>Édition</th><th style="min-width:160px">Encaissement</th><th class="n">Encaissé</th><th class="n">Reste</th><th class="n">Dépenses</th><th class="n">Résultat</th><th class="n">Gain chacun (prévu)</th></tr></thead><tbody>${all.map(s => `<tr class="click" data-act="go" data-href="#edition/${s.ed.id}"><td><b>${esc(s.ed.skill)}</b><div class="muted">${s.ed.id}</div></td><td>${pbar(s.attendu ? s.enc / s.attendu : 0)}</td><td class="n">${EUR(s.enc)}</td><td class="n">${EUR(s.reste)}</td><td class="n">${EUR(s.couts)}</td><td class="n">${EUR(s.now.res)}</td><td class="n">${EUR(s.prev.part)}</td></tr>`).join('')}</tbody></table></div><p class="muted">Les éditions de l’été 2026 n’ont que les encaissements importés du Drive : leurs dépenses restent à saisir.</p></div>`;
  if (finTab === 'tresorerie') body = tresorerie(D);
  if (finTab === 'entrees') body = echeancesCard(D, finEdition) + all.filter(s => s.parts.length || s.pays.length).map(s => `<div class="card"><div class="head"><h2>${esc(s.ed.skill)} · ${s.ed.id}</h2><span class="muted">${EUR(s.enc)} / ${EUR(s.attendu)} · manque ${EUR(s.reste)}</span></div>${pbar(s.attendu ? s.enc / s.attendu : 0, `${Math.round(s.attendu ? s.enc / s.attendu * 100 : 0)} % encaissé`)}<div style="height:10px"></div>${payBars(s.parts)}<details class="more-detail"><summary>Voir les ${s.pays.length} encaissements en détail</summary>${payTable(s.pays, pn)}</details></div>`).join('') || '<div class="card"><div class="empty-state">Aucun encaissement</div></div>';
  if (finTab === 'depenses') {
    const exps = (finEdition ? D.exps.filter(x => x.edition_id === finEdition) : D.exps).filter(x => !expCat || x.category === expCat);
    const cats = {}; (finEdition ? D.exps.filter(x => x.edition_id === finEdition) : D.exps).filter(x => x.type !== 'Frais fondateurs').forEach(x => cats[x.category] = (cats[x.category] || 0) + N(x.amount_eur));
    body = `${quickBar(finEdition)}<div class="split"><div class="card"><div class="head"><h2>Journal des dépenses</h2><button class="btn sm" type="button" data-act="import">Importer un relevé (CSV)</button><select id="expCat" data-var="expCat"><option value="">Toutes catégories</option>${EXP_CATS.map(c => `<option ${c === expCat ? 'selected' : ''}>${c}</option>`).join('')}</select></div><p class="muted">Chaque dépense peut avoir une photo / facture, et être détaillée (ex. un retrait Bourso qui a servi à l’excursion et aux courses). Les petites courses du coin : catégorie « Petites dépenses », une ligne par semaine suffit.</p>${expFeed(exps, D)}</div><div>${owesBox(D, finEdition)}<div class="card"><div class="head"><h2>Par catégorie</h2></div>${catChart(cats)}</div></div></div>`;
  }
  if (finTab === 'gain') {
    const gid = finEdition || S.gainEd || currentEd() || D.eds.find(e => !e.hidden)?.id; S.gainEd = gid;
    const st = edStats(gid, D), P = postes(gid, D);
    const chips = D.eds.filter(e => !e.hidden).map(e => { const x = edStats(e.id, D); return `<button type="button" class="edchip ${e.id === gid ? 'on' : ''}" data-act="gained" data-id="${e.id}"><b>${esc(e.skill)}</b><small>${fmtD(e.start_date)}</small><span class="num">${EUR(x.prev.part)} chacun</span></button>`; }).join('');
    const byCat = {}; st.costs.forEach(x => byCat[x.category] = (byCat[x.category] || 0) + N(x.amount_eur));
    body = `<div class="edchips">${chips}</div>
    <div class="grid g4">${kpi('Entrées de ce bootcamp', EUR(st.enc), `sur ${EUR(st.attendu)} attendus`)}${kpi('Dépenses de ce bootcamp', EUR(st.couts), P.has ? `prévision ${EUR(P.totPrev)}` : '')}${kpi('Résultat', EUR(st.now.res), `prévu ${EUR(st.prev.res)}`)}${kpi('Gain chacun', EUR(st.now.part), `prévu ${EUR(st.prev.part)}`, 'accent')}</div>
    <div class="split"><div>${gainTable(st, `Gain de ${esc(st.ed.skill)} · ${fmtD(st.ed.start_date)}`)}</div>
    <div class="card"><div class="head"><h2>D’où vient l’argent</h2><span class="num">${EUR(st.enc)}</span></div>${payBars(st.parts)}
    <div class="head" style="margin-top:12px"><h2>Où il est parti</h2><span class="num">${EUR(st.couts)}</span></div>${catChart(byCat)}
    <div class="head" style="margin-top:12px"><h2>Déjà pris par chacun</h2></div>${expFeed(st.adv, D)}</div></div>
    <p class="muted">Seules les entrées et dépenses rattachées à ce bootcamp comptent. Les dépenses sans bootcamp (structure, URSSAF…) ne sont dans aucun gain : rattachez-les à une édition si elles doivent être partagées.</p>`;
  }

  if (finTab === 'comptes') body = comptesHtml(D);
  if (finTab === 'clarifier') body = `<p class="muted">Chaque ligne s’ouvre : corrigez directement et elle disparaît de la liste. Les totaux se recalculent seuls.</p>${clarifyHtml(clar)}`;
  return `<div class="tabs page-tabs"><label class="tabctx sel">${ICON.editions}<select data-var="finEdition" aria-label="Filtrer par bootcamp">${edOpts(finTab === 'gain' ? (finEdition || S.gainEd || currentEd()) : finEdition, 'Tous les bootcamps')}</select></label>${tabs.map(([k, l]) => `<button type="button" data-act="setvar" data-k="finTab" data-v="${k}" class="${finTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
};

/* Alumni */
let alTab = 'membres';
V.alumni = async () => {
  setHead('Alumni & Circle Club', 'Les participants passent ici automatiquement à la fin de leur bootcamp. Le Circle Club les garde réunis, et le parrainage se suit tout seul.');
  const D = await loadData();
  const [leads, rewards, events] = await Promise.all([load('leads'), q(sb.from('referral_rewards').select('*').order('created_at', { ascending: false })), q(sb.from('club_events').select('*').order('event_on', { ascending: false, nullsFirst: false }))]);
  const al = D.parts.filter(p => !INACTIVE.includes(p.status) && isEnded(D.eds.find(e => e.id === p.edition_id)));
  const link = S.settings.club_whatsapp_link || '';
  const fR = N(S.settings.parrainage_filleul_eur) || 150, rR = N(S.settings.parrainage_parrain_eur) || 150, ret = S.settings.club_retour_pct || 15;
  const t = today();
  const codeOf = p => (p.referral_code || '').toUpperCase();
  // Parrainage : tous les parrains (alumni et participants actuels)
  const refs = D.parts.filter(p => p.referral_code).map(p => {
    const code = codeOf(p);
    const inscrits = D.parts.filter(x => (x.referred_by || '').toUpperCase() === code).map(x => ({ x, b: partBal(x, D.pays), rw: rewards.find(r => r.referred_participant_id === x.id) }));
    const prospects = leads.filter(l => (l.referral_code_used || '').toUpperCase() === code && l.status !== 'Payé');
    const due = inscrits.filter(i => i.b.net > 0 && !i.rw).length;
    const earned = sum(rewards.filter(r => r.referrer_id === p.id && r.status !== 'Annulé'), r => r.amount_eur);
    return { p, inscrits, prospects, due, earned, score: inscrits.length * 3 + prospects.length };
  }).filter(r => r.inscrits.length || r.prospects.length).sort((a, b) => b.score - a.score);
  const inv = p => { const msg = `Salut ${p.full_name.split(' ')[0]} ! Bienvenue dans le Circle Club, la communauté des alumni The Circle${link ? ` : ${link}` : ''}. Ton code de parrainage : ${p.referral_code} (${fR} € offerts à chaque ami inscrit, ${rR} € pour toi).`; return p.phone ? `${wa(p.phone)}?text=${encodeURIComponent(msg)}` : ''; };
  const members = al.filter(p => p.club_status === 'Membre' || p.circle_club).length, invited = al.filter(p => p.club_status === 'Invité').length;
  const tabs = [['membres', `Alumni (${al.length})`], ['parrainage', `Parrainage (${refs.length})`], ['club', 'Circle Club'], ['events', `Événements (${events.length})`]];
  let body = '';
  if (alTab === 'membres') body = `<div class="card"><div class="table-wrap"><table><thead><tr><th>Alumni</th><th>Bootcamp</th><th>Circle Club</th><th>Code</th><th>Relance</th><th></th></tr></thead><tbody>${al.sort((a, b) => (a.next_followup || '').localeCompare(b.next_followup || '')).map(p => `<tr><td class="click" data-act="part" data-id="${p.id}"><div class="who"><div class="avatar">${esc(p.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase())}</div><div><b>${esc(p.full_name)}</b>${p.ambassador ? ' ' + pill('Ambassadeur', 'good') : ''}<div class="muted">${esc(p.project || p.profession || '')}</div></div></div></td><td>${esc(D.eds.find(e => e.id === p.edition_id)?.skill || '')} <span class="muted">${esc(p.edition_id)}</span></td><td>${pill(p.circle_club ? 'Membre' : p.club_status || 'Pas encore invité', p.circle_club || p.club_status === 'Membre' ? 'good' : p.club_status === 'Invité' ? 'warn' : 'mute')}</td><td><code>${esc(p.referral_code || '')}</code></td><td>${!p.next_followup ? pill('À planifier', 'warn') : p.next_followup <= t ? pill(fmtD(p.next_followup), 'bad') : fmtD(p.next_followup)}</td><td class="acts">${p.phone ? `<a class="btn sm" href="${inv(p)}" target="_blank" rel="noopener" data-act="invited" data-id="${p.id}">Inviter au club</a>` : ''}<button class="btn sm" type="button" data-act="contacted" data-id="${p.id}">Contacté</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty-state">Aucun alumni</td></tr>'}</tbody></table></div></div>`;
  if (alTab === 'parrainage') body = `<div class="grid g4">${kpi('Parrains actifs', refs.length, 'au moins un filleul')}${kpi('Filleuls inscrits', sum(refs, r => r.inscrits.length), `${sum(refs, r => r.prospects.length)} prospects en cours`)}${kpi('Récompenses à valider', sum(refs, r => r.due), `${EUR(sum(refs, r => r.due) * rR)} à prévoir`)}${kpi('Déjà versé', EUR(sum(rewards.filter(r => r.status === 'Versé' || r.status === 'Déduit du prochain bootcamp'), r => r.amount_eur)), `${rewards.filter(r => r.status === 'À verser').length} en attente`)}</div>
  <div class="card"><div class="head"><h2>Classement des parrains</h2></div>${refs.length ? `<div class="refs">${refs.map((r, i) => `<div class="ref"><div class="rank">${i + 1}</div><div class="grow"><div class="click" data-act="part" data-id="${r.p.id}"><b>${esc(r.p.full_name)}</b> <code>${esc(r.p.referral_code)}</code></div>
    <div class="fil">${r.inscrits.map(i => `<span class="filleul">${esc(i.x.full_name)} ${i.rw ? pill(i.rw.status, i.rw.status === 'Versé' ? 'good' : 'warn') : i.b.net > 0 ? `<button class="btn sm primary" type="button" data-act="reward" data-ref="${r.p.id}" data-fil="${i.x.id}" data-name="${esc(i.x.full_name)}">Valider ${EUR(rR)}</button>` : pill('pas encore payé', 'mute')}</span>`).join('')}${r.prospects.map(l => `<span class="filleul">${esc(l.full_name)} ${pill('prospect · ' + l.status, 'mute')}</span>`).join('')}</div></div><div class="pv"><small>Gagné</small><b class="num">${EUR(r.earned)}</b></div></div>`).join('')}</div>` : `<div class="empty-state">Aucun parrainage pour l’instant. Dès qu’un prospect ou un participant a un code dans sa fiche (« Code de parrainage utilisé » / « Parrainé par »), il apparaît ici.</div>`}</div>
  <div class="card"><div class="head"><h2>Récompenses</h2><button class="btn sm" type="button" data-act="add" data-t="referral_rewards" data-def="${J({ amount_eur: rR, status: 'À verser' })}">+ Ajouter</button></div><div class="list">${rewards.map(w => `<button type="button" class="row click" data-act="edit" data-t="referral_rewards" data-id="${w.id}"><div class="grow"><b>${esc(D.parts.find(p => p.id === w.referrer_id)?.full_name || '')}</b> pour ${esc(w.referred_name || D.parts.find(p => p.id === w.referred_participant_id)?.full_name || '')}<div class="sub">${w.paid_on ? 'versé le ' + fmtD(w.paid_on) : ''}</div></div>${pill(w.status, w.status === 'Versé' ? 'good' : w.status === 'Annulé' ? 'mute' : 'warn')}<b class="num">${EUR(w.amount_eur)}</b></button>`).join('') || '<div class="empty-state">Aucune récompense</div>'}</div><p class="muted">Quand vous passez une récompense à « Versé », une dépense « Parrainage » est créée dans le bootcamp du filleul : elle entre dans le calcul du gain.</p></div>`;
  if (alTab === 'club') body = `<div class="grid g4">${kpi('Membres du club', members, `sur ${al.length} alumni`)}${kpi('Invités', invited, 'pas encore entrés')}${kpi('Événements', events.length, events[0] ? 'dernier : ' + fmtD(events[0].event_on) : 'aucun')}${kpi('Lien du groupe', link ? 'OK' : 'à créer', link ? 'dans Réglages' : 'collez-le dans Réglages')}</div>
  <div class="split"><div class="card club"><div class="head"><h2>Le Circle Club : ce qu’on vous recommande</h2></div>
  <p><b>Une communauté WhatsApp</b> « The Circle Alumni » plutôt qu’une nouvelle appli : tous vos participants sont déjà sur WhatsApp, c’est gratuit, et une communauté regroupe plusieurs groupes sous un même toit.</p>
  <div class="clubgrid"><div><b>📣 Annonces</b><small>Seuls Youssef et Nahed écrivent : nouvelles éditions, événements, offres. Tout le monde y est.</small></div><div><b>🛒 E-commerce</b><small>Alumni e-com : questions, fournisseurs, résultats.</small></div><div><b>📈 Trading</b><small>Alumni trading : analyses, challenges, prop firms.</small></div><div><b>🤝 Opportunités</b><small>Jobs, missions freelance, associés, services entre alumni.</small></div><div><b>🌴 Bali & voyages</b><small>Ceux qui reviennent à Bali, colocs, bons plans.</small></div><div><b>🇹🇳 Meetups Tunisie</b><small>Afterworks et réunion annuelle à Tunis.</small></div></div>
  <h3>Ce que les membres y gagnent</h3><ul class="steps"><li>Un <b>live par mois</b> avec un coach ou un alumni qui a réussi (30 min + questions).</li><li><b>−${ret} %</b> sur un 2ᵉ bootcamp et priorité sur les places.</li><li>Leur <b>code de parrainage</b> : ${fR} € offerts à leurs amis, ${rR} € pour eux par inscrit.</li><li>Un <b>annuaire des alumni</b> (nom, projet, Instagram) partagé dans le groupe chaque trimestre, pour se contacter entre eux.</li><li>Une <b>réunion annuelle</b> à Tunis et un afterwork à Bali pendant chaque édition (les alumni sur place rencontrent les nouveaux).</li><li>Les <b>3 meilleurs parrains</b> de l’année : une semaine offerte à la villa.</li></ul>
  <h3>Comment le lancer (30 minutes)</h3><ol class="steps"><li>WhatsApp → Communautés → Nouvelle communauté « The Circle Alumni », créez les groupes ci-dessus.</li><li>Copiez le lien d’invitation et collez-le dans <a href="#reglages">Réglages</a>.</li><li>Onglet « Alumni » : bouton « Inviter au club » sur chaque personne. Le message part avec le lien et son code de parrainage.</li><li>Programmez les lives dans l’onglet « Événements ».</li></ol></div>
  <div class="card"><div class="head"><h2>Rituels automatiques</h2></div><ul class="steps"><li><b>Fin du bootcamp</b> : la personne passe alumni, reçoit son code et l’invitation au club.</li><li><b>J+7</b> : demander un avis et des photos/vidéos.</li><li><b>J+30</b> : « où en est ton projet ? » (notez la réponse dans sa fiche, champ Projet).</li><li><b>J+90</b> puis tous les 3 mois : nouvelles éditions + rappel du code. Le bouton « Contacté » planifie la relance suivante.</li></ul>
  <a class="btn primary" href="#alumni" data-act="altab" data-v="membres">Voir qui inviter</a></div></div>`;
  if (alTab === 'events') body = `<div class="card"><div class="head"><h2>Événements du Circle Club</h2><button class="btn sm primary" type="button" data-act="add" data-t="club_events" data-def="${J({ kind: 'Live en ligne', event_on: today() })}">+ Événement</button></div><div class="feed">${events.map(ev => `<button type="button" class="feed-item click" data-act="edit" data-t="club_events" data-id="${ev.id}"><div class="fi-date">${ev.event_on ? new Date(ev.event_on + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : ''}</div><div class="grow"><div>${pill(ev.kind, ev.event_on && ev.event_on >= t ? 'good' : 'mute')} <b>${esc(ev.title)}</b></div><div class="sub">${esc([ev.place, ev.link].filter(Boolean).join(' · '))}${ev.attendees ? ` · ${ev.attendees} participants` : ''}</div></div></button>`).join('') || '<div class="empty-state">Aucun événement. Commencez par un live « Mon business 3 mois après Bali » avec un alumni.</div>'}</div></div>`;
  return `<div class="tabs page-tabs">${tabs.map(([k, l]) => `<button type="button" data-act="altab" data-v="${k}" class="${alTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
};
SCHEMAS.referral_rewards.afterSave = async (rec, old) => {
  if (rec.status === 'Versé' && (!old || old.status !== 'Versé')) {
    const fil = S.cache.participants.find(p => p.id === rec.referred_participant_id), par = S.cache.participants.find(p => p.id === rec.referrer_id);
    await q(sb.from('expenses').insert({ edition_id: fil?.edition_id || null, spent_on: rec.paid_on || today(), description: `Parrainage : ${par?.full_name || ''} pour ${fil?.full_name || rec.referred_name || ''}`, category: 'Parrainage', amount: rec.amount_eur, currency: 'EUR', fx_rate: 1, type: 'Marketing', paid_by: 'Caisse Circle', notes: 'Créée automatiquement à partir de la récompense de parrainage' }));
  }
};

/* Listes simples */
function simpleList(table, title, sub, cols, order = 'created_at', asc = false, filter = () => true, def = {}) {
  return async () => {
    await ensureLookups();
    setHead(title, sub, `<button class="btn primary" type="button" data-act="add" data-t="${table}" data-def="${J(def)}">+ Ajouter</button>`);
    const rows = (await load(table, order, asc)).filter(filter);
    return `<div class="card"><div class="table-wrap"><table><thead><tr>${cols.map(c => `<th class="${c[2] === 'n' ? 'n' : ''}">${c[0]}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => `<tr class="click" data-act="edit" data-t="${table}" data-id="${esc(r[SCHEMAS[table].key || 'id'])}">${cols.map(c => `<td class="${c[2] === 'n' ? 'n' : ''}">${c[1](r)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}" class="empty-state">Rien pour l'instant</td></tr>`}
    </tbody></table></div></div>`;
  };
}
V.partenaires = simpleList('partners', 'Partenaires', 'Coachs, villa, prestataires.', [['Type', r => pill(r.type, 'mute')], ['Nom', r => `<b>${esc(r.name)}</b><div class="muted">${esc(r.role || '')}</div>`], ['Contact', r => esc(r.contact || '')], ['Prix', r => esc(r.price || '')], ['Contrat', r => r.contract_signed ? pill('Signé', 'good') : pill('Non signé', 'warn')]], 'type', true, r => r.status !== 'Retiré', { type: 'Prestataire' });
V.documents = simpleList('documents', 'Documents', 'Bibliothèque rangée par destinataire. Joignez le fichier quand il est prêt.', [['Pour', r => pill(r.audience, 'mute')], ['Document', r => esc(r.name)], ['État', r => pill(r.status, r.status === 'Prête' ? 'good' : 'warn')], ['Fichier', r => r.file_path ? pill('Joint', 'good') : '<span class="muted">—</span>']], 'audience', true, () => true, { audience: 'Interne', status: 'À rédiger' });
V.securite = simpleList('incidents', 'Sécurité', "Incidents (accès réservé à l'équipe). Urgences Bali : 112 · police 110 · ambulance 118 / 119 · BIMC Kuta +62 361 761263 · Siloam +62 361 779900.", [['Date', r => fmtD(r.occurred_on)], ['Bootcamp', r => esc(r.edition_id || 'Été 2026 / hors édition')], ['Type', r => pill(r.type, 'bad')], ['Faits', r => esc(r.description)], ['Décision', r => esc(r.decision || '')], ['Statut', r => pill(r.status, r.status === 'Clos' ? 'good' : 'warn')]], 'occurred_on', false, () => true, { occurred_on: today(), status: 'Ouvert' });
V.pilotage = async () => {
  setHead('Tâches & décisions', 'Toutes les tâches et le journal des décisions.', `<button class="btn" type="button" data-act="add" data-t="decisions" data-def="${J({ decided_on: today() })}">+ Décision</button><button class="btn primary" type="button" data-act="add" data-t="tasks" data-def="${J({ owner: 'Les deux' })}">+ Tâche</button>`);
  const [tasks, decs] = await Promise.all([load('tasks', 'due_date', true), load('decisions', 'decided_on')]);
  return `<div class="split"><div class="card"><div class="head"><h2>Tâches</h2></div><div class="table-wrap"><table><thead><tr><th>Tâche</th><th>Qui</th><th>Échéance</th><th>État</th></tr></thead><tbody>${tasks.map(x => `<tr class="click" data-act="edit" data-t="tasks" data-id="${x.id}"><td>${esc(x.title)}</td><td>${esc(x.owner || '')}</td><td>${fmtD(x.due_date)}</td><td>${x.done ? pill('Faite', 'good') : x.due_date && x.due_date < today() ? pill('En retard', 'bad') : pill('À faire', 'mute')}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card"><div class="head"><h2>Décisions</h2></div><div class="list">${decs.map(d => `<button type="button" class="row click" data-act="edit" data-t="decisions" data-id="${d.id}"><div><b>${esc(d.subject)}</b><div class="sub">${esc(d.decision)}</div><div class="sub">${fmtD(d.decided_on)}${d.ref ? ' · ' + esc(d.ref) : ''}</div></div></button>`).join('')}</div></div></div>`;
};
V.reglages = async () => {
  await ensureLookups(true);
  setHead('Réglages', 'Taux de change, part d’investissement, parrainage, comptes, éditions masquées.');
  const hidden = S.cache.editions.filter(e => e.hidden);
  [S.team, S.invites] = await Promise.all([q(sb.from('team_members').select('*')), q(sb.from('team_invites').select('*'))]);
  setTimeout(() => { const f = $('inviteForm'); if (f) f.onsubmit = async ev => { ev.preventDefault(); await q(sb.from('team_invites').upsert({ email: f.e.value.trim().toLowerCase(), display_name: f.n.value.trim(), role: 'Fondatrice', claimed_at: null })); toast(`Accès donné à ${f.n.value.trim()} : elle peut se connecter`); route(); }; }, 0);
  return `<div class="split"><div class="card"><div class="head"><h2>Paramètres de calcul</h2></div><div class="form">${S.settingsRows.sort((a, b) => a.key.localeCompare(b.key)).map(s => `<label class="field">${esc(s.description || s.key)}<div class="inline"><input type="text" value="${esc(s.value)}" id="set_${esc(s.key)}"><button class="btn sm" type="button" data-act="saveset" data-id="${esc(s.key)}">Enregistrer</button></div></label>`).join('')}</div></div>
  <div class="card"><div class="head"><h2>Équipe</h2></div><div class="list">${(S.team || []).map(m => `<div class="row"><div class="avatar sm">${esc(m.display_name.slice(0, 1))}</div><div class="grow"><b>${esc(m.display_name)}</b><div class="sub">${esc(m.role || '')} · accès complet</div></div>${pill('actif', 'good')}</div>`).join('')}${(S.invites || []).filter(i => !i.claimed_at).map(i => `<div class="row"><div class="avatar sm">${esc(i.display_name.slice(0, 1))}</div><div class="grow"><b>${esc(i.display_name)}</b><div class="sub">${esc(i.email)} · invitée, pas encore connectée</div></div>${pill('en attente', 'warn')}</div>`).join('')}</div>
  <form class="form" id="inviteForm"><div class="fwrap half"><label class="field">Prénom<input name="n" required placeholder="Nahed"></label></div><div class="fwrap half"><label class="field">Son e-mail<input type="email" name="e" required placeholder="adresse@exemple.com"></label></div><div class="fwrap full"><button class="btn primary" type="submit">Donner l’accès</button></div></form>
  <p class="muted">Elle ouvre ensuite ${esc(location.origin + location.pathname)}, tape cet e-mail, clique sur le lien reçu : elle arrive directement dans l’app avec un accès complet. Chaque modification de l’un ou de l’autre est signée dans l’Historique.</p></div>
  <div class="card"><div class="head"><h2>Comptes</h2><button class="btn sm primary" type="button" data-act="add" data-t="accounts" data-def="${J({ currency: 'EUR', sort: 100 })}">+ Compte</button></div><div class="list">${S.cache.accounts.map(a => `<button type="button" class="row click" data-act="edit" data-t="accounts" data-id="${esc(a.name)}"><div><b>${esc(a.name)}</b> <span class="muted">${esc(a.currency || '')}</span><div class="sub">${esc(a.holder || '')}${a.notes ? ' · ' + esc(a.notes) : ''}</div></div></button>`).join('')}</div>
  <div class="head" style="margin-top:14px"><h2>Sauvegarde</h2></div><p class="muted">Téléchargez toute la base (un fichier JSON complet, ou des CSV lisibles dans Excel). Une copie est aussi faite automatiquement chaque mois dans le Drive.</p><div class="inline"><button class="btn sm primary" type="button" data-act="export" data-v="json">Tout télécharger (JSON)</button><button class="btn sm" type="button" data-act="export" data-v="csv">Finances en CSV (Excel)</button></div>
  <div class="head" style="margin-top:14px"><h2>Éditions masquées</h2></div><div class="list">${hidden.map(e => `<button type="button" class="row click" data-act="edit" data-t="editions" data-id="${e.id}"><div>${esc(e.skill)} · ${e.id}<div class="sub">Ouvrir et décocher « Masquer » pour la réafficher</div></div></button>`).join('') || '<div class="empty-state">Aucune</div>'}</div></div></div>`;
};

/* ---------- Routing ---------- */
async function route() {
  if (!S.member) return;
  const [k, arg] = (location.hash || '#accueil').slice(1).split('/');
  const view = V[k] ? k : 'accueil', navKey = view === 'edition' ? 'editions' : view;
  if (view !== 'edition') edTab = edTab;
  $('nav').innerHTML = NAV.map(([g, items]) => `${g ? `<div class="ngroup">${g}</div>` : ''}${items.map(([key, l]) => `<a href="#${key}" class="${key === navKey ? 'on' : ''}">${ICON[key] || ''}<span>${l}</span></a>`).join('')}`).join('');
  document.querySelectorAll('.bottombar a').forEach(a => a.classList.toggle('on', a.dataset.k === navKey));
  $('side').classList.remove('open'); $('fabMenu').classList.remove('on');
  if (view !== 'edition' && view !== 'finances') S.ctxEdition = null;
  const v = $('view'); if (!v.dataset.k || v.dataset.k !== location.hash.split('/')[0]) v.innerHTML = skeleton(); v.dataset.k = location.hash.split('/')[0];
  try { const html = await V[view](arg ? decodeURIComponent(arg) : undefined); v.innerHTML = html; v.classList.remove('fade'); void v.offsetWidth; v.classList.add('fade'); } catch (e) { console.error(e); $('view').innerHTML = `<div class="msg err">Impossible de charger cette page : ${esc(e.message)}</div>`; }
}
function backFn(back) {
  if (!back) return null;
  const [kind, id] = back.split(':');
  if (kind === 'part') return () => { route(); participantDetail(id); };
  if (kind === 'week') { const [ed, i, a, b] = id.split('|'); return () => { route(); weekDrawer(ed, i, a, b); }; }
  if (kind === 'exp') return () => { route(); editById('expenses', id); };
  return null;
}
let lastHash = '';
window.addEventListener('hashchange', () => { const base = location.hash.split('/')[0]; if (base !== lastHash) { edTab = 'resume'; lastHash = base; } if (!location.hash.startsWith('#finances/')) { } route(); });

document.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]');
  if (!t) { if (!e.target.closest('.fab-wrap')) $('fabMenu')?.classList.remove('on'); return; }
  const d = t.dataset, after = backFn(d.back);
  switch (d.act) {
    case 'close': closeDrawer(); break;
    case 'logout': await sb.auth.signOut(); location.hash = ''; location.reload(); break;
    case 'menu': $('side').classList.toggle('open'); break;
    case 'fab': $('fabMenu').classList.toggle('on'); document.querySelector('.fab-wrap').classList.toggle('on', $('fabMenu').classList.contains('on')); break;
    case 'add': { $('fabMenu').classList.remove('on'); const def = d.def && d.def.startsWith('{') ? JSON.parse(d.def) : defaultsFor(d.def); editRow(d.t, null, def, after); break; }
    case 'edit': if (!e.target.closest('input')) editById(d.t, d.id, after || (d.t === 'editions' ? async () => { await ensureLookups(true); route(); } : null)); break;
    case 'part': participantDetail(d.id); break;
    case 'file': openFile(d.path); break;
    case 'go': location.hash = d.href; break;
    case 'tab': edTab = d.v; route(); break;
    case 'setvar': if (d.k === 'partMode') partMode = d.v; if (d.k === 'finTab') { finTab = d.v; if (location.hash.startsWith('#finances/')) { history.replaceState(null, '', '#finances'); } } route(); break;
    case 'doc': { const has = t.classList.contains('ok'); await q(sb.from('participant_documents').upsert({ participant_id: d.id, doc_type: d.doc, received: !has, received_at: has ? null : today() }, { onConflict: 'participant_id,doc_type' })); participantDetail(d.id); break; }
    case 'done': await q(sb.from('tasks').update({ done: true }).eq('id', d.id)); toast('Tâche faite'); route(); break;
    case 'contacted': { const nx = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10); await q(sb.from('participants').update({ last_contact: today(), next_followup: nx }).eq('id', d.id)); toast('Contact noté · prochaine relance le ' + fmtD(nx)); delete S.cache.participants; participantDetail(d.id); route(); break; }
    case 'qsave': quickSave(); break;
    case 'sendportal': sendPortalDrawer(d.id); break;
    case 'copymsg': { const v = $('portalMsg').value; try { await navigator.clipboard.writeText(v); } catch (_) { $('portalMsg').select(); document.execCommand('copy'); } toast('Message copié'); break; }
    case 'splitsave': {
      const ta = $('splitIn'), total = Number(ta.dataset.total), rows = parseSplit(ta.value, total, ta.dataset.cur);
      if (sum(rows, r => r.eur) - total > 1) { toast('Le détail dépasse le total : corrigez avant d’enregistrer', true); break; }
      const old = (await q(sb.from('expense_lines').select('id').eq('expense_id', d.id))).map(x => x.id);
      if (old.length) await q(sb.from('expense_lines').delete().in('id', old));
      if (rows.length) await q(sb.from('expense_lines').insert(rows.map(r => ({ expense_id: d.id, label: r.label, category: r.category, amount_eur: r.eur }))));
      const full = Math.abs(sum(rows, r => r.eur) - total) < 1;
      if (full) await q(sb.from('expenses').update({ type: 'Coût édition', category: rows.slice().sort((a, b) => b.eur - a.eur)[0].category === 'Gain fondateurs' ? 'Gain fondateurs' : rows.slice().sort((a, b) => b.eur - a.eur)[0].category }).eq('id', d.id).eq('type', 'À clarifier'));
      toast(full ? `Réparti en ${rows.length} mini-dépenses ✓` : `Réparti en ${rows.length} lignes · le reste reste à clarifier`);
      route(); editById('expenses', d.id); break;
    }
    case 'splitclear': { const old = (await q(sb.from('expense_lines').select('id').eq('expense_id', d.id))).map(x => x.id); if (old.length) await q(sb.from('expense_lines').delete().in('id', old)); toast('Répartition effacée'); route(); editById('expenses', d.id); break; }
    case 'mksched': { const p = (S.cache.participants || []).find(x => x.id === d.id) || await q(sb.from('participants').select('*').eq('id', d.id).single()); if (!S.cache.payments) await loadData(); schedForm(p); break; }
    case 'copyportal': { const i = $('portalUrl'); i.select(); try { await navigator.clipboard.writeText(i.value); } catch (_) { document.execCommand('copy'); } toast('Lien copié'); break; }
    case 'print': window.print(); break;
    case 'export': exportAll(d.v); break;
    case 'week': weekDrawer(d.ed, d.i, d.a, d.b); break;
    case 'mkposte': await q(sb.from('edition_budget_lines').insert({ edition_id: d.ed, category: d.cat, amount_eur: Number(d.amt) || 0, match_categories: d.cat, paid: !d.unpaid, paid_on: d.unpaid ? null : today(), sort: 50, notes: 'Créé depuis les dépenses' })); toast(`Poste « ${d.cat} » créé${d.unpaid ? '' : ' et marqué payé'}`); route(); break;
    case 'togglepaid': {
      const D = await loadData(); const line = D.budget.find(b => b.id === d.id); if (!line) break;
      const P = postes(line.edition_id, D), r = P.rows.find(x => x.l.id === d.id);
      let msg = '';
      if (d.v === '1') {
        const gap = r ? r.plan - r.real : 0;
        if (r && !r.manual && gap > Math.max(5, r.plan * 0.02)) {
          await q(sb.from('expenses').insert({ edition_id: line.edition_id, spent_on: today(), description: `${line.category} : solde payé`, category: r.cats[0] || 'Imprévus', amount: Math.round(gap * 100) / 100, currency: 'EUR', fx_rate: 1, type: 'Coût édition', paid_by: 'Caisse Circle', notes: `auto-poste:${line.id} · Créée en cochant le poste (prévu ${EUR(r.plan)}, déjà saisi ${EUR(r.real)}). Remplacez-la par la vraie dépense si le montant diffère.` }));
          msg = ` · ${EUR(gap)} ajoutés aux dépenses pour atteindre le prévu`;
        }
        await q(sb.from('edition_budget_lines').update({ paid: true, paid_on: today() }).eq('id', d.id));
        toast(`« ${line.category} » payé${msg || ' · les dépenses saisies correspondent déjà'}`);
      } else {
        const auto = D.exps.filter(x => (x.notes || '').startsWith(`auto-poste:${line.id}`));
        for (const x of auto) await q(sb.from('expenses').delete().eq('id', x.id));
        await q(sb.from('edition_budget_lines').update({ paid: false, paid_on: null }).eq('id', d.id));
        toast(`« ${line.category} » remis à payer${auto.length ? ` · solde automatique de ${EUR(sum(auto, x => x.amount_eur))} retiré` : ''}`);
      }
      route(); break;
    }
    case 'gained': S.gainEd = d.id; finEdition = ''; route(); break;
    case 'altab': e.preventDefault(); alTab = d.v; route(); break;
    case 'invited': await q(sb.from('participants').update({ club_status: 'Invité', last_contact: today() }).eq('id', d.id)); delete S.cache.participants; setTimeout(route, 300); break;
    case 'reward': await q(sb.from('referral_rewards').insert({ referrer_id: d.ref, referred_participant_id: d.fil, referred_name: d.name, amount_eur: N(S.settings.parrainage_parrain_eur) || 150, status: 'À verser' })); toast('Récompense validée : à verser'); route(); break;
    case 'theme': { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const nx = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = nx; try { localStorage.setItem('circle-theme', nx); } catch (_) { } t.innerHTML = nx === 'light' ? ICON.moon : ICON.sun; break; }
    case 'palette': openPalette(); break;
    case 'palgo': runPal(Number(d.i)); break;
    case 'photo': $('photoIn').click(); break;
    case 'import': await ensureLookups(); importDrawer(); break;
    case 'impgo': importGo(); break;
    case 'reimburse': { if (!t.dataset.armed) { t.dataset.armed = 1; t.textContent = 'Confirmer : tout est remboursé'; break; } let qq = sb.from('expenses').update({ reimbursed: true }).eq('paid_by', d.who).eq('reimbursed', false); if (d.ed) qq = qq.eq('edition_id', d.ed); await q(qq); toast('Noté comme remboursé'); route(); break; }
    case 'copybudget': { const from = $('cbFrom')?.value; if (!from) break; const D = await loadData(); const lines = D.budget.filter(b => b.edition_id === from).map(b => ({ edition_id: d.id, category: b.category, amount_eur: b.amount_eur })); await q(sb.from('edition_budget_lines').insert(lines)); toast(`${lines.length} postes copiés`); route(); break; }
    case 'saveset': { const v = $('set_' + d.id).value.trim(); await q(sb.from('settings').update({ value: v }).eq('key', d.id)); S.settings[d.id] = v; toast('Réglage enregistré'); break; }
    case 'convert': {
      const l = await q(sb.from('leads').select('*').eq('id', d.id).single());
      if (!l.edition_id) { toast('Choisissez d’abord l’édition visée dans la fiche', true); break; }
      await q(sb.from('participants').insert({ full_name: l.full_name, phone: l.phone, email: l.email, country: l.country, edition_id: l.edition_id, room_type: l.room_type, price_eur: l.proposed_price_eur || 0, pay_currency: 'TND', status: 'Confirmé', source: l.source, referred_by: l.referral_code_used, lead_id: l.id, notes: l.notes }));
      await q(sb.from('leads').update({ status: 'Payé' }).eq('id', l.id));
      delete S.cache.participants; closeDrawer(); toast(`${l.full_name} est inscrit(e)`); location.hash = '#edition/' + l.edition_id; route(); break;
    }
  }
});
document.addEventListener('change', async e => {
  if (e.target.id === 'impFile' && e.target.files[0]) return importPreview(e.target.files[0]);
  if (e.target.id === 'impAcc' && $('impFile')?.files[0]) return importPreview($('impFile').files[0]);
  if (e.target.id === 'photoIn' && e.target.files[0]) {
    const f = e.target.files[0]; e.target.value = ''; toast('Envoi de la photo…');
    const path = await upload(f, 'expenses');
    const rows = await q(sb.from('expenses').insert({ edition_id: S.ctxEdition || currentEd() || null, spent_on: today(), description: 'Ticket à compléter', category: 'À clarifier', amount: 0, currency: 'IDR', fx_rate: rate('IDR'), type: 'À clarifier', paid_from: 'Caisse Bali (IDR)', paid_by: 'Caisse Circle', receipt_path: path, notes: 'Créée depuis une photo' }).select());
    route(); if (rows?.[0]) editById('expenses', rows[0].id); return;
  }
  if (e.target.dataset.go === 'edition') { location.hash = '#edition/' + e.target.value; return; }
  const v = e.target.dataset.var; if (!v) return;
  if (v === 'crmEdition') crmEdition = e.target.value;
  if (v === 'finEdition') { finEdition = e.target.value; if (finTab === 'gain' && finEdition) S.gainEd = finEdition; }
  if (v === 'expCat') expCat = e.target.value;
  route();
});
let annT;
document.addEventListener('input', e => { if (e.target.id === 'splitIn') { $('splitPrev').innerHTML = splitPreview(parseSplit(e.target.value, Number(e.target.dataset.total), e.target.dataset.cur), Number(e.target.dataset.total)); return; } if (e.target.id === 'qIn') { $('qPrev').innerHTML = quickPreview(parseQuick(e.target.value)); return; } if (e.target.id === 'annQ') { annQ = e.target.value; clearTimeout(annT); annT = setTimeout(async () => { const pos = e.target.selectionStart; await route(); const el = $('annQ'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } }, 250); } });
document.addEventListener('dragstart', e => { const c = e.target.closest('.lead'); if (c) e.dataTransfer.setData('text/plain', c.dataset.lead); });
document.addEventListener('dragover', e => { const c = e.target.closest('.col'); if (c) { e.preventDefault(); c.classList.add('over'); } });
document.addEventListener('dragleave', e => { const c = e.target.closest('.col'); if (c) c.classList.remove('over'); });
document.addEventListener('drop', async e => { const c = e.target.closest('.col'); if (!c) return; e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); await q(sb.from('leads').update({ status: c.dataset.status }).eq('id', id)); toast('Statut mis à jour : ' + c.dataset.status); route(); });
document.addEventListener('keydown', e => { if (e.target.id === 'qIn' && e.key === 'Enter') { e.preventDefault(); quickSave(); return; } if (e.key === 'Escape') { closeDrawer(); $('fabMenu')?.classList.remove('on'); } });

/* ---------- Recherche globale (Ctrl K) ---------- */
let PAL = [], palSel = 0;
const norm = x => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
async function openPalette() {
  await ensureLookups(); if (!S.cache.leads) await load('leads');
  $('pal').hidden = false; const i = $('palIn'); i.value = ''; i.focus(); palRender('');
}
function closePalette() { $('pal').hidden = true; }
function palItems() {
  const it = [];
  NAV.forEach(([, items]) => items.forEach(([k, l]) => it.push({ g: 'Pages', t: l, s: '', ic: ICON[k], go: '#' + k })));
  [['Ajouter une personne (formulaire, pub)', 'leads', { status: 'Nouveau', source: 'Formulaire' }], ['Ajouter un participant', 'participants', { status: 'Confirmé', pay_currency: 'TND' }], ['Ajouter un encaissement', 'payments', 'paydef'], ['Ajouter une dépense', 'expenses', 'expdef'], ['Retrait, change ou virement', 'transfers', 'trdef'], ['Note d’édition', 'edition_journal', 'jdef'], ['Nouvelle tâche', 'tasks', { owner: 'Les deux' }]].forEach(([t, tb, def]) => it.push({ g: 'Actions', t, s: '', ic: ICON.plus, add: [tb, def] }));
  S.cache.editions.filter(e => !e.hidden).forEach(e => it.push({ g: 'Éditions', t: `${e.skill} · ${fmtD(e.start_date)}`, s: e.id, ic: ICON.editions, go: '#edition/' + e.id }));
  S.cache.participants.forEach(p => it.push({ g: 'Participants & alumni', t: p.full_name, s: `${p.edition_id}${p.phone ? ' · ' + p.phone : ''}`, ic: ICON.participants, part: p.id, k: `${p.email || ''} ${p.referral_code || ''}` }));
  (S.cache.leads || []).forEach(l => it.push({ g: 'Prospects', t: l.full_name, s: `${l.status}${l.phone ? ' · ' + l.phone : ''}`, ic: ICON.crm, edit: ['leads', l.id], k: l.email }));
  S.cache.partners.filter(p => p.status !== 'Retiré').forEach(p => it.push({ g: 'Partenaires', t: p.name, s: p.type, ic: ICON.partenaires, edit: ['partners', p.id] }));
  return it;
}
function palRender(qv) {
  const qn = norm(qv); const all = palItems();
  PAL = (qn ? all.filter(x => norm(`${x.t} ${x.s} ${x.k || ''}`).includes(qn)) : all.filter(x => x.g !== 'Participants & alumni' && x.g !== 'Prospects' && x.g !== 'Partenaires')).slice(0, 40); palSel = 0;
  let g = ''; $('palList').innerHTML = PAL.map((x, i) => `${x.g !== g ? `<div class="pal-g">${(g = x.g)}</div>` : ''}<button type="button" class="pal-it ${i === 0 ? 'on' : ''}" data-act="palgo" data-i="${i}">${x.ic || ''}<span class="grow">${esc(x.t)}</span><small>${esc(x.s)}</small></button>`).join('') || '<div class="empty-state">Aucun résultat</div>';
}
function runPal(i) {
  const x = PAL[i]; if (!x) return; closePalette();
  if (x.go) location.hash = x.go; else if (x.part) participantDetail(x.part); else if (x.edit) editById(x.edit[0], x.edit[1]); else if (x.add) editRow(x.add[0], null, typeof x.add[1] === 'string' ? defaultsFor(x.add[1]) : x.add[1]);
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { if (S.member) { e.preventDefault(); openPalette(); } return; }
  if ($('pal') && !$('pal').hidden) {
    if (e.key === 'Escape') { closePalette(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, Math.min(PAL.length - 1, palSel + (e.key === 'ArrowDown' ? 1 : -1))); document.querySelectorAll('.pal-it').forEach((b, i) => b.classList.toggle('on', i === palSel)); document.querySelector('.pal-it.on')?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter') { e.preventDefault(); runPal(palSel); }
  }
});
document.addEventListener('input', e => { if (e.target.id === 'palIn') palRender(e.target.value); });
document.addEventListener('mousedown', e => { if (e.target.id === 'pal') closePalette(); });
try { const th = localStorage.getItem('circle-theme'); if (th) document.documentElement.dataset.theme = th; } catch (_) { }

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
  <button class="btn" data-act="logout" type="button">Se déconnecter</button></div></div>`;
}
async function start(session) {
  S.user = session?.user || null;
  if (!S.user) { S.member = null; return loginView(); }
  const { data } = await sb.from('team_members').select('*').eq('user_id', S.user.id).maybeSingle();
  S.member = data || null;
  if (!S.member) { const { data: ok } = await sb.rpc('claim_invite'); if (ok) { const r = await sb.from('team_members').select('*').eq('user_id', S.user.id).maybeSingle(); S.member = r.data || null; } }
  if (!S.member) return notAllowedView();
  shell(); lastHash = location.hash.split('/')[0]; route();
}
let started = false;
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    if (event === 'SIGNED_IN' && started && S.member) return;
    started = true; setTimeout(() => start(session), 0);
  }
});
