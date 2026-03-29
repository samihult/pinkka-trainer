/** Client-side translation tables and lookup helpers for supported UI languages. */
"use client";

import { useCallback, useMemo } from "react";
import { useLanguagePreference } from "@/lib/language-context";
import type { LanguagePreference } from "@/lib/local-preferences";

const EN_MESSAGES = {
  "navbar.guestUser": "Guest user",
  "navbar.role": "Role: {role}",
  "navbar.adminPanel": "Admin Panel",
  "navbar.manageContent": "Manage Content",
  "navbar.signOut": "Sign Out",
  "navbar.signIn": "Sign In",

  "auth.errorTitle": "Error",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.confirmPassword": "Confirm Password",
  "auth.signIn.link": "Sign In",
  "auth.signUp.link": "Sign Up",

  "auth.signIn.title": "Sign In to Pinkka",
  "auth.signIn.description": "Enter your credentials to access your account",
  "auth.signIn.googleContinue": "Continue with Google",
  "auth.signIn.signingIn": "Signing in...",
  "auth.signIn.redirectingTitle": "Signing in...",
  "auth.signIn.redirectingDescription": "Redirecting to Google sign-in page.",
  "auth.signIn.orEmail": "Or sign in with email",
  "auth.signIn.submit": "Sign In",
  "auth.signIn.submitLoading": "Signing In...",
  "auth.signIn.noAccount": "Don't have an account?",
  "auth.signIn.welcomeBackTitle": "Welcome back!",
  "auth.signIn.welcomeBackDescription": "You have successfully signed in.",
  "auth.signIn.failureDescription":
    "Failed to sign in. Please check your credentials.",
  "auth.signIn.googleWelcomeTitle": "Welcome!",
  "auth.signIn.googleWelcomeDescription":
    "You have successfully signed in with Google.",

  "auth.signUp.title": "Create Your Account",
  "auth.signUp.description": "Sign up to start learning species",
  "auth.signUp.submit": "Sign Up",
  "auth.signUp.submitLoading": "Creating Account...",
  "auth.signUp.hasAccount": "Already have an account?",
  "auth.signUp.passwordMismatch": "Passwords do not match",
  "auth.signUp.passwordTooShort": "Password must be at least 6 characters",
  "auth.signUp.createdTitle": "Account created!",
  "auth.signUp.createdDescription": "Welcome to Pinkka. Start learning now!",
  "auth.signUp.failureDescription": "Failed to create account",

  "home.title": "Collections",
  "home.subtitle": "Choose a stack to study with cards or take a test",
  "home.filterPlaceholder": "Filter...",
  "home.favorite": "Favorite collection",
  "home.mastery": "Mastery",
  "home.noCollectionsMatchFilter": "No collections match the current filter",
  "home.noLearningDataYet": "No learning data yet",
  "home.speciesCount": "{count} species",
  "home.learn": "Learn",
  "home.takeTest": "Take Test",
  "home.noStacksInGroup": "No stacks available in this group yet",
  "home.noMaterialsTitle": "No learning materials available yet",
  "home.noMaterialsSubtitle":
    "Check back later or contact an editor to add content",
  "group.backToHome": "Back to collections",
  "group.favoriteStack": "Favorite stack",
  "group.noStacksMatchFilter": "No stacks match the current filter",
  "group.notFoundTitle": "Collection not found",
  "group.notFoundDescription": "The requested collection could not be loaded.",
  "learn.cards.progressLabel": "{current} / {total}",
  "learn.cards.shuffle": "Shuffle",
  "learn.cards.noSpeciesWithImages":
    "No species with images available in this stack.",
  "learn.cards.browseOtherStacks": "Browse Other Stacks",
  "learn.cards.previous": "Previous",
  "learn.cards.next": "Next",
  "learn.cards.openSpeciesList": "Open species list",
  "learn.cards.keyboardAria": "Keyboard shortcuts",
  "learn.cards.shortcutsTitle": "Shortcuts",
  "learn.cards.shortcut.toggleInfoPanel": "Toggle info panel",
  "learn.cards.shortcut.openLarger": "Open larger / zoom in",
  "learn.cards.shortcut.zoomOut": "Zoom out / close at fit",
  "learn.cards.shortcut.previousImage": "Previous image",
  "learn.cards.shortcut.nextImage": "Next image",
  "learn.cards.shortcut.previousSpecies": "Previous species",
  "learn.cards.shortcut.nextSpecies": "Next species",
  "learn.cards.shortcut.showIdentificationTab": "Show identification tab",
  "learn.cards.shortcut.showPinkkaTab": "Show Pinkka tab",
  "learn.cards.info.show": "Show Info",
  "learn.cards.info.hide": "Hide Info",
  "learn.cards.info.hideAria": "Hide info pane",
  "learn.cards.info.tab.identification": "Identification",
  "learn.cards.info.tab.pinkka": "Pinkka info",
  "learn.cards.info.identificationPlaceholder":
    "No identification hints available.",
  "learn.cards.info.identificationImageAlt":
    "Image referenced by identification hint",
  "learn.cards.info.noDescription": "No description available.",
  "manage.speciesForm.title.edit": "Edit Species",
  "manage.speciesForm.title.create": "Create New Species",
  "manage.speciesForm.tab.information": "Information",
  "manage.speciesForm.tab.pictures": "Pictures",
  "manage.speciesForm.tab.identification": "Identification",
  "manage.speciesForm.field.scientificName": "Scientific Name *",
  "manage.speciesForm.field.finnishName": "Finnish Name",
  "manage.speciesForm.field.englishName": "English Name",
  "manage.speciesForm.field.swedishName": "Swedish Name",
  "manage.speciesForm.field.descriptionFi": "Description (FI)",
  "manage.speciesForm.field.descriptionEn": "Description (EN)",
  "manage.speciesForm.field.descriptionSv": "Description (SV)",
  "manage.speciesForm.placeholder.scientificName": "e.g., Vulpes vulpes",
  "manage.speciesForm.placeholder.finnishName": "e.g., Kettu",
  "manage.speciesForm.placeholder.englishName": "e.g., Red Fox",
  "manage.speciesForm.placeholder.swedishName": "e.g., Rodrav",
  "manage.speciesForm.placeholder.description": "Enter species description...",
  "manage.speciesForm.section.images": "Images",
  "manage.speciesForm.section.testImages": "Test Images",
  "manage.speciesForm.help.testImages":
    "Select which images can appear in tests. Cards always show all images.",
  "manage.speciesForm.help.addImagesForTests":
    "Add images to enable test selection.",
  "manage.speciesForm.imageLabel": "Image {number}",
  "manage.speciesForm.imageAlt": "Species image {number}",
  "manage.speciesForm.imageState.test": "Test",
  "manage.speciesForm.imageState.excluded": "Excluded",
  "manage.speciesForm.error.testImageRequired":
    "Select at least one image for tests.",
  "manage.speciesForm.section.identificationHints": "Identification Hints",
  "manage.speciesForm.action.addHint": "Add Hint",
  "manage.speciesForm.help.identificationHints":
    "Hints are shown in the learning page identification tab.",
  "manage.speciesForm.empty.identificationHints":
    "No identification hints added yet.",
  "manage.speciesForm.action.editHint": "Edit",
  "manage.speciesForm.action.deleteHint": "Delete",
  "manage.speciesForm.action.saving": "Saving...",
  "manage.speciesForm.action.update": "Update Species",
  "manage.speciesForm.action.create": "Create Species",
  "manage.speciesForm.action.cancel": "Cancel",
  "manage.speciesForm.toast.imageUploadedTitle": "Image uploaded",
  "manage.speciesForm.toast.imageUploadedDescription":
    "Image has been uploaded successfully",
  "manage.speciesForm.toast.uploadErrorDescription": "Failed to upload image",
  "manage.speciesForm.toast.selectTestImagesTitle": "Select test images",
  "manage.speciesForm.toast.selectTestImagesDescription":
    "Choose at least one image to use in tests.",
  "manage.speciesForm.toast.scientificNameRequiredTitle":
    "Scientific name is required",
  "manage.speciesForm.toast.scientificNameRequiredDescription":
    "Enter a scientific name before saving.",
  "manage.speciesForm.toast.saveErrorDescription": "Failed to save species",
  "manage.speciesHintDialog.title.edit": "Edit Identification Hint",
  "manage.speciesHintDialog.title.create": "Add Identification Hint",
  "manage.speciesHintDialog.description":
    "Hints are shown in the learning view identification tab.",
  "manage.speciesHintDialog.field.fi": "Hint (FI)",
  "manage.speciesHintDialog.field.en": "Hint (EN)",
  "manage.speciesHintDialog.field.sv": "Hint (SV)",
  "manage.speciesHintDialog.placeholder.fi":
    "Write an identification hint in Finnish...",
  "manage.speciesHintDialog.placeholder.en":
    "Write an identification hint in English...",
  "manage.speciesHintDialog.placeholder.sv":
    "Write an identification hint in Swedish...",
  "manage.speciesHintDialog.action.cancel": "Cancel",
  "manage.speciesHintDialog.action.save": "Save Changes",
  "manage.speciesHintDialog.action.add": "Add Hint",
  "manage.speciesHintDialog.section.imageReference": "Referenced Image",
  "manage.speciesHintDialog.help.imageReference":
    "Optionally attach one species image to the hint.",
  "manage.speciesHintDialog.action.addImage": "Add Image",
  "manage.speciesHintDialog.action.changeImage": "Change Image",
  "manage.speciesHintDialog.action.deleteImage": "Delete Image",
  "manage.speciesHintDialog.emptyImages": "No species images available.",
  "manage.speciesHintDialog.imageDialog.title": "Select Referenced Image",
  "manage.speciesHintDialog.imageDialog.description":
    "Select one species image for this hint.",
  "manage.speciesHintDialog.imageDialog.gridAria": "Species image selector",
  "manage.speciesHintDialog.imageDialog.action.select": "Select Image",
  "manage.tabs.species": "Species",
  "manage.tabs.groups": "Groups",
  "manage.tabs.stack": "Stack",
  "manage.tabs.pinkka": "Pinkka",
  "manage.tabs.speciesDetail": "Species",
  "manage.pinkka.title": "Pinkka Content",
  "manage.pinkka.description":
    "Browse Pinkka groups, stacks, and species details.",
  "manage.pinkka.loading": "Loading content...",
  "manage.pinkka.button.importing": "Importing...",
  "manage.pinkka.button.importSelected": "Import Selected {target} ({count})",
  "manage.pinkka.button.importingMissing": "Importing Missing...",
  "manage.pinkka.button.importMissingSelected":
    "Import Missing Selected {target} ({count})",
  "manage.pinkka.button.importingReimporting": "Importing/Reimporting...",
  "manage.pinkka.button.reimporting": "Re-importing...",
  "manage.pinkka.button.importReimportSelected":
    "Import/Re-import Selected {target} ({count})",
  "manage.pinkka.button.reimportSelected":
    "Re-import Selected {target} ({count})",
  "manage.pinkka.toast.nothingToImportTitle": "Nothing to import",
  "manage.pinkka.toast.nothingToImportDescription":
    "All selected entities are already imported.",
  "manage.pinkka.toast.jobFailedTitle": "Import could not be started",
  "manage.pinkka.toast.jobFailedDescription":
    "Unable to queue the Pinkka import job.",
  "manage.pinkkaImport.action.import": "Importing",
  "manage.pinkkaImport.action.reimport": "Re-importing",
  "manage.pinkkaImport.action.importmissing": "Importing missing",
  "manage.pinkkaImport.target.groupSingular": "group",
  "manage.pinkkaImport.target.groupPlural": "groups",
  "manage.pinkkaImport.target.stackSingular": "stack",
  "manage.pinkkaImport.target.stackPlural": "stacks",
  "manage.pinkkaImport.target.speciesSingular": "species",
  "manage.pinkkaImport.target.speciesPlural": "species",
  "manage.pinkkaImport.target.itemPlural": "items",
  "manage.pinkkaImport.toast.title.queued": "Pinkka import queued",
  "manage.pinkkaImport.toast.title.running": "Pinkka import in progress",
  "manage.pinkkaImport.toast.title.completed": "Pinkka import complete",
  "manage.pinkkaImport.toast.title.interrupted": "Pinkka import interrupted",
  "manage.pinkkaImport.toast.title.failed": "Pinkka import failed",
  "manage.pinkkaImport.toast.description.active": "{action} {count} {target}.",
  "manage.pinkkaImport.toast.description.completed":
    "{action} {count} {target} completed.",
  "manage.pinkkaImport.toast.description.interrupted":
    "{action} {target} was interrupted.",
  "manage.pinkkaImport.toast.description.failed": "{action} {target} failed.",
  "manage.pinkkaImport.toast.interrupt": "Interrupt",
  "manage.pinkkaImport.toast.openPinkka": "Open in Pinkka",
  "manage.pinkkaImport.progress.groups": "Groups",
  "manage.pinkkaImport.progress.stacks": "Stacks",
  "manage.pinkkaImport.progress.species": "Species",
  "manage.pinkkaImport.progress.waiting": "Waiting...",
  "manage.speciesInventory.title": "Species",
  "manage.speciesInventory.description":
    "Manage the canonical learning-item library organized by taxonomy. Groups and stacks link to these shared species entries.",
  "manage.speciesInventory.addSpecies": "Add Species",
  "manage.speciesInventory.searchPlaceholder": "Filter species or taxonomy...",
  "manage.speciesInventory.searchEmpty": "No species match the current filter.",
  "manage.speciesInventory.empty": "No species available yet.",
  "manage.speciesInventory.noVernacularName": "No vernacular name",
  "manage.speciesInventory.hidden": "Hidden",
  "manage.speciesInventory.visible": "Visible",
  "manage.speciesInventory.rank.domain": "Domain",
  "manage.speciesInventory.rank.kingdom": "Kingdom",
  "manage.speciesInventory.rank.phylum": "Phylum",
  "manage.speciesInventory.rank.class": "Class",
  "manage.speciesInventory.rank.order": "Order",
  "manage.speciesInventory.rank.family": "Family",
  "manage.speciesInventory.rank.genus": "Genus",
  "manage.speciesInventory.rank.species": "Species",
  "manage.speciesInventory.unclassifiedRank": "Unclassified {rank}",
  "manage.speciesInventory.unclassifiedFamily": "Unclassified family",
  "manage.speciesInventory.unclassifiedGenus": "Unclassified genus",
  "manage.speciesInventory.backToSpecies": "Back to species",
  "manage.speciesInventory.notFound": "Species not found.",
  "manage.speciesInventory.toast.loadError": "Failed to load species.",
  "manage.speciesInventory.toast.createSuccessTitle": "Success",
  "manage.speciesInventory.toast.createSuccessDescription":
    "Species created successfully.",
  "manage.speciesInventory.toast.updateSuccessTitle": "Success",
  "manage.speciesInventory.toast.updateSuccessDescription":
    "Species updated successfully.",
  "manage.stackSpecies.title": "Manage Species",
  "manage.stackSpecies.description":
    "Link and manage the species used in this stack through the taxonomy tree.",
  "manage.stackSpecies.view.minimal": "Minimal",
  "manage.stackSpecies.view.detailed": "Detailed",
  "manage.stackSpecies.sort": "Sort A-Z",
  "manage.stackSpecies.linkExisting": "Link Existing Species",
  "manage.stackSpecies.addSpecies": "Add Species",
  "manage.stackSpecies.addFirstSpecies": "Add First Species",
  "manage.stackSpecies.searchPlaceholder": "Filter species or taxonomy...",
  "manage.stackSpecies.searchEmpty":
    "No species in this stack match the current filter.",
  "manage.stackSpecies.empty": "No species linked to this stack yet.",
  "manage.stackSpecies.backToStack": "Back to the stack",
  "manage.stackSpecies.notFound": "Species not found for this stack.",
  "manage.stackSpecies.confirm.unlink":
    "Are you sure you want to unlink this species from the stack?",
  "manage.stackSpecies.linkDialog.title": "Link Existing Species",
  "manage.stackSpecies.linkDialog.description":
    "Choose a canonical learning-item entry to link into this stack.",
  "manage.stackSpecies.linkDialog.confirm": "Link Species",
  "manage.stackSpecies.linkDialog.cancel": "Cancel",
  "manage.stackSpecies.linkDialog.empty":
    "No additional species available to link.",
  "manage.stackSpecies.linkDialog.listAria": "Available species to link",
  "manage.stackSpecies.toast.loadError": "Failed to load stack species.",
  "manage.stackSpecies.toast.keepOneTestImage":
    "At least one image must remain enabled for tests.",
  "manage.stackSpecies.toast.testImagesError": "Failed to update test images.",
  "manage.stackSpecies.toast.unlinkSuccessTitle": "Success",
  "manage.stackSpecies.toast.unlinkSuccessDescription":
    "Species unlinked from the stack.",
  "manage.stackSpecies.toast.unlinkError":
    "Failed to unlink species from the stack.",
  "manage.stackSpecies.toast.visibilitySuccessTitle": "Success",
  "manage.stackSpecies.toast.visibilityHidden": "Species hidden from learners.",
  "manage.stackSpecies.toast.visibilityVisible":
    "Species is now visible to learners.",
  "manage.stackSpecies.toast.visibilityError":
    "Failed to update species visibility.",
  "manage.stackSpecies.toast.reorderSuccessTitle": "Success",
  "manage.stackSpecies.toast.reorderSuccessDescription":
    "Species reordered successfully.",
  "manage.stackSpecies.toast.sortSuccessTitle": "Success",
  "manage.stackSpecies.toast.sortSuccessDescription":
    "Species sorted alphabetically.",
  "manage.stackSpecies.toast.sortError": "Failed to sort species.",
  "manage.stackSpecies.toast.linkSuccessTitle": "Success",
  "manage.stackSpecies.toast.linkSuccessDescription":
    "Species linked to the stack.",
  "manage.stackSpecies.toast.linkError": "Failed to link species to the stack.",
  "manage.stackSpecies.toast.createSuccessTitle": "Success",
  "manage.stackSpecies.toast.createSuccessDescription":
    "Species created successfully.",
  "manage.stackSpecies.toast.updateSuccessTitle": "Success",
  "manage.stackSpecies.toast.updateSuccessDescription":
    "Species updated successfully.",

  "test.settings.title": "Test Your Knowledge",
  "test.settings.description": "Customize how this test will run.",
  "test.settings.numberOfSpecies": "Number of species",
  "test.settings.all": "All",
  "test.settings.randomlySelected":
    "Randomly selected from {speciesCount} species.",
  "test.settings.allSpecies": "All {speciesCount} species.",
  "test.settings.mode": "Test mode",
  "test.settings.mode.multipleChoice": "Pick from four options",
  "test.settings.mode.writeName": "Write the species name",
  "test.settings.mode.description":
    "Pick a multiple-choice answer or type the name yourself.",
  "test.settings.sessionMode": "Goal",
  "test.settings.sessionMode.fixedRound": "Fixed-length round",
  "test.settings.sessionMode.fixedRoundDescription":
    "Run through the selected questions once and finish when the round ends.",
  "test.settings.sessionMode.untilCorrect": "Until correct",
  "test.settings.sessionMode.untilCorrectDescription":
    "Keep going until every selected species has been answered correctly once; missed ones return later.",
  "test.settings.answerScope": "Answer scope",
  "test.settings.scope.species": "Species",
  "test.settings.scope.genus": "Genus",
  "test.settings.scope.family": "Family",
  "test.settings.scope.description":
    "Choose the taxonomy level used for options and scoring.",
  "test.settings.answerNameMode": "Answer name mode",
  "test.settings.nameMode.scientific": "Scientific",
  "test.settings.nameMode.vernacular": "Vernacular",
  "test.settings.nameMode.either": "Either",
  "test.settings.nameMode.description":
    "Choose whether scientific, vernacular, or either name is accepted.",
  "test.settings.availableSpecies":
    "{available} of {total} species are available for this configuration.",
  "test.settings.notEnoughEligible":
    "Not enough species for {scope} with {nameMode} names. Choose another setting.",
  "test.answerHelp.scope.species": "Answer with a species-level name.",
  "test.answerHelp.scope.genus": "Answer with a genus-level name.",
  "test.answerHelp.scope.family": "Answer with a family-level name.",
  "test.answerHelp.nameMode.scientific": "Scientific names are accepted.",
  "test.answerHelp.nameMode.vernacular": "Vernacular names are accepted.",
  "test.answerHelp.nameMode.either":
    "Scientific or vernacular names are accepted.",
  "test.answerInput.label": "Answer",
  "test.answerInput.placeholder": "Type your answer",
  "test.answerInput.submit": "Submit Answer",
  "test.answerInput.correct": "Correct!",
  "test.answerInput.correctAnswerPrefix": "Correct answer:",
  "test.answerInput.closeGuess": "Close! Check the spelling and try again.",
  "test.settings.start": "Start",
  "test.multipleChoice.eliminateHalf": "Eliminate 50%",
  "test.multipleChoice.eliminateHalfUsed": "50/50 used",
  "test.multipleChoice.eliminated": "Eliminated",
  "test.scope.short.species": "species",
  "test.scope.short.genus": "genus",
  "test.scope.short.family": "family",
  "test.nameMode.short.scientific": "scientific",
  "test.nameMode.short.vernacular": "vernacular",
  "test.nameMode.short.either": "scientific or vernacular",
  "test.species.prompt": "Identify the {scope} using {nameMode} names.",
  "test.species.expectedFamiliarity": "Expected familiarity",
  "test.species.familiarityPercent": "{percent}%",
  "test.species.noFamiliarityData": "No familiarity data yet",
  "test.species.imageAlt": "Species to identify",
  "test.species.noImage": "No image available",
  "test.progress.settings": "Test settings",
  "test.progress.completed": "Completed",
  "test.progress.question": "Question {current} of {total}",
  "test.progress.untilCorrect": "Correct once: {correct} of {total}",
  "test.navigation.nextQuestion": "Next Question",
  "test.navigation.finishTest": "Finish Test",
  "test.validation.needsTwoSpecies":
    "This stack needs at least 2 species with test images.",
  "test.validation.browseOtherStacks": "Browse Other Stacks",
  "test.fallback.stackName": "Test",
  "test.fallback.loadingGroup": "Loading",

  "learning.histogram.mastered": "Mastered",
  "learning.histogram.strengthening": "Strengthening",
  "learning.histogram.learning": "Learning",
  "learning.histogram.new": "New",
  "learning.histogram.label.species": "Species",
  "learning.histogram.label.genus": "Genus",
  "learning.histogram.label.family": "Family",
  "learning.histogram.barTitle":
    "{label}: New {newPercent}%, Learning {learningPercent}%, Strengthening {strengtheningPercent}%, Mastered {masteredPercent}%",

  "test.completed.title": "Test Complete!",
  "test.completed.scoreLine":
    "You got {correctAnswers} out of {totalQuestions} correct",
  "test.completed.scoreLine.untilCorrect":
    "You answered all {totalQuestions} selected questions correctly in {attempts} attempts",
  "test.completed.stackStatus": "Stack learning status",
  "test.completed.takeAgain": "Take Test Again",
  "test.completed.studyCards": "Study Cards",
  "test.completed.backToStacks": "Back to All Stacks",
} as const;

type TranslationKey = keyof typeof EN_MESSAGES;
type TranslationParams = Record<string, string | number>;
type TranslationTable = Record<TranslationKey, string>;
export type Translate = (
  key: TranslationKey,
  params?: TranslationParams,
) => string;

const FI_MESSAGES: TranslationTable = {
  "navbar.guestUser": "Vieraskäyttäjä",
  "navbar.role": "Rooli: {role}",
  "navbar.adminPanel": "Ylläpito",
  "navbar.manageContent": "Hallitse sisältöä",
  "navbar.signOut": "Kirjaudu ulos",
  "navbar.signIn": "Kirjaudu sisään",

  "auth.errorTitle": "Virhe",
  "auth.email": "Sähköposti",
  "auth.password": "Salasana",
  "auth.confirmPassword": "Vahvista salasana",
  "auth.signIn.link": "Kirjaudu sisään",
  "auth.signUp.link": "Rekisteröidy",

  "auth.signIn.title": "Kirjaudu Pinkkaan",
  "auth.signIn.description": "Anna tunnuksesi päästäksesi tilillesi",
  "auth.signIn.googleContinue": "Jatka Googlella",
  "auth.signIn.signingIn": "Kirjaudutaan...",
  "auth.signIn.redirectingTitle": "Kirjaudutaan...",
  "auth.signIn.redirectingDescription": "Ohjataan Googlen kirjautumissivulle.",
  "auth.signIn.orEmail": "Tai kirjaudu sähköpostilla",
  "auth.signIn.submit": "Kirjaudu sisään",
  "auth.signIn.submitLoading": "Kirjaudutaan...",
  "auth.signIn.noAccount": "Eikö sinulla ole tiliä?",
  "auth.signIn.welcomeBackTitle": "Tervetuloa takaisin!",
  "auth.signIn.welcomeBackDescription": "Kirjautuminen onnistui.",
  "auth.signIn.failureDescription":
    "Kirjautuminen epäonnistui. Tarkista tunnuksesi.",
  "auth.signIn.googleWelcomeTitle": "Tervetuloa!",
  "auth.signIn.googleWelcomeDescription": "Google-kirjautuminen onnistui.",

  "auth.signUp.title": "Luo käyttäjätili",
  "auth.signUp.description": "Rekisteröidy aloittaaksesi lajien opiskelun",
  "auth.signUp.submit": "Rekisteröidy",
  "auth.signUp.submitLoading": "Luodaan tiliä...",
  "auth.signUp.hasAccount": "Onko sinulla jo tili?",
  "auth.signUp.passwordMismatch": "Salasanat eivät täsmää",
  "auth.signUp.passwordTooShort": "Salasanan pitää olla vähintään 6 merkkiä",
  "auth.signUp.createdTitle": "Tili luotu!",
  "auth.signUp.createdDescription": "Tervetuloa Pinkkaan. Aloita oppiminen!",
  "auth.signUp.failureDescription": "Tilin luonti epäonnistui",

  "home.title": "Kokoelmat",
  "home.subtitle": "Valitse kokoelma harjoitellaksesi",
  "home.filterPlaceholder": "Suodata...",
  "home.favorite": "Suosikkikokoelma",
  "home.mastery": "Hallinta",
  "home.noCollectionsMatchFilter":
    "Nykyisellä suodatuksella ei löytynyt kokoelmia",
  "home.noLearningDataYet": "Ei vielä oppimisdataa",
  "home.speciesCount": "{count} lajia",
  "home.learn": "Opiskele",
  "home.takeTest": "Tee testi",
  "home.noStacksInGroup": "Tässä ryhmässä ei ole vielä pinkkoja",
  "home.noMaterialsTitle": "Oppimateriaalia ei ole vielä saatavilla",
  "home.noMaterialsSubtitle":
    "Tarkista myöhemmin tai pyydä toimittajaa lisäämään sisältöä",
  "group.backToHome": "Takaisin kokoelmiin",
  "group.favoriteStack": "Suosikkipinkka",
  "group.noStacksMatchFilter": "Yksikään pinkka ei vastaa nykyistä suodatinta",
  "group.notFoundTitle": "Kokoelmaa ei löytynyt",
  "group.notFoundDescription": "Pyydettyä kokoelmaa ei voitu ladata.",
  "learn.cards.progressLabel": "{current} / {total}",
  "learn.cards.shuffle": "Sekoita",
  "learn.cards.noSpeciesWithImages":
    "Tässä pinkassa ei ole lajeja, joilla on kuvia.",
  "learn.cards.browseOtherStacks": "Selaa muita pinkkoja",
  "learn.cards.previous": "Edellinen",
  "learn.cards.next": "Seuraava",
  "learn.cards.openSpeciesList": "Avaa lajilista",
  "learn.cards.keyboardAria": "Näppäinoikotiet",
  "learn.cards.shortcutsTitle": "Oikotiet",
  "learn.cards.shortcut.toggleInfoPanel": "Näytä tai piilota tietopaneeli",
  "learn.cards.shortcut.openLarger": "Avaa suurempana / zoomaa sisään",
  "learn.cards.shortcut.zoomOut": "Zoomaa ulos / sulje sovituksessa",
  "learn.cards.shortcut.previousImage": "Edellinen kuva",
  "learn.cards.shortcut.nextImage": "Seuraava kuva",
  "learn.cards.shortcut.previousSpecies": "Edellinen laji",
  "learn.cards.shortcut.nextSpecies": "Seuraava laji",
  "learn.cards.shortcut.showIdentificationTab": "Näytä tunnistus-välilehti",
  "learn.cards.shortcut.showPinkkaTab": "Näytä Pinkka-tietovälilehti",
  "learn.cards.info.show": "Näytä tiedot",
  "learn.cards.info.hide": "Piilota tiedot",
  "learn.cards.info.hideAria": "Piilota tietopaneeli",
  "learn.cards.info.tab.identification": "Tunnistus",
  "learn.cards.info.tab.pinkka": "Pinkka-tiedot",
  "learn.cards.info.identificationPlaceholder":
    "Tunnistusvihjeitä ei ole saatavilla.",
  "learn.cards.info.identificationImageAlt":
    "Tunnistusvihjeeseen liitetty kuva",
  "learn.cards.info.noDescription": "Kuvausta ei saatavilla.",
  "manage.speciesForm.title.edit": "Muokkaa lajia",
  "manage.speciesForm.title.create": "Luo uusi laji",
  "manage.speciesForm.tab.information": "Tiedot",
  "manage.speciesForm.tab.pictures": "Kuvat",
  "manage.speciesForm.tab.identification": "Tunnistus",
  "manage.speciesForm.field.scientificName": "Tieteellinen nimi *",
  "manage.speciesForm.field.finnishName": "Suomenkielinen nimi",
  "manage.speciesForm.field.englishName": "Englanninkielinen nimi",
  "manage.speciesForm.field.swedishName": "Ruotsinkielinen nimi",
  "manage.speciesForm.field.descriptionFi": "Kuvaus (FI)",
  "manage.speciesForm.field.descriptionEn": "Kuvaus (EN)",
  "manage.speciesForm.field.descriptionSv": "Kuvaus (SV)",
  "manage.speciesForm.placeholder.scientificName": "esim. Vulpes vulpes",
  "manage.speciesForm.placeholder.finnishName": "esim. Kettu",
  "manage.speciesForm.placeholder.englishName": "esim. Red Fox",
  "manage.speciesForm.placeholder.swedishName": "esim. Rodrav",
  "manage.speciesForm.placeholder.description": "Kirjoita lajin kuvaus...",
  "manage.speciesForm.section.images": "Kuvat",
  "manage.speciesForm.section.testImages": "Testikuvat",
  "manage.speciesForm.help.testImages":
    "Valitse mitkä kuvat voivat näkyä testeissä. Korteilla näytetään aina kaikki kuvat.",
  "manage.speciesForm.help.addImagesForTests":
    "Lisää kuvia ottaaksesi testikuvavalinnan käyttöön.",
  "manage.speciesForm.imageLabel": "Kuva {number}",
  "manage.speciesForm.imageAlt": "Lajin kuva {number}",
  "manage.speciesForm.imageState.test": "Testi",
  "manage.speciesForm.imageState.excluded": "Poissuljettu",
  "manage.speciesForm.error.testImageRequired":
    "Valitse vähintään yksi kuva testeihin.",
  "manage.speciesForm.section.identificationHints": "Tunnistusvihjeet",
  "manage.speciesForm.action.addHint": "Lisää vihje",
  "manage.speciesForm.help.identificationHints":
    "Vihjeet näytetään oppimissivun tunnistusvälilehdellä.",
  "manage.speciesForm.empty.identificationHints":
    "Tunnistusvihjeitä ei ole vielä lisätty.",
  "manage.speciesForm.action.editHint": "Muokkaa",
  "manage.speciesForm.action.deleteHint": "Poista",
  "manage.speciesForm.action.saving": "Tallennetaan...",
  "manage.speciesForm.action.update": "Päivitä laji",
  "manage.speciesForm.action.create": "Luo laji",
  "manage.speciesForm.action.cancel": "Peruuta",
  "manage.speciesForm.toast.imageUploadedTitle": "Kuva ladattu",
  "manage.speciesForm.toast.imageUploadedDescription":
    "Kuva ladattiin onnistuneesti",
  "manage.speciesForm.toast.uploadErrorDescription": "Kuvan lataus epäonnistui",
  "manage.speciesForm.toast.selectTestImagesTitle": "Valitse testikuvat",
  "manage.speciesForm.toast.selectTestImagesDescription":
    "Valitse vähintään yksi testissä käytettävä kuva.",
  "manage.speciesForm.toast.scientificNameRequiredTitle":
    "Tieteellinen nimi on pakollinen",
  "manage.speciesForm.toast.scientificNameRequiredDescription":
    "Lisää tieteellinen nimi ennen tallennusta.",
  "manage.speciesForm.toast.saveErrorDescription":
    "Lajin tallennus epäonnistui",
  "manage.speciesHintDialog.title.edit": "Muokkaa tunnistusvihjettä",
  "manage.speciesHintDialog.title.create": "Lisää tunnistusvihje",
  "manage.speciesHintDialog.description":
    "Vihjeet näytetään oppimissivun tunnistusvälilehdellä.",
  "manage.speciesHintDialog.field.fi": "Vihje (FI)",
  "manage.speciesHintDialog.field.en": "Vihje (EN)",
  "manage.speciesHintDialog.field.sv": "Vihje (SV)",
  "manage.speciesHintDialog.placeholder.fi":
    "Kirjoita tunnistusvihje suomeksi...",
  "manage.speciesHintDialog.placeholder.en":
    "Kirjoita tunnistusvihje englanniksi...",
  "manage.speciesHintDialog.placeholder.sv":
    "Kirjoita tunnistusvihje ruotsiksi...",
  "manage.speciesHintDialog.action.cancel": "Peruuta",
  "manage.speciesHintDialog.action.save": "Tallenna muutokset",
  "manage.speciesHintDialog.action.add": "Lisää vihje",
  "manage.speciesHintDialog.section.imageReference": "Viittauskuva",
  "manage.speciesHintDialog.help.imageReference":
    "Halutessasi voit liittää vihjeeseen yhden lajikuvan.",
  "manage.speciesHintDialog.action.addImage": "Lisää kuva",
  "manage.speciesHintDialog.action.changeImage": "Vaihda kuva",
  "manage.speciesHintDialog.action.deleteImage": "Poista kuva",
  "manage.speciesHintDialog.emptyImages": "Lajikuvia ei ole saatavilla.",
  "manage.speciesHintDialog.imageDialog.title": "Valitse viittauskuva",
  "manage.speciesHintDialog.imageDialog.description":
    "Valitse yksi lajikuva tälle vihjeelle.",
  "manage.speciesHintDialog.imageDialog.gridAria": "Lajikuvavalitsin",
  "manage.speciesHintDialog.imageDialog.action.select": "Valitse kuva",
  "manage.tabs.species": "Lajit",
  "manage.tabs.groups": "Ryhmät",
  "manage.tabs.stack": "Pino",
  "manage.tabs.pinkka": "Pinkka",
  "manage.tabs.speciesDetail": "Laji",
  "manage.pinkka.title": "Pinkka-sisältö",
  "manage.pinkka.description": "Selaa Pinkan ryhmiä, pinoja ja lajien tietoja.",
  "manage.pinkka.loading": "Ladataan sisältöä...",
  "manage.pinkka.button.importing": "Tuodaan...",
  "manage.pinkka.button.importSelected": "Tuo valitut {target} ({count})",
  "manage.pinkka.button.importingMissing": "Tuodaan puuttuvia...",
  "manage.pinkka.button.importMissingSelected":
    "Tuo puuttuvat valitut {target} ({count})",
  "manage.pinkka.button.importingReimporting": "Tuodaan/uudelleentuodaan...",
  "manage.pinkka.button.reimporting": "Uudelleentuodaan...",
  "manage.pinkka.button.importReimportSelected":
    "Tuo/uudelleentuo valitut {target} ({count})",
  "manage.pinkka.button.reimportSelected":
    "Uudelleentuo valitut {target} ({count})",
  "manage.pinkka.toast.nothingToImportTitle": "Ei tuotavaa",
  "manage.pinkka.toast.nothingToImportDescription":
    "Kaikki valitut kohteet on jo tuotu.",
  "manage.pinkka.toast.jobFailedTitle": "Tuontia ei voitu käynnistää",
  "manage.pinkka.toast.jobFailedDescription":
    "Pinkka-tuontityön jonotus epäonnistui.",
  "manage.pinkkaImport.action.import": "Tuodaan",
  "manage.pinkkaImport.action.reimport": "Uudelleentuodaan",
  "manage.pinkkaImport.action.importmissing": "Tuodaan puuttuvia",
  "manage.pinkkaImport.target.groupSingular": "ryhmä",
  "manage.pinkkaImport.target.groupPlural": "ryhmät",
  "manage.pinkkaImport.target.stackSingular": "pino",
  "manage.pinkkaImport.target.stackPlural": "pinot",
  "manage.pinkkaImport.target.speciesSingular": "laji",
  "manage.pinkkaImport.target.speciesPlural": "lajit",
  "manage.pinkkaImport.target.itemPlural": "kohteet",
  "manage.pinkkaImport.toast.title.queued": "Pinkka-tuonti jonossa",
  "manage.pinkkaImport.toast.title.running": "Pinkka-tuonti käynnissä",
  "manage.pinkkaImport.toast.title.completed": "Pinkka-tuonti valmis",
  "manage.pinkkaImport.toast.title.interrupted": "Pinkka-tuonti keskeytettiin",
  "manage.pinkkaImport.toast.title.failed": "Pinkka-tuonti epäonnistui",
  "manage.pinkkaImport.toast.description.active": "{action} {count} {target}.",
  "manage.pinkkaImport.toast.description.completed":
    "{action} {count} {target} valmis.",
  "manage.pinkkaImport.toast.description.interrupted":
    "{action} {target} keskeytettiin.",
  "manage.pinkkaImport.toast.description.failed":
    "{action} {target} epäonnistui.",
  "manage.pinkkaImport.toast.interrupt": "Keskeytä",
  "manage.pinkkaImport.toast.openPinkka": "Avaa Pinkassa",
  "manage.pinkkaImport.progress.groups": "Ryhmät",
  "manage.pinkkaImport.progress.stacks": "Pinot",
  "manage.pinkkaImport.progress.species": "Lajit",
  "manage.pinkkaImport.progress.waiting": "Odotetaan...",
  "manage.speciesInventory.title": "Lajit",
  "manage.speciesInventory.description":
    "Hallitse taksonomisesti järjestettyä lajikirjastoa. Ryhmät ja pinot linkittävät näihin yhteisiin lajitietoihin.",
  "manage.speciesInventory.addSpecies": "Lisää laji",
  "manage.speciesInventory.searchPlaceholder":
    "Suodata lajeja tai taksonomiaa...",
  "manage.speciesInventory.searchEmpty":
    "Yksikään laji ei vastaa nykyistä suodatusta.",
  "manage.speciesInventory.empty": "Lajeja ei ole vielä saatavilla.",
  "manage.speciesInventory.noVernacularName": "Ei kansankielistä nimeä",
  "manage.speciesInventory.hidden": "Piilotettu",
  "manage.speciesInventory.visible": "Näkyvissä",
  "manage.speciesInventory.rank.domain": "Domeeni",
  "manage.speciesInventory.rank.kingdom": "Kunta",
  "manage.speciesInventory.rank.phylum": "Pääjakso",
  "manage.speciesInventory.rank.class": "Luokka",
  "manage.speciesInventory.rank.order": "Lahko",
  "manage.speciesInventory.rank.family": "Heimo",
  "manage.speciesInventory.rank.genus": "Suku",
  "manage.speciesInventory.rank.species": "Laji",
  "manage.speciesInventory.unclassifiedRank": "Luokittelematon {rank}",
  "manage.speciesInventory.unclassifiedFamily": "Luokittelematon heimo",
  "manage.speciesInventory.unclassifiedGenus": "Luokittelematon suku",
  "manage.speciesInventory.backToSpecies": "Takaisin lajeihin",
  "manage.speciesInventory.notFound": "Lajia ei löytynyt.",
  "manage.speciesInventory.toast.loadError": "Lajien lataus epäonnistui.",
  "manage.speciesInventory.toast.createSuccessTitle": "Onnistui",
  "manage.speciesInventory.toast.createSuccessDescription":
    "Laji luotiin onnistuneesti.",
  "manage.speciesInventory.toast.updateSuccessTitle": "Onnistui",
  "manage.speciesInventory.toast.updateSuccessDescription":
    "Laji päivitettiin onnistuneesti.",
  "manage.stackSpecies.title": "Hallitse lajeja",
  "manage.stackSpecies.description":
    "Linkitä ja hallitse tässä pinossa käytettyjä lajeja taksonomiapuun kautta.",
  "manage.stackSpecies.view.minimal": "Tiivis",
  "manage.stackSpecies.view.detailed": "Yksityiskohtainen",
  "manage.stackSpecies.sort": "Lajittele A-Ö",
  "manage.stackSpecies.linkExisting": "Linkitä olemassa oleva laji",
  "manage.stackSpecies.addSpecies": "Lisää laji",
  "manage.stackSpecies.addFirstSpecies": "Lisää ensimmäinen laji",
  "manage.stackSpecies.searchPlaceholder": "Suodata lajeja tai taksonomiaa...",
  "manage.stackSpecies.searchEmpty":
    "Tämän pinon lajeista mikään ei vastaa nykyistä suodatusta.",
  "manage.stackSpecies.empty": "Tähän pinoon ei ole vielä linkitetty lajeja.",
  "manage.stackSpecies.backToStack": "Takaisin pinoon",
  "manage.stackSpecies.notFound": "Lajia ei löytynyt tästä pinosta.",
  "manage.stackSpecies.confirm.unlink":
    "Haluatko varmasti poistaa tämän lajin linkityksen pinosta?",
  "manage.stackSpecies.linkDialog.title": "Linkitä olemassa oleva laji",
  "manage.stackSpecies.linkDialog.description":
    "Valitse yhteisestä lajikirjastosta laji, joka linkitetään tähän pinoon.",
  "manage.stackSpecies.linkDialog.confirm": "Linkitä laji",
  "manage.stackSpecies.linkDialog.cancel": "Peruuta",
  "manage.stackSpecies.linkDialog.empty":
    "Linkitettäväksi ei ole muita lajeja.",
  "manage.stackSpecies.linkDialog.listAria": "Linkitettävissä olevat lajit",
  "manage.stackSpecies.toast.loadError": "Pinon lajien lataus epäonnistui.",
  "manage.stackSpecies.toast.keepOneTestImage":
    "Testeihin on jätettävä vähintään yksi kuva käyttöön.",
  "manage.stackSpecies.toast.testImagesError":
    "Testikuvien päivittäminen epäonnistui.",
  "manage.stackSpecies.toast.unlinkSuccessTitle": "Onnistui",
  "manage.stackSpecies.toast.unlinkSuccessDescription":
    "Lajin linkitys poistettiin pinosta.",
  "manage.stackSpecies.toast.unlinkError":
    "Lajin linkityksen poistaminen epäonnistui.",
  "manage.stackSpecies.toast.visibilitySuccessTitle": "Onnistui",
  "manage.stackSpecies.toast.visibilityHidden": "Laji piilotettiin oppijoilta.",
  "manage.stackSpecies.toast.visibilityVisible":
    "Laji on nyt näkyvissä oppijoille.",
  "manage.stackSpecies.toast.visibilityError":
    "Lajin näkyvyyden päivittäminen epäonnistui.",
  "manage.stackSpecies.toast.reorderSuccessTitle": "Onnistui",
  "manage.stackSpecies.toast.reorderSuccessDescription":
    "Lajien järjestys päivitettiin.",
  "manage.stackSpecies.toast.sortSuccessTitle": "Onnistui",
  "manage.stackSpecies.toast.sortSuccessDescription":
    "Lajit lajiteltiin aakkosjärjestykseen.",
  "manage.stackSpecies.toast.sortError": "Lajien lajittelu epäonnistui.",
  "manage.stackSpecies.toast.linkSuccessTitle": "Onnistui",
  "manage.stackSpecies.toast.linkSuccessDescription":
    "Laji linkitettiin pinoon.",
  "manage.stackSpecies.toast.linkError":
    "Lajin linkittäminen pinoon epäonnistui.",
  "manage.stackSpecies.toast.createSuccessTitle": "Onnistui",
  "manage.stackSpecies.toast.createSuccessDescription":
    "Laji luotiin onnistuneesti.",
  "manage.stackSpecies.toast.updateSuccessTitle": "Onnistui",
  "manage.stackSpecies.toast.updateSuccessDescription":
    "Laji päivitettiin onnistuneesti.",

  "test.settings.title": "Testaa osaamistasi",
  "test.settings.description": "Muokkaa testin toimintaa.",
  "test.settings.numberOfSpecies": "Lajien määrä",
  "test.settings.all": "Kaikki",
  "test.settings.randomlySelected":
    "Valitaan satunnaisesti yhteensä {speciesCount} lajista.",
  "test.settings.allSpecies": "Kaikki {speciesCount} lajia.",
  "test.settings.mode": "Testitapa",
  "test.settings.mode.multipleChoice": "Valitse neljästä vaihtoehdosta",
  "test.settings.mode.writeName": "Kirjoita lajin nimi",
  "test.settings.mode.description":
    "Valitse oikea vaihtoehto tai kirjoita nimi itse.",
  "test.settings.sessionMode": "Tavoite",
  "test.settings.sessionMode.fixedRound": "Kiinteäpituinen kierros",
  "test.settings.sessionMode.fixedRoundDescription":
    "Käy valitut kysymykset kerran läpi ja päätä testi kierroksen lopussa.",
  "test.settings.sessionMode.untilCorrect": "Kunnes oikein",
  "test.settings.sessionMode.untilCorrectDescription":
    "Jatka, kunnes jokaiseen valittuun lajiin on vastattu kerran oikein; väärät palaavat myöhemmin.",
  "test.settings.answerScope": "Vastauksen taso",
  "test.settings.scope.species": "Laji",
  "test.settings.scope.genus": "Suku",
  "test.settings.scope.family": "Heimo",
  "test.settings.scope.description":
    "Valitse vaihtoehdoissa ja pisteytyksessä käytettävä taksonitaso.",
  "test.settings.answerNameMode": "Vastauksen nimimuoto",
  "test.settings.nameMode.scientific": "Tieteellinen",
  "test.settings.nameMode.vernacular": "Kansankielinen",
  "test.settings.nameMode.either": "Kumpi tahansa",
  "test.settings.nameMode.description":
    "Valitse hyväksytäänkö tieteellinen, kansankielinen vai kumpi tahansa nimi.",
  "test.settings.availableSpecies":
    "{available}/{total} lajia on käytettävissä näillä asetuksilla.",
  "test.settings.notEnoughEligible":
    "Ei tarpeeksi lajeja asetukselle {scope} + {nameMode}. Vaihda asetuksia.",
  "test.answerHelp.scope.species": "Vastaa lajitason nimellä.",
  "test.answerHelp.scope.genus": "Vastaa sukutason nimellä.",
  "test.answerHelp.scope.family": "Vastaa heimotason nimellä.",
  "test.answerHelp.nameMode.scientific": "Tieteelliset nimet hyväksytään.",
  "test.answerHelp.nameMode.vernacular": "Kansankieliset nimet hyväksytään.",
  "test.answerHelp.nameMode.either":
    "Tieteelliset ja kansankieliset nimet hyväksytään.",
  "test.answerInput.label": "Vastaus",
  "test.answerInput.placeholder": "Kirjoita vastauksesi",
  "test.answerInput.submit": "Lähetä vastaus",
  "test.answerInput.correct": "Oikein!",
  "test.answerInput.correctAnswerPrefix": "Oikea vastaus:",
  "test.answerInput.closeGuess":
    "Lähellä! Tarkista kirjoitusasu ja yritä uudelleen.",
  "test.settings.start": "Aloita",
  "test.multipleChoice.eliminateHalf": "Poista 50 %",
  "test.multipleChoice.eliminateHalfUsed": "50/50 käytetty",
  "test.multipleChoice.eliminated": "Poistettu",
  "test.scope.short.species": "laji",
  "test.scope.short.genus": "suku",
  "test.scope.short.family": "heimo",
  "test.nameMode.short.scientific": "tieteellinen",
  "test.nameMode.short.vernacular": "kansankielinen",
  "test.nameMode.short.either": "tieteellinen tai kansankielinen",
  "test.species.prompt": "Tunnista kuvasta {scope} käyttäen {nameMode} nimeä.",
  "test.species.expectedFamiliarity": "Odotettu tuttuus",
  "test.species.familiarityPercent": "{percent} %",
  "test.species.noFamiliarityData": "Ei vielä tuttuusdataa",
  "test.species.imageAlt": "Tunnistettava laji",
  "test.species.noImage": "Kuvaa ei saatavilla",
  "test.progress.settings": "Testin asetukset",
  "test.progress.completed": "Valmis",
  "test.progress.question": "Kysymys {current}/{total}",
  "test.progress.untilCorrect": "Kerran oikein: {correct}/{total}",
  "test.navigation.nextQuestion": "Seuraava kysymys",
  "test.navigation.finishTest": "Päätä testi",
  "test.validation.needsTwoSpecies":
    "Testiin tarvitaan vähintään 2 lajia, joilla on testikuvia.",
  "test.validation.browseOtherStacks": "Selaa muita pinkkoja",
  "test.fallback.stackName": "Testi",
  "test.fallback.loadingGroup": "Ladataan",

  "learning.histogram.mastered": "Hallussa",
  "learning.histogram.strengthening": "Vahvistumassa",
  "learning.histogram.learning": "Opettelussa",
  "learning.histogram.new": "Uusi",
  "learning.histogram.label.species": "Laji",
  "learning.histogram.label.genus": "Suku",
  "learning.histogram.label.family": "Heimo",
  "learning.histogram.barTitle":
    "{label}: Uusi {newPercent}%, Opettelussa {learningPercent}%, Vahvistumassa {strengtheningPercent}%, Hallussa {masteredPercent}%",

  "test.completed.title": "Testi valmis!",
  "test.completed.scoreLine": "Sait oikein {correctAnswers} / {totalQuestions}",
  "test.completed.scoreLine.untilCorrect":
    "Vastasit kaikkiin {totalQuestions} valittuun kysymykseen oikein {attempts} yrityksessä",
  "test.completed.stackStatus": "Pinkan oppimistila",
  "test.completed.takeAgain": "Tee testi uudelleen",
  "test.completed.studyCards": "Opiskele korteilla",
  "test.completed.backToStacks": "Takaisin pinkkoihin",
};

const SV_MESSAGES: TranslationTable = {
  "navbar.guestUser": "Gästanvändare",
  "navbar.role": "Roll: {role}",
  "navbar.adminPanel": "Adminpanel",
  "navbar.manageContent": "Hantera innehåll",
  "navbar.signOut": "Logga ut",
  "navbar.signIn": "Logga in",

  "auth.errorTitle": "Fel",
  "auth.email": "E-post",
  "auth.password": "Lösenord",
  "auth.confirmPassword": "Bekräfta lösenord",
  "auth.signIn.link": "Logga in",
  "auth.signUp.link": "Registrera dig",

  "auth.signIn.title": "Logga in i Pinkka",
  "auth.signIn.description": "Ange dina uppgifter för att komma åt ditt konto",
  "auth.signIn.googleContinue": "Fortsätt med Google",
  "auth.signIn.signingIn": "Loggar in...",
  "auth.signIn.redirectingTitle": "Loggar in...",
  "auth.signIn.redirectingDescription":
    "Omdirigerar till Googles inloggningssida.",
  "auth.signIn.orEmail": "Eller logga in med e-post",
  "auth.signIn.submit": "Logga in",
  "auth.signIn.submitLoading": "Loggar in...",
  "auth.signIn.noAccount": "Har du inget konto?",
  "auth.signIn.welcomeBackTitle": "Välkommen tillbaka!",
  "auth.signIn.welcomeBackDescription": "Du har loggat in.",
  "auth.signIn.failureDescription":
    "Inloggningen misslyckades. Kontrollera dina uppgifter.",
  "auth.signIn.googleWelcomeTitle": "Välkommen!",
  "auth.signIn.googleWelcomeDescription": "Du har loggat in med Google.",

  "auth.signUp.title": "Skapa ditt konto",
  "auth.signUp.description": "Registrera dig för att börja lära arter",
  "auth.signUp.submit": "Registrera dig",
  "auth.signUp.submitLoading": "Skapar konto...",
  "auth.signUp.hasAccount": "Har du redan ett konto?",
  "auth.signUp.passwordMismatch": "Lösenorden matchar inte",
  "auth.signUp.passwordTooShort": "Lösenordet måste vara minst 6 tecken",
  "auth.signUp.createdTitle": "Konto skapat!",
  "auth.signUp.createdDescription": "Välkommen till Pinkka. Börja lära nu!",
  "auth.signUp.failureDescription": "Kunde inte skapa konto",

  "home.title": "Samlingar",
  "home.subtitle": "Välj en stack för kortstudier eller test",
  "home.filterPlaceholder": "Filtrera...",
  "home.favorite": "Favoritsamling",
  "home.mastery": "Behärskning",
  "home.noCollectionsMatchFilter":
    "Inga samlingar matchar det aktuella filtret",
  "home.noLearningDataYet": "Ingen lärdata ännu",
  "home.speciesCount": "{count} arter",
  "home.learn": "Lär",
  "home.takeTest": "Gör test",
  "home.noStacksInGroup": "Inga stackar finns i gruppen ännu",
  "home.noMaterialsTitle": "Inget läromaterial tillgängligt ännu",
  "home.noMaterialsSubtitle":
    "Kom tillbaka senare eller kontakta en redaktör för att lägga till innehåll",
  "group.backToHome": "Tillbaka till samlingar",
  "group.favoriteStack": "Favoritstack",
  "group.noStacksMatchFilter": "Inga stackar matchar det aktuella filtret",
  "group.notFoundTitle": "Samlingen hittades inte",
  "group.notFoundDescription": "Den begärda samlingen kunde inte laddas.",
  "learn.cards.progressLabel": "{current} / {total}",
  "learn.cards.shuffle": "Blanda",
  "learn.cards.noSpeciesWithImages":
    "Inga arter med bilder finns tillgängliga i denna stack.",
  "learn.cards.browseOtherStacks": "Bläddra i andra stackar",
  "learn.cards.previous": "Föregående",
  "learn.cards.next": "Nästa",
  "learn.cards.openSpeciesList": "Öppna artlista",
  "learn.cards.keyboardAria": "Tangentbordsgenvägar",
  "learn.cards.shortcutsTitle": "Genvägar",
  "learn.cards.shortcut.toggleInfoPanel": "Växla infopanel",
  "learn.cards.shortcut.openLarger": "Öppna större / zooma in",
  "learn.cards.shortcut.zoomOut": "Zooma ut / stäng i anpassat läge",
  "learn.cards.shortcut.previousImage": "Föregående bild",
  "learn.cards.shortcut.nextImage": "Nästa bild",
  "learn.cards.shortcut.previousSpecies": "Föregående art",
  "learn.cards.shortcut.nextSpecies": "Nästa art",
  "learn.cards.shortcut.showIdentificationTab": "Visa fliken identifiering",
  "learn.cards.shortcut.showPinkkaTab": "Visa fliken Pinkka-info",
  "learn.cards.info.show": "Visa info",
  "learn.cards.info.hide": "Dölj info",
  "learn.cards.info.hideAria": "Dölj infopanel",
  "learn.cards.info.tab.identification": "Identifiering",
  "learn.cards.info.tab.pinkka": "Pinkka-info",
  "learn.cards.info.identificationPlaceholder":
    "Inga identifieringsledtrådar tillgängliga.",
  "learn.cards.info.identificationImageAlt":
    "Bild som refereras av identifieringsledtråden",
  "learn.cards.info.noDescription": "Ingen beskrivning tillgänglig.",
  "manage.speciesForm.title.edit": "Redigera art",
  "manage.speciesForm.title.create": "Skapa ny art",
  "manage.speciesForm.tab.information": "Information",
  "manage.speciesForm.tab.pictures": "Bilder",
  "manage.speciesForm.tab.identification": "Identifiering",
  "manage.speciesForm.field.scientificName": "Vetenskapligt namn *",
  "manage.speciesForm.field.finnishName": "Finskt namn",
  "manage.speciesForm.field.englishName": "Engelskt namn",
  "manage.speciesForm.field.swedishName": "Svenskt namn",
  "manage.speciesForm.field.descriptionFi": "Beskrivning (FI)",
  "manage.speciesForm.field.descriptionEn": "Beskrivning (EN)",
  "manage.speciesForm.field.descriptionSv": "Beskrivning (SV)",
  "manage.speciesForm.placeholder.scientificName": "t.ex. Vulpes vulpes",
  "manage.speciesForm.placeholder.finnishName": "t.ex. Kettu",
  "manage.speciesForm.placeholder.englishName": "t.ex. Red Fox",
  "manage.speciesForm.placeholder.swedishName": "t.ex. Rodrav",
  "manage.speciesForm.placeholder.description": "Ange artbeskrivning...",
  "manage.speciesForm.section.images": "Bilder",
  "manage.speciesForm.section.testImages": "Testbilder",
  "manage.speciesForm.help.testImages":
    "Välj vilka bilder som kan visas i tester. Kort visar alltid alla bilder.",
  "manage.speciesForm.help.addImagesForTests":
    "Lägg till bilder för att aktivera testbildsval.",
  "manage.speciesForm.imageLabel": "Bild {number}",
  "manage.speciesForm.imageAlt": "Artbild {number}",
  "manage.speciesForm.imageState.test": "Test",
  "manage.speciesForm.imageState.excluded": "Utesluten",
  "manage.speciesForm.error.testImageRequired":
    "Välj minst en bild för tester.",
  "manage.speciesForm.section.identificationHints": "Identifieringsledtrådar",
  "manage.speciesForm.action.addHint": "Lägg till ledtråd",
  "manage.speciesForm.help.identificationHints":
    "Ledtrådar visas på identifieringsfliken i inlärningsvyn.",
  "manage.speciesForm.empty.identificationHints":
    "Inga identifieringsledtrådar har lagts till ännu.",
  "manage.speciesForm.action.editHint": "Redigera",
  "manage.speciesForm.action.deleteHint": "Ta bort",
  "manage.speciesForm.action.saving": "Sparar...",
  "manage.speciesForm.action.update": "Uppdatera art",
  "manage.speciesForm.action.create": "Skapa art",
  "manage.speciesForm.action.cancel": "Avbryt",
  "manage.speciesForm.toast.imageUploadedTitle": "Bild uppladdad",
  "manage.speciesForm.toast.imageUploadedDescription": "Bilden laddades upp.",
  "manage.speciesForm.toast.uploadErrorDescription":
    "Det gick inte att ladda upp bilden",
  "manage.speciesForm.toast.selectTestImagesTitle": "Välj testbilder",
  "manage.speciesForm.toast.selectTestImagesDescription":
    "Välj minst en bild som ska användas i tester.",
  "manage.speciesForm.toast.scientificNameRequiredTitle":
    "Vetenskapligt namn krävs",
  "manage.speciesForm.toast.scientificNameRequiredDescription":
    "Ange ett vetenskapligt namn innan du sparar.",
  "manage.speciesForm.toast.saveErrorDescription":
    "Det gick inte att spara arten",
  "manage.speciesHintDialog.title.edit": "Redigera identifieringsledtråd",
  "manage.speciesHintDialog.title.create": "Lägg till identifieringsledtråd",
  "manage.speciesHintDialog.description":
    "Ledtrådar visas på identifieringsfliken i inlärningsvyn.",
  "manage.speciesHintDialog.field.fi": "Ledtråd (FI)",
  "manage.speciesHintDialog.field.en": "Ledtråd (EN)",
  "manage.speciesHintDialog.field.sv": "Ledtråd (SV)",
  "manage.speciesHintDialog.placeholder.fi":
    "Skriv en identifieringsledtråd på finska...",
  "manage.speciesHintDialog.placeholder.en":
    "Skriv en identifieringsledtråd på engelska...",
  "manage.speciesHintDialog.placeholder.sv":
    "Skriv en identifieringsledtråd på svenska...",
  "manage.speciesHintDialog.action.cancel": "Avbryt",
  "manage.speciesHintDialog.action.save": "Spara ändringar",
  "manage.speciesHintDialog.action.add": "Lägg till ledtråd",
  "manage.speciesHintDialog.section.imageReference": "Referensbild",
  "manage.speciesHintDialog.help.imageReference":
    "Du kan valfritt koppla en artbild till ledtråden.",
  "manage.speciesHintDialog.action.addImage": "Lägg till bild",
  "manage.speciesHintDialog.action.changeImage": "Byt bild",
  "manage.speciesHintDialog.action.deleteImage": "Ta bort bild",
  "manage.speciesHintDialog.emptyImages": "Inga artbilder tillgängliga.",
  "manage.speciesHintDialog.imageDialog.title": "Välj referensbild",
  "manage.speciesHintDialog.imageDialog.description":
    "Välj en artbild för den här ledtråden.",
  "manage.speciesHintDialog.imageDialog.gridAria": "Artbildsväljare",
  "manage.speciesHintDialog.imageDialog.action.select": "Välj bild",
  "manage.tabs.species": "Arter",
  "manage.tabs.groups": "Grupper",
  "manage.tabs.stack": "Kortlek",
  "manage.tabs.pinkka": "Pinkka",
  "manage.tabs.speciesDetail": "Art",
  "manage.pinkka.title": "Pinkka-innehåll",
  "manage.pinkka.description":
    "Bläddra bland Pinkka-grupper, kortlekar och artdetaljer.",
  "manage.pinkka.loading": "Laddar innehåll...",
  "manage.pinkka.button.importing": "Importerar...",
  "manage.pinkka.button.importSelected": "Importera valda {target} ({count})",
  "manage.pinkka.button.importingMissing": "Importerar saknade...",
  "manage.pinkka.button.importMissingSelected":
    "Importera saknade valda {target} ({count})",
  "manage.pinkka.button.importingReimporting": "Importerar/importerar om...",
  "manage.pinkka.button.reimporting": "Importerar om...",
  "manage.pinkka.button.importReimportSelected":
    "Importera/importera om valda {target} ({count})",
  "manage.pinkka.button.reimportSelected":
    "Importera om valda {target} ({count})",
  "manage.pinkka.toast.nothingToImportTitle": "Inget att importera",
  "manage.pinkka.toast.nothingToImportDescription":
    "Alla valda objekt är redan importerade.",
  "manage.pinkka.toast.jobFailedTitle": "Importen kunde inte startas",
  "manage.pinkka.toast.jobFailedDescription":
    "Det gick inte att köa Pinkka-importjobbet.",
  "manage.pinkkaImport.action.import": "Importerar",
  "manage.pinkkaImport.action.reimport": "Importerar om",
  "manage.pinkkaImport.action.importmissing": "Importerar saknade",
  "manage.pinkkaImport.target.groupSingular": "grupp",
  "manage.pinkkaImport.target.groupPlural": "grupper",
  "manage.pinkkaImport.target.stackSingular": "kortlek",
  "manage.pinkkaImport.target.stackPlural": "kortlekar",
  "manage.pinkkaImport.target.speciesSingular": "art",
  "manage.pinkkaImport.target.speciesPlural": "arter",
  "manage.pinkkaImport.target.itemPlural": "objekt",
  "manage.pinkkaImport.toast.title.queued": "Pinkka-import köad",
  "manage.pinkkaImport.toast.title.running": "Pinkka-import pågår",
  "manage.pinkkaImport.toast.title.completed": "Pinkka-import klar",
  "manage.pinkkaImport.toast.title.interrupted": "Pinkka-import avbröts",
  "manage.pinkkaImport.toast.title.failed": "Pinkka-import misslyckades",
  "manage.pinkkaImport.toast.description.active": "{action} {count} {target}.",
  "manage.pinkkaImport.toast.description.completed":
    "{action} {count} {target} slutförd.",
  "manage.pinkkaImport.toast.description.interrupted":
    "{action} {target} avbröts.",
  "manage.pinkkaImport.toast.description.failed":
    "{action} {target} misslyckades.",
  "manage.pinkkaImport.toast.interrupt": "Avbryt",
  "manage.pinkkaImport.toast.openPinkka": "Öppna i Pinkka",
  "manage.pinkkaImport.progress.groups": "Grupper",
  "manage.pinkkaImport.progress.stacks": "Kortlekar",
  "manage.pinkkaImport.progress.species": "Arter",
  "manage.pinkkaImport.progress.waiting": "Väntar...",
  "manage.speciesInventory.title": "Arter",
  "manage.speciesInventory.description":
    "Hantera det taxonomiskt ordnade artbiblioteket. Grupper och kortlekar länkar till dessa delade artposter.",
  "manage.speciesInventory.addSpecies": "Lägg till art",
  "manage.speciesInventory.searchPlaceholder":
    "Filtrera arter eller taxonomi...",
  "manage.speciesInventory.searchEmpty":
    "Ingen art matchar det aktuella filtret.",
  "manage.speciesInventory.empty": "Inga arter finns ännu.",
  "manage.speciesInventory.noVernacularName": "Inget trivialnamn",
  "manage.speciesInventory.hidden": "Dold",
  "manage.speciesInventory.visible": "Synlig",
  "manage.speciesInventory.rank.domain": "Domän",
  "manage.speciesInventory.rank.kingdom": "Rike",
  "manage.speciesInventory.rank.phylum": "Stam",
  "manage.speciesInventory.rank.class": "Klass",
  "manage.speciesInventory.rank.order": "Ordning",
  "manage.speciesInventory.rank.family": "Familj",
  "manage.speciesInventory.rank.genus": "Släkte",
  "manage.speciesInventory.rank.species": "Art",
  "manage.speciesInventory.unclassifiedRank": "Oklassificerad {rank}",
  "manage.speciesInventory.unclassifiedFamily": "Oklassificerad familj",
  "manage.speciesInventory.unclassifiedGenus": "Oklassificerat släkte",
  "manage.speciesInventory.backToSpecies": "Tillbaka till arter",
  "manage.speciesInventory.notFound": "Arten hittades inte.",
  "manage.speciesInventory.toast.loadError": "Det gick inte att ladda arter.",
  "manage.speciesInventory.toast.createSuccessTitle": "Klart",
  "manage.speciesInventory.toast.createSuccessDescription": "Arten skapades.",
  "manage.speciesInventory.toast.updateSuccessTitle": "Klart",
  "manage.speciesInventory.toast.updateSuccessDescription":
    "Arten uppdaterades.",
  "manage.stackSpecies.title": "Hantera arter",
  "manage.stackSpecies.description":
    "Länka och hantera arterna i denna kortlek via taxonomiträdet.",
  "manage.stackSpecies.view.minimal": "Minimal",
  "manage.stackSpecies.view.detailed": "Detaljerad",
  "manage.stackSpecies.sort": "Sortera A-Ö",
  "manage.stackSpecies.linkExisting": "Länka befintlig art",
  "manage.stackSpecies.addSpecies": "Lägg till art",
  "manage.stackSpecies.addFirstSpecies": "Lägg till första arten",
  "manage.stackSpecies.searchPlaceholder": "Filtrera arter eller taxonomi...",
  "manage.stackSpecies.searchEmpty":
    "Ingen art i denna kortlek matchar det aktuella filtret.",
  "manage.stackSpecies.empty": "Inga arter är ännu länkade till denna kortlek.",
  "manage.stackSpecies.backToStack": "Tillbaka till kortleken",
  "manage.stackSpecies.notFound": "Arten hittades inte i denna kortlek.",
  "manage.stackSpecies.confirm.unlink":
    "Vill du verkligen ta bort artens länkning från kortleken?",
  "manage.stackSpecies.linkDialog.title": "Länka befintlig art",
  "manage.stackSpecies.linkDialog.description":
    "Välj en art från det gemensamma artbiblioteket att länka till denna kortlek.",
  "manage.stackSpecies.linkDialog.confirm": "Länka art",
  "manage.stackSpecies.linkDialog.cancel": "Avbryt",
  "manage.stackSpecies.linkDialog.empty":
    "Det finns inga fler arter att länka.",
  "manage.stackSpecies.linkDialog.listAria": "Arter som kan länkas",
  "manage.stackSpecies.toast.loadError":
    "Det gick inte att ladda kortlekens arter.",
  "manage.stackSpecies.toast.keepOneTestImage":
    "Minst en bild måste förbli aktiverad för tester.",
  "manage.stackSpecies.toast.testImagesError":
    "Det gick inte att uppdatera testbilderna.",
  "manage.stackSpecies.toast.unlinkSuccessTitle": "Klart",
  "manage.stackSpecies.toast.unlinkSuccessDescription":
    "Artens länkning togs bort från kortleken.",
  "manage.stackSpecies.toast.unlinkError":
    "Det gick inte att ta bort artens länkning från kortleken.",
  "manage.stackSpecies.toast.visibilitySuccessTitle": "Klart",
  "manage.stackSpecies.toast.visibilityHidden": "Arten doldes för eleverna.",
  "manage.stackSpecies.toast.visibilityVisible":
    "Arten är nu synlig för eleverna.",
  "manage.stackSpecies.toast.visibilityError":
    "Det gick inte att uppdatera artens synlighet.",
  "manage.stackSpecies.toast.reorderSuccessTitle": "Klart",
  "manage.stackSpecies.toast.reorderSuccessDescription":
    "Artordningen uppdaterades.",
  "manage.stackSpecies.toast.sortSuccessTitle": "Klart",
  "manage.stackSpecies.toast.sortSuccessDescription":
    "Arterna sorterades alfabetiskt.",
  "manage.stackSpecies.toast.sortError": "Det gick inte att sortera arterna.",
  "manage.stackSpecies.toast.linkSuccessTitle": "Klart",
  "manage.stackSpecies.toast.linkSuccessDescription":
    "Arten länkades till kortleken.",
  "manage.stackSpecies.toast.linkError":
    "Det gick inte att länka arten till kortleken.",
  "manage.stackSpecies.toast.createSuccessTitle": "Klart",
  "manage.stackSpecies.toast.createSuccessDescription": "Arten skapades.",
  "manage.stackSpecies.toast.updateSuccessTitle": "Klart",
  "manage.stackSpecies.toast.updateSuccessDescription": "Arten uppdaterades.",

  "test.settings.title": "Testa dina kunskaper",
  "test.settings.description": "Anpassa hur testet ska köras.",
  "test.settings.numberOfSpecies": "Antal arter",
  "test.settings.all": "Alla",
  "test.settings.randomlySelected":
    "Slumpmässigt valda från {speciesCount} arter.",
  "test.settings.allSpecies": "Alla {speciesCount} arter.",
  "test.settings.mode": "Testläge",
  "test.settings.mode.multipleChoice": "Välj bland fyra alternativ",
  "test.settings.mode.writeName": "Skriv artens namn",
  "test.settings.mode.description":
    "Välj ett flervalsalternativ eller skriv namnet själv.",
  "test.settings.sessionMode": "Målsättning",
  "test.settings.sessionMode.fixedRound": "Runda med fast längd",
  "test.settings.sessionMode.fixedRoundDescription":
    "Gå igenom de valda frågorna en gång och avsluta när rundan är slut.",
  "test.settings.sessionMode.untilCorrect": "Tills rätt",
  "test.settings.sessionMode.untilCorrectDescription":
    "Fortsätt tills varje vald art har besvarats rätt en gång; felaktiga svar kommer tillbaka senare.",
  "test.settings.answerScope": "Svarsnivå",
  "test.settings.scope.species": "Art",
  "test.settings.scope.genus": "Släkte",
  "test.settings.scope.family": "Familj",
  "test.settings.scope.description":
    "Välj taxonnivån som används i alternativ och poängsättning.",
  "test.settings.answerNameMode": "Svarsnamnsläge",
  "test.settings.nameMode.scientific": "Vetenskapligt",
  "test.settings.nameMode.vernacular": "Vardagligt",
  "test.settings.nameMode.either": "Antingen",
  "test.settings.nameMode.description":
    "Välj om vetenskapligt, vardagligt eller båda namn accepteras.",
  "test.settings.availableSpecies":
    "{available} av {total} arter är tillgängliga för denna konfiguration.",
  "test.settings.notEnoughEligible":
    "För få arter för {scope} med {nameMode} namn. Välj en annan inställning.",
  "test.answerHelp.scope.species": "Svara med ett namn på artnivå.",
  "test.answerHelp.scope.genus": "Svara med ett namn på släktesnivå.",
  "test.answerHelp.scope.family": "Svara med ett namn på familjenivå.",
  "test.answerHelp.nameMode.scientific": "Vetenskapliga namn accepteras.",
  "test.answerHelp.nameMode.vernacular": "Vardagliga namn accepteras.",
  "test.answerHelp.nameMode.either":
    "Vetenskapliga eller vardagliga namn accepteras.",
  "test.answerInput.label": "Svar",
  "test.answerInput.placeholder": "Skriv ditt svar",
  "test.answerInput.submit": "Skicka svar",
  "test.answerInput.correct": "Rätt!",
  "test.answerInput.correctAnswerPrefix": "Rätt svar:",
  "test.answerInput.closeGuess":
    "Nära! Kontrollera stavningen och försök igen.",
  "test.settings.start": "Starta",
  "test.multipleChoice.eliminateHalf": "Ta bort 50 %",
  "test.multipleChoice.eliminateHalfUsed": "50/50 använd",
  "test.multipleChoice.eliminated": "Borttagen",
  "test.scope.short.species": "art",
  "test.scope.short.genus": "släkte",
  "test.scope.short.family": "familj",
  "test.nameMode.short.scientific": "vetenskapliga",
  "test.nameMode.short.vernacular": "vardagliga",
  "test.nameMode.short.either": "vetenskapliga eller vardagliga",
  "test.species.prompt": "Identifiera {scope} i bilden med {nameMode} namn.",
  "test.species.expectedFamiliarity": "Förväntad igenkänning",
  "test.species.familiarityPercent": "{percent} %",
  "test.species.noFamiliarityData": "Ingen bekantskapsdata ännu",
  "test.species.imageAlt": "Art att identifiera",
  "test.species.noImage": "Ingen bild tillgänglig",
  "test.progress.settings": "Testinställningar",
  "test.progress.completed": "Klart",
  "test.progress.question": "Fråga {current} av {total}",
  "test.progress.untilCorrect": "Rätt en gång: {correct} av {total}",
  "test.navigation.nextQuestion": "Nästa fråga",
  "test.navigation.finishTest": "Avsluta test",
  "test.validation.needsTwoSpecies":
    "Den här stacken behöver minst 2 arter med testbilder.",
  "test.validation.browseOtherStacks": "Bläddra bland andra stackar",
  "test.fallback.stackName": "Test",
  "test.fallback.loadingGroup": "Laddar",

  "learning.histogram.mastered": "Behärskad",
  "learning.histogram.strengthening": "Stärks",
  "learning.histogram.learning": "Lärs in",
  "learning.histogram.new": "Ny",
  "learning.histogram.label.species": "Art",
  "learning.histogram.label.genus": "Släkte",
  "learning.histogram.label.family": "Familj",
  "learning.histogram.barTitle":
    "{label}: Ny {newPercent}%, Lärs in {learningPercent}%, Stärks {strengtheningPercent}%, Behärskad {masteredPercent}%",

  "test.completed.title": "Testet är klart!",
  "test.completed.scoreLine":
    "Du fick {correctAnswers} av {totalQuestions} rätt",
  "test.completed.scoreLine.untilCorrect":
    "Du svarade rätt på alla {totalQuestions} valda frågor på {attempts} försök",
  "test.completed.stackStatus": "Stackens inlärningsstatus",
  "test.completed.takeAgain": "Gör testet igen",
  "test.completed.studyCards": "Studera kort",
  "test.completed.backToStacks": "Tillbaka till alla stackar",
};

const MESSAGES: Record<LanguagePreference, TranslationTable> = {
  EN: EN_MESSAGES,
  FI: FI_MESSAGES,
  SV: SV_MESSAGES,
};

function formatMessage(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template,
  );
}

/** Access translated UI text for the active language preference. */
export function useI18n() {
  const { language } = useLanguagePreference();

  const t: Translate = useCallback(
    (key: TranslationKey, params?: TranslationParams) => {
      const message = MESSAGES[language][key] ?? EN_MESSAGES[key];
      return formatMessage(message, params);
    },
    [language],
  );

  return useMemo(
    () => ({
      language,
      t,
    }),
    [language, t],
  );
}
