# Zafy — maquette et guide de design

Zafy (Zap + Safe) est un wallet Bitcoin Lightning **self-custodial** et **anti-arnaque** pour le Sénégal.
Problème : arnaques au mobile money (faux agents Wave / Orange Money, codes USSD piégés, vol de carte SIM).
Réponse : les clés restent sur le téléphone (un vol de SIM ne donne accès à rien), l'app aide à repérer les messages suspects et la communauté signale les escrocs via Nostr.

Ce document décrit **l'app telle qu'elle est construite** dans `../zafy_mobile`. En cas de doute, le code fait foi.

Contenu du dossier :
- `ecrans/` : capture de chaque écran de l'app (390 × 844, en 2x), avec des données de démonstration.
- `logo/` : logos SVG et PNG, icône d'app 1024 px.
- `sources/maquette-initiale/` : HTML de la première maquette (15 écrans), gardé pour l'historique. Il n'est plus à jour.

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
- **Form** : `Label`, `Input`, `TextArea`, `RecipientInput` (pastille initiale + boutons contact / coller / scanner), `AmountInput` (unité de la devise, équivalent en dessous), `ChoiceGroup` (segmenté ou grille).
- **FilterChips** : pastilles de filtre défilantes (active : fond navy).
- **DateRangePicker** : calendrier en feuille du bas (date unique ou plage).
- **ConfirmDialog** : carte de confirmation centrée (icône ronde, titre, message, Annuler / action) qui remplace l'alerte système ; variante danger en rouge.
- **SwipeToDelete** : glisser une ligne vers la gauche pour la supprimer, après confirmation.
- **QrCode** : QR dans un cadre blanc arrondi, logo Zafy au centre (correction d'erreur H). Taille commune 236 px.
- **CurrencyIcon** / **LanguageFlag** : icône de devise ou drapeau dans une pastille arrondie, bordure turquoise si sélectionné.
- **ReportedBanner** : bandeau rouge « Ton compte a été signalé ».
- **PinPad** / **PinInput** : clavier numérique avec empreinte, ou 4 cases.
- Icônes : traits 2 px arrondis, style Lucide (`Icon.tsx`).

---

## 3. Écrans et navigation

```
Bienvenue ─┬─ Inscription ──► Accueil
           ├─ Connexion ────► Accueil
           └─ Restaurer ────► Accueil

Accueil ─┬─ Envoyer ──► EnvoiOK          (contacts, scanner, alertes du destinataire)
         ├─ Recevoir                     (facture Zafy ou Lightning)
         ├─ + Ajouter ──► Recevoir / Sats de test
         ├─ Vérifier ──► Signaler
         ├─ Planifier ──► NouveauPlan / PaiementPlanifié
         └─ Activité ──► Transactions ──► Transaction
Alertes ──► AlerteDétail / Signaler
Profil ──► Mes 12 mots · Modifier mon profil · Mes contacts (──► Contact / AjouterContact)
         · Devise · Langue
Tabs : Accueil · Vérifier · Alertes · Profil
```

| Fichier | Écran | Contenu |
|---|---|---|
| A-Bienvenue | Accueil non connecté | Fond navy, logo, « zafy », slogan, « Créer mon compte » / « Se connecter ». |
| B-Inscription | Création de compte | Prénom, téléphone +221, code à 4 chiffres, « Tes clés sont créées sur ce téléphone ». |
| C-Connexion | Déverrouillage | Avatar, « Bon retour, Fatou », 4 points, clavier + empreinte, « Code oublié ? Restaurer mon wallet ». |
| D-Restaurer | Restauration | 12 mots (compteur et validation), prénom, téléphone, nouveau code. |
| 01-Accueil | Tableau de bord | Logo + avatar, carte portefeuille (solde dans la devise choisie, équivalent en sats, badge Test, bouton Ajouter), 4 actions, Activité (noms des contacts). |
| 02-Envoyer | Paiement | « À qui ? » (contact, coller, scanner), badges : contact reconnu (nom · numéro), type de destination, signalements Nostr ; montant dans la devise, montants rapides ; montant bloqué pour une facture. |
| 03-EnvoiOK | Confirmation | Coche, montant, « à Awa Diop », équivalent, frais, réseau, Terminé. |
| 04-Recevoir | Réception | QR de la facture (Zafy = facture Spark avec identité, ou Lightning pour un autre portefeuille), montant facultatif, Copier / Partager. |
| 05-Ajouter | Obtenir des sats | Recevoir, Acheter (Wave / Orange Money / Yas, « Bientôt »), Sats de test, vendeurs vérifiés. |
| 06-Verifier | Analyse d'un message | Expéditeur + message, Analyser, verdict et raisons, Signaler / Bloquer. |
| 07-Signaler | Signalement Nostr | Numéro ou adresse (coller, scanner), type d'arnaque (6), message facultatif, « Publié sur Nostr, sans ton nom ni ton numéro ». |
| 08-Alertes | Alertes communautaires | Hero « 47 arnaques signalées cette semaine », filtres Toutes / Numéros / Adresses, liste par nombre de signaleurs. |
| 09-AlerteDetail | Détail d'une alerte | Type, cible, « Signalé par 23 personnes », comportements, messages reçus, dates, signatures Nostr, « Moi aussi, je signale ». Version spéciale si c'est ton propre compte. |
| 10-Planifier | Paiements planifiés | Prochain paiement (hero), liste (glisser pour supprimer, badge « À payer »), Nouveau paiement. |
| 11-NouveauPlan | Créer / modifier | Pour quoi, à qui, montant (fixé dans la devise), fréquence, date + heure, envoi « Je confirme » / « Automatique ». |
| 12-Profil | Compte | Carte portefeuille (prénom, adresse, Copier), bandeau si signalé, QR « Ma carte » + Partager, sauvegarde des clés, liste des réglages, Se déconnecter. |
| 13-Transactions | Historique | Recherche, filtres type / période / dates, totaux reçus / envoyés, liste par jour. |
| 14-Transaction | Détail | Montant, type, statut, date, frais, destinataire, message, référence ; Supprimer de l'historique. |
| 15-PaiementPlanifie | Détail d'un paiement planifié | Montant, destinataire, fréquence, mode, échéance ; Modifier / Supprimer / Envoyer. |
| 16-Contacts | Annuaire | Recherche, liste (glisser pour supprimer), « Scanner une carte ». |
| 17-AjouterContact | Carte scannée | Prénom, numéro, adresse, vérification des signalements, Ajouter / Mettre à jour. |
| 18-Devise | Devise d'affichage | FCFA, Euro, Dollar, Satoshi avec icône et exemple de conversion. |
| 19-Langue | Langue | Français / English avec drapeaux. |
| 20-ModifierProfil | Profil | Prénom et téléphone. |
| 21-Cles | Mes 12 mots | Conseils de sécurité, mots cachés jusqu'au code ou à l'empreinte. |
| 22-SatsTest | Réseau de test | QR de l'adresse, étapes, Copier / Robinet. |

---

## 4. Fonctionnement

- **Portefeuille** : Breez SDK **Spark** (réseau de test Regtest pour l'instant). 12 mots BIP39 et code (haché) dans `expo-secure-store`, tout reste sur le téléphone.
- **Factures Zafy** : factures Spark qui contiennent l'identité de celui qui reçoit ; le payeur voit le nom de son contact, vérifié par cette identité (jamais par le texte de la facture). Facture Lightning classique pour les autres portefeuilles.
- **Carte de contact** : QR « Ma carte » (`zafy://ajouter-contact?n=…&p=…&a=…`) qui ajoute la personne à l'annuaire sans rien écrire.
- **Signalements** : événements Nostr kind `1984` signés avec une clé tirée des 12 mots (NIP-06), publiés sur damus, nos.lol et primal. La cible est un numéro, un compte Spark ou un nœud Lightning ; une personne compte une seule fois.
- **Vérification à l'envoi** : badge vert « Aucun signalement » ou rouge « Signalé par N personnes ».
- **Paiements planifiés** : stockage local, rappel par notification à l'heure choisie, envoi automatique possible quand l'app est ouverte. Montant fixé en FCFA, converti au taux du jour.
- **Devises** : FCFA, euro, dollar, sats ; taux Breez (CoinGecko en secours), le FCFA dérivé de l'euro (655,957).
- **Langues** : français et anglais (i18next), langue du téléphone au premier lancement.
- **Notifications** locales : paiement reçu, rappels, paiement automatique envoyé.
- **Encore factice** : l'analyse « Vérifier » (règles simples, l'IA reste à brancher) et l'achat via mobile money.
