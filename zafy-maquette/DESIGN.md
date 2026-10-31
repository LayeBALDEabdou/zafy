# Zafy — maquette et guide de design

Zafy (Zap + Safe) est un wallet Bitcoin Lightning **self-custodial** et **anti-arnaque** pour le Sénégal.
Problème : arnaques au mobile money (faux agents Wave / Orange Money, codes USSD piégés, vol de carte SIM).
Réponse : les clés restent sur le téléphone (un vol de SIM ne donne accès à rien), une IA analyse les messages suspects, et la communauté signale les escrocs via Nostr.

Contenu du dossier :
- `ecrans/` : rendu PNG (2x) de chaque écran, 390 × 844.
- `sources/` : HTML de chaque écran (styles inline). C'est **la référence exacte** pour les tailles, couleurs, icônes SVG et textes.
- `logo/` : logos SVG et PNG, icône d'app 1024 px.

---

## 1. Design tokens

### Couleurs
| Rôle | Hex |
|---|---|
| Fond de l'app | `#EEF3F8` |
| Cartes | `#FFFFFF` |
| Navy (texte principal, hero) | `#13213A` |
| Navy secondaire (cercle déco) | `#1E3256` |
| Turquoise (accent, boutons) | `#6EDDD6` |
| Turquoise foncé (logo sur fond clair) | `#1E9E95` |
| Texte turquoise / fond badge succès | `#157A73` / `#DDF7F5` |
| Texte secondaire | `#5B6B82` |
| Texte secondaire sur navy | `#C3CEDD` |
| Champs de saisie | `#F3F6FA` |
| Danger texte / fond | `#B4232A` / `#FDE8E8` |
| Avertissement | `#F5A524` / `#FFF1D6` |
| Bordure bouton secondaire sur navy | `#3A5078` |

### Typographie
- Titres et montants : **Sora** 600 / 700 (`@expo-google-fonts/sora`).
- Texte courant : **Inter** 400 / 500 / 600 (`@expo-google-fonts/inter`).
- Tailles : titre d'écran 20, solde 34, gros montant 56, corps 15, labels 14, petit 13, nav 12.

### Formes et espacements
- Padding d'écran : 24 haut, 20 côtés. Écart entre blocs : **24**.
- Rayons : cartes 20, hero 24 (28 sur l'écran succès), boutons 18, champs 14, chips 12-14, pastilles rondes.
- Bouton principal : hauteur 56, fond turquoise, texte navy Sora 700 16.
- Champs : hauteur 52, fond `#F3F6FA`, sans bordure.
- **Aucune ombre.** Le design est plat et aéré ; la dernière carte de l'écran prend la place restante (`flex: 1`) pour éviter les vides.

### Composants récurrents
- **Hero card** (navy, 190 px, rayon 24) avec deux cercles décoratifs : turquoise 190 px (right -50, top -60) et `#1E3256` 150 px (right 50, bottom -80), `overflow: hidden`.
- **Header d'écran** : bouton retour rond 44 px blanc avec chevron + titre Sora 20.
- **Bottom nav** (Accueil, Vérifier, Alertes, Profil) : fond blanc, rayon 24 24 0 0, l'icône active est remplie en turquoise et son label en navy gras.
- **Badges** : pastille arrondie, texte 13 600 (vert `#157A73`/`#DDF7F5`, rouge `#B4232A`/`#FDE8E8`).
- **Ligne d'activité** : point coloré 10 px, nom, badge montant (+ vert / − rouge).
- Icônes : traits 2 px, arrondis (style Lucide → `lucide-react-native`).

---

## 2. Écrans et navigation

```
Bienvenue ─┬─ Inscription ──► Accueil
           └─ Connexion ────► Accueil

Accueil ─┬─ Envoyer ──► EnvoiOK ──► Accueil
         ├─ Recevoir
         ├─ + Ajouter (hero) ──► Ajouter
         ├─ Vérifier ──► Signaler ──► Alertes
         ├─ Planifier ──► NouveauPlan
         └─ Avatar ──► Profil
Alertes ──► AlerteDetail / Signaler
Tabs : Accueil · Vérifier · Alertes · Profil
```

| Fichier | Écran | Contenu |
|---|---|---|
| A-Bienvenue | Accueil non connecté | Fond navy, logo, « zafy », slogan, boutons « Créer mon compte » / « Se connecter ». |
| B-Inscription | Création de compte | Prénom, téléphone +221, adresse Lightning générée (`771234567@zafy.app`), code PIN à 4 chiffres, « Tes clés sont créées sur ce téléphone ». |
| C-Connexion | Déverrouillage | Avatar, « Bon retour, Fatou », 4 points, clavier numérique + empreinte digitale, lien « Restaurer mon wallet ». |
| 01-Accueil | Tableau de bord | Logo + avatar, hero solde (sats + FCFA, bouton + Ajouter), 4 actions, carte Activité, bottom nav. |
| 02-Envoyer | Paiement | « À qui ? » (adresse, numéro ou scan QR) + badge « Aucun signalement » (vérif automatique), montant, chips rapides, solde et frais, bouton envoyer. |
| 03-EnvoiOK | Confirmation | Hero avec coche, montant, destinataire, détails (FCFA, frais, durée), boutons Reçu / Terminé. |
| 04-Recevoir | Réception | QR `lightning:fatou@zafy.app` avec logo au centre, adresse, montant optionnel, Partager. |
| 05-Ajouter | Obtenir des sats | Recevoir, Acheter (vendeurs P2P Wave / Orange Money), Gagner, Sats de test ; avertissement vendeurs vérifiés. |
| 06-Verifier | Analyse IA | Expéditeur + message reçu, Analyser, verdict « Arnaque probable » avec raisons, Signaler / Bloquer. |
| 07-Signaler | Signalement | Numéro de l'escroc, type (Faux agent, Code piégé, Envoyé par erreur, Faux lien), message facultatif, « Ton nom et ton numéro restent privés », Publier. |
| 08-Alertes | Liste communautaire | Hero « 47 arnaques signalées cette semaine », filtres, liste des alertes avec compteur, bouton Signaler. |
| 09-AlerteDetail | Détail d'une alerte | Numéro signalé, nombre de signalements, comportements, dates, « 23 signatures Nostr », Bloquer / Moi aussi. |
| 10-Planifier | Paiements récurrents | Prochain paiement (hero), liste (Loyer, Tontine, Maman, Crédit), + Nouveau paiement. |
| 11-NouveauPlan | Créer un paiement planifié | Destinataire, montant, fréquence (Une fois / Semaine / Mois), date, toggle « Confirmer avant d'envoyer ». |
| 12-Profil | Compte | Carte profil (même style que le hero), sauvegarde des clés, téléphone, langue, code, clé Nostr (npub), toggle alertes. |

---

## 3. Fonctionnement attendu

- **Wallet Lightning** : Breez SDK (Nodeless / Liquid) pour React Native. Clés générées et stockées sur l'appareil (`expo-secure-store`), phrase de récupération à sauvegarder.
- **Adresse Lightning** basée sur le numéro : `771234567@zafy.app`.
- **Vérification IA** : le message et l'expéditeur sont envoyés à une API LLM qui renvoie `{ verdict, score, raisons[] }`.
- **Signalements Nostr** : événement NIP-56 (kind `1984`) signé avec la clé Nostr de l'utilisateur (`nostr-tools`), publié sur des relais. Le numéro de l'escroc est haché ; l'identité du signaleur n'est pas révélée.
- **Vérification à l'envoi** : avant chaque paiement, l'app compte les signalements liés au destinataire et affiche un badge vert ou rouge.
- **Paiements planifiés** : stockage local + notification ; l'utilisateur confirme avant l'envoi (le téléphone doit être en ligne).
- **Conversion FCFA** : taux BTC/XOF récupéré via une API publique.

---

## 4. Consignes d'implémentation

- **Expo (SDK récent) + TypeScript + expo-router**, avec des tabs pour Accueil / Vérifier / Alertes / Profil et des écrans en stack pour le reste.
- Un fichier `theme.ts` reprenant exactement les tokens ci-dessus. Des composants réutilisables : `HeroCard`, `Card`, `PrimaryButton`, `ScreenHeader`, `Badge`, `ActivityRow`, `PinPad`.
- Reproduire les écrans **au pixel près** à partir des PNG et du HTML dans `sources/`.
- Commencer avec des données factices (Fatou, 125 400 sats…), puis brancher Breez SDK, Nostr et l'IA. Breez SDK nécessite un *development build* (`npx expo run:android`) : Expo Go ne suffit pas pour ce module.
- Textes de l'interface en français.
