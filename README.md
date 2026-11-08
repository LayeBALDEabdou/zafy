<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="zafy-maquette/logo/zafy-logo-horizontal-transparent-fond-sombre.png" />
    <img src="zafy-maquette/logo/zafy-logo-horizontal-fond-clair.png" alt="Zafy" width="260" />
  </picture>
</p>

**Un wallet Bitcoin Lightning self-custodial qui protège les Sénégalais contre les arnaques au mobile money.**

Faux agents Wave ou Orange Money, codes USSD piégés, messages « je t'ai envoyé de l'argent par erreur », vol de carte SIM : au Sénégal, une SIM volée ou un code donné à la mauvaise personne suffit souvent pour perdre son argent. Zafy garde les clés sur le téléphone, prévient avant de payer un escroc signalé et montre exactement à qui on envoie l'argent.

<table>
  <tr>
    <td align="center"><img src="zafy-maquette/ecrans/01-Accueil.png" width="190" alt="Accueil" /><br /><sub>Accueil</sub></td>
    <td align="center"><img src="zafy-maquette/ecrans/02-Envoyer.png" width="190" alt="Envoyer" /><br /><sub>Envoyer : contact + vérification</sub></td>
    <td align="center"><img src="zafy-maquette/ecrans/06-Verifier.png" width="190" alt="Vérifier un message" /><br /><sub>Vérifier un message</sub></td>
    <td align="center"><img src="zafy-maquette/ecrans/08-Alertes.png" width="190" alt="Alertes de la communauté" /><br /><sub>Alertes de la communauté (Nostr)</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="zafy-maquette/ecrans/04-Recevoir.png" width="190" alt="Recevoir" /><br /><sub>Recevoir (facture Zafy)</sub></td>
    <td align="center"><img src="zafy-maquette/ecrans/17-AjouterContact.png" width="190" alt="Ajouter un contact" /><br /><sub>Ajouter un contact par QR</sub></td>
    <td align="center"><img src="zafy-maquette/ecrans/10-Planifier.png" width="190" alt="Paiements planifiés" /><br /><sub>Paiements planifiés</sub></td>
    <td align="center"><img src="zafy-maquette/ecrans/13-Transactions.png" width="190" alt="Historique" /><br /><sub>Historique</sub></td>
  </tr>
</table>

Les 28 écrans sont dans [`zafy-maquette/ecrans/`](zafy-maquette/ecrans), et le guide de design dans [`zafy-maquette/DESIGN.md`](zafy-maquette/DESIGN.md).

---

## 1. Problème et utilisateurs

**Utilisateur principal :** un petit commerçant ou une famille au Sénégal qui envoie et reçoit de l'argent chaque jour (loyer, tontine, aide à la famille, paiements des clients) et qui est régulièrement visé par des arnaques au mobile money.

**Ce qui change au quotidien**

| Aujourd'hui (mobile money) | Avec Zafy |
|---|---|
| Le compte est lié à la carte SIM : une SIM volée peut vouloir dire de l'argent volé. | Les clés sont créées et gardées sur le téléphone. Une SIM volée ne donne accès à rien. |
| Un faux agent demande ton code secret par téléphone ou par SMS. | Zafy ne demande jamais de code par téléphone. L'écran **Vérifier** repère les messages d'arnaque typiques. |
| Tu paies un numéro sans savoir s'il a été signalé. | Avant chaque paiement, Zafy affiche **« Signalé par N personnes »** ou **« Aucun signalement »**, grâce aux signalements de la communauté sur Nostr. |
| Tu recopies un long numéro en espérant ne pas te tromper. | Chaque compte a une **adresse Zafy** lisible, `a.balde.776511631@zafy` : l'app affiche le nom du destinataire avant de payer, et bloque le paiement si le nom ne correspond pas au numéro. Ou scanne une fois sa **carte Zafy** : son nom s'affiche ensuite à chaque paiement et dans l'historique. |
| Le loyer et la tontine dépendent de ta mémoire. | **Paiements planifiés** avec un rappel à l'heure choisie : l'argent ne part qu'après ta confirmation. Les montants peuvent être fixés en FCFA. |

**Portée (objectif de pilote, pas encore mesuré) :** un marché de Dakar, environ 50 commerçants, qui reçoivent chacun environ 20 paiements par semaine, soit environ 1 000 paiements par semaine vérifiés par les signalements de la communauté. La [section 8](#8-métriques-à-suivre) liste ce que nous mesurerons.

---

## 2. Ce qui fonctionne aujourd'hui

| Fonction | État |
|---|---|
| **Compte** : nom complet et numéro sénégalais (9 chiffres), 12 mots BIP39 créés sur le téléphone, restauration avec les 12 mots | ✅ Réel (Breez SDK Spark) |
| **Un numéro = un compte** : à l'inscription, à la restauration et au changement de numéro, l'app refuse un numéro déjà utilisé par un autre portefeuille | ✅ Réel (annuaire Nostr) |
| **Adresse Zafy** `a.balde.776511631@zafy` (initiale, nom, numéro), affichée en haut du Profil avec un badge « publié sur Nostr » | ✅ Réel (profil Nostr signé par le portefeuille) |
| **Envoyer** à une adresse Zafy, un numéro, une adresse Spark ou Bitcoin, une facture Zafy ou Lightning ; nom du destinataire et frais affichés avant de confirmer | ✅ Réel |
| **Recevoir** avec un QR (facture Zafy) et un lien de partage cliquable qui ouvre Zafy sur Envoyer, montant dans la devise choisie | ✅ Réel (App Links Android + page web `/payer`) |
| Sats de test gratuits (robinet Regtest) | ✅ Réel |
| **Signaler** un escroc (numéro, adresse Zafy, compte Spark, adresse Bitcoin ou nœud Lightning), retirer son propre signalement | ✅ Réel (Nostr, kind 1984, 5 relais publics) |
| **Avant chaque paiement** : « Signalé par N personnes, dont 2 de tes contacts », « Aucun signalement » ou « Signalements non vérifiés » si les relais ne répondent pas ; un numéro et le compte Zafy qui lui est lié sont comptés ensemble | ✅ Réel |
| Alertes de la communauté (recherche, Numéros / Adresses) et bandeau si ton propre compte a été signalé | ✅ Réel |
| Contacts ajoutés en scannant une carte Zafy ou en saisissant une adresse Zafy ; noms affichés dans Envoyer, l'historique et les alertes | ✅ Réel (gardés sur le téléphone) |
| Paiements planifiés avec rappel à l'heure choisie, **toujours confirmés** par l'utilisateur, montants fixés en FCFA | ✅ Réel (notifications locales) |
| Historique avec recherche, filtre Toutes / Reçues / Envoyées, calendrier, détails et suppression locale | ✅ Réel |
| **Code et sécurité** : changer son code (codes trop simples refusés), empreinte activable, blocage après 5 codes faux, liste de ce qui est public | ✅ Réel |
| Affichage et saisie en FCFA, euro ou dollar, avec les taux en direct | ✅ Réel (taux Breez, CoinGecko en secours) |
| Français et anglais | ✅ Réel (i18next) |
| **Vérifier un message** (détection d'arnaque) | ⚠️ Règles simples par mots-clés pour l'instant ; le modèle d'IA est la prochaine étape |
| Acheter des sats avec Wave ou Orange Money | ⏳ Affiché « Bientôt » |

---

## 3. Démo (3 minutes)

1. **Le problème (30 s) :** un faux agent Wave demande à Fatou son code secret.
2. **Vérifier (30 s) :** Fatou colle le message dans **Vérifier** et obtient « Arnaque probable : demande ton code, te met la pression ». Elle signale le numéro en un appui.
3. **Protection au moment de payer (45 s) :** dans **Envoyer**, le numéro signalé affiche un badge rouge « Signalé par N personnes ». Fatou tape ensuite l'adresse Zafy d'Awa, `a.diop.771234567@zafy` : l'app affiche « Awa Diop · compte Zafy » et « Aucun signalement ».
4. **Un vrai paiement (45 s) :** Fatou paie Awa (ou scanne le QR de sa facture). Les frais sont affichés avant de confirmer et le paiement passe sur le réseau Bitcoin de test. Awa reçoit la notification « Paiement reçu ».
5. **Impact et suite (30 s) :** les clés restent sur le téléphone, la communauté protège tout le monde, et la suite, c'est l'IA de vérification, le réseau réel et l'achat via mobile money.

**Parcours à tester :** créer un compte sur deux téléphones → **Ajouter → Sats de test** (robinet) → sur le premier, **Envoyer** à l'adresse Zafy du second (affichée en haut de son **Profil**) → voir le paiement dans l'**historique** des deux téléphones. Variante : **Recevoir → Partager** sur le second, puis ouvrir le lien reçu sur le premier.

---

## 4. Installation

Le dépôt contient trois dossiers :

```
zafy/
├── zafy_mobile/     App Expo (React Native, TypeScript, expo-router)
├── zafy_web/        Page de présentation (React, Vite, TypeScript)
└── zafy-maquette/   Écrans et guide de design
```

### App mobile

Breez SDK contient du code natif : l'app a besoin d'un **development build** (Expo Go ne suffit pas).

```bash
cd zafy_mobile
npm install
npx eas-cli@latest build --profile development --platform android   # une fois : installe le development build
npx expo start                                                       # puis ouvrir l'app sur le téléphone
```

Un APK autonome qui fonctionne sans ordinateur :

```bash
npx eas-cli@latest build --profile preview --platform android
```

Vérifications : `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`.

L'app fonctionne sur le **réseau Bitcoin de test (Regtest)** : aucune clé d'API n'est nécessaire et aucun argent réel n'est en jeu. Les sats de test gratuits viennent du robinet Lightspark (bouton dans **Ajouter → Sats de test**).

### Page de présentation

```bash
cd zafy_web
npm install
npm run dev      # http://localhost:5173
```

---

## 5. Architecture

```mermaid
flowchart LR
  subgraph Phone["Téléphone (tout ce qui est sensible reste ici)"]
    UI["App Zafy<br/>Expo / React Native"]
    SS[("SecureStore<br/>12 mots, code haché, profil")]
    FS[("Fichiers locaux<br/>contacts, paiements planifiés,<br/>devise, langue")]
    SDK["Breez SDK Spark<br/>(self-custodial)"]
    UI --> SS
    UI --> FS
    UI --> SDK
  end
  SDK <--> Spark["Opérateurs Spark<br/>+ réseau Lightning"]
  UI <-- "signalements (kind 1984)<br/>profils Zafy (kind 30078)" --> Relays["5 relais Nostr publics<br/>damus, nos.lol, primal,<br/>nostr.mom, snort"]
  UI -- "cours du BTC" --> Rates["Taux Breez /<br/>CoinGecko"]
```

- **Pas de serveur Zafy.** Il n'y a ni backend ni base de comptes : les clés, les contacts et les réglages ne quittent jamais le téléphone.
- **Wallet :** Breez SDK Spark dérive le wallet des 12 mots et garde ses données dans l'espace privé de l'app.
- **Signalements :** événements Nostr signés avec une clé dérivée des 12 mots (NIP-06). Celui qui signale n'est donc identifié ni par son nom ni par son numéro.
- **Factures Zafy :** les factures Spark contiennent l'identité de celui qui reçoit. L'app du payeur peut ainsi la relier à un contact enregistré de façon cryptographique, et non à partir d'un texte libre.
- **Annuaire Zafy :** chaque utilisateur (s'il le souhaite) publie un profil Nostr remplaçable (NIP-78, kind 30078) : son nom, son adresse Spark, l'**empreinte** de son numéro (jamais le numéro en clair), et une preuve que sa clé Nostr appartient à son portefeuille (signature par la clé d'identité Spark). L'adresse `a.balde.776511631@zafy` est retrouvée grâce à cette empreinte ; un profil sans preuve valide est ignoré.
- **Lecture des relais :** une recherche répond dès que 2 relais ont fini (environ 1 s), avec une mémoire d'une minute. « Rien trouvé » n'est conclu que si au moins 2 relais ont vraiment répondu ; sinon l'app affiche « vérification impossible » plutôt qu'un faux « aucun signalement ».

---

## 6. Sécurité dès la conception

**Modèle de menaces**

| Menace | Parade |
|---|---|
| Vol ou duplication de la carte SIM | L'argent n'est pas lié à la SIM : les clés sont sur l'appareil, protégées par un code ou l'empreinte. |
| Manipulation (« donne-moi ton code ») | Le code ne quitte jamais le téléphone et personne d'autre n'en a besoin. L'écran **Vérifier** et l'écran des 12 mots préviennent qu'un « agent » qui les demande est un escroc. |
| Payer un escroc connu | Destinataire vérifié dans les signalements de la communauté avant chaque paiement. |
| Usurper un contact dans une facture | Les contacts sont reconnus par l'**identité Spark contenue dans la facture**, jamais par le texte de la facture. |
| Faux signalements ou spam | Les signalements sont signés. Une personne ne compte qu'une fois par cible, et l'app montre combien viennent de tes contacts. On ne peut pas se signaler soi-même. Le compteur est un avertissement, il ne bloque rien. |
| Relais en panne ou lent | « Aucun signalement » n'est affiché que si au moins 2 relais ont répondu ; sinon « Signalements non vérifiés », rappelé dans la confirmation d'envoi. |
| Usurper une adresse Zafy | Un profil n'est accepté que s'il est signé par le portefeuille qu'il annonce. Si deux portefeuilles revendiquent le même numéro, ou si le nom de l'adresse ne correspond pas au compte, le paiement est bloqué. Un numéro déjà utilisé est refusé à l'inscription. |
| Téléphone volé | App verrouillée par un code à 4 chiffres (stocké sous forme d'empreinte SHA-256 salée) ou l'empreinte digitale. Après 5 codes faux, les essais sont bloqués 30 s, puis de plus en plus longtemps (jusqu'à 15 min), même si l'app est relancée. Les codes trop simples (1111, 1234) sont refusés au changement de code. Les 12 mots ne s'affichent qu'après le code ou l'empreinte. |
| Téléphone perdu | Le wallet se récupère entièrement avec les 12 mots sur un nouveau téléphone. |
| Double paiement | Le bouton est bloqué pendant l'envoi et l'échéance est relue juste avant d'envoyer. |

**Réglages sûrs par défaut**
- **Secrets :** les 12 mots et l'empreinte du code sont dans `expo-secure-store` (Android Keystore / iOS Keychain). Le code n'est jamais stocké en clair.
- **Permissions minimales :** la caméra n'est demandée que pour scanner les QR codes (pas de micro), la biométrie seulement pour déverrouiller, les notifications seulement pour les paiements.
- **Saisies validées :** chaque destination est analysée par Breez SDK avant l'envoi. Les factures bloquent le montant. Les numéros et les montants sont normalisés. Les 12 mots sont vérifiés avec la liste de mots BIP39.
- **Aucune donnée personnelle dans les journaux :** l'app n'écrit aucun journal (`console.*` n'est pas utilisé). Les noms et numéros des contacts restent sur le téléphone, et un numéro n'est publié en clair que lorsqu'un utilisateur le signale comme arnaque.
- **Ce qui est public est dit clairement :** l'écran **Profil → Code et sécurité** liste ce que les autres voient (nom, adresse Zafy, adresse Spark). L'option « Être payé avec mon numéro » retire le profil de l'annuaire.
- **Bibliothèques éprouvées :** Breez SDK Spark, `@scure/bip39`, `nostr-tools` (NIP-06 et signatures), modules Expo pour le stockage sécurisé, la biométrie, la caméra et les notifications.

---

## 7. Limites (liste honnête)

- **Réseau de test uniquement (Regtest)** pour le hackathon. Le réseau réel demande une clé d'API Breez.
- **Vérifier un message** utilise des règles par mots-clés pour l'instant, pas un modèle d'IA.
- **Les notifications de paiement reçu** fonctionnent quand l'app est ouverte ou récemment en arrière-plan. Les notifications push, app fermée, demandent un petit serveur qui écoute les webhooks Breez.
- **L'adresse Zafy ne marche qu'entre utilisateurs de Zafy.** Ce n'est pas une adresse Lightning standard : un autre portefeuille ne sait pas la payer.
- **Le numéro n'est pas vérifié par SMS.** L'annuaire empêche deux comptes d'utiliser le même numéro, mais ne prouve pas que tu possèdes ce numéro. Deux inscriptions au même instant avec le même numéro ne sont pas empêchées (le paiement vers ce numéro est alors bloqué comme « contesté »).
- **Anonymat partiel :** quand l'option « Être payé avec mon numéro » est activée, le nom complet est public et le numéro se lit dans l'adresse Zafy. L'empreinte du numéro publiée sur Nostr peut aussi être retrouvée en essayant tous les numéros possibles.
- **Les contacts et les paiements planifiés ne sont gardés que sur le téléphone.** Ils sont perdus avec le téléphone tant que la sauvegarde chiffrée sur Nostr n'existe pas.
- **Les signalements Nostr sont publics et permanents**, et n'importe qui peut en publier. C'est pourquoi le compteur est un avertissement, pas un verdict.
- **L'achat de sats via mobile money** n'est pas encore développé.

---

## 8. Métriques à suivre

| Métrique | Pourquoi |
|---|---|
| Paiements vérifiés dans les signalements par semaine | Usage de la protection principale |
| Paiements annulés après un avertissement « Signalé » | Arnaques évitées |
| Signalements publiés par semaine, et nombre de personnes qui signalent | Santé de la communauté |
| Part des paiements vers un contact enregistré | Confiance et moins d'erreurs de destinataire |
| Comptes qui ont confirmé avoir noté leurs 12 mots | Capacité à récupérer son wallet |
| Wallets actifs par semaine, fidélité à 4 semaines | Adoption |
| Temps entre l'ouverture d'Envoyer et le paiement confirmé | Rapidité de l'UX |

Ces mesures se feraient uniquement avec des compteurs agrégés qui respectent la vie privée : aucun numéro, nom ou adresse.

---

## 9. Prochaine version

1. **Détection d'arnaque par IA** pour l'écran **Vérifier** (un LLM qui renvoie un verdict, un score et des raisons), avec les règles par mots-clés en secours hors connexion.
2. **Sauvegarde chiffrée** des contacts et des paiements planifiés sur Nostr (NIP-44, chiffrée avec la propre clé de l'utilisateur).
3. **Réseau réel (mainnet)** avec une clé d'API Breez, et une vraie adresse Lightning (`a.balde@zafy…`) payable par tous les portefeuilles.
4. **Vérification du numéro par SMS** et réservation des numéros côté serveur, pour une unicité garantie.
5. **Notifications push** pour les paiements reçus (webhooks Breez).
6. **Achat via mobile money** (Wave, Orange Money) auprès de vendeurs vérifiés.
7. **Traduction en wolof**, relue par des locuteurs natifs.
8. **Play Store**, après l'APK de test proposé sur la page de présentation.
