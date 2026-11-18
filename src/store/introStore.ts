import { create } from 'zustand';

const INTRO_SESSION_KEY = 'evj_intro_v2_seen';

function shouldShowIntroInitially(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('intro') === '1') return true;
    return sessionStorage.getItem(INTRO_SESSION_KEY) !== '1';
  } catch {
    return true;
  }
}

interface IntroState {
  showIntro: boolean;
  playId: number;
  forceFull: boolean;
  completeIntro: () => void;
  replayIntro: () => void;
}

export const useIntroStore = create<IntroState>((set) => ({
  showIntro: shouldShowIntroInitially(),
  playId: 1,
  forceFull: false,
  completeIntro: () => {
    try {
      sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    } catch {
      // ignore storage errors
    }
    set({ showIntro: false, forceFull: false });
  },
  replayIntro: () =>
    set((s) => ({
      showIntro: true,
      playId: s.playId + 1,
      forceFull: true,
    })),
}));
