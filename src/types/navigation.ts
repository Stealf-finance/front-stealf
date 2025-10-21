// Screen props interfaces
export interface BalanceDisplayProps {
  isPrivacy?: boolean;
  style?: any;
}

export interface AddFundsScreenProps {
  onBack?: () => void;
}

export interface SendScreenProps {
  onBack?: () => void;
}

export interface SendPrivateScreenProps {
  onBack?: () => void;
}

export interface AddFundsPrivacyProps {
  onBack?: () => void;
}

export interface ProfileScreenProps {
  onBack: () => void;
  onNavigateToPage: (page: string) => void;
  onLogout: () => void;
  currentPage: string;
  userEmail?: string;
  username?: string;
}

// Page types for navigation
export type PageType = 'home' | 'send' | 'addFunds' | 'privacy' | 'sendPrivate' | 'addFundsPrivacy' | 'profile';
