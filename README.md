# The Circle OS

Espace de gestion interne de The Circle Bali : CRM, éditions, participants, finances, partenaires, documents, sécurité, alumni, tâches et décisions.

- Interface : fichiers statiques (HTML, CSS, JavaScript), hébergés sur GitHub Pages.
- Données : Supabase (projet `the-circle-os`, organisation The Circle). Aucune donnée n'est stockée dans ce dépôt.
- Sécurité : chaque table est protégée par des règles RLS ; seuls les comptes listés dans `team_members` peuvent lire ou écrire. La clé présente dans `config.js` est une clé publique prévue pour le navigateur.
- Connexion : lien magique envoyé par e-mail.

Fichiers :
- `index.html` : page de l'application
- `style.css` : design
- `app.js` : logique de l'application
- `config.js` : adresse du projet Supabase et taux TND
- `vendor-supabase.js` : bibliothèque Supabase embarquée (version 2.45.4), pour ne dépendre d'aucun service externe
