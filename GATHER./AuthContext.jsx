import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!auth) {
      setAuthError('Add your Firebase web app settings to client/.env.local to enable sign-in.');
      setLoading(false);
      return undefined;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthError('');
      setUser(firebaseUser ? {
        uid: firebaseUser.uid,
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Gather member',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || null,
        profile_image: firebaseUser.photoURL || null,
        emailVerified: firebaseUser.emailVerified,
        role: 'USER'
      } : null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    if (auth) await firebaseSignOut(auth);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, authError, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
