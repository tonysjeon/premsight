'use client';

import { SignInModal } from '@/components/sign-in-modal';
import type { Team } from '@/lib/api';
import { useTeamFavorites } from '@/lib/use-player-favorites';

export function TeamFollow({ team }: { team: Team }) {
  const favorites = useTeamFavorites();
  const following = favorites.teams.some((saved) => saved.id === team.id);
  return (
    <div className="team-follow-control">
      <button
        className="team-follow-button"
        type="button"
        aria-pressed={favorites.loadError ? undefined : following}
        aria-label={
          favorites.loadError
            ? 'Retry loading followed teams'
            : `${following ? 'Unfollow' : 'Follow'} ${team.name}`
        }
        title={favorites.loadError ? 'Follow status unavailable. Click to retry.' : undefined}
        disabled={favorites.loading}
        onClick={() => void favorites.toggle(team)}
      >
        {favorites.loadError ? 'Retry' : following ? 'Following' : 'Follow'}
      </button>
      {favorites.error && !favorites.loadError ? (
        <span className="save-feedback" role="status">
          {favorites.error}
        </span>
      ) : null}
      <SignInModal open={favorites.signIn} onClose={() => favorites.setSignIn(false)} />
    </div>
  );
}
