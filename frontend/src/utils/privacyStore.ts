import { useState, useEffect } from 'react';

export const setPrivacyMode = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fintrack_privacy_mode', String(enabled));
    window.dispatchEvent(new Event('privacy-toggle'));
  }
};

export const usePrivacyMode = () => {
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    return typeof window !== 'undefined' && localStorage.getItem('fintrack_privacy_mode') === 'true';
  });

  useEffect(() => {
    const handleToggle = () => {
      setIsPrivacyMode(localStorage.getItem('fintrack_privacy_mode') === 'true');
    };
    window.addEventListener('privacy-toggle', handleToggle);
    return () => window.removeEventListener('privacy-toggle', handleToggle);
  }, []);

  const enablePrivacyMode = () => {
    setPrivacyMode(true);
  };

  const disablePrivacyMode = () => {
    setPrivacyMode(false);
  };

  const togglePrivacyMode = () => {
    const current = typeof window !== 'undefined' && localStorage.getItem('fintrack_privacy_mode') === 'true';
    setPrivacyMode(!current);
  };

  return { isPrivacyMode, enablePrivacyMode, disablePrivacyMode, togglePrivacyMode };
};

export const formatCurrency = (val: number) => {
  const isPrivacyMode = typeof window !== 'undefined' && localStorage.getItem('fintrack_privacy_mode') === 'true';
  if (isPrivacyMode) {
    return '₹••••••';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
};
