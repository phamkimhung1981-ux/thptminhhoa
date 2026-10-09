import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, Role } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { isAdminUser } from '../lib/moduleData';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  login: (username: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  switchRoleForDemo?: (role: Role) => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restore user from localStorage if exists
  useEffect(() => {
    try {
      const stored = localStorage.getItem('authUser');
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error(e);
      setUser(null);
    }
  }, []);

  const login = async (username: string, password?: string) => {
    setError(null);
    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập.');
      return;
    }
    try {
      const q = query(collection(db, 'teachers'), where('username', '==', username.trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const foundUser = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as User;
        setUser(foundUser);
        localStorage.setItem('authUser', JSON.stringify(foundUser));
      } else {
        // Handle admin username
        if (username.trim().toLowerCase() === 'admin') {
          let adminAvatar = '';
          let adminName = 'Quản trị viên Hệ thống';
          try {
            const adminDoc = await getDoc(doc(db, 'settings', 'admin_profile'));
            if (adminDoc.exists()) {
              adminAvatar = adminDoc.data().avatar || '';
              if (adminDoc.data().name) adminName = adminDoc.data().name;
            }
          } catch (err) {
            console.warn("Could not fetch admin profile doc:", err);
          }

          const adminUser: User = {
            id: 'admin',
            name: adminName,
            role: 'admin',
            username: 'admin',
            position: 'Quản trị viên',
            avatar: adminAvatar || undefined
          };
          setUser(adminUser);
          localStorage.setItem('authUser', JSON.stringify(adminUser));
        } else {
          setError('Tên đăng nhập hoặc mật khẩu không chính xác, hoặc tài khoản chưa được kích hoạt.');
        }
      }
    } catch (e) {
      console.error(e);
      setError('Không thể kết nối cơ sở dữ liệu xác thực.');
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('authUser', JSON.stringify(updatedUser));

    try {
      if (user.id === 'admin') {
        const adminRef = doc(db, 'settings', 'admin_profile');
        await setDoc(adminRef, {
          name: updatedUser.name,
          avatar: updatedUser.avatar || '',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } else if (user.id) {
        const teacherRef = doc(db, 'teachers', user.id);
        const updatePayload: Record<string, any> = {};
        if (data.avatar !== undefined) updatePayload.avatar = data.avatar;
        if (data.name !== undefined) updatePayload.name = data.name;
        if (Object.keys(updatePayload).length > 0) {
          await updateDoc(teacherRef, updatePayload);
        }
      }
    } catch (err) {
      console.warn("Could not sync user profile update to Firestore:", err);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authUser');
  };

  const isAdmin = isAdminUser(user);

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, logout, updateUser, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
