import { useState, useEffect, useCallback } from 'react';

export type IntroMode = 'always' | 'session' | 'never';

const PREF_STORAGE_KEY = 'utilityai_intro_pref';
const SESSION_SHOWN_KEY = 'utilityai_intro_shown_session';

function getStoredPreference(): IntroMode {
  try {
    const val = localStorage.getItem(PREF_STORAGE_KEY);
    if (val === 'always' || val === 'session' || val === 'never') {
      return val;
    }
    const userPrefsRaw = localStorage.getItem('utilityai_user_prefs');
    if (userPrefsRaw) {
      const parsed = JSON.parse(userPrefsRaw);
      if (parsed.intro_mode === 'always' || parsed.intro_mode === 'session' || parsed.intro_mode === 'never') {
        return parsed.intro_mode;
      }
    }
  } catch {
    // Fallback if localStorage is disabled or restricted
  }
  return 'session';
}

function getSessionShown(): boolean {
  try {
    return sessionStorage.getItem(SESSION_SHOWN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function useIntroPreference() {
  const [introPref, setIntroPrefState] = useState<IntroMode>(getStoredPreference);
  const [isSessionShown, setIsSessionShown] = useState<boolean>(getSessionShown);
  const [forcedReplayCount, setForcedReplayCount] = useState(0);

  useEffect(() => {
    // Sync with external storage changes if any
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PREF_STORAGE_KEY && e.newValue) {
        if (e.newValue === 'always' || e.newValue === 'session' || e.newValue === 'never') {
          setIntroPrefState(e.newValue);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setIntroPref = useCallback((mode: IntroMode) => {
    setIntroPrefState(mode);
    try {
      localStorage.setItem(PREF_STORAGE_KEY, mode);
      const userPrefsRaw = localStorage.getItem('utilityai_user_prefs');
      if (userPrefsRaw) {
        const parsed = JSON.parse(userPrefsRaw);
        parsed.intro_mode = mode;
        localStorage.setItem('utilityai_user_prefs', JSON.stringify(parsed));
      }
    } catch {
      // storage blocked or full
    }
  }, []);

  const markIntroShown = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_SHOWN_KEY, 'true');
    } catch {
      // ignore
    }
    setIsSessionShown(true);
    setForcedReplayCount(0);
  }, []);

  const forceReplay = useCallback(() => {
    setForcedReplayCount((c) => c + 1);
  }, []);

  // Determine whether intro should be displayed
  const shouldShowIntro = (() => {
    if (forcedReplayCount > 0) return true;
    if (introPref === 'never') return false;
    if (introPref === 'always') return true;
    // introPref === 'session'
    return !isSessionShown;
  })();

  return {
    introPref,
    setIntroPref,
    shouldShowIntro,
    markIntroShown,
    forceReplay,
    forcedReplayCount
  };
}
