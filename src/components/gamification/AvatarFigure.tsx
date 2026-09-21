import { type AvatarConfig } from "@/lib/gamification/avatar";
import { avatarFigureSvg } from "@/lib/gamification/avatarSvg";

// Reine Custom-Figur (fuer die Baukasten-Vorschau). SVG wird aus eigenen,
// sanitierten Katalogwerten erzeugt – kein Fremd-HTML.
export function AvatarFigure({ config, size = 128 }: { config: AvatarConfig; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: avatarFigureSvg(config, size) }}
    />
  );
}
