export interface User {
  type: 'farmer' | 'merchant';
  name?: string;
  phoneNumber?: string;
  username?: string;
  businessName?: string;
}

export const auth = {
  getUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('user');
  },

  signOut: async (): Promise<void> => {
    localStorage.removeItem('user');
  },

  onAuthStateChange: (callback: (user: User | null) => void) => {
    const handleStorageChange = () => {
      callback(auth.getUser());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }
};
