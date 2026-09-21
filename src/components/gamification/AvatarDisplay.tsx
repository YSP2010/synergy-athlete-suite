import { type Rank, divisionName } from "@/lib/gamification/rank";
import type { Locale } from "@/lib/i18n/messages";
import type { AvatarConfig } from "@/lib/gamification/avatar";
import { AvatarFigure } from "./AvatarFigure";

interface Props {
  config: AvatarConfig;
  ranked: boolean;
  rank: Rank;
  locale: Locale;
  prospectLabel: string;
  size?: number;
}

// Avatar mit rang-abhaengigem Rahmen und Emblem darunter.
export function AvatarDisplay({ config, ranked, rank, locale, prospectLabel, size = 160 }: Props) {
  const color = ranked ? rank.division.color : "#8b95a1";
  const accent = ranked ? rank.division.accent : "#c3ccd6";
  const title = ranked ? `${divisionName(rank.division, locale)} ${rank.roman}` : prospectLabel;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="rounded-full p-[4px]"
        style={{ background: `linear-gradient(135deg, ${color}, ${accent})` }}
      >
        <div
          className="overflow-hidden rounded-full bg-[var(--elevated)]"
          style={{ width: size, height: size }}
        >
          <AvatarFigure config={config} size={size} />
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div
          className="rounded-full px-4 py-1 text-sm font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${color}, ${accent})` }}
        >
          {title}
        </div>
        {ranked && (
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: i < rank.tier ? color : "var(--elevated)" }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
