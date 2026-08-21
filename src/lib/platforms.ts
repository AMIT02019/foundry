/**
 * Platform adapters.
 *
 * The database row (see `platforms` in schema.ts) holds the *behaviour* flags.
 * This file holds the *presentation* + seed defaults for each platform we
 * support. Adding a new platform means one entry here plus one seeded row —
 * no branching anywhere else in the app.
 */

export type PlatformSlug =
  | "html"
  | "wordpress"
  | "shopify"
  | "webflow"
  | "framer"
  | "figma";

export interface PlatformDef {
  slug: PlatformSlug;
  name: string;
  deliveryType: "file" | "link" | "external";
  supportsLicensing: boolean;
  supportsAutoUpdate: boolean;
  /** Fields the seller must fill for this platform, beyond the shared ones. */
  requiredFields: string[];
  /** Shown on the product page. Markdown. */
  installGuide: string;
  accent: string;
  sortOrder: number;
}

export const PLATFORMS: Record<PlatformSlug, PlatformDef> = {
  html: {
    slug: "html",
    name: "HTML / Tailwind",
    deliveryType: "file",
    supportsLicensing: false,
    supportsAutoUpdate: false,
    requiredFields: ["buildTool"],
    installGuide:
      "Unzip the download and upload the contents to your web host, or run the included build step and deploy the `dist` folder anywhere static files are served.",
    accent: "#1F4BFF",
    sortOrder: 1,
  },
  wordpress: {
    slug: "wordpress",
    name: "WordPress",
    deliveryType: "file",
    supportsLicensing: true,
    supportsAutoUpdate: true,
    requiredFields: ["minWpVersion", "minPhpVersion", "requiredPlugins"],
    installGuide:
      "In your dashboard go to Appearance → Themes → Add New → Upload Theme, choose the zip, then Activate. Paste your licence key under the theme's Licence tab to receive updates.",
    accent: "#21759B",
    sortOrder: 2,
  },
  shopify: {
    slug: "shopify",
    name: "Shopify",
    deliveryType: "file",
    supportsLicensing: false,
    supportsAutoUpdate: false,
    requiredFields: ["onlineStoreVersion"],
    installGuide:
      "From your Shopify admin open Online Store → Themes → Add theme → Upload zip file, then Publish when you're ready.",
    accent: "#5E8E3E",
    sortOrder: 3,
  },
  webflow: {
    slug: "webflow",
    name: "Webflow",
    deliveryType: "link",
    supportsLicensing: false,
    supportsAutoUpdate: false,
    requiredFields: ["cloneUrl"],
    installGuide:
      "Open the clone link on your purchase page while signed in to Webflow. The project is copied into your own dashboard.",
    accent: "#4353FF",
    sortOrder: 4,
  },
  framer: {
    slug: "framer",
    name: "Framer",
    deliveryType: "link",
    supportsLicensing: false,
    supportsAutoUpdate: false,
    requiredFields: ["remixUrl"],
    installGuide:
      "Open the remix link on your purchase page while signed in to Framer. The project is duplicated into your workspace.",
    accent: "#0055FF",
    sortOrder: 5,
  },
  figma: {
    slug: "figma",
    name: "Figma",
    deliveryType: "link",
    supportsLicensing: false,
    supportsAutoUpdate: false,
    requiredFields: ["duplicateUrl"],
    installGuide:
      "Open the community link on your purchase page and choose Duplicate to add the file to your drafts.",
    accent: "#A259FF",
    sortOrder: 6,
  },
};

export const platformList = Object.values(PLATFORMS).sort(
  (a, b) => a.sortOrder - b.sortOrder,
);
