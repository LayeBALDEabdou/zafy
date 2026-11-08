# Zafy — maquette et guide de design

Zafy (Zap + Safe) est un wallet Bitcoin Lightning **self-custodial** et **anti-arnaque** pour le Sénégal.
Problème : arnaques au mobile money (faux agents Wave / Orange Money, codes USSD piégés, vol de carte SIM).
Réponse : les clés restent sur le téléphone (un vol de SIM ne donne accès à rien), l'app aide à repérer les messages suspects et la communauté signale les escrocs via Nostr.

Ce document décrit **l'app telle qu'elle est construite** dans `../zafy_mobile`. En cas de doute, le code fait foi.

Contenu du dossier :
- `ecrans/` : capture de chaque écran de l'app (28 écrans, 390 × 844 en 2x), prise sur la vraie app avec des données de démonstration (Fatou Sow, ses contacts, des signalements fictifs).
- `logo/` : logos SVG et PNG, icône d'app 1024 px.
- `sources/maquette-initiale/` : HTML de la première maquette (15 écrans), gardé pour l'historique. Il n'est plus à jour : les captures de `ecrans/` font foi.

---

## 1. Design tokens

Définis dans `zafy_mobile/src/theme.ts`.

### Couleurs
| Rôle | Hex |
|---|---|
| Fond de l'app | `#EEF3F8` |
| Cartes | `#FFFFFF` |
| Navy (texte principal, hero, carte portefeuille) | `#13213A` |
| Navy secondaire (cercle déco, fond pastille) | `#1E3256` |
| Turquoise (accent, boutons) | `#6EDDD6` |
| Turquoise foncé (logo sur fond clair) | `#1E9E95` |
| Texte turquoise / fond badge succès | `#157A73` / `#DDF7F5` |
| Texte secondaire | `#5B6B82` |
| Texte secondaire sur navy | `#C3CEDD` |
| Champs de saisie | `#F3F6FA` |
| Danger texte / fond / point | `#B4232A` / `#FDE8E8` / `#E5484D` |
| Avertissement / fond / texte | `#F5A524` / `#FFF1D6` / `#8A5300` |
| Bordure bouton secondaire sur navy | `#3A5078` |
| Étiquette d'alerte (corail) | `#FF9F7A` |

### Typographie
- Titres et montants : **Sora** 600 / 700.
- Texte courant : **Inter** 400 / 500 / 600 / 700.
- Tailles : titre d'écran 20, solde 34, gros montant 56, corps 15, labels 14, petit 13, nav 12.

### Formes et espacements
- Padding d'écran : 24 haut, 20 côtés. Écart entre blocs : **24**.
- Rayons : cartes 20, hero 24, boutons 18, champs 14, chips 12-20, pastilles rondes.
- Bouton principal : hauteur 56, fond turquoise, texte navy Sora 700 16.
- Champs : hauteur 52, fond `#F3F6FA`, sans bordure.
- **Aucune ombre.** Le design est plat et aéré ; la dernière carte de l'écran prend la place restante pour éviter les vides.
- L'en-tête d'écran défile avec le contenu (il n'est pas fixe).

---

## 2. Composants (`zafy_mobile/src/components`)

- **WalletCard** (Accueil, Profil) : carte navy unie avec une carte turquoise qui dépasse derrière, logo en haut, et un bouton pilule turquoise posé en encoche sur le bord bas droit (« Ajouter », « Copier »).
- **HeroCard** : carte navy avec deux cercles décoratifs (turquoise en haut à droite, `#1E3256` en bas à gauche).
- **ScreenHeader** : bouton retour rond blanc 44 px + titre Sora 20. **TabTitle** pour les onglets.
- **TabBar** (Accueil, Vérifier, Alertes, Profil) : fond blanc, coins hauts arrondis 24 ; l'onglet actif a l'icône turquoise et le label navy gras. Historique et écrans liés mettent en avant leur onglet parent.
- **Button** : variantes `primary`, `secondary`, `outline`, `dark`, `muted`, `danger`.
- **Badge** : pastille arrondie (succès, danger, avertissement, neutre), avec icône facultative.
- **ActivityRow** : point coloré 10 px, libellé, badge montant (+ vert / − rouge).
- **Form** : `Label`, `Input`, `TextArea`, `RecipientInput` (pastille initiale + boutons contact / coller / scanner), `AmountInput` (unité de la devise, équivalent en dessous), `ChoiceGroup` (segmenté ou grille ; le segmenté sert de filtre dans Transactions et Alertes, sur fond blanc).
- **ProfileFields** : nom complet (au moins prénom + nom) et numéro +221 en chiffres uniquement (9 au plus), communs à Inscription, Restaurer et Modifier mon profil.
- **Toggle** : interrupteur (turquoise si activé).
- **Barre de recherche** (Transactions, Alertes) : champ blanc 52 px, icône loupe, croix pour effacer ; dans Transactions, bouton calendrier à droite (navy quand des dates sont choisies) et pastille « dates ✕ » sous les filtres.
- **Ligne de liste** (Transactions, Alertes) : pastille 40 px (initiale du contact, flèche reçue / envoyée, ou téléphone / éclair coloré selon la gravité), titre, ligne secondaire (heure · note, ou type · date), et à droite le montant en texte coloré ou le nombre de signalements dans une pastille.
- **DateRangePicker** : calendrier en feuille du bas (date unique ou plage).
- **ConfirmDialog** : carte de confirmation centrée (icône ronde, titre, message, Annuler / action) qui remplace l'alerte système ; variante danger en rouge.
- **SwipeToDelete** : glisser une ligne vers la gauche pour la supprimer, après confirmation.
- **QrCode** : QR dans un cadre blanc arrondi, logo Zafy au centre (correction d'erreur H). Taille commune 236 px.
- **CurrencyIcon** / **LanguageFlag** : icône de devise ou drapeau dans une pastille arrondie, bordure turquoise si sélectionné.
- **ReportedBanner** : bandeau rouge « Ton compte a été signalé ».
- **Badge « publié sur Nostr »** (Profil) : bouclier coché navy dans une pastille turquoise de 26 px, à droite du nom, visible quand le profil est publié dans l'annuaire.
- **PinPad** / **PinInput** : clavier numérique avec empreinte, ou 4 cases.
- Icônes : traits 2 px arrondis, style Lucide (`Icon.tsx`).

---

## 3. Écrans et navigation

```
Bienvenue ─┬─ Inscription ──► Accueil
           ├─ Connexion ────► Accueil
           └─ Restaurer ────► Accueil

Accueil ─┬─ Envoyer ──► EnvoiOK          (adresse Zafy, contacts, scanner, alertes du destinataire)
         ├─ Recevoir                     (QR de la facture Zafy, lien à partager)
         ├─ + Ajouter ──► Recevoir / Sats de test
         ├─ Vérifier ──► Signaler
         ├─ Planifier ──► NouveauPlan / PaiementPlanifié
         └─ Activité ──► Transactions ──► Transaction
Alertes ──► AlerteDétail / Signaler
Profil ──► Modifier mon profil · Mes contacts (──► Contact / AjouterContact)
         · Devise · Langue · Code et sécurité (──► Changer mon code / Mes 12 mots)
Liens reçus : …/payer?r=… ──► Envoyer (facture remplie) · …/ajouter-contact?n=… ──► AjouterContact
Tabs : Accueil · Vérifier · Alertes · Profil
```

| Fichier | Écran | Contenu |
|---|---|---|
| A-Bienvenue | Accueil non connecté | Fond navy, logo, « zafy », slogan, « Créer mon compte » / « Se connecter ». |
| B-Inscription | Création de compte | Nom complet, téléphone +221 (chiffres uniquement), aperçu de l'adresse Zafy, code à 4 chiffres. Refusé si le numéro est déjà utilisé par un autre compte. |
| C-Connexion | Déverrouillage | Avatar, « Bon retour, Fatou » (prénom), 4 points, clavier + empreinte (si activée), blocage après 5 codes faux, « Code oublié ? Restaurer mon wallet ». |
| D-Restaurer | Restauration | 12 mots (compteur et validation), nom complet, téléphone, nouveau code. |
| 01-Accueil | Tableau de bord | Logo + avatar, carte portefeuille (solde dans la devise choisie, équivalent en sats, badge Test, bouton Ajouter), 4 actions, Activité (noms des contacts). |
| 02-Envoyer | Paiement | « À qui ? » (adresse Zafy, numéro, adresse ou facture ; contact, coller, scanner), badges : compte Zafy trouvé (nom · numéro), contact reconnu, type de destination, signalements Nostr (« dont N de tes contacts », ou « Signalements non vérifiés ») ; montant dans la devise, montants rapides ; montant bloqué pour une facture. Paiement bloqué si l'adresse ne correspond pas au compte. |
| 03-EnvoiOK | Confirmation | Coche, montant, « à Awa Diop », équivalent, frais, réseau, Terminé. |
| 04-Recevoir | Réception | Un seul QR (facture Zafy, avec l'identité de celui qui reçoit), adresse Zafy copiable dessous, montant facultatif, « Copier la facture » / « Partager » (lien cliquable « Paie-moi 5 000 FCFA »). |
| 05-Ajouter | Obtenir des sats | Recevoir, Acheter (Wave / Orange Money / Yas, « Bientôt »), Sats de test, vendeurs vérifiés. |
| 06-Verifier | Analyse d'un message | Expéditeur + message, Analyser, verdict et raisons, Signaler / Bloquer. |
| 07-Signaler | Signalement Nostr | Numéro, adresse Zafy ou autre adresse (coller, scanner), type d'arnaque (6), message facultatif (280 caractères, compteur), « Publié sur Nostr, sans ton nom ni ton numéro ». Refusé pour son propre compte ou une cible déjà signalée. |
| 08-Alertes | Alertes communautaires | Recherche (numéro, adresse, nom, type), segmenté Toutes / Numéros / Adresses, « 47 arnaques signalées cette semaine », liste (pastille colorée selon la gravité, type · date, nombre de personnes), Réessayer si les relais ne répondent pas. |
| 09-AlerteDetail | Détail d'une alerte | Type, cible, « Signalé par 23 personnes », « Dont 2 de tes contacts », comportements, messages reçus, signalements du compte lié au numéro, dates, signatures Nostr ; « Moi aussi, je signale », ou « Retirer mon signalement » si on l'a déjà fait. Version spéciale si c'est ton propre compte. |
| 10-Planifier | Paiements planifiés | Prochain paiement (hero), liste (glisser pour supprimer, badge « À payer »), Nouveau paiement. |
| 11-NouveauPlan | Créer / modifier | Pour quoi, à qui (adresse Zafy, contact ou adresse Spark), montant (fixé dans la devise), fréquence, date + heure, rappel « L'argent ne part qu'après ta confirmation ». |
| 12-Profil | Compte | Carte portefeuille (nom complet, badge « publié sur Nostr », adresse Zafy `a.balde.776511631@zafy`, Copier), bandeau si signalé, QR « Ma carte » + Partager, sauvegarde des clés, réglages (Modifier mon profil, Mes contacts, Téléphone, Adresse Zafy : Activée / Publication… / Réessayer / Désactivée, Devise, Langue, Code et sécurité), Se déconnecter. |
| 13-Transactions | Historique | Recherche avec bouton calendrier, segmenté Toutes / Reçues / Envoyées, pastille des dates choisies, total « +reçu · −envoyé » sur une ligne, liste par jour (montant en texte coloré). |
| 14-Transaction | Détail | Montant, type, statut, date, frais, destinataire, message, référence ; Supprimer de l'historique. |
| 15-PaiementPlanifie | Détail d'un paiement planifié | Montant, destinataire, fréquence, échéance ; Sauter cette échéance, Modifier / Supprimer, Confirmer l'envoi. |
| 16-Contacts | Annuaire | Recherche, liste (glisser pour supprimer), « Scanner une carte ». |
| 17-AjouterContact | Carte scannée ou lien reçu | Nom, numéro, adresse, vérification des signalements, Ajouter / Mettre à jour. |
| 18-Devise | Devise d'affichage | FCFA, Euro, Dollar avec icône et exemple de conversion. |
| 19-Langue | Langue | Français / English avec drapeaux. |
| 20-ModifierProfil | Profil | Nom complet, téléphone (vérifié s'il change), interrupteur « Être payé avec mon numéro » avec l'adresse Zafy. |
| 21-Cles | Mes 12 mots | Conseils de sécurité, mots cachés jusqu'au code ou à l'empreinte. |
| 22-SatsTest | Réseau de test | QR de l'adresse, étapes, Copier / Robinet. |
| 23-Securite | Code et sécurité | Changer mon code, interrupteur empreinte, note sur le blocage ; Clés du portefeuille ; « Ce que les autres voient » (nom, adresse Zafy, adresse Spark, ou rien) et lien pour être trouvable ou non. |
| 24-ChangerCode | Changer mon code | Code actuel, nouveau code, confirmation (4 cases chacun) ; codes trop simples refusés. |

---

## 4. Fonctionnement

- **Portefeuille** : Breez SDK **Spark** (réseau de test Regtest pour l'instant). 12 mots BIP39 et code (haché, salé) dans `expo-secure-store`, tout reste sur le téléphone.
- **Compte** : nom complet et numéro sénégalais. **Un numéro = un compte** : l'inscription, la restauration et le changement de numéro sont refusés si l'annuaire montre ce numéro sur un autre portefeuille.
- **Annuaire et adresse Zafy** : profil Nostr remplaçable (kind 30078, `d = zafy-profile`) avec le nom, l'adresse Spark, l'empreinte SHA-256 du numéro et la clé Nostr signée par la clé d'identité Spark. L'adresse `a.balde.776511631@zafy` (initiale, nom, numéro) est retrouvée par l'empreinte du numéro ; le nom doit correspondre au compte. Profil retiré si l'utilisateur désactive « Être payé avec mon numéro ».
- **Factures Zafy** : factures Spark qui contiennent l'identité de celui qui reçoit ; le payeur voit le nom de son contact, vérifié par cette identité (jamais par le texte de la facture).
- **Liens** : carte de contact `https://zafy.vercel.app/ajouter-contact?n=…&p=…&a=…` et demande de paiement `https://zafy.vercel.app/payer?r=<facture>&n=…&m=5 000 FCFA`. Ils ouvrent l'app (App Links Android) ou la page web, qui renvoie vers l'app.
- **Signalements** : événements Nostr kind `1984` signés avec une clé tirée des 12 mots (NIP-06), publiés sur 5 relais (damus, nos.lol, primal, nostr.mom, snort). La cible est un numéro, un compte Spark, une adresse Bitcoin ou un nœud Lightning ; une personne compte une seule fois ; un numéro et le compte Zafy qui lui est lié sont comptés ensemble. Retrait possible par son auteur (kind 5).
- **Lecture des relais** : réponse dès que 2 relais ont fini (environ 1 s), mémoire d'une minute ; « rien trouvé » seulement si 2 relais ont vraiment répondu, sinon « vérification impossible ».
- **Vérification à l'envoi** : badge vert « Aucun signalement », rouge « Signalé par N personnes » (dont N contacts), ou orange « Signalements non vérifiés » ; rappelé dans la confirmation.
- **Paiements planifiés** : stockage local, rappel par notification à l'heure choisie, **toujours confirmés** par l'utilisateur. Montant fixé en FCFA, converti au taux du jour.
- **Sécurité** : code à 4 chiffres (codes trop simples refusés au changement), empreinte activable, blocage après 5 codes faux (30 s, puis le double, 15 min au plus).
- **Devises** : FCFA, euro, dollar ; taux Breez (CoinGecko en secours), le FCFA dérivé de l'euro (655,957). Les sats restent affichés en petit comme équivalent.
- **Langues** : français et anglais (i18next), langue du téléphone au premier lancement.
- **Notifications** locales : paiement reçu, rappels de paiements planifiés.
- **Encore factice** : l'analyse « Vérifier » (règles simples, l'IA reste à brancher) et l'achat via mobile money.
