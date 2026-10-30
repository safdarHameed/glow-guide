import { Sun, Wind } from "lucide-react";

const cities = [
  { name: "Lahore", temp: 34, uv: 8, aqi: 152 },
  { name: "Dubai", temp: 31, uv: 10, aqi: 61 },
  { name: "London", temp: 12, uv: 1, aqi: 28 },
  { name: "Karachi", temp: 32, uv: 9, aqi: 98 },
  { name: "Singapore", temp: 30, uv: 11, aqi: 44 },
  { name: "Istanbul", temp: 18, uv: 4, aqi: 57 },
  { name: "New York", temp: 14, uv: 3, aqi: 35 },
  { name: "Delhi", temp: 29, uv: 7, aqi: 188 },
];

function aqiTone(aqi: number) {
  if (aqi >= 150) return "text-rose-500";
  if (aqi >= 100) return "text-sun-600";
  return "text-brand-500";
}

export function CityTicker() {
  const row = [...cities, ...cities];
  return (
    <section aria-label="Example conditions in cities" className="relative border-y border-line bg-white/70 py-5">
      <div className="mx-auto mb-3 flex max-w-page items-center justify-between px-4 text-xs text-muted sm:px-6">
        <span className="font-medium tracking-wide uppercase">One skin profile · every city</span>
      </div>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="animate-marquee flex w-max gap-3 hover:[animation-play-state:paused]">
          {row.map((c, i) => (
            <div
              key={`${c.name}-${i}`}
              aria-hidden={i >= cities.length}
              className="flex items-center gap-3 rounded-full border border-line bg-white px-4 py-2 text-sm whitespace-nowrap shadow-sm"
            >
              <span className="font-semibold text-ink">{c.name}</span>
              <span className="text-ink-soft">{c.temp}°</span>
              <span className="flex items-center gap-1 text-sun-600">
                <Sun size={13} /> {c.uv}
              </span>
              <span className={`flex items-center gap-1 ${aqiTone(c.aqi)}`}>
                <Wind size={13} /> {c.aqi}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
