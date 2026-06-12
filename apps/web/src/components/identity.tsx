/** Data-bound identity components: look up team colors + local asset slots. */
import { useEffect, useMemo, useState } from 'react';
import { Crest, Flag, Avatar, FavButton, Jersey } from '@worldcup/ui';
import type { Player } from '@worldcup/shared';
import { downloadedPlayerPhotoExts, playerPhotoFallbacks } from '@/generated/playerPhotos';
import blobPlayerPhotos from '../../../../packages/shared/src/data/blobPlayerPhotos.json';
import { downloadedTeamCrestExts, teamCrestFallbacks } from '@/generated/teamCrests';
import {
  downloadedTeamKitExts,
  downloadedTeamKitVariantExts,
  teamKitFallbacks,
  teamKitVariants,
  type TeamKitVariant,
} from '@/generated/teamKits';
import { useAsset, useTeamsMap } from '@/hooks';
import { useFavorites, type FavKind } from '@/store/favorites';

export function TeamCrest({ code, size = 40 }: { code: string; size?: number }) {
  const teams = useTeamsMap();
  const t = teams[code];
  const assetSrc = useAsset(t?.crestAssetId);
  const downloadedExt = downloadedTeamCrestExts[code];
  const fallback = teamCrestFallbacks[code];
  const candidates = useMemo(() => {
    const staticSrc = downloadedExt ? `/team-crests/${encodeURIComponent(code)}.${downloadedExt}` : null;
    return [assetSrc, staticSrc, fallback?.src].filter((src): src is string => Boolean(src));
  }, [assetSrc, code, downloadedExt, fallback?.src]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  useEffect(() => setCandidateIndex(0), [assetSrc, code, downloadedExt, fallback?.src]);

  const src = candidates[candidateIndex] ?? null;
  if (src) {
    return (
      <img
        src={src}
        alt={`${t?.name ?? code} crest`}
        width={size}
        height={size}
        className="crest official-crest asset-img"
        loading="lazy"
        decoding="async"
        draggable={false}
        style={{
          background: 'rgba(255, 255, 255, 0.94)',
          borderRadius: Math.round(size * 0.22),
          display: 'block',
          width: size,
          height: size,
          objectFit: 'contain',
          padding: Math.max(3, Math.round(size * 0.08)),
          boxSizing: 'border-box',
        }}
        onError={() => setCandidateIndex((i) => i + 1)}
      />
    );
  }

  return <Crest code={code} colorA={t?.colorA} colorB={t?.colorB} size={size} />;
}

export function TeamFlag({ code, size = 18 }: { code: string; size?: number }) {
  const teams = useTeamsMap();
  const t = teams[code];
  const assetSrc = useAsset(t?.flagAssetId);
  // Prefer a real country flag (flagcdn, free) when we know the ISO code.
  const src = t?.iso2 ? `https://flagcdn.com/${t.iso2}.svg` : assetSrc;
  return <Flag code={code} colorA={t?.colorA} colorB={t?.colorB} size={size} src={src} />;
}

export function TeamKit({ code, size = 36, variant = 'home' }: { code: string; size?: number; variant?: TeamKitVariant }) {
  const teams = useTeamsMap();
  const t = teams[code];
  const fallback = teamKitVariants[code]?.[variant] ?? (variant === 'home' ? teamKitFallbacks[code] : null);
  const downloadedExt = downloadedTeamKitVariantExts[code]?.[variant] ?? (variant === 'home' ? downloadedTeamKitExts[code] : null);
  const candidates = useMemo(() => {
    const staticName = variant === 'home' ? code : `${code}-${variant}`;
    const staticSrc = downloadedExt ? `/team-kits/${encodeURIComponent(staticName)}.${downloadedExt}` : null;
    return [staticSrc, fallback?.src].filter((src): src is string => Boolean(src));
  }, [code, downloadedExt, fallback?.src, variant]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  useEffect(() => setCandidateIndex(0), [code, downloadedExt, fallback?.src, variant]);

  const src = candidates[candidateIndex] ?? null;
  if (src) {
    return (
      <img
        src={src}
        alt={`${t?.name ?? code} kit`}
        width={size}
        height={Math.round((size * 44) / 48)}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="asset-img"
        style={{ objectFit: 'contain', flex: 'none' }}
        onError={() => setCandidateIndex((i) => i + 1)}
      />
    );
  }

  return <Jersey colorA={t?.colorA} colorB={t?.colorB} size={size} />;
}

export function PlayerAvatar({ player, size = 44 }: { player: Player; size?: number }) {
  const teams = useTeamsMap();
  const t = teams[player.team];
  const assetSrc = useAsset(player.photoAssetId);
  const fallback = playerPhotoFallbacks[player.id];
  const downloadedExt = downloadedPlayerPhotoExts[player.id];
  const blobUrl = `https://fudh993bs9djeozd.public.blob.vercel-storage.com/players/${player.id}.jpg`;
  const candidates = useMemo(() => {
    const staticSrc = downloadedExt ? `/player-photos/${encodeURIComponent(player.id)}.${downloadedExt}` : null;
    return [blobUrl, assetSrc, staticSrc, fallback?.src].filter((src): src is string => Boolean(src));
  }, [blobUrl, assetSrc, downloadedExt, fallback?.src, player.id]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  useEffect(() => setCandidateIndex(0), [blobUrl, assetSrc, downloadedExt, fallback?.src, player.id]);

  const src = candidates[candidateIndex] ?? null;
  return (
    <span
      className="player-avatar-wrapper"
      style={{
        display: 'inline-flex',
        flex: 'none',
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        viewTransitionName: `player-photo-${player.id}`,
      } as React.CSSProperties}
    >
      {src ? (
        <img
          src={src}
          alt={player.name}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="asset-img player-photo"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            minWidth: `${size}px`,
            minHeight: `${size}px`,
            borderRadius: 12,
            objectFit: 'cover',
            flex: 'none',
          }}
          onError={() => setCandidateIndex((i) => i + 1)}
        />
      ) : (
        <Avatar name={player.name} colorA={t?.colorA} colorB={t?.colorB} size={size} />
      )}
    </span>
  );
}

export function TeamLabel({
  code,
  size = 28,
  bold = true,
  sub,
}: {
  code: string;
  size?: number;
  bold?: boolean;
  sub?: string;
}) {
  const teams = useTeamsMap();
  const t = teams[code];
  return (
    <span className="row gap-10" style={{ minWidth: 0 }}>
      <TeamCrest code={code} size={size} />
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            fontWeight: bold ? 700 : 500,
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {t?.name ?? code}
        </span>
        {sub && <span className="mono-label" style={{ display: 'block' }}>{sub}</span>}
      </span>
    </span>
  );
}

export function FavStar({ kind, id, size = 18 }: { kind: FavKind; id: string; size?: number }) {
  const active = useFavorites((s) => s[kind].includes(id));
  const toggle = useFavorites((s) => s.toggle);
  return <FavButton active={active} size={size} onClick={() => toggle(kind, id)} />;
}
