/** Sample Storybook data for Verdant Scholar stories derived from the Stitch export. */
import {
  BookOpen,
  FlaskConical,
  Leaf,
  Microscope,
  TreePine,
} from "lucide-react";

import type { VerdantScholarActiveAssessmentProps } from "./organisms/active-assessment";
import type { VerdantScholarFooterProps } from "./organisms/footer";
import type { VerdantScholarHomeLandingProps } from "./organisms/home-landing";
import type { VerdantScholarIdentificationKeysProps } from "./organisms/identification-keys";
import type { VerdantScholarLearningDashboardProps } from "./organisms/learning-dashboard";
import type { VerdantScholarSpeciesExplorerProps } from "./organisms/species-explorer";
import type { VerdantScholarSpeciesProfileProps } from "./organisms/species-profile";
import type { VerdantScholarStudyViewerProps } from "./organisms/study-viewer";
import type { VerdantScholarTestConfigurationProps } from "./organisms/test-configuration";
import type { VerdantScholarTopNavigationProps } from "./organisms/top-navigation";

const navigationBase: VerdantScholarTopNavigationProps = {
  brand: "The Living Archive",
  items: [
    { label: "Explore" },
    { label: "Taxonomy" },
    { label: "Conservation" },
    { label: "About" },
  ],
  searchPlaceholder: "Search the archive...",
};

const dashboardNavigation: VerdantScholarTopNavigationProps = {
  brand: "The Biological Editorial",
  items: [
    { label: "My Progress" },
    { label: "Groups" },
    { label: "Resources" },
  ],
  activeLabel: "My Progress",
  searchPlaceholder: "Search the archive...",
};

export const footerData: VerdantScholarFooterProps = {
  brand: "The Biological Editorial",
  links: [
    { label: "Scientific Accuracy" },
    { label: "Terms of Specimen" },
    { label: "Privacy Policy" },
    { label: "Contact Archive" },
  ],
  meta: "© 2024 The Biological Editorial. A living archive.",
};

export const homeLandingData: VerdantScholarHomeLandingProps = {
  navigation: { ...navigationBase, activeLabel: "Explore" },
  footer: footerData,
  hero: {
    title: (
      <>
        Witness the{" "}
        <span className="italic text-[var(--vs-color-primary)]">
          Complexity
        </span>{" "}
        of Life.
      </>
    ),
    description:
      "Varjopinkka is a premium digital herbarium and zoological archive designed for researchers, educators, and the curious.",
    searchPlaceholder: "Search species, genus, or family...",
    searchActionLabel: "Search",
    imageAlt: "Botanical detail",
    imageCaption: "Botanical detail / Monstera deliciosa",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCv8N5A86OPbUjLrNRBdeNzBW7KaZIuGD2bs6urUv1FUlDIjE6wODizHv3MxmoHXxyD2MLVLj61j5GUdYSgySY60R-Yij-HbftFE5qeDK4gGGJojihHyhWYHxkqJjf3m8LpS_gK15RlwuQw6OqQgYAo5CeCENY9QndstU758wA9EgRJWZT9Bd9_yO7Jb_2ssxh3HuL30IRJD6MUb8X98D0M3UYN7-9l37zPDnad5hTk1s682srAqCKSW1ydYdKlfUvkl_92jbAzbe8",
    floatingLabel: "Over 12,000 verified entries",
  },
  featureTiles: [
    {
      title: "Flora",
      description:
        "From ancient bryophytes to complex angiosperms, explore the foundation of ecosystems.",
      ctaLabel: "Explore Plants",
      imageAlt: "Forest plants",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBpMS0KDxV8nZZIeWCXxlm94luTwXUXbahJ8rWk-fo7Lrxm7jrKsiwp9X-od_s5KfPXl9RobpRNDOJU6IYi-5igO0CBAq3mddkV9j6KyvudYlBdW2BklD4pWU3eO7qEp2lzZ140ykMW14Aa6-r5csvFHoGSnQb6aVGPNkzblicldn095OnuGoJga5DyHQEPu6kVihcViHVhjo1r-pvfAYoryT7idOfTe6HcU0DVyYrR8_y-0ISZ6Ln6cKmn_giWvxOjyighg3qpkb8",
      emphasis: "hero",
    },
    {
      title: "Aves",
      description: "Catalogue birds",
      ctaLabel: "Explore Birds",
      imageAlt: "Bird card",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBscaALS9nivWU_Fp5CMHlpTQdMcx4mXlxtT5tDAhmzyEjZ9iTTpXEIAv2hEwvWgkQIuAbvk8UMcuvf2g9o1-_7v2NbNtHXTqFbB9i3jNhBKI3-JNevJGzL0oVc2viwdIXpK5xlMDSTIncE2Kg9YiLBahGvrhaLPpLcANI89UAoKpeuOxNjuNf4o8YazYZnzh9hK2kI9VT-MCNAEVQq50tYm3vwjrq_-yrPOzMu64SH8Xa0lim5c9MJaY-Nl-HgvfuszzFN9toVNqA",
    },
    {
      title: "Fungi",
      description: "Hidden networks",
      ctaLabel: "Review Fungi",
      imageAlt: "Fungi tile",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAIXwC5VKjQY80W9QTqs7R8OudOR1RApwxYR02SWsRYQCXv9TKOSrfnEEOUS9MxMo1VzrE0-nTa0WSNgKwrNUG-ODsB1NFdD1Q7tUgjC7Ji6M2HSNO4R7VuOHkOmBz_6YxhJpLNPdczOC3WaEojkYIJynY7eV6KarUHV4XWN-Q8Ir-U_7CBoC9_fblf0_V0RmZIQC20D5skXFhfMup5asriJAYBP4UvJe8lQtXQyBEHBKddDPtDdi4-gX9-dEl4H6D6UJbk1lj4900",
      emphasis: "compact",
    },
    {
      title: "Insecta",
      description: "Micro taxonomies",
      ctaLabel: "Browse Insects",
      imageAlt: "Insect tile",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBNWxvlcVdxRjR_pqcq3CXd-s4K7kEcgB1zjZ13d8AKt06rUlSHqPAjW2LuHlL3HnJZSbhUpLwaEkqqWHeoCi8mlIp6VfTXnwECYiTCoLHLL5L4k12mShD7xX0Y6BuBKNH8q7Ghv-EaOu9feiwUzvNUivlFBk9p_6ratgfIczxHOK3Etjq6GPWL4da2tfvFxkjCtT40Hzj9rDpTqHlEwtwWk8VneGkeoxeSikyQ8JCXX50yKEKc7uvZCus0rZnTXNAEhKm4LR4xqlQ",
      emphasis: "compact",
    },
  ],
  editorialCards: [
    {
      title: "Research Tools",
      description: "Curated workflows for close reading and archive work.",
      icon: <Microscope className="size-6" />,
    },
    {
      title: "Student Browsers",
      description: "Gentle entry points for guided taxonomic exploration.",
      icon: <Leaf className="size-6" />,
    },
    {
      title: "Comparative Notes",
      description: "Keep observation and evidence together while learning.",
      icon: <TreePine className="size-6" />,
    },
    {
      title: "Specimen Labs",
      description: "Balanced views for imagery, narrative, and morphology.",
      icon: <FlaskConical className="size-6" />,
    },
  ],
  metrics: [
    { value: "45k+", label: "Total Species" },
    { value: "120", label: "Collaborators" },
    { value: "850k", label: "Archive Hours" },
    { value: "24/7", label: "Open Access" },
  ],
};

export const speciesExplorerData: VerdantScholarSpeciesExplorerProps = {
  navigation: { ...navigationBase, activeLabel: "Explore" },
  footer: footerData,
  resultsLabel: "Showing 1,240 Specimens",
  title: "The Avian Registry",
  filterActionLabel: "Apply Filter View",
  filterGroups: [
    {
      title: "Taxonomy",
      variant: "checkboxes",
      items: [
        { label: "Mammalia" },
        { label: "Aves", selected: true },
        { label: "Reptilia" },
        { label: "Amphibia" },
      ],
    },
    {
      title: "Habitat",
      variant: "chips",
      items: [
        { label: "Tropical Forest", selected: true },
        { label: "Alpine" },
        { label: "Coastal" },
        { label: "Marine" },
      ],
    },
    {
      title: "Conservation Status",
      variant: "counts",
      items: [
        {
          label: "Critically Endangered",
          count: 12,
          swatchClass: "bg-[var(--vs-color-error)]",
        },
        { label: "Vulnerable", count: 48, swatchClass: "bg-orange-500" },
        {
          label: "Least Concern",
          count: 154,
          swatchClass: "bg-[var(--vs-color-primary)]",
        },
      ],
    },
  ],
  cards: [
    {
      title: "Scarlet Macaw",
      scientificName: "Ara macao",
      taxonomy: "Psittaciformes",
      status: "LC · Least Concern",
      imageAlt: "Scarlet Macaw",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBBdYg6ph7VBO_IXe0jMfCC2cJssf-Y0q62_ibR87RY9bQ06vvvLXfMCpvFlAWwrd_hg4IVMC-t0G1JGevKCUQLKYynTCU6jI3f0vai0MDW7bskjLayE_8YSlETT9NeHMj2vi380_F4A4M8Zjpo5h3Xg-VkFTWCUG02SEIflSrR90xD97HXBjwB9npRZ01AdYv2Oi2NfJWMXGad3bTumbF5Hdkloy8qOZkyR49gVO1Z-kqNwDq7MrGXpcpmfMysFcPWX_ScQGE1VnQ",
    },
    {
      title: "Common Kingfisher",
      scientificName: "Alcedo atthis",
      taxonomy: "Coraciiformes",
      status: "LC · Least Concern",
      imageAlt: "Common Kingfisher",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuB3HDI4wzkWwZiRwL_H1H_itXWSXcXRxhowa3Okk8nnzjYGC5c3-4m_KhgOIWnqD4qg11NsGAvzEDpqW5jEnPeFr3hHPtxsQ98mqtUF5j0_pgcknP8rPRDCPyKXyYpr6hKC0GwipYwTCewTF7BKvstPbgCJRGEi21GJZ1Rk3a6GmPEsci-Wub5cS2osWh6KPB7OFJJyhKfFHOQitSN_bxPB8ItXJWiPXgdo73B8TrhHKZvRx7kuuMK3JMcmbBAidX4VWfBR3lj-w-Q",
    },
    {
      title: "Harpy Eagle",
      scientificName: "Harpia harpyja",
      taxonomy: "Accipitriformes",
      status: "VU · Vulnerable",
      imageAlt: "Harpy Eagle",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDRK5WTlSAOtO4yBPMvrd8xUSF0YNPc0bVVzXxqYM1sYP4rxxaU3JKHAqpzrmRKCIP-w5w9mN0hqwad3TLZtPfR7XWmrgRFnG5BpkoAIpZr3WebL2xM8YZ0YHCA9UzUq0EnGnk6aPXW05wFgERs7TKcAPS2rIH7A6o4_igJnfxfOi9QAjLdvKIgrXhz0-9KubnzDMNGuHudX2l9FJGP89RoCaEsu9Qe_6qoP3Cf6LVEzjOCTDTDefDP_bIA1lx1w1lBNVatogwDS1M",
    },
  ],
  pagination: { currentPage: 1, pageCountLabel: "2 · 3 · … 12" },
};

export const speciesProfileData: VerdantScholarSpeciesProfileProps = {
  navigation: { ...navigationBase, activeLabel: "Explore" },
  footer: footerData,
  hero: {
    taxonomyLabel: "Mammalia • Felidae • Panthera",
    scientificName: "Panthera leo",
    commonName: "African Lion",
    status: "Vulnerable",
    imageAlt: "African Lion",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDGXKKFz-3ww0h1OnVuRXxdeuEBTKX7K1zbcmISTG676lc53_tYm3J9dHnwGJrJBqmLlj2xUqPUie8UJK35uF0OzZMUog6cNjiyi-aEVKEB4Tuxpn0He0esoSb45ofl9bBwdf5KCMkZNrCZ9SNJy0OC1ZW2CCoshP_3pAUKgWmkL_sQjDqzpy63Ck2wLFT6WFRseQ_RzXM4GsDX_Kg5XK7oRCqN0tz5XUJ6vZFTSS-eKhzzTBJ_K8_p1rM4iiTSWXPpbKrHwFWJ3kY",
  },
  morphologyCard: {
    title: "Morphology",
    rows: [
      { label: "Adult Weight", value: "150 - 250 kg" },
      { label: "Body Length", value: "1.7 - 2.5 m" },
      { label: "Life Expectancy", value: "10 - 14 years" },
      { label: "Speed", value: "80 km/h" },
    ],
  },
  phylogenyCard: {
    title: "Phylogeny",
    rows: [
      { label: "Class", value: "Mammalia" },
      { label: "Order", value: "Carnivora" },
      { label: "Family", value: "Felidae" },
    ],
  },
  habitatCard: {
    title: "Key Habitat: Sub-Saharan Savanna",
    summary:
      "Predominantly found in grasslands and savannas. They are the only truly social felids.",
  },
  narrative: [
    "The lion (Panthera leo) is a large cat of the genus Panthera native to Africa and India. It has a muscular, deep-chested body, short rounded head, and a prominent mane in adult males.",
    "It is a social species, forming groups called prides. Female lions often hunt together, and the species remains both an apex predator and a keystone ecological presence.",
  ],
  map: {
    badgeLabel: "Live Data",
    imageAlt: "Distribution map",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAn53C5__KzIlN4qQezzzNBq1Xts-_cZscafBMN2mRrDyHoaDZqsVyJ1-aNmkzZgnCZm977TDXQSVWidpsTbNPO6odVy9LNdfDcPHvKa69XWgkPaZn_48L2z3PKHVamLpF1TrsCxfun1T4y_QAjH8jPy99-EPsx6lCbHBBtqIRFAr_WG1b8fNAl6FMszSXLg49WgNNv8sFYKZ7unKuyaVccjjpPKpvd0mhdouvxT9uM-XacynpTjyqJkGf-V2Sb5R4ivpJFf5KjhMc",
  },
  gallery: [
    {
      title: "Southern African Variant",
      caption:
        "The fuller mane is often used to distinguish certain lineages in the field.",
      imageAlt: "Lion portrait",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDSjOAGTiGyM14l1CGiSF6XanAnY3vj034Lnyysd0OVRG9oScTgOEvNcDgZf1yKUPuoJP7Mi02A6nRyJQa-Gwl_k2l-oLxOAHbpKcotc1fAaXDjwYSERCvgQLYMQLS1enaF_ByPfH6qUOr1iShvNWQQewTsB0F1KReJPIaG2UD6r6bHH_6T4ZB5W2KTVrRzrBMwE7oxFfNmVbW1trEBCO6Txw5hTRJg4vxt9AqFVoskEIkTAyCOI2zkYMRnQU8bKfKXI5qVxq6q4uo",
    },
    {
      title: "East African Specimen",
      caption:
        "Observe the narrower mane placement and lighter mane growth near the jawline.",
      imageAlt: "Lion side portrait",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBKAKkrVtci4pb4M6UIVhakpZUgON2Z2L2eMqVwVir3likM87fpkVkU2fqdyKeesGgkxK2IHYS5qyE4BxHgVgEF_mNaxHKBq1C3yvB0IQLqk-qdFSTzLixyLZBarQRAsq9D_BOXam6xPDXJq2nW5S588Li4-CAYKTcMMmVhNXs3YqWgB9A7C4bRGabws-eqsURs_zFVJwsk9LToziIui2wf8JOUpfSqk7Q52SdndhCYN0OU4-mpXeGmsN0HSRc04zJhZz3gX1XVFP4",
    },
    {
      title: "Juvenile Morphology",
      caption:
        "Younger individuals can be identified by the softer facial structure and less prominent mane.",
      imageAlt: "Young lion",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAIYWHeOO-s8CjlUNFE6cv7fvXTym8-flOzPSx44lRXV3LeylQtHUEh9AAF2c8cogrTAaPYvL3JOpaUcS6GyLrM03GjizdTfmY8EgG3MqlWX8piTWUrLfYcAuzZZcR_K8BZT7KsaS23JTUkVPkVhcusKHwGeMsHqfVJXUxfMHLwIbzYPafZ4zuFL2L0AHtPbbgfHRNB5gJdTEPtpb7b0Gp-VG9qoE13wQwU6lz3uwq5eZGIdZov-j09cgmTLAFP3Xs_clwP7vCjVOo",
    },
  ],
};

export const identificationKeysData: VerdantScholarIdentificationKeysProps = {
  navigation: { ...navigationBase, activeLabel: "Taxonomy" },
  footer: footerData,
  heroDescription:
    "Utilize our dichotomous keys and diagnostic modules to categorize specimens. A rigorous digital framework designed for field researchers and university cohorts.",
  guideDescription:
    "Learn how to differentiate between convergent evolution and homologous traits before using the keys.",
  steps: [
    {
      indexLabel: "01",
      subtitle: "Primary Morphology",
      title:
        "Does the specimen exhibit woody tissue development or herbaceous characteristics?",
      actions: ["Woody Tissue Present", "Herbaceous (Non-Woody)"],
      active: true,
    },
    {
      indexLabel: "02",
      subtitle: "Phyllotaxy Arrangement",
      title: "Observation of leaf positioning along the apical meristem.",
    },
  ],
  savedSpecimens: [
    {
      title: "Quercus alba",
      subtitle: "White Oak Specimen",
      imageAlt: "Microscopic plant cells",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBt5NIHt5LYe2Oq8vUp6Yh91c91V6xS_mHao-IrNAyFm79jgQEpDlHxSrSvnr_GMdRFAvlT6XOiPN0Zh3AXdNPZgx1o5S86tSvUtpBKB96OFeu2DYgWhdSzwdA_6b3oX8tC0qfh77orrbURwdlY-N5z_tJWqyvCbMRZcDuKeOm-A1VKIMm8QENK4ZEsmXLI87J6W5own0DpDZgly7F0lbpENwBwpqu1U7W1lXFD_MCScr0MTbcU5HGP1KFWqzrcdJENAIdTl7OeycE",
    },
    {
      title: "Acer rubrum",
      subtitle: "Red Maple Specimen",
      imageAlt: "Leaf closeup",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDAO-zaxukGuTL2g3oLZYpn9HS5_yJfjgDNqS-wzSqjmFjN2xFoV0EJemWQbBJGLHfgRrp6fSWmzx-HlOaxXqZEljQIAT4J8L6bGOHCN7ApbYniaD-bzFgD1-7_-ZpVwintmLHj8itH4bFX0mYcBT0jXYJFwmSvVQ5PCX00FZRG1GYQCOKf44vrS5TypQ8c-FNB-1-YmXEonRPKFPeJmvEZCE0-lp5m7z3Uhuf0lMBl7Cp8iwkajeZ7nKPa296fIpqzuwUGgpwmOow",
    },
  ],
  featuredModule: {
    title: "Pteridology: The Study of Ferns and Allies",
    description:
      "Master the complex spore patterns and frond structures of ancient vascular plants.",
    ctaLabel: "Start Module",
    imageAlt: "Fern illustration",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB1KTiARqBSh_2SeMz5houBXBm_rQwzmi4YJ5E2Lxal8OWN2AZrvCEjJ1fcWphD1PhFkuPK2NrNVs2YEbPQK1YGxn-WTAfpeNv8l2Wgv_umsussgC8VWzCPR69YBZxHrUZNI-RxdVJ_41NqXFZCaGTOPegf6ocCBEnSjWX-LWhuK6dggImQ8ALVEuYULkg5Og8ORyUgJu8enkvDpkemX2iIIBYSX47i0EyU2XrGjRpqzQU-2Co5D_QjtZMlIAt8J2qMs8uFYhk6gEo",
  },
  moduleCards: [
    {
      title: "Linnaean Foundations",
      description: "A refresher on binomial nomenclature and hierarchy.",
      icon: <BookOpen className="size-6" />,
    },
    {
      title: "Genetic Barcoding",
      description: "DNA-led classification modules.",
      icon: <Microscope className="size-6" />,
    },
    {
      title: "Field Observation",
      description: "Learn by doing in guided habitat contexts.",
      icon: <Leaf className="size-6" />,
    },
  ],
  directoryCards: [
    {
      title: "Microbiome Data Repositories",
      description: "Institutional reference layers and specimen logs.",
      icon: <Microscope className="size-6" />,
    },
    {
      title: "Institutional Access Portal",
      description: "Peer-reviewed access workflows for archive work.",
      icon: <BookOpen className="size-6" />,
    },
    {
      title: "Ethical Fieldwork Protocols",
      description: "Standards for collaborative specimen gathering.",
      icon: <Leaf className="size-6" />,
    },
  ],
};

export const learningDashboardData: VerdantScholarLearningDashboardProps = {
  navigation: dashboardNavigation,
  footer: footerData,
  welcomeTitle: "Welcome back, Curator.",
  welcomeBody:
    "Your taxonomic journey through the biosphere continues. You have mastered 14 new specimens this week across 3 ecological zones.",
  metrics: [
    { value: "68%", label: "Global Mastery" },
    { value: "1,240", label: "XP Earned" },
    { value: "42", label: "Specimens" },
    { value: "Rank 8", label: "Naturalist" },
  ],
  highlight: {
    eyebrow: "Priority Path",
    title: "Coniferous Forest Stacks",
    description:
      "Study the resilient gymnosperms of the northern hemisphere. Focus on needle morphology and reproductive cone structures.",
    imageAlt: "Fern leaf",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuASW2ujmNVJgidU23pWDRcYiTBsDfRf3IKWEqnyWpSPCve5Yw2cz0izFqRS9SnR45mZMDgLt8LwlWj0mIlC3c3uEovnN1nF2Hrqq02Wmc6A8pnbGcHbF70_mXx6iGg9f05rkMdFncZHsglb_Fq9_JDFMAqCsF8eyTKznL-MJXTO90RBGmZ2L14GRyaOVYp5HRrSpV1aH_wczBe2ru3r1zGFWBg1e1kDC-ssbfBra-JWXo6gDthDaPu4BpxnOVIdeMeJ4cu9V_vzUdk",
    masteryLabel: "Mastery Level 4",
    completionLabel: "750 / 1000 XP",
    progress: 75,
  },
  sideCard: {
    title: "Subarctic Habitats",
    description:
      "Lichen, mosses, and dwarf shrubs adapted to permafrost environments.",
    eyebrow: "A+",
    meta: "12 specimens · 30% complete",
    actionLabel: "Resume Stack",
  },
  collections: [
    {
      title: "Avian Morphology",
      description: "Light review set for plumage and beak studies.",
      eyebrow: "Level 12 Mastery",
      imageAlt: "Kingfisher",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuALFIoRPsFPRlo3reNlxymGUPJsoiBEY9sKC7OhgP5AsuH70xqJ4kghERiIHIqLtxJW1O4j-cxXlytbDZA-6jyntxoU6uHPFPQeuxilzVSPFpeJOGwjAfV1sCs2BbGNW7sSsbqVsyWbBse6pN40ijvc7CJnc5sD1ahT8JCEBR_fSQcE9ztrI4Nqila3y7_x-5ZNMe6kuRCKYggPAjerXHHwUR35l10ergVoYUrVYePj6173aPhfjAfZZsglDa7Lhv8sVdqyD7tUlRY",
      meta: "Level 12 Mastery",
    },
    {
      title: "Marine Invertebrates",
      description: "Precision testing for gelatinous organism recognition.",
      eyebrow: "Test Ready",
      imageAlt: "Jellyfish",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCllVyVzIz0tyaVpr1VgpU1AHXIheu6O8YDGVKbsYIttUG8F6f9BV_T9zX5PfVutMaWDgomH7Y_qGl2ZT0KgqxZVYcVZDi2Kq-Zm0O5haO5Vd4fWADI3L09niwdHUBAjnfqytXbB1A_UHzDPuUOq-yF-smTnTLYwxZTe54nXjGa47Ho2cpLK7eD0AH7ooW7su23XAQU8exK4zzvp0bTKohK8OAs-ga-If8lV5NkHsH5yUSSmQzRUdsAsO3EoNJQp9-ScNrk6afdyHM",
      meta: "Precision · Take Test",
    },
    {
      title: "Mammalian Sociality",
      description: "New stack for communal behavior and habitat cues.",
      eyebrow: "New Stack",
      imageAlt: "Lion",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCuwEisYE4hwXAxk3s0s4CdisIo-P3pX_RE8Zq1QjRvCJU8o9mKx5E7ae7mQEhPkFrbeVwZR5zeS7JHxCnjKhMXX_RmmixN3ry6lzR5de6icvPrNCKPdODi6K90qWRtJiCYO4l_lPgME_QzUErT8-E0Kclmv0y23U3IuhrDagKGekwYrUwukKHe1-UUaQk5YKl3QQM_84zB00inFmdVfrEFN3zldJ57luUBdRRX8dCfrVC9CYK8D5-0n4X-nVqNlBx7giJe3u5PKmM",
      meta: "Unlocked",
    },
  ],
  toolkit: [
    {
      title: "Specimen Comparison Engine",
      description:
        "Side-by-side morphology review for complex identifications.",
      tone: "primary",
    },
    {
      title: "Virtual Lab",
      description: "Simulated microscopy and annotation.",
      tone: "surface",
    },
    {
      title: "Global Map",
      description: "Live distribution overlays.",
      tone: "tertiary",
    },
  ],
};

export const studyViewerData: VerdantScholarStudyViewerProps = {
  currentIndex: "14 / 288",
  heroLabel: "Specimen 042 // Sanikkaiset",
  title: "Pteridium aquilinum",
  heroDescription: "Commonly known as Eagle Fern or Bracken.",
  heroImageAlt: "Fern specimen",
  heroImageUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCvI_YxShXsu7KYjJpViYLk54xr0q3I2HbIXZwdvmYQQy8jMj1o_YD36Tv2cXzkttV5eWKwtEt7kB1rLm02g9phoassEamGkOPSx3lNhC3rD-iSpYdEGtywyGx4VI4quySRw3FTv_QYWSQ1GxnyX3X3C3q4yxk6kZDB5-7-9HTcHASzvOsmm4XKIAofb_gH6S9S31u1VTKW-5D5YfV6OQKC2MHomd5PeUnhJF_Fp2NU7NwdZaZJOvtQHT62PSVazr8-q6z8kqqOptA",
  sessionProgress: 45,
  sidebarSections: [
    {
      title: "Morphology",
      rows: [
        {
          label: "Frond Structure",
          value:
            "Large, highly divided fronds often reaching 1-3 meters in length.",
        },
      ],
    },
    {
      title: "Ecological Niche",
      rows: [
        { label: "Light", value: "Full Sun" },
        { label: "Soil", value: "Well Drained" },
      ],
      summary:
        "A cosmopolitan species occurring in temperate and subtropical regions of both hemispheres.",
    },
    {
      title: "Memory Anchor",
      summary:
        '"Bracken has wings" - look for the eagle-like shape of its fronds when viewed from above.',
    },
  ],
  thumbnails: [
    {
      imageAlt: "Fern selected thumbnail",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAZrHG6hec5YLivU5wgoj6V7siG5tfnIAlY1gWjHCBAF9lTD-gzgx_HLea2qEznI8fZI8Xkz7V-gKj3he0sxiMfZUWVrJ67pu1pZKngRBEWChjLvwniVtvtF_DfGiONQAlge3cdKZdgbeJ3Y1hhiRCN_v44shOOKzBky4mRTb9RiaqGsB0h6VlWcqos6oejRj-kaqqeUGVnpvPuc8PBbBLiRHCI2okGBecfcAmEimIEhUC4SY4EFqYLN4qbORSMldk5IQjaldDu6nQ",
      selected: true,
    },
    {
      imageAlt: "Fern detail",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDvXxdCy9lGdoGqxRhWrHy1q6Dt4M5Pbwt5ku930B6Vpxe6SBcJbKnBgBYGPjdgMpZJZvMi4GubTAXdnElALQeIBtU030gPnC8iW6BmRlnUsKJqMW0r3E8D5Fya0doKMgSa5RsfP0W4GMCYKo-1CRrxXF0ZqodNhTSNENslfzlUJHerriW43G-19QuDJQ9aM8D9ucZLdCpFnpbIoKeRBSL5TNeI8N0R2_EDejEG8vnLTB2IXHBzTwoJJG5cYDt5Z9gvBxAlrlQrIUA",
    },
    {
      imageAlt: "Spore texture",
      imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuA1eVtG9svmRBBR0f2aOhCBaE33Szv8RSJcuZafCgloZY0vd4ZD6nLv7UgFysswDGNmyW-c1dPVaeuvjgYrvL96M1RtJ6TF3s1sd4WPiVJHSrvNE48Q_ixWIsZRRXxZA5NtL0P0UJzkN4Ioha4B-kKW0vBPDYV78CHBZTaM2Zau7cG01RZEnBLZhEatihiYbz8HeINr0iUDMoQnd9pcnWx3DHG18zvFgzRPnpD-9L591075ZGCpChOBVhuMQhRfQJTm7TBhR_FWbt0",
    },
  ],
};

export const activeAssessmentData: VerdantScholarActiveAssessmentProps = {
  navigation: dashboardNavigation,
  footer: footerData,
  title: "Verdant Scholar: Level III",
  questionCountLabel: "Question 1 of 25",
  progress: 4,
  imageAlt: "Microscopic specimen",
  imageUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDMuh6xM0ruA8yMs_xqJFX6wisQhTcSzoK-ML7svaoDcJorEfwM1GHCs4X0VdbtEn9ZmNmU00t94BatF_39kUdrpxHhV4jBxiQRcOYiQ75CKIu0SDmNxTGTG5SSdq1YkzPTU-1nWyzY17aFhZavFNR9zUhe1poubTGmtjJCB3T2jQhPjvdviwQlX6LK3Xfn_DoCcWmiqVgRJs6fZ29q-n3N_yq5oJsEAKKOgo5YPlq2xeSqjXkmBQkIRCpG1s2OZyT2Up4rorxuHu0",
  question:
    "Identify the specific taxonomic family based on the specimen's observed structural morphology.",
  answers: [
    { optionKey: "A", label: "Melastomataceae", state: "incorrect" },
    { optionKey: "B", label: "Asteraceae" },
    {
      optionKey: "C",
      label: "Ericaceae",
      state: "correct",
      suffix: "Correct Specimen",
    },
    { optionKey: "D", label: "Rubiaceae" },
  ],
  observationBody:
    "Observe the cellular architecture and the specific serration pattern on the margin. Note the distribution of vascular bundles radiating from the central midrib.",
  insight:
    "The Ericaceae family is distinguished here by the urceolate floral structures and the specific leaf venation typical of high-altitude species.",
};

export const testConfigurationData: VerdantScholarTestConfigurationProps = {
  navigation: dashboardNavigation,
  footer: footerData,
  collectionSizes: [
    { title: "10", selected: true },
    { title: "25" },
    { title: "50" },
    { title: "All" },
  ],
  methodologies: [
    {
      title: "Multiple Choice",
      description: "Identify the specimen from four distinct options.",
      selected: true,
    },
    {
      title: "Write Name",
      description: "Recall and type the nomenclature manually.",
    },
  ],
  nomenclatureOptions: [
    { title: "Latin Names", description: "Scientific class", selected: true },
    { title: "Local Names", description: "Regional vernacular" },
  ],
};
