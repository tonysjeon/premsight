'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { persistFavorite, setFavorite } from '@/lib/favorite-state';
import type { Player, Team } from '@/lib/api';
import {
  AuthError,
  authRequest,
  fetchCurrentUser,
  peekCurrentUser,
  subscribeAuth,
} from '@/lib/auth';

const changed = 'premsight-favorites-changed';
const cache = new Map<string, { items: (Player | Team)[]; updated: number }>();
const requests = new Map<string, Promise<{ items: (Player | Team)[] }>>();

function cacheKey(kind: string) {
  const user = peekCurrentUser();
  return user ? `${user.id}:${kind}` : null;
}

function cachedItems<T>(kind: string): T[] | undefined {
  const key = cacheKey(kind);
  return key ? (cache.get(key)?.items as T[] | undefined) : undefined;
}

export function usePlayerFavorites() {
  return useFavorites<Player>('players');
}

export function useTeamFavorites() {
  const result = useFavorites<Team>('teams');
  return { ...result, teams: result.players };
}

function useFavorites<T extends Player | Team>(kind: 'players' | 'teams') {
  const [players, setPlayers] = useState<T[]>(() => cachedItems<T>(kind) ?? []);
  const [visibleItems, setVisibleItems] = useState<T[]>(() => cachedItems<T>(kind) ?? []);
  const [loading, setLoading] = useState(() => cachedItems(kind) === undefined);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const inFlight = useRef(new Set<string>());
  const desired = useRef(new Map<string, boolean>());
  const revision = useRef(0);
  const [signIn, setSignIn] = useState(false);
  const load = useCallback(async () => {
    const started = ++revision.current;
    try {
      const user = await fetchCurrentUser();
      if (!user) {
        if (started === revision.current) {
          setPlayers([]);
          setVisibleItems([]);
          setError('');
          setLoadError(false);
        }
        return;
      }
      const key = `${user.id}:${kind}`;
      const existing = cache.get(key);
      if (existing && Date.now() - existing.updated < 30000) {
        if (started === revision.current) {
          setPlayers(existing.items as T[]);
          setVisibleItems(existing.items as T[]);
        }
        setError('');
        setLoadError(false);
        return;
      }
      let request = requests.get(key);
      if (!request) {
        request = authRequest<{ items: (Player | Team)[] }>(`/v1/favorites/${kind}`).finally(() =>
          requests.delete(key),
        );
        requests.set(key, request);
      }
      const result = await request;
      if (started !== revision.current) return;
      if (peekCurrentUser()?.id !== user.id) return;
      cache.set(key, { items: result.items, updated: Date.now() });
      setPlayers(result.items as T[]);
      setVisibleItems(result.items as T[]);
      setError('');
      setLoadError(false);
    } catch (e) {
      if (started !== revision.current) return;
      const signedOut = e instanceof AuthError && e.status === 401;
      if (signedOut) {
        setPlayers([]);
        setVisibleItems([]);
      }
      setLoadError(!signedOut);
      setError(signedOut ? '' : 'Saved items unavailable');
    } finally {
      setLoading(false);
    }
  }, [kind]);
  useEffect(() => {
    void Promise.resolve().then(load);
    const unsubscribe = subscribeAuth(() => {
      cache.clear();
      revision.current++;
      setPlayers([]);
      setVisibleItems([]);
      setLoading(true);
      void load();
    });
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: string; item: T; saved: boolean }>).detail;
      if (detail.kind !== kind) return;
      revision.current++;
      setPlayers((previous) => setFavorite(previous, detail.item, detail.saved));
      if (detail.saved) setVisibleItems((previous) => setFavorite(previous, detail.item, true));
    };
    window.addEventListener(changed, refresh);
    return () => {
      unsubscribe();
      window.removeEventListener(changed, refresh);
    };
  }, [load, kind]);

  async function toggle(player: T) {
    if (loadError) {
      await load();
      return;
    }
    setError('');
    const saved = desired.current.get(player.id) ?? players.some((p) => p.id === player.id);
    desired.current.set(player.id, !saved);
    const publish = (value: boolean) => {
      const key = cacheKey(kind);
      if (key) {
        const previous = cache.get(key)?.items ?? players;
        cache.set(key, {
          items: setFavorite(previous as T[], player, value) as (Player | Team)[],
          updated: Date.now(),
        });
      }
      window.dispatchEvent(
        new CustomEvent(changed, { detail: { kind, item: player, saved: value } }),
      );
    };
    publish(!saved);
    if (inFlight.current.has(player.id)) return;
    inFlight.current.add(player.id);
    setPending(new Set(inFlight.current));
    let confirmed = saved;
    try {
      await persistFavorite(
        saved,
        () => desired.current.get(player.id)!,
        (target) =>
          authRequest<void>(`/v1/favorites/${kind}/${encodeURIComponent(player.id)}`, {
            method: target ? 'PUT' : 'DELETE',
          }),
        (value) => {
          confirmed = value;
        },
      );
    } catch (e) {
      publish(confirmed);
      if (e instanceof AuthError && e.status === 401) setSignIn(true);
      else setError('Couldn’t save that change');
    } finally {
      inFlight.current.delete(player.id);
      desired.current.delete(player.id);
      setPending(new Set(inFlight.current));
    }
  }
  return {
    players,
    visibleItems,
    loading,
    error,
    loadError,
    pending,
    signIn,
    setSignIn,
    toggle,
    reload: load,
  };
}
