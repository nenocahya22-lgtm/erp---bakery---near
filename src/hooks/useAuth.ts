import { useState } from 'react';
import { safeGetLocalStorage } from '../lib/safe-json';
import type { Cabang } from '../types';

export function useAuth() {
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState(() => {
    const localAuth = localStorage.getItem('owner_authenticated') === 'true';
    const sessionAuth = sessionStorage.getItem('owner_authenticated') === 'true';
    const sessionToken = localStorage.getItem('owner_session_token');
    if (localAuth && sessionAuth && sessionToken) {
      return true;
    }
    if (localAuth && !sessionAuth) {
      localStorage.removeItem('owner_authenticated');
      localStorage.removeItem('owner_authenticated_at');
      localStorage.removeItem('owner_session_token');
    }
    return false;
  });

  const [branchAuth, setBranchAuth] = useState<{ id: string; nama: string } | null>(() =>
    safeGetLocalStorage<{ id: string; nama: string } | null>('branch_authenticated', null)
  );

  const [showBranchLogin, setShowBranchLogin] = useState(false);
  const [showOwnerLogin, setShowOwnerLogin] = useState(false);

  const handleOwnerLogin = () => {
    setIsOwnerAuthenticated(true);
  };

  const handleOwnerLogout = () => {
    localStorage.removeItem('owner_authenticated');
    localStorage.removeItem('owner_authenticated_at');
    localStorage.removeItem('owner_session_token');
    sessionStorage.removeItem('owner_authenticated');
    sessionStorage.removeItem('owner_authenticated_at');
    sessionStorage.removeItem('owner_session_id');
    setIsOwnerAuthenticated(false);
  };

  const handleBranchLogin = (cabang: Cabang) => {
    setBranchAuth({ id: cabang.id, nama: cabang.nama });
  };

  const handleBranchLogout = () => {
    localStorage.removeItem('branch_authenticated');
    localStorage.removeItem('branch_authenticated_at');
    setBranchAuth(null);
  };

  return {
    isOwnerAuthenticated,
    setIsOwnerAuthenticated,
    branchAuth,
    setBranchAuth,
    showBranchLogin,
    setShowBranchLogin,
    showOwnerLogin,
    setShowOwnerLogin,
    handleOwnerLogin,
    handleOwnerLogout,
    handleBranchLogin,
    handleBranchLogout,
  };
}
