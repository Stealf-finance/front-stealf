# Ephemeral Rollups Integration

## Overview

Ce module intègre **Magic Block Ephemeral Rollups** dans l'application Stealf pour permettre des transferts SOL ultra-rapides (~80ms au lieu de ~1000ms sur base layer).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application React Native                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         useEphemeralTransfer Hook                     │  │
│  │  - State management                                   │  │
│  │  - Progress tracking                                  │  │
│  │  - Endpoint selection                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     EphemeralRollupService                           │  │
│  │  - Initialize transfer                                │  │
│  │  - Delegate to ER                                     │  │
│  │  - Execute instant transfer                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Solana Blockchain                         │
│  ┌──────────────┐         ┌─────────────────────────────┐  │
│  │  Base Layer  │────────▶│  Ephemeral Rollup (ER)      │  │
│  │  (Devnet)    │  Step2  │  - Asia (devnet-as)         │  │
│  │              │ Delegate│  - EU (devnet-eu)           │  │
│  │  Step 1:     │         │  - US (devnet-us)           │  │
│  │  Initialize  │         │  - TEE (tee)                │  │
│  └──────────────┘         │                             │  │
│                           │  Step 3: Instant Transfer   │  │
│                           │  ~80ms ⚡                    │  │
│                           └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Workflow

### 3 étapes pour un transfert instantané:

1. **Initialize** (Base Layer)
   - Crée un PDA avec les détails du transfert
   - Temps: ~1000ms
   - Transaction: Base Layer Solana

2. **Delegate** (Base Layer → ER)
   - Transfère la propriété du PDA à l'Ephemeral Rollup
   - Temps: ~1000ms
   - Transaction: Base Layer Solana

3. **Instant Transfer** (ER)
   - Exécute le transfert sur l'Ephemeral Rollup
   - Temps: **~80ms** ⚡
   - Transaction: Ephemeral Rollup

## Usage

### Basic Example

```typescript
import { useEphemeralTransfer } from '@/hooks/useEphemeralTransfer';

function SendScreen() {
  const {
    executeERTransfer,
    isTransferring,
    progress,
    result,
    error
  } = useEphemeralTransfer();

  const handleSend = async () => {
    const recipientAddress = '7CKVw8SpB47WvwipRNhg123uHEUyAztCKbMAGT3YgNkv';
    const amountSOL = 0.05;

    const transferResult = await executeERTransfer(recipientAddress, amountSOL);

    if (transferResult) {
      console.log('Transfer completed in', transferResult.transferDuration, 'ms');
      console.log('Signature:', transferResult.transferSignature);
    }
  };

  return (
    <View>
      <Button onPress={handleSend} disabled={isTransferring}>
        {isTransferring ? 'Sending...' : 'Send with ER'}
      </Button>

      {progress && <Text>{progress.step}</Text>}
      {error && <Text style={{color: 'red'}}>{error}</Text>}
      {result && <Text>✅ Sent in {result.transferDuration}ms!</Text>}
    </View>
  );
}
```

### Endpoint Selection

```typescript
import { useEphemeralTransfer } from '@/hooks/useEphemeralTransfer';

function ERSettingsScreen() {
  const {
    currentEndpoint,
    availableEndpoints,
    changeEndpoint,
    selectBestEndpoint,
    testEndpointLatency
  } = useEphemeralTransfer();

  // Test latence de chaque endpoint
  const testLatencies = async () => {
    for (const endpoint of availableEndpoints) {
      const latency = await testEndpointLatency(endpoint);
      console.log(`${endpoint}: ${latency}ms`);
    }
  };

  // Sélectionner automatiquement le meilleur endpoint
  const handleAutoBestEndpoint = async () => {
    const best = await selectBestEndpoint();
    console.log('Best endpoint:', best);
  };

  return (
    <View>
      <Text>Current: {currentEndpoint}</Text>

      {availableEndpoints.map(endpoint => (
        <Button
          key={endpoint}
          onPress={() => changeEndpoint(endpoint)}
          title={endpoint.toUpperCase()}
        />
      ))}

      <Button onPress={handleAutoBestEndpoint} title="Auto Select Best" />
      <Button onPress={testLatencies} title="Test All Latencies" />
    </View>
  );
}
```

### Availability Check

```typescript
import { useEffect } from 'react';
import { useEphemeralTransfer } from '@/hooks/useEphemeralTransfer';

function App() {
  const { checkERAvailability, isERAvailable } = useEphemeralTransfer();

  useEffect(() => {
    checkERAvailability();
  }, []);

  return (
    <View>
      {isERAvailable === false && (
        <Text>⚠️ Ephemeral Rollups not available</Text>
      )}
    </View>
  );
}
```

## API Reference

### `useEphemeralTransfer()` Hook

#### State

- `isTransferring: boolean` - Transfer en cours
- `progress: ERTransferProgress | null` - État actuel (Initialize, Delegate, Transfer)
- `error: string | null` - Message d'erreur
- `result: ERTransferResult | null` - Résultat du transfert
- `isERAvailable: boolean | null` - Disponibilité de l'ER
- `currentEndpoint: EREndpoint` - Endpoint actuellement utilisé
- `availableEndpoints: EREndpoint[]` - Liste des endpoints disponibles

#### Methods

- `executeERTransfer(recipient: string, amountSOL: number)` - Exécute un transfert ER complet
- `checkERAvailability()` - Vérifie si l'ER est disponible
- `changeEndpoint(endpoint: EREndpoint)` - Change l'endpoint ER
- `testEndpointLatency(endpoint: EREndpoint)` - Teste la latence d'un endpoint
- `selectBestEndpoint()` - Sélectionne automatiquement le meilleur endpoint
- `reset()` - Réinitialise l'état du hook

### Endpoints Disponibles

| Endpoint | Region | RPC URL | Validator Identity |
|----------|--------|---------|-------------------|
| `asia` | Asia | `https://devnet-as.magicblock.app` | `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57` |
| `eu` | Europe | `https://devnet-eu.magicblock.app` | `MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e` |
| `us` | US | `https://devnet-us.magicblock.app` | `MUS3hc9TCw4cGC12vHNoYcCGzJgQLZWVoeNHNd` |
| `tee` | TEE | `https://tee.magicblock.app` | `FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA` |
| `local` | Local | `http://127.0.0.1:8899` | `mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev` |

Par défaut, l'endpoint **EU** est utilisé.

## Performance

### Comparaison Base Layer vs Ephemeral Rollup

| Méthode | Temps moyen | Description |
|---------|-------------|-------------|
| **Base Layer** (Standard) | ~1000ms | Transaction normale sur Solana |
| **Ephemeral Rollup** (ER) | **~80ms** ⚡ | Transaction sur ER (Step 3 uniquement) |

**Note**: Les étapes 1 et 2 (Initialize + Delegate) se font sur Base Layer (~2000ms total), mais ne sont nécessaires qu'une seule fois. Ensuite, tous les transferts suivants utilisent l'ER et prennent ~80ms.

## Deployed Program

- **Program ID**: `5QtWKtEg9aZJBrnx3d4FcvXto7QG2ELoQEQzoQPipvnh`
- **Network**: Solana Devnet
- **IDL**: `src/services/idl/bolt_instant_transfer.json`

## Testing

### Test local

```bash
# 1. Démarrer le validateur ER local
npx @magicblock-labs/ephemeral-validator

# 2. Dans l'app, sélectionner l'endpoint 'local'
changeEndpoint('local');

# 3. Exécuter un transfert
await executeERTransfer(recipientAddress, amountSOL);
```

### Test sur MagicBlock Devnet

```typescript
// Pas besoin de validateur local
changeEndpoint('eu'); // ou 'asia', 'us', 'tee'
await executeERTransfer(recipientAddress, amountSOL);
```

## Troubleshooting

### "Wallet not loaded"
Assurez-vous que le wallet est chargé avant d'exécuter un transfert:
```typescript
const keypair = solanaWalletService.getKeypair();
if (!keypair) {
  await solanaWalletService.loadWallet();
}
```

### "Ephemeral Rollup not available"
1. Vérifiez que l'endpoint est accessible
2. Testez avec un autre endpoint
3. Utilisez `selectBestEndpoint()` pour trouver le meilleur

### "Transaction loads a writable account that cannot be written"
Le compte est probablement déjà délégué. Attendez 3 secondes entre Delegate et Instant Transfer.

## References

- [MagicBlock Documentation](https://docs.magicblock.gg)
- [Ephemeral Rollups SDK](https://github.com/magicblock-labs/ephemeral-rollups-sdk)
- [Anchor Counter Example](https://github.com/magicblock-labs/magicblock-engine-examples/tree/main/anchor-counter)
