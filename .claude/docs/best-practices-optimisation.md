# Best Practices & Optimisation — Stealf React Native

Review basee sur les conventions Expo/React Native/TypeScript. Chaque point inclut le statut actuel, la priorite et l'action corrective.

---

## P0 — Critique

### 1. FlatList pour TransactionHistory

**Statut** : `TransactionHistory.tsx` utilise `ScrollView` + `.map()` pour rendre les transactions. `HomeScreen.tsx` passe `limit={50}`, soit 50 composants montes d'un coup sans virtualisation.
**Risque** : Jank sur les appareils d'entree de gamme, memoire gaspillee pour les items hors ecran.
**Action** :
```tsx
// Remplacer ScrollView + .map() par FlatList
import { FlatList } from 'react-native';

<FlatList
  data={displayedTransactions}
  keyExtractor={tx => tx.signature}
  renderItem={({ item }) => <TransactionRow tx={item} />}
  contentInsetAdjustmentBehavior="automatic"
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="white" />}
/>
```
Extraire `TransactionRow` en composant memo pour eviter les re-renders de toute la liste.

---

### 2. TypeScript strict mode

**Statut** : `strict: false` dans tsconfig.json
**Risque** : Les erreurs null/undefined ne sont pas detectees a la compilation. Pour une app financiere, c'est inacceptable.
**Action** :
```json
// tsconfig.json
{ "compilerOptions": { "strict": true } }
```
Corriger ensuite toutes les erreurs TS generees. Prioriser les fichiers services/ et hooks/ qui manipulent des donnees financieres.

---

### 3. Safe Area Management

**Statut** : Aucun SafeAreaView ni SafeAreaProvider dans le projet. Le package `react-native-safe-area-context` est installe mais jamais utilise. Des paddings hardcodes compensent : `headerSpacer: { height: 110 }` (HomeScreen.tsx:153), `paddingTop: 120` (SignUpScreen.tsx:249).
**Risque** : Contenu masque par le notch, Dynamic Island (iOS) et barre de navigation (Android). Layout incorrect sur iPhone SE vs iPhone 15 Pro Max.
**Action** :
```tsx
// App.tsx — wrapper racine
import { SafeAreaProvider } from 'react-native-safe-area-context';

<SafeAreaProvider>
  <GestureHandlerRootView style={{ flex: 1 }}>
    ...
  </GestureHandlerRootView>
</SafeAreaProvider>
```
Pour les ScrollViews, preferer `contentInsetAdjustmentBehavior="automatic"` au lieu de hardcoder le padding top :
```tsx
<ScrollView contentInsetAdjustmentBehavior="automatic">
```
Pour les ecrans plein ecran (gradient backgrounds), utiliser `useSafeAreaInsets()` :
```tsx
const insets = useSafeAreaInsets();
<View style={{ paddingTop: insets.top }}>
```

---

### 4. Tests

**Statut** : Zero fichier test dans le projet (aucun *.test.* ni *.spec.*).
**Risque** : Regressions silencieuses sur les flux critiques (transactions, auth, wallet).
**Action** — tester en priorite :
- `transactionsGuard.ts` — validation des transactions (unit tests Jest)
- `walletKeyCache.ts` — cache cle privee TTL (unit tests Jest)
- `authStorage.ts` — persistence securisee (unit tests Jest)
- `useSignIn` / `useSignUp` — flux auth (hook tests avec @testing-library/react-hooks)
- `useSendSimpleTransaction` — envoi transaction (integration)

Setup recommande :
```bash
npx expo install jest @testing-library/react-native @testing-library/jest-native
```

---

### 5. Accessibilite (a11y)

**Statut** : Aucune prop d'accessibilite dans le projet (0 accessibilityLabel, 0 accessibilityRole, 0 accessible).
**Risque** : App inutilisable avec VoiceOver/TalkBack. Non conforme WCAG pour une app bancaire.
**Action** — sur tous les composants interactifs :
```tsx
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Sign in with passkey"
>

<TextInput
  accessibilityLabel="Email address"
  accessibilityHint="Enter your email to create an account"
/>

// Soldes — annonce correcte
<Text accessibilityRole="text" accessibilityLabel={`Balance: ${balance} SOL`}>
```

---

## P1 — Important

### 6. Validation runtime des donnees API (Zod)

**Statut** : Les reponses API ne sont pas validees. Les donnees du backend sont trustees aveuglément.
**Risque** : Une reponse malformee (champ manquant, type incorrect) provoque un crash silencieux ou un affichage incorrect de soldes.
**Action** :
```bash
npm install zod
```
```typescript
// src/services/api/schemas.ts
import { z } from 'zod';

export const BalanceResponseSchema = z.object({
  balance: z.number(),
  wallet: z.string(),
});

export const TransactionSchema = z.object({
  signature: z.string(),
  amount: z.number(),
  type: z.enum(['send', 'receive']),
  timestamp: z.number(),
});

// Usage dans fetchWalletInfos.ts
const data = BalanceResponseSchema.parse(response);
```

---

### 7. Error logging en production (Sentry)

**Statut** : `ErrorBoundary.tsx` existe mais ne log rien vers un service externe. Les erreurs sont visibles uniquement en dev via `__DEV__` console.log.
**Risque** : Aucune visibilite sur les crashes en production. Impossible de debugger des problemes utilisateur.
**Action** :
```bash
npx expo install @sentry/react-native
```
```typescript
// App.tsx
import * as Sentry from '@sentry/react-native';
Sentry.init({ dsn: 'https://...', tracesSampleRate: 0.2 });
```
Logger au minimum : erreurs de transaction, erreurs auth, socket disconnects, erreurs ZK proofs.

---

### 8. Optimisation images — expo-image

**Statut** : Utilise `Image` de React Native partout.
**Risque** : Pas de caching avance, pas de placeholders, pas de transitions, pas de support WebP optimal.
**Action** :
```bash
npx expo install expo-image
```
```tsx
// Remplacer
import { Image } from 'react-native';
// Par
import { Image } from 'expo-image';

<Image
  source={require('../../assets/logo-transparent.png')}
  style={styles.logo}
  contentFit="contain"
  transition={200}
/>
```

---

### 9. Splitting AuthContext

**Statut** : `AuthContext.tsx` concentre trop de responsabilites — auth state, user data, socket subscriptions, wallet listeners, yield subscriptions, logout cleanup.
**Risque** : Re-renders excessifs. Tout composant qui consomme `useAuth()` se re-render quand n'importe quelle valeur change.
**Action** — decouper en 3 contexts :
```
AuthContext       → isAuthenticated, session, login, logout
UserDataContext   → userData, setUserData
SocketContext     → socket subscriptions, listeners, events
```
Alternative plus legere : `useMemo` sur les valeurs retournees pour limiter les re-renders.

---

### 10. Animated legacy → react-native-reanimated

**Statut** : `animations.ts`, `AppNavigator.tsx`, `HomeScreen.tsx` et `WelcomeLoader.tsx` utilisent `Animated` de React Native (bridge JS), alors que `react-native-reanimated` est deja installe et utilise dans `swipePager.tsx`.
**Risque** : Les animations de slide overlay tournent sur le thread JS — elles peuvent janker pendant les fetches API ou les calculs crypto.
**Action** :
```tsx
// Avant (animations.ts) — thread JS
import { Animated } from 'react-native';
Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true })

// Apres (reanimated) — thread UI natif
import { useSharedValue, withSpring } from 'react-native-reanimated';
const translateY = useSharedValue(SCREEN_HEIGHT);
translateY.value = withSpring(0, { damping: 22, stiffness: 200 });
```

---

### 11. Gestion offline absente

**Statut** : Aucun check de connectivite reseau. Si l'utilisateur ouvre l'app sans connexion, les queries React Query echouent et montrent un spinner infini.
**Risque** : UX bloquee sans connexion. Pas de message d'erreur clair.
**Action** :
```tsx
// App.tsx
import { onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => setOnline(state.isConnected ?? true))
);
```
Les queries se mettent en pause automatiquement offline et reprennent a la reconnexion.

---

### 12. Haptics absents

**Statut** : Aucun retour haptique sur les interactions critiques (SlideToConfirm, send, switch tabs, boutons importants).
**Risque** : L'app ne "sent" pas native sur iOS. Les apps bancaires concurrentes (Revolut, N26) utilisent intensivement les haptics.
**Action** :
```bash
npx expo install expo-haptics
```
```tsx
import * as Haptics from 'expo-haptics';

// SlideToConfirm — quand confirme
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Boutons importants (send, deposit)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Erreur
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```
Conditionner sur iOS : `if (process.env.EXPO_OS === 'ios')`.

---

## P2 — Recommande

### 13. Reducer au lieu de multiples useState

**Statut** : `SignUpScreen.tsx` a 7 useState. `AppNavigator.tsx` en a ~15. Difficile a maintenir et source de bugs d'etat inconsistant.
**Action** :
```typescript
interface SignUpState {
  step: 'email' | 'waiting' | 'verified';
  email: string;
  pseudo: string;
  inviteCode: string;
  loading: boolean;
  error: string;
  preAuthToken: string | null;
}

const [state, dispatch] = useReducer(signUpReducer, initialState);
```

---

### 14. Memoisation des composants

**Statut** : Aucun `React.memo`, `useMemo` ou `useCallback` dans les composants UI.
**Risque** : Re-renders inutiles, surtout dans les listes (TransactionHistory) et le swipePager.
**Action** — memoiser en priorite :
- `TransactionHistory` (liste potentiellement longue)
- `CashBalanceCard` / `PrivacyBalanceCard` (re-render a chaque update context)
- `MinimalNavBar` (re-render a chaque swipe)
- Callbacks passes en props (wrap avec `useCallback`)

---

### 15. Responsive design — Dimensions.get() statique

**Statut** : `animations.ts:4` et `AppNavigator.tsx:27` utilisent `Dimensions.get('window').height` qui est calcule une seule fois au lancement. Paddings et tailles hardcodes partout (paddingTop: 120, width: 80, fontSize: 32).
**Risque** : Layout casse sur petits ecrans (iPhone SE) ou tablettes. Ne se met pas a jour lors de rotation ecran ou split-view iPad.
**Action** :
```typescript
// Dans les composants — reactif aux changements de taille
import { useWindowDimensions } from 'react-native';

const { width, height } = useWindowDimensions();
const logoSize = width * 0.2;
const paddingTop = height * 0.12;
```
Preferer flexbox et les pourcentages aux valeurs fixes.

---

### 16. Performance du socket singleton

**Statut** : `socketService.ts` est un singleton avec etat mutable global. En dev, le hot reload peut causer des double-subscriptions. Utilise un `require()` dynamique (ligne 109) qui empeche le tree-shaking. `useWalletInfos.ts` appelle `attachWalletListeners()` a chaque mount de composant — si 3 composants l'utilisent, les listeners sont detaches/rattaches 3 fois.
**Action** : Ajouter un guard de deduplication + attacher les listeners une seule fois dans AuthContext :
```typescript
// Verifier avant subscribe
if (subscribedWallets.has(walletAddress)) return;

// Remplacer require() dynamique par import statique
import { getUserIdHash } from '../yield/deposit';
```
Ou migrer vers un pattern React Context pour le cycle de vie.

---

### 17. borderCurve: 'continuous' absent

**Statut** : Aucun composant n'utilise `borderCurve: 'continuous'` pour les coins arrondis.
**Risque** : Les coins arrondis geometriques ne matchent pas le rendu "squircle" natif Apple (HIG).
**Action** :
```tsx
// Ajouter sur tous les elements avec borderRadius
{ borderRadius: 16, borderCurve: 'continuous' }
```
Ne pas appliquer sur les formes capsule (borderRadius: height/2).

---

### 18. fontVariant: 'tabular-nums' sur les montants

**Statut** : Les montants financiers (`$123.45`) n'utilisent pas `tabular-nums`. Les chiffres ont des largeurs variables.
**Risque** : Desalignement visuel des montants dans les listes de transactions.
**Action** :
```tsx
amount: { fontVariant: ['tabular-nums'] }
```

---

### 19. QueryClient config incomplete

**Statut** : `staleTime: 5000` (5s) par defaut mais les queries wallet utilisent `staleTime: Infinity`. Pas de `gcTime` — les queries inactives restent en memoire indefiniment.
**Action** :
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 min (defaut coherent)
      gcTime: 1000 * 60 * 30,   // 30 min (libere la memoire)
    },
  },
});
```

---

### 20. API client couple a un hook React

**Statut** : `clientStealf.ts` est un hook (`useAuthenticatedApi`) qui depend de `useTurnkey()`. Impossible d'appeler l'API depuis un service, un worker ou un callback non-React.
**Action** : Extraire un client standalone en complement du hook :
```tsx
// services/api/client.ts
export async function apiGet(endpoint: string, token: string) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ApiError(response.status);
  const result = await response.json();
  return result.data || result;
}
```

---

## P3 — Nice to have

### 21. Internationalisation (i18n)

**Statut** : Tous les textes hardcodes en anglais.
**Action** : `expo-localization` + `i18n-js` ou `react-i18next`.

---

### 22. Deep linking

**Statut** : Navigation 100% custom, pas de support deep link.
**Action** : Configurer `expo-linking` pour les liens magic link email et les redirections post-paiement.

---

### 23. Code splitting

**Statut** : Tous les ecrans importes statiquement dans AppNavigator.
**Action** : `React.lazy()` + `Suspense` pour les ecrans non-critiques (SavingsScreen, CardScreen, InfoScreen).

---

### 24. Migration vers Expo Router

**Statut** : Navigation 100% custom via `AppNavigator.tsx` (297 lignes, ~15 useState, switch/case pour overlays). Pas d'Expo Router.
**Impact** : Pas de deep linking natif, pas de code splitting automatique, pas de native stack transitions (iOS back swipe), pas de form sheets natifs pour les overlays.
**Action** : Migration progressive vers Expo Router :
```
app/
  _layout.tsx              ← Stack racine
  (auth)/
    sign-in.tsx
    sign-up.tsx
  (main)/
    _layout.tsx            ← Custom pager ou NativeTabs
    (home,privacy)/
      _layout.tsx          ← Stack partage
      index.tsx / privacy.tsx
      send.tsx             ← presentation: "formSheet"
      add-funds.tsx        ← presentation: "formSheet"
      savings.tsx          ← presentation: "modal"
    profile.tsx
```
Les overlays deviennent des routes modales :
```tsx
<Stack.Screen name="send" options={{ presentation: "formSheet", sheetGrabberVisible: true }} />
```
Le swipePager custom peut rester comme composant dans le group route (home,privacy).

---

## Resume

| # | Priorite | Item | Statut | Effort |
|---|----------|------|--------|--------|
| 1 | P0 | FlatList pour TransactionHistory | Non fait | Faible |
| 2 | P0 | TypeScript strict mode | Non fait | Moyen |
| 3 | P0 | SafeAreaProvider + contentInsetAdjustmentBehavior | Non fait | Faible |
| 4 | P0 | Tests unitaires | Non fait | Moyen |
| 5 | P0 | Accessibilite (a11y) | Non fait | Faible |
| 6 | P1 | Validation Zod | Non fait | Moyen |
| 7 | P1 | Sentry error logging | Non fait | Faible |
| 8 | P1 | expo-image | Non fait | Faible |
| 9 | P1 | Split AuthContext | Non fait | Moyen |
| 10 | P1 | Animated legacy → reanimated | Non fait | Moyen |
| 11 | P1 | Gestion offline (NetInfo + React Query) | Non fait | Faible |
| 12 | P1 | Haptics (expo-haptics) | Non fait | Faible |
| 13 | P2 | useReducer (SignUpScreen, AppNavigator) | Non fait | Faible |
| 14 | P2 | Memoisation (React.memo, useMemo, useCallback) | Non fait | Faible |
| 15 | P2 | Responsive design (useWindowDimensions) | Non fait | Moyen |
| 16 | P2 | Socket singleton (dedup + require dynamique) | Non fait | Faible |
| 17 | P2 | borderCurve: 'continuous' | Non fait | Trivial |
| 18 | P2 | fontVariant: 'tabular-nums' sur montants | Non fait | Trivial |
| 19 | P2 | QueryClient config (gcTime, staleTime) | Non fait | Trivial |
| 20 | P2 | API client standalone (hors hook React) | Non fait | Moyen |
| 21 | P3 | i18n | Non fait | Eleve |
| 22 | P3 | Deep linking | Non fait | Moyen |
| 23 | P3 | Code splitting | Non fait | Faible |
| 24 | P3 | Migration Expo Router | Non fait | Eleve |
