/**
 * Tests de conformité — SavingsScreen (tâche 3.3)
 *
 * Couvre :
 * - Absence de référence à l'auto-sweep (non implémenté / Rain Cards non disponible)
 * - Présence du modal USDC "coming soon" (setUsdcComingSoonVisible)
 * - Textes Jito/Marinade en anglais ("active", pas "actif")
 *
 * Requirements : 8.1, 8.2, 9.3
 */

import * as fs from 'fs';
import * as path from 'path';

const SCREEN_PATH = path.resolve(__dirname, '../app/(savings)/SavingsScreen.tsx');
const screenContent = fs.readFileSync(SCREEN_PATH, 'utf8');

describe('SavingsScreen — conformité beta', () => {
  it('ne contient aucune référence à l\'auto-sweep (RAIN_CARDS non disponible)', () => {
    expect(screenContent).not.toMatch(/auto.?sweep/i);
    expect(screenContent).not.toMatch(/autoSweep/i);
    expect(screenContent).not.toMatch(/RAIN_CARDS_ENABLED/);
  });

  it('contient le mécanisme "coming soon" pour l\'onglet USDC', () => {
    expect(screenContent).toMatch(/usdcComingSoonVisible/);
    expect(screenContent).toMatch(/setUsdcComingSoonVisible\(true\)/);
  });

  it('affiche "active" (anglais) et pas "actif" (français) pour Jito et Marinade', () => {
    expect(screenContent).toMatch(/Jito/);
    expect(screenContent).toMatch(/Marinade/);
    expect(screenContent).toMatch(/protocolBadgeText.*active|active.*protocolBadgeText/s);
    expect(screenContent).not.toMatch(/protocolBadgeText.*actif|actif.*protocolBadgeText/s);
  });
});
