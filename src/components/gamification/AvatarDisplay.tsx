import { type Rank, divisionName } from "@/lib/gamification/rank";
import type { Locale } from "@/lib/i18n/messages";
import type { AvatarConfig } from "@/lib/gamification/avatar";
import {
  ringShell,
  customInnerBuilder,
  imageInnerBuilder,
  medalSvg,
  tierStarSvg,
} from "@/lib/gamification/avatarSvg";
import { dicebearUrl, presetUrl } from "@/lib/gamification/galleries";

interface Props {
  config: AvatarConfig;
  ranked: boolean;
  rank: Rank;
  locale: Locale;
  prospectLabel: string;
  size?: number;
}

// Avatar (aktuell Custom-Modus) im rang-abhaengigen Ring, darunter Medaille,
// Rang-Plakette und Stufen-Sterne. DiceBear-/Illustriert-Modus folgen als
// eigene Ausbaustufen und liefern dann ihren eigenen inneren Builder.
export function AvatarDisplay({ config, ranked, rank, locale, prospectLabel, size = 220 }: Props) {
  const color = ranked ? rank.division.color : "#8b95a1";
  const accent = ranked ? rank.division.accent : "#c9d2dc";
  const isGold = ranked && rank.divisionIndex === 4;
  const inner =
    config.mode === "dicebear"
      ? imageInnerBuilder(dicebearUrl(config.dicebearId))
      : config.mode === "illustrated"
        ? imageInnerBuilder(presetUrl(config.presetId))
        : customInnerBuilder(config);
  const ringHtml = ringShell(
    inner,
    { color, accent, divisionIndex: rank.divisionIndex, ranked },
    size,
  );
  const title = ranked ? `${divisionName(rank.division, locale)} ${rank.roman}` : prospectLabel;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        style={{ width: size, height: size, lineHeight: 0 }}
        dangerouslySetInnerHTML={{ __html: ringHtml }}
      />
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2.5">
          {ranked && (
            <span
              style={{ lineHeight: 0 }}
              dangerouslySetInnerHTML={{ __html: medalSvg(rank.divisionIndex, color, accent) }}
            />
          )}
          <span
            className="rounded-full px-4 py-1.5 font-display font-bold uppercase tracking-wide text-white"
            style={{
              background: `linear-gradient(135deg, ${color}, ${accent})`,
              boxShadow: isGold
                ? `0 0 0 2px #f4c95a, 0 2px 10px rgba(0,0,0,.34), 0 0 30px ${color}66`
                : `0 2px 8px rgba(0,0,0,.25), 0 0 20px ${color}66`,
              textShadow: "0 1px 2px rgba(0,0,0,.4)",
              fontSize: isGold ? 18 : 15,
            }}
          >
            {title}
          </span>
        </div>
        {ranked && (
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                style={{ lineHeight: 0 }}
                dangerouslySetInnerHTML={{ __html: tierStarSvg(i < rank.tier, color) }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
