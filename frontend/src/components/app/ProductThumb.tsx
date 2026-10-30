import { Droplet, FlaskConical, Leaf, Sparkles, Sun, Waves } from "lucide-react";
import type { Category } from "@/lib/mock-data";

const look: Record<Category, { icon: React.ComponentType<{ size?: number; className?: string }>; bg: string; fg: string }> = {
  Cleansers: { icon: Waves, bg: "from-sky-50 to-sky-100", fg: "text-sky-600" },
  Serums: { icon: FlaskConical, bg: "from-brand-50 to-brand-100", fg: "text-brand-500" },
  Moisturizers: { icon: Droplet, bg: "from-sky-50 to-brand-50", fg: "text-sky-500" },
  Sunscreens: { icon: Sun, bg: "from-sun-50 to-sun-100", fg: "text-sun-600" },
  Exfoliants: { icon: Sparkles, bg: "from-rose-50 to-sun-50", fg: "text-rose-500" },
  Aftercare: { icon: Leaf, bg: "from-brand-50 to-sun-50", fg: "text-brand-400" },
};

/** Placeholder product image until real images come from the search agent. */
export function ProductThumb({ category, size = 56 }: { category: Category; size?: number }) {
  const { icon: Icon, bg, fg } = look[category];
  return (
    <span className={`grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${bg}`} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.42)} className={fg} />
    </span>
  );
}
