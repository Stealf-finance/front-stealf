export interface AddFundsScreenProps {
  onBack?: () => void;
}

export interface SendScreenProps {
  onBack?: () => void;
  transferType?: 'basic' | 'private';
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
