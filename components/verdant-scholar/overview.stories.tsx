import type { Meta, StoryObj } from "@storybook/react";

import {
  activeAssessmentData,
  homeLandingData,
  identificationKeysData,
  learningDashboardData,
  speciesExplorerData,
  speciesProfileData,
  studyViewerData,
  testConfigurationData,
} from "./story-data";
import { VerdantScholarSectionHeading } from "./molecules/section-heading";
import { VerdantScholarTheme } from "./verdant-scholar-theme";

const meta: Meta = {
  title: "Verdant Scholar/Overview",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj;

const storyCards = [
  {
    title: "Home Species Learning",
    description:
      "Landing page with editorial hero, asymmetrical bento grid, and institutional footer.",
    imageUrl: homeLandingData.hero.imageUrl,
  },
  {
    title: "Explore Species",
    description:
      "Tonal filter sidebar and specimen gallery with conservation status badges.",
    imageUrl: speciesExplorerData.cards[0]?.imageUrl ?? "",
  },
  {
    title: "Species Detail",
    description:
      "Display typography, morphology cards, narrative copy, and a live map frame.",
    imageUrl: speciesProfileData.hero.imageUrl,
  },
  {
    title: "Identification Keys",
    description:
      "Dichotomous path logic, saved specimens, and research directory patterns.",
    imageUrl: identificationKeysData.featuredModule.imageUrl,
  },
  {
    title: "Learning Dashboard",
    description:
      "Curator metrics, highlighted stacks, study cards, and toolkit tiles.",
    imageUrl: learningDashboardData.highlight.imageUrl ?? "",
  },
  {
    title: "Study Viewer",
    description:
      "Immersive specimen image, vertical tools, annotation sidebar, and thumbnail rail.",
    imageUrl: studyViewerData.heroImageUrl,
  },
  {
    title: "Active Assessment",
    description:
      "Question layout with answer states, observation note, and next-question CTA.",
    imageUrl: activeAssessmentData.imageUrl,
  },
  {
    title: "Test Configuration",
    description:
      "Large configuration shell for collection size, methodology, and nomenclature choices.",
    imageUrl: testConfigurationData.collectionSizes[0]
      ? (homeLandingData.featureTiles[0]?.imageUrl ?? "")
      : "",
  },
];

export const Gallery: Story = {
  render: () => (
    <VerdantScholarTheme className="min-h-screen" padding="comfortable">
      <div className="mx-auto w-full max-w-[var(--vs-layout-max-width)] space-y-10">
        <VerdantScholarSectionHeading
          eyebrow="Verdant Scholar"
          title="Storybook gallery for the Stitch-derived design system"
          description="Every organism story maps to one of the attached Stitch screens while the atoms and molecules keep the patterns reusable for later adoption in the app."
        />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {storyCards.map((card) => (
            <article
              key={card.title}
              className="overflow-hidden rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-surface-container-low)]"
            >
              <img
                alt={card.title}
                className="aspect-[4/5] w-full object-cover"
                src={card.imageUrl}
              />
              <div className="space-y-3 p-5">
                <h3 className="text-[length:var(--vs-font-headline-sm)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                  {card.title}
                </h3>
                <p className="text-sm leading-6 text-[var(--vs-color-on-surface-variant)]">
                  {card.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </VerdantScholarTheme>
  ),
};
