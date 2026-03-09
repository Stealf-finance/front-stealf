export interface AddFundsScreenProps {
  onBack?: () => void;
}

export interface SendScreenProps {
  onBack?: () => void;
  transferType?: 'basic' | 'private';
  walletType?: 'cash' | 'stealf';
}

export interface ProfileScreenProps {
  onBack: () => void;
  onNavigateToPage: (page: string) => void;
  onLogout: () => void;
  currentPage: string;
  userEmail?: string;
  username?: string;
}

export type PageType = 'home' | 'send' | 'addFunds' | 'privacy' | 'sendPrivate' | 'addFundsPrivacy' | 'profile';
