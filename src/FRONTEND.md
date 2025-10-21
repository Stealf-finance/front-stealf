# Structure du Code - Stealf

Ce document décrit l'architecture et l'organisation du code source de l'application Stealf.

## 📁 Structure des Dossiers

```
src/
├── components/          # Composants réutilisables
├── config/             # Configuration de l'application
├── constants/          # Constantes globales
├── contexts/           # Contextes React (état global)
├── hooks/              # Hooks React personnalisés
├── navigation/         # Gestion de la navigation
├── screens/            # Écrans de l'application
├── services/           # Services et logique métier
├── theme/              # Thème et styles globaux
├── types/              # Définitions TypeScript
└── utils/              # Fonctions utilitaires
```

---

## 📂 Détails par Dossier

### `components/` - Composants Réutilisables

Composants UI organisés par catégorie :

#### `components/features/`
- **`BalanceDisplay.tsx`** : Affiche le solde de l'utilisateur (mode CASH et PRIVACY)
  - Récupère les balances SOL, USDC, USDT via RPC Solana
  - Calcule le total en USD
  - Mode Privacy : masque le montant avec "*** USD"

#### `components/layout/`
- **`Container.tsx`** : Conteneur de mise en page principal
- **`Header.tsx`** : En-tête réutilisable avec navigation
- **`index.ts`** : Exports centralisés

#### `components/ui/`
- **`Button.tsx`** : Bouton personnalisé
- **`Card.tsx`** : Carte/conteneur stylisé
- **`Input.tsx`** : Champ de saisie personnalisé
- **`index.ts`** : Exports centralisés

#### Composants racine
- **`CopyableField.tsx`** : Champ copiable pour adresses/clés
- **`PaymentOption.tsx`** : Option de paiement sélectionnable
- **`QRCodePlaceholder.tsx`** : Placeholder pour QR codes
- **`TransactionHistory.tsx`** : Liste des transactions récentes
- **`index.ts`** : Export centralisé de tous les composants

---

### `config/` - Configuration

- **`config.ts`** : Configuration principale
  - URL de l'API backend
  - Variables d'environnement
- **`config.docker.ts`** : Configuration spécifique Docker

---

### `constants/` - Constantes

- **`colors.ts`** : Palette de couleurs de l'application

---

### `contexts/` - Contextes React

- **`AuthContext.tsx`** : Gestion de l'authentification
  - État `isAuthenticated`
  - Données utilisateur (`userData`)
  - Fonctions `login()` et `logout()`
  - Persistance via `storageService`

---

### `hooks/` - Hooks Personnalisés

- **`useBalance.ts`** : Récupère la balance Solana d'un wallet
  - Interroge le RPC Solana
  - Retourne SOL, USDC, USDT
  - Gère le loading et les erreurs

- **`useUserData.ts`** : Récupère les données utilisateur depuis le storage

- **`useWallet.ts`** : Gère le wallet de l'utilisateur
  - Récupère l'adresse Grid depuis le storage
  - Synchronise avec AuthContext

- **`index.ts`** : Exports centralisés

---

### `navigation/` - Navigation

- **`AppNavigator.tsx`** : Navigateur principal de l'application
  - Gère les états : `currentPage` (home/privacy), `currentScreen` (main/send/addFunds/etc.)
  - Affiche AuthScreen si non authentifié
  - Gère les animations de transition
  - Overlay violet pour les pages Privacy
  - Profile en overlay absolu (z-index 10)

- **`types.ts`** : Types de navigation
  - `PageType` : 'home' | 'privacy'

---

### `screens/` - Écrans

#### Écrans Principaux

- **`HomeScreen.tsx`** : Page d'accueil CASH
  - Carte Stealf (Coming Soon) en arrière-plan
  - Balance blanche avec détails SOL/USDC/USDT
  - Boutons : Add Funds, Send, On-Ramp
  - Historique des transactions
  - Swipe gauche → Privacy

- **`PrivacyScreen.tsx`** : Page PRIVACY
  - Structure identique à HomeScreen
  - Overlay violet (géré par AppNavigator)
  - Balance masquée ("*** USD")
  - Boutons : Add Funds, Send, On-Ramp
  - Swipe droite → Home, Swipe gauche → Profile

- **`Profile.tsx`** : Écran de profil
  - Informations utilisateur (email, username)
  - Total CASH
  - Actions : Help, Logout, Delete Account
  - Navigation vers Home/Privacy depuis le header
  - Swipe droite → retour

#### Écrans Secondaires

- **`Auth.tsx`** : Écran d'authentification
  - Login / Sign Up avec OTP
  - Animation de logo à la connexion
  - Intégration avec AuthContext
  - Sauvegarde token + Grid address

- **`Send.tsx`** : Envoi de fonds (mode CASH)
- **`SendPrivate.tsx`** : Envoi de fonds (mode PRIVACY)
- **`AddFunds.tsx`** : Ajout de fonds (mode CASH)
- **`AddFundsPrivacy.tsx`** : Ajout de fonds (mode PRIVACY)
- **`Stablecoin.tsx`** : Gestion des stablecoins

---

### `services/` - Services

- **`apiService.ts`** : Communication avec le backend
  - Gestion des requêtes HTTP
  - Authentification

- **`solanaService.ts`** : Interaction avec Solana
  - Connexion RPC Solana
  - Récupération de balances
  - Requêtes blockchain

- **`storageService.ts`** : Stockage local (AsyncStorage)
  - `saveUserData()` : Sauvegarde données utilisateur
  - `getUserData()` : Récupération données
  - `clearAll()` : Suppression (logout)
  - Stocke : token, gridAddress, email, username

- **`index.ts`** : Exports centralisés

---

### `theme/` - Thème

- **`colors.ts`** : Palette de couleurs
- **`typography.ts`** : Styles de texte
- **`spacing.ts`** : Espacements
- **`shadows.ts`** : Ombres
- **`commonStyles.ts`** : Styles communs réutilisables
- **`index.ts`** : Export centralisé du thème

---

### `types/` - Types TypeScript

- **`models.ts`** : Modèles de données
  - `UserData` : Données utilisateur
  - `Balance` : Structure de balance

- **`navigation.ts`** : Types de navigation
  - Props des écrans (HomeScreenProps, PrivacyScreenProps, etc.)
  - `PageType` : Types de pages

- **`api.ts`** : Types API
  - Requêtes et réponses backend

- **`index.ts`** : Export centralisé

---

### `utils/` - Utilitaires

- **`animations.ts`** : Fonctions d'animation
  - `animatePageTransition()` : Transition Home ↔ Privacy
  - `animateScreenTransition()` : Transition vers écrans secondaires
  - `animateSlideIn()` : Animation d'entrée (profile)
  - `animateSlideOut()` : Animation de sortie (profile)

---

## 🔄 Flux de Navigation

```
AuthScreen (non authentifié)
    ↓
    Login/Register → OTP → Animation logo
    ↓
    Sauvegarde dans AuthContext
    ↓
HomeScreen ←→ PrivacyScreen ←→ ProfileScreen
    ↓             ↓
  Send        SendPrivate
  AddFunds    AddFundsPrivacy
```

### États de Navigation

1. **Pages principales** (`currentPage`)
   - `home` : HomeScreen
   - `privacy` : PrivacyScreen

2. **Écrans secondaires** (`currentScreen`)
   - `main` : Pages principales
   - `send` : Envoi CASH
   - `sendPrivate` : Envoi PRIVACY
   - `addFunds` : Ajout de fonds CASH
   - `addFundsPrivacy` : Ajout de fonds PRIVACY

3. **Overlay** (`showProfile`)
   - `true` : ProfileScreen visible (position absolute, z-index 10)
   - `false` : ProfileScreen caché

---

## 🎨 Architecture des Animations

### Système à 3 niveaux d'animations

1. **Page Transitions** (`fadeAnim`, `slideAnim`)
   - Transition entre Home et Privacy
   - Fade out → change page → Fade in

2. **Screen Transitions** (`screenFadeAnim`, `screenSlideAnim`)
   - Transition vers écrans secondaires (Send, AddFunds, etc.)
   - Slide out → change screen → Slide in

3. **Profile Overlay** (`profileFadeAnim`, `profileSlideAnim`)
   - Animation indépendante pour le profil
   - Slide depuis la droite

---

## 🔐 Gestion de l'Authentification

### Flow d'authentification

1. **Page de connexion** (Auth.tsx)
   - Saisie email (+ username si signup)
   - Envoi OTP par le backend
   - Saisie code OTP (6 chiffres)

2. **Vérification OTP**
   - Backend retourne : `tokens`, `user` (email, username, grid_address)
   - Sauvegarde dans AsyncStorage :
     - `token` : Access token
     - `gridAddress` : Adresse Grid Protocol
     - Données utilisateur

3. **Persistance**
   - Au démarrage : `AuthContext` vérifie AsyncStorage
   - Si données présentes → `isAuthenticated = true` → HomeScreen
   - Sinon → AuthScreen

4. **Logout**
   - `clearAll()` : Suppression de toutes les données
   - `isAuthenticated = false`
   - Redirection → AuthScreen

---

## 🌐 Intégration Blockchain

### Solana RPC

**Service** : `solanaService.ts`

- **Connexion RPC** : Solana Mainnet-Beta
- **Fonctions** :
  - Récupération de balance SOL
  - Récupération de tokens (USDC, USDT)
  - Parsing des comptes de tokens

**Hook** : `useBalance.ts`

- Interroge le RPC avec l'adresse Grid
- Retourne : `{ sol, tokens }`
- Gère loading et erreurs
- Fonction `refresh()` pour recharger

---

## 📦 Composants Clés

### BalanceDisplay

**Fichier** : `components/features/BalanceDisplay.tsx`

**Modes** :
- **CASH** (`isPrivacy=false`) :
  - Affiche "TOTAL BALANCE"
  - Montant en USD calculé
  - Détails SOL, USDC, USDT

- **PRIVACY** (`isPrivacy=true`) :
  - Affiche "PRIVACY CASH"
  - Montant masqué : "*** USD"
  - Texte "Tap to reveal"

**Layout** :
- Label et montant alignés horizontalement (`balanceRow`)
- Détails tokens en liste verticale

---

## 🎭 Overlay Violet (Privacy)

**Gestion** : `AppNavigator.tsx`

**Conditions d'affichage** :
```typescript
currentPage === 'privacy' ||
currentScreen === 'sendPrivate' ||
currentScreen === 'addFundsPrivacy'
```

**Styles** :
- Position : `absolute`
- Background : `rgba(10, 0, 60, 0.30)`
- Z-index : `0` (derrière le contenu)
- Pointer events : `none` (non interactif)

---

## 📝 Conventions de Code

### Structure des Fichiers

1. **Imports** (React, librairies, composants locaux, types)
2. **Interfaces/Types** (Props, State)
3. **Composant principal**
4. **Styles** (StyleSheet)

### Nommage

- **Composants** : PascalCase (`HomeScreen`, `BalanceDisplay`)
- **Fichiers** : PascalCase pour composants, camelCase pour utilitaires
- **Props** : camelCase avec `on` pour callbacks (`onNavigateToPage`)
- **Styles** : camelCase (`balanceContainer`, `navButton`)

### Organisation

- Toujours un fichier `index.ts` pour exports centralisés
- Séparation claire features/layout/ui pour les composants
- Types centralisés dans `types/`

---

## 🚀 Points d'Entrée

### App.tsx
```typescript
<AuthProvider>
  <AppNavigator />
</AuthProvider>
```

### AppNavigator.tsx

**Flow décisionnel** :
1. `loading` → Écran de chargement
2. `!isAuthenticated` → AuthScreen
3. `isAuthenticated` → Main content (Home/Privacy/Screens)

---

## 🛠️ Développement

### Ajout d'un nouvel écran

1. Créer le fichier dans `src/screens/`
2. Définir les props dans `src/types/navigation.ts`
3. Ajouter l'état dans `AppNavigator`
4. Créer la fonction de navigation
5. Ajouter le rendu conditionnel

### Ajout d'un service

1. Créer le fichier dans `src/services/`
2. Définir les types dans `src/types/api.ts`
3. Exporter dans `src/services/index.ts`
4. Utiliser dans les composants/hooks

### Ajout d'un hook

1. Créer le fichier dans `src/hooks/`
2. Définir les types de retour
3. Exporter dans `src/hooks/index.ts`
4. Utiliser dans les composants

---

## 📱 État de l'Application

### AuthContext

**État global** :
- `isAuthenticated` : boolean
- `userData` : UserData | null
- `loading` : boolean

**Fonctions** :
- `login(data)` : Authentifie l'utilisateur
- `logout()` : Déconnecte et nettoie le storage

### AppNavigator (État local)

**Navigation** :
- `currentPage` : 'home' | 'privacy'
- `currentScreen` : 'main' | 'send' | 'sendPrivate' | ...
- `showProfile` : boolean

**Animations** :
- `fadeAnim`, `slideAnim` : Pages
- `screenFadeAnim`, `screenSlideAnim` : Écrans
- `profileFadeAnim`, `profileSlideAnim` : Profile

---

## 🔗 Dépendances Principales

- **React Native** : Framework mobile
- **Expo** : Toolchain et APIs
- **@solana/web3.js** : SDK Solana
- **@react-native-async-storage/async-storage** : Stockage local
- **expo-blur** : Effets de flou
- **TypeScript** : Typage statique

---

## 📄 Fichiers de Configuration

- `tsconfig.json` : Configuration TypeScript
- `app.json` : Configuration Expo
- `package.json` : Dépendances npm
- `.env` : Variables d'environnement (non versionné)

---

*Documentation générée pour Stealf - Privacy-first Neobank*
