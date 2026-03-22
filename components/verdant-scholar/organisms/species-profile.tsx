/** Verdant Scholar species profile mirrors the editorial species detail Stitch layout. */
import { ChartColumnIncreasing, Map, Sprout, Waypoints } from "lucide-react";

import { VerdantScholarBadge } from "../atoms/badge";
import { VerdantScholarButton } from "../atoms/button";
import {
  VerdantScholarFactCard,
  type VerdantScholarFactCardProps,
} from "../molecules/fact-card";
import { VerdantScholarSectionHeading } from "../molecules/section-heading";
import { VerdantScholarFooter, type VerdantScholarFooterProps } from "./footer";
import {
  VerdantScholarTopNavigation,
  type VerdantScholarTopNavigationProps,
} from "./top-navigation";

/** Species gallery card metadata for the profile page. */
export interface VerdantScholarProfileGalleryItem {
  caption: string;
  imageAlt: string;
  imageUrl: string;
  title: string;
}

/** Hero metadata for the species profile. */
export interface VerdantScholarSpeciesProfileHero {
  commonName: string;
  imageAlt: string;
  imageUrl: string;
  scientificName: string;
  status: string;
  taxonomyLabel: string;
}

/** Map metadata for the species profile. */
export interface VerdantScholarSpeciesMap {
  badgeLabel: string;
  imageAlt: string;
  imageUrl: string;
}

/**
 * Props for the Verdant Scholar species profile organism.
 * @property footer Shared footer props.
 * @property gallery Supporting identification gallery.
 * @property habitatCard Habitat summary card.
 * @property hero Hero content.
 * @property map Distribution map metadata.
 * @property morphologyCard Morphology card props.
 * @property narrative Paragraphs for the biological narrative.
 * @property navigation Shared navigation props.
 * @property phylogenyCard Phylogeny card props.
 */
export interface VerdantScholarSpeciesProfileProps {
  footer: VerdantScholarFooterProps;
  gallery: VerdantScholarProfileGalleryItem[];
  habitatCard: VerdantScholarFactCardProps;
  hero: VerdantScholarSpeciesProfileHero;
  map: VerdantScholarSpeciesMap;
  morphologyCard: VerdantScholarFactCardProps;
  narrative: string[];
  navigation: VerdantScholarTopNavigationProps;
  phylogenyCard: VerdantScholarFactCardProps;
}

/** Editorial species profile with hero, fact cards, narrative, map, and gallery. */
export function VerdantScholarSpeciesProfile({
  footer,
  gallery,
  habitatCard,
  hero,
  map,
  morphologyCard,
  narrative,
  navigation,
  phylogenyCard,
}: VerdantScholarSpeciesProfileProps) {
  return (
    <div className="space-y-14">
      <VerdantScholarTopNavigation {...navigation} />
      <main className="mx-auto w-full max-w-[var(--vs-layout-max-width)] space-y-16 px-6 pb-10 lg:px-8">
        <section className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.85fr)] lg:items-end">
          <div className="relative">
            <div className="overflow-hidden rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-surface-container-low)]">
              <img
                alt={hero.imageAlt}
                className="aspect-[16/10] w-full object-cover"
                src={hero.imageUrl}
              />
            </div>
            <div className="absolute -bottom-6 right-6 hidden rounded-[var(--vs-radius-md)] bg-[color:rgba(229,226,225,0.9)] p-5 shadow-[var(--vs-shadow-floating)] md:block">
              <p className="text-[length:var(--vs-font-label-sm)] uppercase tracking-[0.18em] text-[var(--vs-color-on-surface-variant)]">
                Status
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-[var(--vs-color-tertiary)]" />
                <span className="text-lg text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold">
                  {hero.status}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <p className="text-[length:var(--vs-font-label-md)] font-bold uppercase tracking-[0.22em] text-[var(--vs-color-primary)]">
              {hero.taxonomyLabel}
            </p>
            <h1 className="text-[length:var(--vs-font-display-lg)] leading-[0.88] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-extrabold tracking-tight">
              {hero.scientificName}
            </h1>
            <p className="text-2xl italic text-[var(--vs-color-on-surface-variant)]">
              {hero.commonName}
            </p>
            <div className="flex flex-wrap gap-3">
              <VerdantScholarButton>Cite Specimen</VerdantScholarButton>
              <VerdantScholarButton variant="secondary">
                Add to Archive
              </VerdantScholarButton>
            </div>
          </div>
        </section>

        <section className="rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-surface-container-low)] px-6 py-10 lg:px-8">
          <div className="grid gap-6 md:grid-cols-4">
            <VerdantScholarFactCard
              {...morphologyCard}
              className="md:col-span-2"
              icon={
                <ChartColumnIncreasing className="size-5 text-[var(--vs-color-primary)]" />
              }
            />
            <VerdantScholarFactCard
              {...phylogenyCard}
              icon={
                <Waypoints className="size-5 text-[var(--vs-color-primary)]" />
              }
            />
            <VerdantScholarFactCard
              {...habitatCard}
              icon={<Sprout className="size-5" />}
              tone="accent"
            />
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <VerdantScholarSectionHeading title="Biological Narrative" />
            <div className="space-y-6 text-lg leading-8 text-[var(--vs-color-on-surface-variant)]">
              {narrative.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
          <article className="rounded-[var(--vs-radius-xl)] bg-[var(--vs-color-surface-container)] p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-[length:var(--vs-font-headline-sm)] text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                Distribution Range
              </h3>
              <VerdantScholarBadge tone="success">
                {map.badgeLabel}
              </VerdantScholarBadge>
            </div>
            <div className="relative mt-6 overflow-hidden rounded-[var(--vs-radius-md)] bg-[var(--vs-color-surface-dim)]">
              <img
                alt={map.imageAlt}
                className="aspect-square w-full object-cover opacity-85"
                src={map.imageUrl}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-[var(--vs-radius-md)] bg-[color:rgba(255,255,255,0.16)] p-5 text-center backdrop-blur-xl">
                  <Map className="mx-auto size-6 text-[var(--vs-color-on-surface)]" />
                  <p className="mt-3 text-sm text-[var(--vs-color-on-surface)]">
                    Spatial distribution layer
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="space-y-8">
          <VerdantScholarSectionHeading
            title="Field Identification"
            description="Visual indicators for subspecies and regional variations."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {gallery.map((item) => (
              <article key={item.title} className="space-y-4">
                <div className="overflow-hidden rounded-[var(--vs-radius-md)] bg-[var(--vs-color-surface-container-low)]">
                  <img
                    alt={item.imageAlt}
                    className="aspect-[4/5] w-full object-cover"
                    src={item.imageUrl}
                  />
                </div>
                <div>
                  <h3 className="text-lg text-[var(--vs-color-on-surface)] [font-family:var(--vs-font-display-family)] font-bold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--vs-color-on-surface-variant)]">
                    {item.caption}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <VerdantScholarFooter {...footer} />
    </div>
  );
}
