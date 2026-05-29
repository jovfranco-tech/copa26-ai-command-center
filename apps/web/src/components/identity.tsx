/** Data-bound identity components: look up team colors + local asset slots. */
import { Crest, Flag, Avatar, FavButton } from '@worldcup/ui';
import type { Player } from '@worldcup/shared';
import { useAsset, useTeamsMap } from '@/hooks';
import { useFavorites, type FavKind } from '@/store/favorites';

export function TeamCrest({ code, size = 40 }: { code: string; size?: number }) {
  const teams = useTeamsMap();
  const t = teams[code];
  const src = useAsset(t?.crestAssetId);
  return <Crest code={code} colorA={t?.colorA} colorB={t?.colorB} size={size} src={src} />;
}

export function TeamFlag({ code, size = 18 }: { code: string; size?: number }) {
  const teams = useTeamsMap();
  const t = teams[code];
  const src = useAsset(t?.flagAssetId);
  return <Flag code={code} colorA={t?.colorA} colorB={t?.colorB} size={size} src={src} />;
}

export function PlayerAvatar({ player, size = 44 }: { player: Player; size?: number }) {
  const teams = useTeamsMap();
  const t = teams[player.team];
  const src = useAsset(player.photoAssetId);
  return <Avatar name={player.name} colorA={t?.colorA} colorB={t?.colorB} size={size} src={src} />;
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
