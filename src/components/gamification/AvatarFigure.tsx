import { useId } from "react";
import {
  type AvatarConfig,
  SKIN_TONES,
  HAIR_COLORS,
  JERSEY_COLORS,
  colorHex,
  sanitizeAvatar,
} from "@/lib/gamification/avatar";

const TORSO = "M16 100 C16 76 30 66 50 66 C70 66 84 76 84 100 Z";
const CAP = "M27 43 C27 20 73 20 73 43 C66 33 58 29 50 29 C42 29 34 33 27 43 Z";

const HAIR_D: Record<string, string> = {
  buzz: "M30 44 C30 24 70 24 70 44 C64 35 57 32 50 32 C43 32 36 35 30 44 Z",
  short: "M28 44 C28 20 72 20 72 44 C66 33 58 29 50 29 C42 29 34 33 28 44 Z",
  medium: "M26 52 C24 22 76 22 74 52 C70 35 60 30 50 30 C40 30 30 35 26 52 Z",
  long: "M25 44 C23 20 77 20 75 44 L75 68 L67 68 L67 44 C63 34 57 30 50 30 C43 30 37 34 33 44 L33 68 L25 68 Z",
};

interface Props {
  config: AvatarConfig;
  size?: number;
}

export function AvatarFigure({ config, size = 128 }: Props) {
  const cfg = sanitizeAvatar(config);
  const uid = useId().replace(/[:]/g, "");
  const torsoId = `torso-${uid}`;

  const skin = colorHex(SKIN_TONES, cfg.skin);
  const hair = colorHex(HAIR_COLORS, cfg.hairColor);
  const jersey = colorHex(JERSEY_COLORS, cfg.jerseyColor);
  const lightJersey = cfg.jerseyColor === "white" || cfg.jerseyColor === "yellow";
  const pat = lightJersey ? "#2a2f3a" : "#ffffff";
  const hairPath = HAIR_D[cfg.hair];

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Avatar">
      <defs>
        <clipPath id={torsoId}>
          <path d={TORSO} />
        </clipPath>
      </defs>

      {/* Torso / Trikot */}
      <path d={TORSO} fill={jersey} />
      {cfg.jersey !== "solid" && (
        <g clipPath={`url(#${torsoId})`}>
          {cfg.jersey === "stripes" &&
            [34, 46, 58].map((x) => (
              <rect key={x} x={x} y={66} width={6} height={34} fill={pat} opacity={0.85} />
            ))}
          {cfg.jersey === "hoops" &&
            [74, 86].map((y) => (
              <rect key={y} x={16} y={y} width={68} height={6} fill={pat} opacity={0.85} />
            ))}
          {cfg.jersey === "sash" && (
            <rect
              x={6}
              y={72}
              width={88}
              height={9}
              fill={pat}
              opacity={0.85}
              transform="rotate(18 50 82)"
            />
          )}
        </g>
      )}

      {/* Hals + Ohren + Kopf */}
      <rect x={43} y={57} width={14} height={14} rx={5} fill={skin} />
      <circle cx={30} cy={44} r={4} fill={skin} />
      <circle cx={70} cy={44} r={4} fill={skin} />
      <circle cx={50} cy={42} r={20} fill={skin} />

      {/* Haare */}
      {hairPath && <path d={hairPath} fill={hair} />}

      {/* Gesicht */}
      <circle cx={43} cy={45} r={2.2} fill="#2a2f3a" />
      <circle cx={57} cy={45} r={2.2} fill="#2a2f3a" />
      <path
        d="M45 53 Q50 57 55 53"
        stroke="#00000033"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />

      {/* Accessoire */}
      {cfg.accessory === "headband" && (
        <rect x={28} y={37} width={44} height={6} rx={3} fill={jersey} />
      )}
      {cfg.accessory === "cap" && (
        <g>
          <path d={CAP} fill={jersey} />
          <rect x={22} y={41} width={28} height={5} rx={2.5} fill={jersey} />
        </g>
      )}
      {cfg.accessory === "armband" && (
        <rect x={18} y={74} width={10} height={9} rx={2} fill="#f4c027" />
      )}
    </svg>
  );
}
