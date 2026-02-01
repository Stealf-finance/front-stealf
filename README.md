# Stealf - Frontend

Application mobile React Native avec authentification Turnkey Passkey.

toujours en developpement

pour le moment on peut seulement créer un compte.

pour l'auth -> envoie d'un lien unique (toujours sur stealf.fi@gmail pour le moment).
il faut configurer resend
une fois email vérifier auth avec passkey gere directement par turnkey, pour le moment seulement fonctionnel avec ios.

on ne peut pas se signin pour le moment

Le SDK Turnkey est natif, ce n’est pas juste une librairie JS ou un script web. Concrètement ça signifie :

1️⃣ Implications principales
Doit être lié à la plateforme:

iOS : via CocoaPods / Swift / Objective-C

Android : via Gradle / Java / Kotlin

Ne fonctionne pas “à chaud” dans Expo Go

Si tu utilises Expo classique, tu dois build une app native (npx expo prebuild ou npx react-native run-ios/run-android)
Parce que le SDK Turnkey doit être compilé dans l’app et relié aux API biométriques / Passkeys natives
Compilation obligatoire pour tester Passkeys / biométrie

Même en dev : l’app sur l’iPhone ou l’émulateur Android doit avoir le SDK inclus dans le build
Tu ne peux pas tester Turnkey via un navigateur ou dans un simulateur “JS only”

## Prérequis

- Node.js 18+
- iOS: macOS + Xcode + CocoaPods
- Android: Android Studio + JDK

## Installation

```bash
npm install
```

## Configuration

Créer un fichier `.env` à la racine:

```env
EXPO_PUBLIC_ORGANIZATION_ID="your-turnkey-org-id"
EXPO_PUBLIC_AUTH_PROXY_CONFIG_ID="your-turnkey-auth-proxy-id"
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

## Développement

### Expo Go (pas de passkeys)

```bash
npm start
```

Scannez le QR code avec l'app Expo Go.

**⚠️ Les passkeys ne fonctionnent PAS sur Expo Go.**

### Development Build (avec passkeys)

#### iOS

```bash
# Sur simulateur (pas de passkeys)
npx expo run:ios

# Sur iPhone physique (passkeys fonctionnels)
npx expo run:ios --device
```

#### Android

```bash
# Sur émulateur (pas de passkeys)
npx expo run:android

# Sur appareil physique (passkeys fonctionnels)
npx expo run:android --device
```

## Configuration Passkey

### Domaine requis

- rpId: `stealf.xyz`
- AASA: `https://stealf.xyz/.well-known/apple-app-site-association`
- Asset Links: `https://stealf.xyz/.well-known/assetlinks.json`

### iOS Entitlements

```xml
<key>com.apple.developer.associated-domains</key>
<array>
  <string>webcredentials:stealf.xyz</string>
</array>
```

### Fichier AASA (iOS)

Héberger à `https://stealf.xyz/.well-known/apple-app-site-association`:

```json
{
  "webcredentials": {
    "apps": ["63724CT6P8.com.stealf.app"]
  }
}
```

## Architecture

```
src/
├── app/              # Screens (Expo Router)
│   ├── (auth)/       # Auth screens (SignUp, etc.)
│   └── (tabs)/       # Main app screens
├── components/       # Composants réutilisables
├── constants/        # Config Turnkey
├── contexts/         # React Context (Auth)
├── hooks/            # Custom hooks (useAuth, polling)
├── navigation/       # Navigation setup
├── services/         # API clients
└── types/            # TypeScript types
```

## Commandes utiles

```bash
# Clean iOS build
cd ios && rm -rf build && cd ..

# Clean Android build
cd android && ./gradlew clean && cd ..

# Rebuild pods (iOS)
cd ios && pod install && cd ..
```

## Notes importantes

- **Passkeys nécessitent un appareil physique** avec Face ID/Touch ID (iOS) ou empreinte digitale (Android)
- **HTTPS obligatoire** pour le fichier AASA
- **Clean build requis** après changement des entitlements
- **Backend local**: Utiliser l'IP locale (ex: `192.168.1.36:3000`) au lieu de `localhost` pour tester sur appareil physique
