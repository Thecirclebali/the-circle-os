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
const today = () => new Date().toISOString().slice(0, 10);
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
const EXP_CATS = ['Villa', 'Coach', 'Excursions', 'Dîners', 'Courses maison', 'Petites dépenses', 'Surf & activités', 'Transport', 'Matériel & cadeaux', 'Publicité', 'Contenu & sponsoring', 'Visas', 'Banque & outils', 'Charges sociales', 'Assurance', 'Frais de change', 'Événements & meetups', 'Outils formation', 'Gain fondateurs', 'À clarifier'];
const EXP_TYPES = [['Coût édition', 'Coût de l’édition'], ['Marketing', 'Marketing'], ['Structure', 'Structure (banque, charges…)'], ['Frais fondateurs', 'Avance sur gain d’un fondateur'], ['À clarifier', 'À clarifier']];
const typeLabel = t => (EXP_TYPES.find(x => x[0] === t) || [t, t])[1];
const DOC_TYPES = ['Contrat', 'CGV', 'Code de conduite', 'Règlement villa', 'Décharge', 'Droit image', 'Passeport', 'Visa', 'Assurance', 'Billets', 'Contact urgence', 'Fiche médicale'];
const JOURNAL_KINDS = ['Remarque', 'Problème', 'Contenu filmé', 'Changement', 'Bonne idée', 'Retour participant'];
const PAID_BY = [['Caisse Circle', 'Argent de The Circle'], ['Youssef', 'Youssef (de sa poche)'], ['Nahed', 'Nahed (de sa poche)']];

/* Définition des formulaires : [clé, libellé, type, requis, options] */
const SCHEMAS = {
  leads: { title: 'Personne / lead', fields: [['full_name', 'Nom et prénom', 'text', 1], ['phone', 'Téléphone / WhatsApp', 'text'], ['email', 'E-mail', 'email'], ['source', 'Vient de', 'select', 1, SOURCES], ['edition_id', 'Édition visée', 'edition'], ['status', 'Statut', 'select', 1, LEAD_STATUSES], ['country', 'Pays', 'text'], ['age', 'Âge', 'number'], ['room_type', 'Chambre', 'select', 0, ROOMS], ['proposed_price_eur', 'Prix proposé (€)', 'number'], ['referral_code_used', 'Code de parrainage utilisé', 'text'], ['next_action', 'Prochaine action', 'text'], ['next_action_date', "Date de l'action", 'date'], ['owner', 'Responsable', 'select', 0, OWNERS], ['consent_contact', 'Accepte d’être contacté', 'bool'], ['lost_reason', 'Motif de refus', 'text'], ['notes', 'Notes', 'textarea']] },
  participants: { title: 'Participant', fields: [['full_name', 'Nom et prénom', 'text', 1], ['edition_id', 'Bootcamp', 'edition', 1], ['room_type', 'Chambre', 'select', 0, ROOMS], ['price_eur', 'Prix total à payer (€)', 'number', 1], ['pay_currency', 'Paie en', 'select', 1, ['EUR', 'TND']], ['status', 'Statut', 'select', 1, ['Confirmé', 'Reporté', 'Annulé', 'Exclu']], ['phone', 'Téléphone / WhatsApp', 'text'], ['email', 'E-mail', 'email'], ['instagram', 'Instagram', 'text'], ['birth_date', 'Date de naissance', 'date'], ['country', 'Pays', 'text'], ['city', 'Ville', 'text'], ['profession', 'Profession', 'text'], ['emergency_contact', "Contact d'urgence (nom, lien, téléphone)", 'text'], ['source', 'Vient de', 'select', 0, SOURCES], ['referred_by', 'Parrainé par (code)', 'text'], ['project', 'Projet / objectif', 'text'], ['last_contact', 'Dernier contact', 'date'], ['next_followup', 'Prochaine relance', 'date'], ['circle_club', 'Membre du Circle Club', 'bool'], ['ambassador', 'Ambassadeur', 'bool'], ['consent_marketing', 'Accepte de recevoir nos nouvelles', 'bool'], ['notes', 'Notes', 'textarea']] },
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
  edition_budget_lines: { title: 'Ligne de budget', fields: [['edition_id', 'Bootcamp', 'edition', 1], ['category', 'Poste', 'text', 1], ['amount_eur', 'Montant (€)', 'number', 1]] },
  transfers: { title: 'Retrait, change ou virement', fields: [['kind', 'Type', 'select', 1, ['Retrait espèces', 'Change de devises', 'Virement interne', 'Dépôt espèces']], ['done_on', 'Date', 'date'], ['edition_id', 'Bootcamp', 'edition'], ['from_account', 'Sorti de', 'account'], ['from_amount', 'Montant sorti', 'number'], ['from_currency', 'Devise sortie', 'select', 1, CURR], ['to_account', 'Arrivé sur', 'account'], ['to_amount', 'Montant arrivé', 'number'], ['to_currency', 'Devise arrivée', 'select', 1, CURR], ['file', 'Reçu / capture', 'file', 0, 'file_path'], ['notes', 'Notes', 'textarea']] },
  cash_counts: { title: 'Comptage de caisse', fields: [['account', 'Caisse', 'account', 1], ['counted_on', 'Date', 'date', 1], ['amount', 'Montant compté (dans la devise de la caisse)', 'number', 1], ['notes', 'Notes', 'text']] },
  accounts: { title: 'Compte', key: 'name', fields: [['name', 'Nom du compte', 'text', 1], ['holder', 'Titulaire', 'text'], ['currency', 'Devise', 'text'], ['notes', 'Notes', 'textarea'], ['sort', 'Ordre', 'number']] }
};

function fieldHtml([k, label, type, req, opt], v) {
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
  openDrawer(`${drawerHead(`${isNew ? 'Ajouter' : 'Modifier'} · ${sc.title}`)}
  <form class="form" id="gform">${sc.fields.filter(f => !(f[0] === key && !isNew && table === 'editions')).map(f => fieldHtml(f, f[2] === 'file' ? data[f[4]] : data[f[0]])).join('')}
  ${fileCols.filter(c => row && row[c]).map(c => `<button class="btn" type="button" data-act="file" data-path="${esc(row[c])}">Ouvrir la pièce jointe</button>`).join('')}
  <div class="row-actions">${isNew ? '' : '<button class="btn danger" type="button" id="del">Supprimer</button>'}<button class="btn primary" type="submit">Enregistrer</button></div></form>${extra}`);
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
  return `<div class="sub-section"><div class="head"><h3>Détail de cette transaction</h3><button class="btn sm" type="button" data-act="add" data-t="expense_lines" data-def="${J({ expense_id: row.id })}" data-back="exp:${row.id}">Ajouter une ligne</button></div>
  <p class="muted">Utile pour un retrait Bourso, un paiement carte ou un retrait d’espèces qui a servi à plusieurs choses. Écrivez à quoi a servi l’argent : la différence non détaillée reste « à clarifier ».</p>
  <table><tbody>${lines.map(l => `<tr class="click" data-act="edit" data-t="expense_lines" data-id="${l.id}" data-back="exp:${row.id}"><td>${esc(l.label)}<div class="muted">${esc(l.category || '')}</div></td><td>${l.file_path ? pill('Justif.', 'good') : ''}</td><td class="n">${EUR(l.amount_eur)}</td></tr>`).join('')}
  <tr><td><b>Total détaillé</b></td><td></td><td class="n"><b>${EUR(det)}</b> / ${EUR(row.amount_eur)}</td></tr>
  ${lines.length ? `<tr><td>${Math.abs(rest) < 1 ? 'Tout est détaillé' : rest > 0 ? 'Reste à détailler' : 'Détail supérieur au montant'}</td><td></td><td class="n">${Math.abs(rest) < 1 ? pill('OK', 'good') : pill(EUR(rest), 'bad')}</td></tr>` : ''}</tbody></table></div>`;
};
SCHEMAS.participant_files.afterSave = async rec => { if (rec.participant_id && DOC_TYPES.includes(rec.doc_type)) await q(sb.from('participant_documents').upsert({ participant_id: rec.participant_id, doc_type: rec.doc_type, received: true, received_at: today() }, { onConflict: 'participant_id,doc_type' })); };
/* Fiche lead : inscrire comme participant */
SCHEMAS.leads.extra = async row => `<div class="sub-section"><h3>Inscription</h3><p class="muted">Quand la personne a payé sa première tranche, créez sa fiche participant en un clic (les infos sont reprises).</p><button class="btn primary" type="button" data-act="convert" data-id="${row.id}">Inscrire comme participant</button></div>`;

/* ---------- Données & calculs financiers ---------- */
async function loadData() {
  await ensureLookups();
  const [parts, pays, exps, lines, budget, transfers, counts] = await Promise.all([
    load('participants', 'full_name', true), load('payments', 'paid_on'), load('expenses', 'spent_on'),
    q(sb.from('expense_lines').select('*')), q(sb.from('edition_budget_lines').select('*')),
    q(sb.from('transfers').select('*').order('done_on', { ascending: false, nullsFirst: false })), q(sb.from('cash_counts').select('*').order('counted_on', { ascending: false }))
  ]);
  return { eds: S.cache.editions, parts, pays, exps, lines, budget, transfers, counts };
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
  const pays = D.pays.filter(x => x.edition_id === id), exps = D.exps.filter(x => x.edition_id === id);
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
  const coutsPrev = Math.max(couts, budget);
  const prev = split(enc + reste - coutsPrev - fraisChange);
  return { ed, parts, active, reported, avoirs, fraisChange, pays, exps, costs, adv, enc, attendu, reste, couts, avY, avN, avX, budget, coutsPrev, now, prev, pct };
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
  add('Dépenses marquées « à clarifier »', 'On ne sait pas encore à quoi elles correspondent.', exps.filter(x => x.type === 'À clarifier').map(x => ({ label: `${x.description || 'Sans description'} · ${fmtD(x.spent_on)}`, amount: x.amount_eur, act: `data-act="edit" data-t="expenses" data-id="${x.id}"` })), 'bad');
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
const VIEWS = [['accueil', 'Accueil'], ['crm', 'CRM · prospects'], ['annuaire', 'Annuaire'], ['editions', 'Éditions'], ['participants', 'Participants'], ['finances', 'Finances'], ['alumni', 'Alumni & parrainage'], ['partenaires', 'Partenaires'], ['documents', 'Documents'], ['securite', 'Sécurité'], ['pilotage', 'Tâches & décisions'], ['reglages', 'Réglages']];
function shell() {
  $('root').innerHTML = `<aside id="side">
    <div class="brand"><svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="13" fill="none" stroke="#4FB3A9" stroke-width="3"/><circle cx="17" cy="17" r="6" fill="none" stroke="#E8B04F" stroke-width="2"/></svg><div><b>THE CIRCLE</b><small>Bali · espace de gestion</small></div></div>
    <nav id="nav"></nav>
    <div class="side-foot"><span>Connecté : ${esc(S.member?.display_name || S.user.email)}</span><button data-act="logout" type="button">Se déconnecter</button></div>
  </aside>
  <main><div class="top"><button class="btn menu-btn" data-act="menu" type="button" aria-label="Ouvrir le menu">Menu</button><div><h1 id="title"></h1><p id="subtitle"></p></div><div class="actions" id="actions"></div></div><div class="wrap" id="view"><div class="loading">Chargement…</div></div></main>
  <div class="fab-wrap"><div class="fab-menu" id="fabMenu">
    <button type="button" data-act="add" data-t="leads" data-def="${J({ status: 'Nouveau', source: 'Formulaire' })}">Nouvelle personne (formulaire, pub…)</button>
    <button type="button" data-act="add" data-t="participants" data-def="${J({ status: 'Confirmé', pay_currency: 'TND' })}">Nouveau participant</button>
    <button type="button" data-act="add" data-t="payments" data-def="paydef">Encaissement</button>
    <button type="button" data-act="add" data-t="expenses" data-def="expdef">Dépense</button>
    <button type="button" data-act="photo">Photo d’un ticket (dépense à compléter)</button>
    <button type="button" data-act="add" data-t="transfers" data-def="trdef">Retrait, change ou virement</button>
    <button type="button" data-act="add" data-t="edition_journal" data-def="jdef">Note d’édition (remarque, problème, contenu)</button>
    <button type="button" data-act="add" data-t="tasks" data-def="${J({ owner: 'Les deux' })}">Tâche</button>
  </div><button class="fab" type="button" data-act="fab" aria-label="Ajouter">+</button></div><input type="file" id="photoIn" accept="image/*,.pdf" capture="environment" hidden>`;
}
function setHead(t, s, actions = '') { $('title').textContent = t; $('subtitle').textContent = s; $('actions').innerHTML = actions; }
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
  const lines = D.budget.filter(b => b.edition_id === s.ed.id);
  const real = {}; s.costs.forEach(x => real[x.category] = (real[x.category] || 0) + N(x.amount_eur));
  const used = new Set();
  const rows = lines.sort((a, b) => b.amount_eur - a.amount_eur).map(l => { const cats = BUDGET_MAP[l.category] || [l.category]; cats.forEach(c => used.add(c)); return { name: l.category, plan: N(l.amount_eur), real: sum(cats, c => real[c] || 0), id: l.id }; });
  const others = Object.entries(real).filter(([c]) => !used.has(c));
  const imp = rows.find(r => /impr[eé]vu/i.test(r.name));
  if (imp) { imp.real += sum(others, o => o[1]); imp.detail = others.map(([c, v]) => `${c} ${EUR(v)}`).join(' · '); }
  else others.forEach(([c, v]) => rows.push({ name: c, plan: 0, real: v }));
  if (fraisOf(s)) rows.push({ name: 'Pertes de change (calculées)', plan: 0, real: fraisOf(s) });
  const tp = sum(rows, r => r.plan), tr = sum(rows, r => r.real);
  const copy = `<div class="inline"><select id="cbFrom">${D.eds.filter(e => e.id !== s.ed.id && D.budget.some(b => b.edition_id === e.id)).map(e => `<option value="${e.id}">${esc(e.skill)} · ${e.id}</option>`).join('')}</select><button class="btn sm" type="button" data-act="copybudget" data-id="${s.ed.id}">Copier ce budget ici</button></div>`;
  return `<div class="card"><div class="head"><h2>Prévu / réel par poste</h2><button class="btn sm" type="button" data-act="add" data-t="edition_budget_lines" data-def="${J({ edition_id: s.ed.id })}">+ Poste prévu</button></div>
  ${lines.length ? '' : `<p class="muted">Pas encore de budget prévu pour cette édition. Copiez celui d’une autre édition, puis ajustez.</p>${copy}`}
  <div class="table-wrap"><table class="bvr"><thead><tr><th>Poste</th><th class="n">Prévu</th><th class="n">Réel</th><th style="min-width:160px"></th><th class="n">Écart</th></tr></thead><tbody>
  ${rows.map(r => { const over = r.plan && r.real > r.plan; return `<tr ${r.id ? `class="click" data-act="edit" data-t="edition_budget_lines" data-id="${r.id}"` : ''}><td>${esc(r.name)}${r.detail ? `<div class="muted">${esc(r.detail)}</div>` : ''}</td><td class="n">${r.plan ? EUR(r.plan) : '—'}</td><td class="n">${EUR(r.real)}</td><td>${r.plan ? pbar(r.real / r.plan, Math.round(r.real / r.plan * 100) + ' %').replace('class="pbar', `class="pbar ${over ? 'over' : ''}`) : ''}</td><td class="n ${over ? 'neg' : ''}">${r.plan ? (r.real - r.plan > 0 ? '+' : '') + EUR(r.real - r.plan) : 'hors budget'}</td></tr>`; }).join('')}
  <tr class="sep"><td><b>Total</b></td><td class="n"><b>${EUR(tp)}</b></td><td class="n"><b>${EUR(tr)}</b></td><td>${tp ? pbar(tr / tp) : ''}</td><td class="n"><b class="${tr > tp && tp ? 'neg' : ''}">${tp ? EUR(tr - tp) : ''}</b></td></tr></tbody></table></div></div>`;
}
const fraisOf = s => N(s.fraisChange);
function envelope(s) {
  const e = s.ed; if (!e.start_date || !e.end_date) return '';
  const envIdr = N(S.settings.enveloppe_courses_idr) || 4000000, envEur = toEur(envIdr, 'IDR');
  const start = new Date(e.start_date + 'T00:00:00'), weeks = Math.ceil((new Date(e.end_date + 'T00:00:00') - start) / 864e5 / 7) || 1;
  const ex = s.costs.filter(x => ['Courses maison', 'Petites dépenses'].includes(x.category));
  const rows = []; for (let i = 0; i < weeks; i++) { const a = new Date(+start + i * 7 * 864e5).toISOString().slice(0, 10), b = new Date(+start + (i + 1) * 7 * 864e5).toISOString().slice(0, 10); rows.push({ i, a, v: sum(ex.filter(x => x.spent_on && x.spent_on >= a && x.spent_on < b), x => x.amount_eur) }); }
  const outside = sum(ex.filter(x => !x.spent_on || x.spent_on < e.start_date || x.spent_on >= new Date(+start + weeks * 7 * 864e5).toISOString().slice(0, 10)), x => x.amount_eur);
  return `<div class="card"><div class="head"><h2>Enveloppe courses & petites dépenses</h2><span class="muted">${IDR(envIdr)} ≈ ${EUR(envEur)} par semaine · modifiable dans Réglages</span></div>
  <div class="paybars">${rows.map(r => `<div class="paybar"><div class="pb-head"><b>Semaine ${r.i + 1}</b><span class="muted">dès le ${fmtD(r.a)}</span><span class="num">${EUR(r.v)} / ${EUR(envEur)}</span></div>${pbar(r.v / envEur).replace('class="pbar', `class="pbar ${r.v > envEur ? 'over' : ''}`)}</div>`).join('')}</div>
  ${outside ? `<p class="muted">${EUR(outside)} de courses hors des semaines du bootcamp (avant, après ou sans date).</p>` : ''}<p class="muted">Pas besoin de noter chaque bouteille d’eau : une ligne « courses semaine 2 » avec la photo des tickets suffit.</p></div>`;
}
function owesBox(D, edId) {
  const o = whoOwes(D, edId);
  return `<div class="card owes"><div class="head"><h2>Qui doit quoi à qui</h2></div>${o.length ? o.map(x => `<div class="row"><div class="grow">La caisse The Circle doit <b>${EUR(x.total)}</b> à <b>${esc(x.who)}</b><div class="sub">${x.n} dépense(s) avancée(s) de sa poche</div></div><button class="btn sm" type="button" data-act="reimburse" data-who="${esc(x.who)}" data-ed="${esc(edId || '')}">Marquer remboursé</button></div>`).join('') : '<div class="empty-state">Personne n’a d’argent à récupérer</div>'}</div>`;
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
  return `<div class="grid g4">
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
    ['Participants en cours et à venir', P.filter(p => !INACTIVE.includes(p.status) && !isEnded(edOf(p.edition_id))).map(p => ({ n: p.full_name, s: `${edOf(p.edition_id)?.skill || ''} · ${p.edition_id}`, ph: p.phone, em: p.email, act: `data-act="part" data-id="${p.id}"` }))],
    ['Alumni', P.filter(p => !INACTIVE.includes(p.status) && isEnded(edOf(p.edition_id))).map(p => ({ n: p.full_name, s: `${edOf(p.edition_id)?.skill || ''} · ${p.edition_id}`, ph: p.phone, em: p.email, act: `data-act="part" data-id="${p.id}"` }))],
    ['Prospects', leads.filter(l => !['Payé', 'Perdu'].includes(l.status)).map(l => ({ n: l.full_name, s: `${l.status}${l.edition_id ? ' · ' + l.edition_id : ''}`, ph: l.phone, em: l.email, act: `data-act="edit" data-t="leads" data-id="${l.id}"` }))],
    ['Coachs', D.parts.length >= 0 ? S.cache.partners.filter(p => p.type === 'Coach' && p.status !== 'Retiré').map(p => ({ n: p.name, s: p.role || 'Coach', ph: p.contact, act: `data-act="edit" data-t="partners" data-id="${p.id}"` })) : []],
    ['Partenaires et prestataires', S.cache.partners.filter(p => p.type !== 'Coach' && p.status !== 'Retiré').map(p => ({ n: p.name, s: `${p.type}${p.role ? ' · ' + p.role : ''}`, ph: p.contact, act: `data-act="edit" data-t="partners" data-id="${p.id}"` }))],
    ['Équipe', team.map(m => ({ n: m.display_name, s: m.role || '' }))],
    ['Exclus, annulés, perdus', [...P.filter(p => INACTIVE.includes(p.status)).map(p => ({ n: p.full_name, s: `${p.status} · ${p.edition_id}`, ph: p.phone, act: `data-act="part" data-id="${p.id}"` })), ...leads.filter(l => l.status === 'Perdu').map(l => ({ n: l.full_name, s: `Prospect perdu${l.lost_reason ? ' · ' + l.lost_reason : ''}`, ph: l.phone, act: `data-act="edit" data-t="leads" data-id="${l.id}"` }))]]
  ];
  const qq = annQ.toLowerCase();
  const match = x => !qq || `${x.n} ${x.s} ${x.ph || ''} ${x.em || ''}`.toLowerCase().includes(qq);
  return `<div class="toolbar"><input type="search" id="annQ" placeholder="Rechercher un nom, un numéro, un e-mail…" value="${esc(annQ)}" class="search"></div>
  <div class="grid g2">${cats.map(([title, items]) => { const it = items.filter(match).sort((a, b) => a.n.localeCompare(b.n)); return `<div class="card"><div class="head"><h2>${title}</h2>${pill(it.length, 'mute')}</div><div class="list">${it.map(x => `<div class="row person"><div class="avatar">${esc((x.n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase())}</div><div class="grow ${x.act ? 'click' : ''}" ${x.act || ''}><div>${esc(x.n)}</div><div class="sub">${esc(x.s)}</div></div>${x.ph && /\d{6,}/.test(x.ph) ? `<a class="btn sm" href="${wa(x.ph)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}${x.em ? `<a class="btn sm" href="mailto:${esc(x.em)}">E-mail</a>` : ''}</div>`).join('') || '<div class="empty-state">Personne</div>'}</div></div>`; }).join('')}</div>`;
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
  setHead(`${e.skill} · ${e.id}`, `${fmtD(e.start_date)} → ${fmtD(e.end_date)}${coach ? ' · coach : ' + coach.name : ''} · ${e.status}`, `<a class="btn" href="#editions">← Éditions</a><button class="btn" type="button" data-act="edit" data-t="editions" data-id="${id}">Modifier</button>`);
  const tabs = [['resume', 'Résumé'], ['participants', `Participants (${s.parts.length})`], ['entrees', `Entrées (${s.pays.length})`], ['depenses', `Dépenses (${s.exps.length})`], ['journal', `Journal (${journal.length})`], ['incidents', `Incidents (${incidents.length})`], ['budget', 'Budget prévu']];
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
  if (edTab === 'entrees') body = `<div class="card"><div class="head"><h2>Ce que chacun doit payer</h2></div>${payBars(s.parts)}</div><div class="card"><div class="head"><h2>Tous les encaissements en détail</h2><button class="btn primary sm" type="button" data-act="add" data-t="payments" data-def="paydef">+ Encaissement</button></div>${payTable(s.pays, pn)}</div>`;
  if (edTab === 'depenses') body = `${quickBar(id)}${budgetVsReal(s, D)}<div class="split"><div class="card"><div class="head"><h2>Journal des dépenses</h2><button class="btn primary sm" type="button" data-act="add" data-t="expenses" data-def="expdef">+ Dépense détaillée</button></div>${expFeed(s.exps, D)}</div><div>${owesBox(D, id)}${envelope(s)}</div></div>`;
  if (edTab === 'journal') body = `<div class="card"><div class="head"><h2>Journal de l’édition</h2><button class="btn primary sm" type="button" data-act="add" data-t="edition_journal" data-def="jdef">+ Note</button></div><p class="muted">Remarques, problèmes, contenu filmé (avec le lien Drive), changements, retours des participants.</p>${journalFeed(journal)}</div>`;
  if (edTab === 'incidents') body = `<div class="card"><div class="head"><h2>Incidents</h2><button class="btn primary sm" type="button" data-act="add" data-t="incidents" data-def="${J({ edition_id: id, occurred_on: today(), status: 'Ouvert' })}">+ Incident</button></div><div class="list">${incidents.map(x => `<button type="button" class="row click" data-act="edit" data-t="incidents" data-id="${x.id}"><span class="stripe ${x.status === 'Clos' ? '' : 'bad'}"></span><div class="grow"><div><b>${esc(x.type)}</b> · ${fmtD(x.occurred_on)} ${pill(x.status, x.status === 'Clos' ? 'good' : 'warn')}</div><div class="sub">${esc(x.description)}</div>${x.decision ? `<div class="sub">Décision : ${esc(x.decision)}</div>` : ''}</div></button>`).join('') || '<div class="empty-state">Aucun incident</div>'}</div></div>`;
  if (edTab === 'budget') {
    const lines = D.budget.filter(b => b.edition_id === id).sort((a, b) => b.amount_eur - a.amount_eur), avg = s.active.length ? s.attendu / s.active.length : 2300;
    body = `<div class="card"><div class="head"><h2>Budget prévisionnel</h2><button class="btn primary sm" type="button" data-act="add" data-t="edition_budget_lines" data-def="${J({ edition_id: id })}">+ Poste</button></div><table><tbody>${lines.map(l => `<tr class="click" data-act="edit" data-t="edition_budget_lines" data-id="${l.id}"><td>${esc(l.category)}</td><td class="n">${EUR(l.amount_eur)}</td></tr>`).join('') || '<tr><td class="muted">Budget à construire</td></tr>'}
    ${s.budget ? `<tr class="sep"><td><b>Total prévu</b></td><td class="n"><b>${EUR(s.budget)}</b></td></tr><tr><td>Dépensé à ce jour</td><td class="n">${EUR(s.couts)} (${Math.round(s.couts / s.budget * 100)} %)</td></tr><tr><td>Seuil sans perte (prix moyen ${EUR(avg)})</td><td class="n">${Math.ceil(s.budget / avg)} participants</td></tr><tr><td>Gain chacun à 12 participants</td><td class="n">${EUR((12 * avg - s.budget) * (1 - s.pct) / 2)}</td></tr>` : ''}</tbody></table></div>`;
  }
  return `<div class="tabs page-tabs">${tabs.map(([k, l]) => `<button type="button" data-act="tab" data-v="${k}" class="${edTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
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
    ${lines.length ? `<div class="sub">Détail : ${lines.map(l => `${esc(l.label)} ${EUR(l.amount_eur)}`).join(' · ')}${rest > 1 ? ` · <span class="warn-t">${EUR(rest)} non détaillés</span>` : ''}</div>` : ''}</div>
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
  const tabs = [['resume', 'Vue d’ensemble'], ['entrees', 'Entrées'], ['depenses', 'Dépenses'], ['gain', 'Gain fondateurs'], ['comptes', 'Comptes & circuit de l’argent'], ['clarifier', `À clarifier (${sum(clar.filter(g => g.kind !== 'mute'), g => g.items.length)})`]];
  let body = '';
  if (finTab === 'resume') body = `<div class="grid g4">${kpi('Encaissé', EUR(tot(s => s.enc)), `sur ${EUR(tot(s => s.attendu))} attendus`)}${kpi('Reste à encaisser', EUR(tot(s => s.reste)), `${sum(all, s => s.parts.filter(b => b.reste > 1).length)} personne(s)`)}${kpi('Dépenses', EUR(tot(s => s.couts)), 'hors avances sur gain')}${kpi('Gain chacun aujourd’hui', EUR(tot(s => s.now.part)), `prévu : ${EUR(tot(s => s.prev.part))}`)}</div>
    <div class="card"><div class="head"><h2>Par édition</h2></div><div class="table-wrap"><table><thead><tr><th>Édition</th><th style="min-width:160px">Encaissement</th><th class="n">Encaissé</th><th class="n">Reste</th><th class="n">Dépenses</th><th class="n">Résultat</th><th class="n">Gain chacun (prévu)</th></tr></thead><tbody>${all.map(s => `<tr class="click" data-act="go" data-href="#edition/${s.ed.id}"><td><b>${esc(s.ed.skill)}</b><div class="muted">${s.ed.id}</div></td><td>${pbar(s.attendu ? s.enc / s.attendu : 0)}</td><td class="n">${EUR(s.enc)}</td><td class="n">${EUR(s.reste)}</td><td class="n">${EUR(s.couts)}</td><td class="n">${EUR(s.now.res)}</td><td class="n">${EUR(s.prev.part)}</td></tr>`).join('')}</tbody></table></div><p class="muted">Les éditions de l’été 2026 n’ont que les encaissements importés du Drive : leurs dépenses restent à saisir.</p></div>`;
  if (finTab === 'entrees') body = all.filter(s => s.parts.length || s.pays.length).map(s => `<div class="card"><div class="head"><h2>${esc(s.ed.skill)} · ${s.ed.id}</h2><span class="muted">${EUR(s.enc)} / ${EUR(s.attendu)} · manque ${EUR(s.reste)}</span></div>${pbar(s.attendu ? s.enc / s.attendu : 0, `${Math.round(s.attendu ? s.enc / s.attendu * 100 : 0)} % encaissé`)}<div style="height:10px"></div>${payBars(s.parts)}<details class="more-detail"><summary>Voir les ${s.pays.length} encaissements en détail</summary>${payTable(s.pays, pn)}</details></div>`).join('') || '<div class="card"><div class="empty-state">Aucun encaissement</div></div>';
  if (finTab === 'depenses') {
    const exps = (finEdition ? D.exps.filter(x => x.edition_id === finEdition) : D.exps).filter(x => !expCat || x.category === expCat);
    const cats = {}; (finEdition ? D.exps.filter(x => x.edition_id === finEdition) : D.exps).filter(x => x.type !== 'Frais fondateurs').forEach(x => cats[x.category] = (cats[x.category] || 0) + N(x.amount_eur));
    body = `${quickBar(finEdition)}<div class="split"><div class="card"><div class="head"><h2>Journal des dépenses</h2><button class="btn sm" type="button" data-act="import">Importer un relevé (CSV)</button><select id="expCat" data-var="expCat"><option value="">Toutes catégories</option>${EXP_CATS.map(c => `<option ${c === expCat ? 'selected' : ''}>${c}</option>`).join('')}</select></div><p class="muted">Chaque dépense peut avoir une photo / facture, et être détaillée (ex. un retrait Bourso qui a servi à l’excursion et aux courses). Les petites courses du coin : catégorie « Petites dépenses », une ligne par semaine suffit.</p>${expFeed(exps, D)}</div><div>${owesBox(D, finEdition)}<div class="card"><div class="head"><h2>Par catégorie</h2></div>${catChart(cats)}</div></div></div>`;
  }
  if (finTab === 'gain') body = all.filter(s => s.enc || s.couts).map(s => gainTable(s, `${esc(s.ed.skill)} · ${s.ed.id}`)).join('') + `<div class="card"><div class="head"><h2>Avances sur gain enregistrées</h2></div>${expFeed(D.exps.filter(x => x.type === 'Frais fondateurs' && (!finEdition || x.edition_id === finEdition)), D)}</div>`;
  if (finTab === 'comptes') body = comptesHtml(D);
  if (finTab === 'clarifier') body = `<p class="muted">Chaque ligne s’ouvre : corrigez directement et elle disparaît de la liste. Les totaux se recalculent seuls.</p>${clarifyHtml(clar)}`;
  return `<div class="toolbar"><label for="finEd" class="muted">Édition</label><select id="finEd" data-var="finEdition">${edOpts(finEdition)}</select></div><div class="tabs page-tabs">${tabs.map(([k, l]) => `<button type="button" data-act="setvar" data-k="finTab" data-v="${k}" class="${finTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
};

/* Alumni */
V.alumni = async () => {
  setHead('Alumni & parrainage', 'Les participants passent ici automatiquement à la fin de leur bootcamp, avec toutes leurs informations et leurs fichiers.');
  const D = await loadData();
  const leads = await load('leads');
  const al = D.parts.filter(p => !INACTIVE.includes(p.status) && isEnded(D.eds.find(e => e.id === p.edition_id)));
  const refCount = code => code ? D.parts.filter(x => (x.referred_by || '').toUpperCase() === code).length + leads.filter(l => (l.referral_code_used || '').toUpperCase() === code).length : 0;
  const t = today();
  const due = al.filter(p => !p.next_followup || p.next_followup <= t);
  const f = S.settings.parrainage_filleul_eur || 150, r = S.settings.parrainage_parrain_eur || 150;
  return `<div class="grid g4">${kpi('Alumni', al.length, `${new Set(al.map(p => p.edition_id)).size} bootcamps`)}${kpi('À recontacter', due.length, 'relance due ou jamais planifiée')}${kpi('Filleuls', sum(al, p => refCount(p.referral_code)), 'prospects et inscrits avec un code')}${kpi('Circle Club', al.filter(p => p.circle_club).length, `${al.filter(p => p.ambassador).length} ambassadeur(s)`)}</div>
  <div class="split"><div class="card"><div class="head"><h2>Tous les alumni</h2></div><div class="table-wrap"><table><thead><tr><th>Nom</th><th>Bootcamp</th><th>Code</th><th class="n">Filleuls</th><th>Dernier contact</th><th>Relance</th><th></th></tr></thead><tbody>${al.sort((a, b) => (a.next_followup || '').localeCompare(b.next_followup || '')).map(p => `<tr class="click" data-act="part" data-id="${p.id}"><td><b>${esc(p.full_name)}</b>${p.ambassador ? ' ' + pill('Ambassadeur', 'good') : ''}${p.circle_club ? ' ' + pill('Club', 'mute') : ''}</td><td>${esc(p.edition_id)}</td><td><code>${esc(p.referral_code || '')}</code></td><td class="n">${refCount(p.referral_code)}</td><td>${fmtD(p.last_contact)}</td><td>${!p.next_followup ? pill('À planifier', 'warn') : p.next_followup <= t ? pill(fmtD(p.next_followup), 'bad') : fmtD(p.next_followup)}</td><td>${p.phone ? `<a class="btn sm" href="${wa(p.phone)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="empty-state">Aucun alumni</td></tr>'}</tbody></table></div></div>
  <div class="card"><div class="head"><h2>Programme de continuité</h2><a class="more" href="#reglages">Modifier les montants</a></div>
  <ol class="steps"><li><b>Code de parrainage personnel</b> créé automatiquement pour chaque participant (ex. CIRCLE-YANIS-457). Le filleul a <b>${f} €</b> de réduction, le parrain reçoit <b>${r} €</b> (ou une remise sur son prochain bootcamp) quand le filleul a payé.</li>
  <li><b>Relances</b> : J+7 (avis + photos), J+30 (où en est ton projet ?), J+90 (prochaine édition), puis tous les 6 mois. Cochez « contacté » dans la fiche, la prochaine date se calcule toute seule (+90 jours).</li>
  <li><b>Circle Club</b> : groupe WhatsApp privé des alumni, un live par mois avec un coach, des offres partenaires à Bali.</li>
  <li><b>Retour</b> : −15 % sur un 2ᵉ bootcamp (autre compétence), priorité sur les places.</li>
  <li><b>Ambassadeurs</b> : les 3 meilleurs parrains de l’année sont invités une semaine gratuite à la villa pendant une édition.</li>
  <li><b>Réunion annuelle</b> en Tunisie : un dîner ou un événement par an pour garder le lien et faire venir des prospects.</li></ol>
  <p class="muted">Pour qu’un parrainage compte : saisissez le code dans la fiche du prospect (« Code de parrainage utilisé ») ou dans la fiche participant (« Parrainé par »).</p></div></div>`;
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
  return `<div class="split"><div class="card"><div class="head"><h2>Paramètres de calcul</h2></div><div class="form">${S.settingsRows.sort((a, b) => a.key.localeCompare(b.key)).map(s => `<label class="field">${esc(s.description || s.key)}<div class="inline"><input type="text" value="${esc(s.value)}" id="set_${esc(s.key)}"><button class="btn sm" type="button" data-act="saveset" data-id="${esc(s.key)}">Enregistrer</button></div></label>`).join('')}</div></div>
  <div class="card"><div class="head"><h2>Comptes</h2><button class="btn sm primary" type="button" data-act="add" data-t="accounts" data-def="${J({ currency: 'EUR', sort: 100 })}">+ Compte</button></div><div class="list">${S.cache.accounts.map(a => `<button type="button" class="row click" data-act="edit" data-t="accounts" data-id="${esc(a.name)}"><div><b>${esc(a.name)}</b> <span class="muted">${esc(a.currency || '')}</span><div class="sub">${esc(a.holder || '')}${a.notes ? ' · ' + esc(a.notes) : ''}</div></div></button>`).join('')}</div>
  <div class="head" style="margin-top:14px"><h2>Éditions masquées</h2></div><div class="list">${hidden.map(e => `<button type="button" class="row click" data-act="edit" data-t="editions" data-id="${e.id}"><div>${esc(e.skill)} · ${e.id}<div class="sub">Ouvrir et décocher « Masquer » pour la réafficher</div></div></button>`).join('') || '<div class="empty-state">Aucune</div>'}</div></div></div>`;
};

/* ---------- Routing ---------- */
async function route() {
  if (!S.member) return;
  const [k, arg] = (location.hash || '#accueil').slice(1).split('/');
  const view = V[k] ? k : 'accueil', navKey = view === 'edition' ? 'editions' : view;
  if (view !== 'edition') edTab = edTab;
  $('nav').innerHTML = VIEWS.map(([key, l]) => `<a href="#${key}" class="${key === navKey ? 'on' : ''}"><span class="dot"></span>${l}</a>`).join('');
  $('side').classList.remove('open'); $('fabMenu').classList.remove('on');
  if (view !== 'edition' && view !== 'finances') S.ctxEdition = null;
  try { $('view').innerHTML = await V[view](arg ? decodeURIComponent(arg) : undefined); } catch (e) { console.error(e); $('view').innerHTML = `<div class="msg err">Impossible de charger cette page : ${esc(e.message)}</div>`; }
}
function backFn(back) {
  if (!back) return null;
  const [kind, id] = back.split(':');
  if (kind === 'part') return () => { route(); participantDetail(id); };
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
    case 'fab': $('fabMenu').classList.toggle('on'); break;
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
  const v = e.target.dataset.var; if (!v) return;
  if (v === 'crmEdition') crmEdition = e.target.value;
  if (v === 'finEdition') finEdition = e.target.value;
  if (v === 'expCat') expCat = e.target.value;
  route();
});
let annT;
document.addEventListener('input', e => { if (e.target.id === 'qIn') { $('qPrev').innerHTML = quickPreview(parseQuick(e.target.value)); return; } if (e.target.id === 'annQ') { annQ = e.target.value; clearTimeout(annT); annT = setTimeout(async () => { const pos = e.target.selectionStart; await route(); const el = $('annQ'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } }, 250); } });
document.addEventListener('dragstart', e => { const c = e.target.closest('.lead'); if (c) e.dataTransfer.setData('text/plain', c.dataset.lead); });
document.addEventListener('dragover', e => { const c = e.target.closest('.col'); if (c) { e.preventDefault(); c.classList.add('over'); } });
document.addEventListener('dragleave', e => { const c = e.target.closest('.col'); if (c) c.classList.remove('over'); });
document.addEventListener('drop', async e => { const c = e.target.closest('.col'); if (!c) return; e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); await q(sb.from('leads').update({ status: c.dataset.status }).eq('id', id)); toast('Statut mis à jour : ' + c.dataset.status); route(); });
document.addEventListener('keydown', e => { if (e.target.id === 'qIn' && e.key === 'Enter') { e.preventDefault(); quickSave(); return; } if (e.key === 'Escape') { closeDrawer(); $('fabMenu')?.classList.remove('on'); } });

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
