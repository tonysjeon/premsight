'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IoLogOutOutline, IoTrashOutline } from 'react-icons/io5';
import { SlidingTabs } from '@/components/sliding-tabs';
import { SignInModal } from '@/components/sign-in-modal';
import { usePlayerFavorites, useTeamFavorites } from '@/lib/use-player-favorites';
import {
  deleteAccountToHome,
  fetchCurrentUser,
  peekCurrentUser,
  signOutToHome,
  subscribeAuth,
  type AuthUser,
} from '@/lib/auth';
import { profileInitials, type ProfileTab } from '@/lib/profile';

const TABS: readonly { id: ProfileTab; label: string }[] = [
  { id: 'teams', label: 'Teams' },
  { id: 'players', label: 'Players' },
];

export function ProfilePage() {
  const favorites = usePlayerFavorites();
  const followed = useTeamFavorites();
  const [tab, setTab] = useState<ProfileTab>('teams');
  const [user, setUser] = useState<AuthUser | null | undefined>(peekCurrentUser);

  useEffect(() => {
    const loadUser = () => {
      fetchCurrentUser()
        .then(setUser)
        .catch(() => setUser(null));
    };
    loadUser();
    return subscribeAuth(loadUser);
  }, []);

  useEffect(() => {
    if (user !== null) return;
    window.location.replace('/');
  }, [user]);

  async function handleSignOut() {
    await signOutToHome();
  }

  async function handleDelete() {
    const confirmed = window.confirm('Delete your PremSight account? This cannot be undone.');
    if (!confirmed) return;
    await deleteAccountToHome();
  }

  if (!user) {
    return (
      <main aria-busy="true" className="profile-page">
        <header className="profile-heading">
          <span className="profile-avatar profile-skeleton" />
          <div className="profile-heading-copy">
            <h1>Profile</h1>
            <p className="profile-name">
              <span className="profile-skeleton profile-skeleton--name" />
            </p>
          </div>
        </header>
        <section className="profile-card">
          <div className="profile-tabs">
            {TABS.map((item) => (
              <span key={item.id}>{item.label}</span>
            ))}
          </div>
          <div className="profile-list" />
        </section>
      </main>
    );
  }

  const initials = profileInitials(user.display_name);

  return (
    <main className="profile-page">
      <SignInModal
        open={favorites.signIn || followed.signIn}
        onClose={() => {
          favorites.setSignIn(false);
          followed.setSignIn(false);
        }}
      />
      <header className="profile-heading">
        {user.avatar_url ? (
          <Image
            alt={user.display_name}
            className="profile-avatar"
            height={72}
            referrerPolicy="no-referrer"
            src={user.avatar_url}
            unoptimized
            width={72}
          />
        ) : (
          <span aria-hidden="true" className="profile-avatar profile-avatar--fallback">
            {initials}
          </span>
        )}
        <div className="profile-heading-copy">
          <h1>Profile</h1>
          <p className="profile-name">{user.display_name}</p>
        </div>
      </header>

      <section className="profile-card" aria-labelledby="profile-collection-heading">
        <h2 className="sr-only" id="profile-collection-heading">
          Saved collections
        </h2>
        <SlidingTabs
          as="div"
          className="profile-tabs"
          label="Profile sections"
          role="tablist"
          selected={tab}
        >
          {TABS.map((item) => (
            <button
              aria-controls="profile-collection-panel"
              aria-selected={item.id === tab}
              id={`profile-tab-${item.id}`}
              key={item.id}
              role="tab"
              type="button"
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </SlidingTabs>
        <div
          aria-labelledby={`profile-tab-${tab}`}
          className="profile-list"
          id="profile-collection-panel"
          role="tabpanel"
        >
          {tab === 'players' ? (
            favorites.loading ? (
              <p className="empty">Loading favorites…</p>
            ) : favorites.error ? (
              <p className="profile-save-feedback" role="status">
                {favorites.error} <button onClick={() => void favorites.reload()}>Retry</button>
              </p>
            ) : favorites.visibleItems.length ? (
              <ul className="profile-team-list">
                {favorites.visibleItems.map((player) => (
                  <li key={player.id}>
                    <div className="profile-player-copy">
                      {player.team_crest_url ? (
                        <Image
                          src={player.team_crest_url}
                          alt=""
                          width={24}
                          height={24}
                          unoptimized
                        />
                      ) : null}
                      <span>{player.display_name}</span>
                    </div>
                    <button
                      className="team-follow-button"
                      type="button"
                      aria-pressed={favorites.players.some((saved) => saved.id === player.id)}
                      aria-label={`${favorites.players.some((saved) => saved.id === player.id) ? 'Unfollow' : 'Follow'} ${player.display_name}`}
                      onClick={() => void favorites.toggle(player)}
                    >
                      {favorites.players.some((saved) => saved.id === player.id)
                        ? 'Following'
                        : 'Follow'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null
          ) : followed.loading ? (
            <p className="empty">Loading followed teams…</p>
          ) : followed.error ? (
            <p className="profile-save-feedback" role="status">
              {followed.error}{' '}
              <button type="button" onClick={() => void followed.reload()}>
                Retry
              </button>
            </p>
          ) : followed.visibleItems.length ? (
            <ul className="profile-team-list">
              {followed.visibleItems.map((team) => (
                <li key={team.id}>
                  <Link
                    href={`/teams/${team.tla?.toLowerCase() || team.id}`}
                    className="profile-team-link"
                  >
                    {team.crest_url ? (
                      <Image src={team.crest_url} alt="" width={24} height={24} unoptimized />
                    ) : null}
                    <span>{team.name}</span>
                  </Link>
                  <button
                    className="team-follow-button"
                    type="button"
                    aria-pressed={followed.teams.some((saved) => saved.id === team.id)}
                    aria-label={`${followed.teams.some((saved) => saved.id === team.id) ? 'Unfollow' : 'Follow'} ${team.name}`}
                    onClick={() => void followed.toggle(team)}
                  >
                    {followed.teams.some((saved) => saved.id === team.id) ? 'Following' : 'Follow'}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <div className="profile-actions">
        <button className="profile-text-action" type="button" onClick={handleSignOut}>
          <IoLogOutOutline aria-hidden="true" size={16} />
          Sign out
        </button>
        <button className="profile-text-action" type="button" onClick={handleDelete}>
          <IoTrashOutline aria-hidden="true" size={16} />
          Delete account
        </button>
      </div>
    </main>
  );
}
