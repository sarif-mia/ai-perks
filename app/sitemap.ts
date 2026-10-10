import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/privacy", "/terms"].map((path) => ({
    url: "https://ai-perks-two.vercel.app" + path,
    changeFrequency: "monthly",
    priority: path ? 0.3 : 1,
  }));
}
