'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { setFavorite } from '@/lib/favorite-state';
import type { Player, Team } from '@/lib/api';
import { AuthError, authRequest, subscribeAuth } from '@/lib/auth';

const changed = 'premsight-favorites-changed';

export function usePlayerFavorites() {
  return useFavorites<Player>('players');
}

export function useTeamFavorites() {
  const result = useFavorites<Team>('teams');
  return { ...result, teams: result.players };
}

function useFavorites<T extends { id: string }>(kind: 'players' | 'teams') {
  const [players, setPlayers] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const inFlight = useRef(new Set<string>());
  const revision = useRef(0);
  const [signIn, setSignIn] = useState(false);
  const load = useCallback(async () => {
    const started = ++revision.current;
    try {
      const result = await authRequest<{ items: T[] }>(`/v1/favorites/${kind}`);
      if (started !== revision.current) return;
      setPlayers(result.items);
      setError('');
      setLoadError(false);
    } catch (e) {
      if (started !== revision.current) return;
      const signedOut = e instanceof AuthError && e.status === 401;
      if (signedOut) setPlayers([]);
      setLoadError(!signedOut);
      setError(signedOut ? '' : 'Saved items unavailable');
    } finally {
      setLoading(false);
    }
  }, [kind]);
  useEffect(() => {
    void Promise.resolve().then(load);
    const unsubscribe = subscribeAuth(() => {
      void load();
    });
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: string; item: T; saved: boolean }>).detail;
      if (detail.kind !== kind) return;
      revision.current++;
      setPlayers((previous) => setFavorite(previous, detail.item, detail.saved));
    };
    window.addEventListener(changed, refresh);
    return () => {
      unsubscribe();
      window.removeEventListener(changed, refresh);
    };
  }, [load, kind]);

  async function toggle(player: T) {
    if (inFlight.current.has(player.id)) return;
    if (loadError) {
      await load();
      return;
    }
    inFlight.current.add(player.id);
    setPending(new Set(inFlight.current));
    setError('');
    const saved = players.some((p) => p.id === player.id);
    const publish = (value: boolean) => {
      window.dispatchEvent(
        new CustomEvent(changed, { detail: { kind, item: player, saved: value } }),
      );
    };
    publish(!saved);
    try {
      await authRequest<void>(`/v1/favorites/${kind}/${encodeURIComponent(player.id)}`, {
        method: saved ? 'DELETE' : 'PUT',
      });
    } catch (e) {
      publish(saved);
      if (e instanceof AuthError && e.status === 401) setSignIn(true);
      else setError('Couldn’t save that change');
    } finally {
      inFlight.current.delete(player.id);
      setPending(new Set(inFlight.current));
    }
  }
  return { players, loading, error, loadError, pending, signIn, setSignIn, toggle, reload: load };
}
