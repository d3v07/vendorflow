import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { mockUsers, currentUser as defaultUser } from '@/data/mockData';

interface UserContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  hasPermission: (requiredRole: UserRole) => boolean;
  allUsers: User[];
}

const roleHierarchy: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  viewer: 1
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);

  const hasPermission = (requiredRole: UserRole): boolean => {
    return roleHierarchy[currentUser.role] >= roleHierarchy[requiredRole];
  };

  return (
    <UserContext.Provider value={{ 
      currentUser, 
      setCurrentUser, 
      hasPermission,
      allUsers: mockUsers 
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
