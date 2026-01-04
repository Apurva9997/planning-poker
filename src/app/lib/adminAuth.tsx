import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { auth, googleProvider } from "./firebase";

interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined
);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        // Check if user is an admin by verifying token with backend
        try {
          const idToken = await user.getIdToken();
          const response = await fetch(
            `${
              import.meta.env.PROD
                ? "/.netlify/functions/api"
                : "http://localhost:8888/.netlify/functions/api"
            }/admin/verify`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            setIsAdmin(data.isAdmin);

            if (data.isAdmin) {
              setAdminUser({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
              });
            } else {
              // User is not an admin, sign them out
              await signOut(auth);
              setAdminUser(null);
              setIsAdmin(false);
            }
          } else {
            // Not an admin or verification failed
            await signOut(auth);
            setAdminUser(null);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          setAdminUser(null);
          setIsAdmin(false);
        }
      } else {
        setAdminUser(null);
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Error signing in:", error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setAdminUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error("Error getting ID token:", error);
      return null;
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        isLoading,
        isAdmin,
        signIn,
        signOut: handleSignOut,
        getIdToken,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}
