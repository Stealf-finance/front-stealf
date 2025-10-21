export type PageType = 'home' | 'privacy' | 'transactionHistory';
export type ScreenType = 'auth' | 'main';

export interface NavigationState {
  currentScreen: ScreenType;
  currentPage: PageType;
  showProfile: boolean;
}
