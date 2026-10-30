export type MetricKey = "temp" | "humidity" | "uv" | "aqi";

/** Copy for the metric explainer modal (S07 click 3). */
export const explainers: Record<MetricKey, { title: string; meaning: string; bands: { range: string; label: string; tone: string }[]; skin: string }> = {
  temp: {
    title: "Temperature",
    meaning: "Air temperature and how hot it actually feels once humidity and wind are counted.",
    bands: [
      { range: "Below 15°", label: "Cool", tone: "bg-sky-100 text-sky-600" },
      { range: "15–28°", label: "Mild", tone: "bg-brand-50 text-brand-600" },
      { range: "Above 28°", label: "Hot", tone: "bg-sun-100 text-sun-700" },
    ],
    skin: "Heat raises oil production and sweat, so lighter textures and a gentle cleanse feel better on hot days.",
  },
  humidity: {
    title: "Humidity",
    meaning: "How much water is in the air. Skin loses less moisture when the air is humid.",
    bands: [
      { range: "Below 35%", label: "Dry", tone: "bg-sun-100 text-sun-700" },
      { range: "35–60%", label: "Comfortable", tone: "bg-brand-50 text-brand-600" },
      { range: "Above 60%", label: "Humid", tone: "bg-sky-100 text-sky-600" },
    ],
    skin: "Humid air suits gel textures; dry air calls for a richer moisturizer to stop skin feeling tight.",
  },
  uv: {
    title: "UV index",
    meaning: "The strength of the sun's skin-damaging ultraviolet rays, highest around midday.",
    bands: [
      { range: "0–2", label: "Low", tone: "bg-brand-50 text-brand-600" },
      { range: "3–5", label: "Moderate", tone: "bg-sun-50 text-sun-700" },
      { range: "6–7", label: "High", tone: "bg-sun-100 text-sun-700" },
      { range: "8–10", label: "Very high", tone: "bg-rose-50 text-rose-600" },
      { range: "11+", label: "Extreme", tone: "bg-rose-100 text-rose-600" },
    ],
    skin: "UV causes sunburn, dark spots and early lines. At 6 or above, use SPF 50 and reapply every 2 hours outdoors.",
  },
  aqi: {
    title: "Air quality (AQI)",
    meaning: "A combined score for pollution such as fine particles (PM2.5) and ozone. Higher is worse.",
    bands: [
      { range: "0–50", label: "Good", tone: "bg-brand-50 text-brand-600" },
      { range: "51–100", label: "Moderate", tone: "bg-sun-50 text-sun-700" },
      { range: "101–150", label: "Unhealthy for sensitive", tone: "bg-sun-100 text-sun-700" },
      { range: "151–200", label: "Unhealthy", tone: "bg-rose-50 text-rose-600" },
      { range: "200+", label: "Very unhealthy", tone: "bg-rose-100 text-rose-600" },
    ],
    skin: "Fine particles cling to skin and sunscreen. Above 100, double-cleanse at night to remove them.",
  },
};
