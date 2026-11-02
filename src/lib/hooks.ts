import { useMemo } from 'react';
import { useAppState, useTargets } from '../store/store';
import { todayKey } from './dates';
import { currentStreak, dayReward, gemsBalance, gemsEarned, levelInfo } from './gamification';
import type { Mood } from './pet';

/** Estado derivado de gamificación, memoizado para no recalcular en cada render. */
export function useGameStatus() {
  const state = useAppState();
  const targets = useTargets();
  return useMemo(() => {
    const earned = gemsEarned(state, targets);
    const balance = gemsBalance(state, targets);
    const lvl = levelInfo(earned);
    const streak = currentStreak(state);
    const today = state.days[todayKey()];
    const todayReward = dayReward(today, targets);
    const hour = new Date().getHours();
    let mood: Mood = 'contento';
    if (!today?.entries.length) mood = hour >= 11 ? 'dormido' : 'contento';
    else if (todayReward.total >= 60) mood = 'eufórico';
    else mood = 'feliz';
    return { earned, balance, ...lvl, streak, todayReward, mood };
  }, [state, targets]);
}
