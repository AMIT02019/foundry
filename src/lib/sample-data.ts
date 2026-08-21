export interface SampleProduct {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  priceRegular: number;
  priceExtended: number | null;
  currency: string;
  thumbnailUrl: string | null;
  demoUrl: string | null;
  platformSlug: string;
  version: string;
  changelog: string;
  releasedAt: string;
  requirements: Record<string, unknown>;
  seller: {
    displayName: string;
  };
  platform: {
    name: string;
    slug: string;
    supportsAutoUpdate: boolean;
    supportsLicensing: boolean;
    installGuide?: string;
  };
}

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    id: 1,
    slug: "meridian-wp",
    title: "Meridian",
    tagline: "Consulting and professional services, built on ACF blocks.",
    description:
      "Every page is production-ready: real content structure, accessible markup, and no placeholder lorem left behind. Built specifically for modern WordPress with clean PHP and ACF block architecture.",
    priceRegular: 44900,
    priceExtended: 224900,
    currency: "INR",
    thumbnailUrl: null,
    demoUrl: "https://demo.foundry.dev/meridian",
    platformSlug: "wordpress",
    version: "2.3.1",
    changelog: "Adds a case-study post type and fixes the sticky sub-nav.",
    releasedAt: "2025-01-15T00:00:00.000Z",
    requirements: { wp: "6.4+", php: "8.1+", woocommerce: false },
    seller: { displayName: "Foundry Studio" },
    platform: {
      name: "WordPress",
      slug: "wordpress",
      supportsAutoUpdate: true,
      supportsLicensing: true,
      installGuide:
        "In your dashboard go to Appearance → Themes → Add New → Upload Theme, choose the zip, then Activate. Paste your licence key under the theme's Licence tab to receive updates.",
    },
  },
  {
    id: 2,
    slug: "kiln-html",
    title: "Kiln",
    tagline: "A 14-page Tailwind kit for studios that photograph their work.",
    description:
      "A fast, minimalist, and responsive multi-page template crafted with Tailwind CSS and Vite. Features dark mode, masonry layout grids, responsive image components, and pristine semantic markup.",
    priceRegular: 19900,
    priceExtended: 99900,
    currency: "INR",
    thumbnailUrl: null,
    demoUrl: "https://demo.foundry.dev/kiln",
    platformSlug: "html",
    version: "1.4.0",
    changelog: "New masonry gallery and a dark variant of every page.",
    releasedAt: "2025-01-10T00:00:00.000Z",
    requirements: { build: "Vite 5", css: "Tailwind 4" },
    seller: { displayName: "Foundry Studio" },
    platform: {
      name: "HTML / Tailwind",
      slug: "html",
      supportsAutoUpdate: false,
      supportsLicensing: false,
      installGuide:
        "Unzip the download and upload the contents to your web host, or run the included build step and deploy the dist folder anywhere static files are served.",
    },
  },
  {
    id: 3,
    slug: "harvest-shopify",
    title: "Harvest",
    tagline: "Grocery and speciality food storefront with bundle pricing.",
    description:
      "High-converting Shopify 2.0 theme built for speed, multi-currency commerce, custom product bundles, and seamless checkout extensibility.",
    priceRegular: 89900,
    priceExtended: null,
    currency: "INR",
    thumbnailUrl: null,
    demoUrl: "https://demo.foundry.dev/harvest",
    platformSlug: "shopify",
    version: "1.1.2",
    changelog: "Online Store 2.0 metafield sections.",
    releasedAt: "2025-01-05T00:00:00.000Z",
    requirements: { os: "2.0", checkout: "Extensibility ready" },
    seller: { displayName: "Foundry Studio" },
    platform: {
      name: "Shopify",
      slug: "shopify",
      supportsAutoUpdate: false,
      supportsLicensing: false,
      installGuide:
        "From your Shopify admin open Online Store → Themes → Add theme → Upload zip file, then Publish when you're ready.",
    },
  },
  {
    id: 4,
    slug: "signal-framer",
    title: "Signal",
    tagline: "Launch page for developer tools, with a live changelog section.",
    description:
      "A high-impact, dark-mode Framer template featuring interactive component demos, smooth micro-interactions, responsive typography, and built-in CMS for docs & changelogs.",
    priceRegular: 34900,
    priceExtended: null,
    currency: "INR",
    thumbnailUrl: null,
    demoUrl: "https://signal.framer.website",
    platformSlug: "framer",
    version: "1.0.0",
    changelog: "First release.",
    releasedAt: "2024-12-28T00:00:00.000Z",
    requirements: { plan: "Framer Mini or above" },
    seller: { displayName: "Foundry Studio" },
    platform: {
      name: "Framer",
      slug: "framer",
      supportsAutoUpdate: false,
      supportsLicensing: false,
      installGuide:
        "Open the remix link on your purchase page while signed in to Framer. The project is duplicated into your workspace.",
    },
  },
  {
    id: 5,
    slug: "prism-webflow",
    title: "Prism",
    tagline: "Modern SaaS landing page and documentation hub for Webflow.",
    description:
      "Elevate your SaaS launch with Prism. Complete with pricing tables, feature comparisons, client testimonials, and a full Webflow CMS blog and knowledge base.",
    priceRegular: 39900,
    priceExtended: null,
    currency: "INR",
    thumbnailUrl: null,
    demoUrl: "https://demo.foundry.dev/prism",
    platformSlug: "webflow",
    version: "1.2.0",
    changelog: "Updated CMS structures and refined interactions.",
    releasedAt: "2024-12-20T00:00:00.000Z",
    requirements: { plan: "Webflow CMS or above" },
    seller: { displayName: "Foundry Studio" },
    platform: {
      name: "Webflow",
      slug: "webflow",
      supportsAutoUpdate: false,
      supportsLicensing: false,
      installGuide:
        "Open the clone link on your purchase page while signed in to Webflow. The project is copied into your own dashboard.",
    },
  },
  {
    id: 6,
    slug: "apex-figma",
    title: "Apex UI System",
    tagline: "Comprehensive design system with 200+ auto-layout components.",
    description:
      "Pixel-perfect Figma design kit equipped with variable modes (dark/light), auto-layout 5.0, tokens, responsive typography scales, and production-ready screen flows.",
    priceRegular: 24900,
    priceExtended: 119900,
    currency: "INR",
    thumbnailUrl: null,
    demoUrl: "https://demo.foundry.dev/apex",
    platformSlug: "figma",
    version: "2.0.0",
    changelog: "Figma Variables 2.0 support and full tablet breakpoint added.",
    releasedAt: "2025-01-08T00:00:00.000Z",
    requirements: { figma: "Figma Desktop / Browser" },
    seller: { displayName: "Foundry Studio" },
    platform: {
      name: "Figma",
      slug: "figma",
      supportsAutoUpdate: false,
      supportsLicensing: false,
      installGuide:
        "Open the community link on your purchase page and choose Duplicate to add the file to your drafts.",
    },
  },
];
