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
import { VerdantScholarActiveAssessment } from "./organisms/active-assessment";
import { VerdantScholarHomeLanding } from "./organisms/home-landing";
import { VerdantScholarIdentificationKeys } from "./organisms/identification-keys";
import { VerdantScholarLearningDashboard } from "./organisms/learning-dashboard";
import { VerdantScholarSpeciesExplorer } from "./organisms/species-explorer";
import { VerdantScholarSpeciesProfile } from "./organisms/species-profile";
import { VerdantScholarStudyViewer } from "./organisms/study-viewer";
import { VerdantScholarTestConfiguration } from "./organisms/test-configuration";
import { VerdantScholarTheme } from "./verdant-scholar-theme";

const meta: Meta = {
  title: "Verdant Scholar/Organisms",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj;

export const HomeLanding: Story = {
  render: () => (
    <VerdantScholarTheme padding="none">
      <VerdantScholarHomeLanding {...homeLandingData} />
    </VerdantScholarTheme>
  ),
};

export const ExploreSpecies: Story = {
  render: () => (
    <VerdantScholarTheme padding="none">
      <VerdantScholarSpeciesExplorer {...speciesExplorerData} />
    </VerdantScholarTheme>
  ),
};

export const SpeciesProfile: Story = {
  render: () => (
    <VerdantScholarTheme padding="none">
      <VerdantScholarSpeciesProfile {...speciesProfileData} />
    </VerdantScholarTheme>
  ),
};

export const IdentificationKeys: Story = {
  render: () => (
    <VerdantScholarTheme padding="none">
      <VerdantScholarIdentificationKeys {...identificationKeysData} />
    </VerdantScholarTheme>
  ),
};

export const LearningDashboard: Story = {
  render: () => (
    <VerdantScholarTheme padding="none">
      <VerdantScholarLearningDashboard {...learningDashboardData} />
    </VerdantScholarTheme>
  ),
};

export const StudyViewer: Story = {
  render: () => (
    <VerdantScholarTheme padding="none">
      <VerdantScholarStudyViewer {...studyViewerData} />
    </VerdantScholarTheme>
  ),
};

export const ActiveAssessment: Story = {
  render: () => (
    <VerdantScholarTheme padding="none">
      <VerdantScholarActiveAssessment {...activeAssessmentData} />
    </VerdantScholarTheme>
  ),
};

export const TestConfiguration: Story = {
  render: () => (
    <VerdantScholarTheme padding="none">
      <VerdantScholarTestConfiguration {...testConfigurationData} />
    </VerdantScholarTheme>
  ),
};
