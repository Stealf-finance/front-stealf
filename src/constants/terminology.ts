export const WALLET_TERMINOLOGY = {
    public: {
        screenTitle: 'Cash',           // Titre du dashboard (user-friendly)
        walletLabel: 'Public Wallet',  // Dans les selectors/transfers
        accountLabel: 'Main',          // Sous-compte (un seul pour public)
        description: 'Compliant wallet linked to your card',
    },
    privacy: {
        screenTitle: 'Privacy',        // Titre du dashboard
        walletLabel: 'Privacy Wallet', // Dans les selectors/transfers
        accountLabel: (index: number) => `Account ${index}`, // "Account 1", "Account 2"
        description: 'Shielded wallet with anonymous transactions',
    },
} as const;
