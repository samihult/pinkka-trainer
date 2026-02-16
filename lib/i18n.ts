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

  "home.title": "Learn Species",
  "home.subtitle": "Choose a stack to study with cards or take a test",
  "home.noLearningDataYet": "No learning data yet",
  "home.learn": "Learn",
  "home.takeTest": "Take Test",
  "home.noStacksInGroup": "No stacks available in this group yet",
  "home.noMaterialsTitle": "No learning materials available yet",
  "home.noMaterialsSubtitle":
    "Check back later or contact an editor to add content",

  "test.settings.title": "Test Settings",
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
  "test.settings.acceptedAnswer": "Accepted answer",
  "test.settings.answer.scientific": "Scientific name only",
  "test.settings.answer.vernacular": "Vernacular name only",
  "test.settings.answer.either": "Scientific or vernacular",
  "test.settings.answer.description":
    "Applies to both test modes; answers ignore case and extra spaces.",
  "test.settings.start": "Start ⏎",
  "test.multipleChoice.eliminateHalf": "Eliminate 50%",
  "test.multipleChoice.eliminateHalfUsed": "50/50 used",
  "test.multipleChoice.eliminated": "Eliminated",
  "test.species.prompt": "What species is shown in this image?",
  "test.species.expectedFamiliarity": "Expected familiarity",
  "test.species.familiarityPercent": "{percent}%",
  "test.species.noFamiliarityData": "No familiarity data yet",
  "test.species.imageAlt": "Species to identify",
  "test.species.noImage": "No image available",

  "learning.histogram.mastered": "Mastered",
  "learning.histogram.strengthening": "Strengthening",
  "learning.histogram.learning": "Learning",
  "learning.histogram.new": "New",
  "learning.histogram.label.scientific": "Scientific",
  "learning.histogram.label.vernacular": "Vernacular",
  "learning.histogram.label.either": "Scientific or vernacular",
  "learning.histogram.barTitle":
    "{label}: New {newPercent}%, Learning {learningPercent}%, Strengthening {strengtheningPercent}%, Mastered {masteredPercent}%",

  "test.completed.title": "Test Complete!",
  "test.completed.scoreLine":
    "You got {correctAnswers} out of {totalQuestions} correct",
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
  "auth.signIn.redirectingDescription":
    "Ohjataan Googlen kirjautumissivulle.",
  "auth.signIn.orEmail": "Tai kirjaudu sähköpostilla",
  "auth.signIn.submit": "Kirjaudu sisään",
  "auth.signIn.submitLoading": "Kirjaudutaan...",
  "auth.signIn.noAccount": "Eikö sinulla ole tiliä?",
  "auth.signIn.welcomeBackTitle": "Tervetuloa takaisin!",
  "auth.signIn.welcomeBackDescription": "Kirjautuminen onnistui.",
  "auth.signIn.failureDescription":
    "Kirjautuminen epäonnistui. Tarkista tunnuksesi.",
  "auth.signIn.googleWelcomeTitle": "Tervetuloa!",
  "auth.signIn.googleWelcomeDescription":
    "Google-kirjautuminen onnistui.",

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

  "home.title": "Opiskele lajeja",
  "home.subtitle": "Valitse pinkka kortteihin tai testiin",
  "home.noLearningDataYet": "Ei vielä oppimisdataa",
  "home.learn": "Opiskele",
  "home.takeTest": "Tee testi",
  "home.noStacksInGroup": "Tässä ryhmässä ei ole vielä pinkkoja",
  "home.noMaterialsTitle": "Oppimateriaalia ei ole vielä saatavilla",
  "home.noMaterialsSubtitle":
    "Tarkista myöhemmin tai pyydä toimittajaa lisäämään sisältöä",

  "test.settings.title": "Testin asetukset",
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
  "test.settings.acceptedAnswer": "Hyväksytty vastaus",
  "test.settings.answer.scientific": "Vain tieteellinen nimi",
  "test.settings.answer.vernacular": "Vain kansankielinen nimi",
  "test.settings.answer.either": "Tieteellinen tai kansankielinen",
  "test.settings.answer.description":
    "Koskee molempia testitapoja; kirjainkoko ja ylimääräiset välit ohitetaan.",
  "test.settings.start": "Aloita ⏎",
  "test.multipleChoice.eliminateHalf": "Poista 50 %",
  "test.multipleChoice.eliminateHalfUsed": "50/50 käytetty",
  "test.multipleChoice.eliminated": "Poistettu",
  "test.species.prompt": "Mikä laji kuvassa on?",
  "test.species.expectedFamiliarity": "Odotettu tuttuus",
  "test.species.familiarityPercent": "{percent} %",
  "test.species.noFamiliarityData": "Ei vielä tuttuusdataa",
  "test.species.imageAlt": "Tunnistettava laji",
  "test.species.noImage": "Kuvaa ei saatavilla",

  "learning.histogram.mastered": "Hallussa",
  "learning.histogram.strengthening": "Vahvistumassa",
  "learning.histogram.learning": "Opettelussa",
  "learning.histogram.new": "Uusi",
  "learning.histogram.label.scientific": "Tieteellinen",
  "learning.histogram.label.vernacular": "Kansankielinen",
  "learning.histogram.label.either": "Tieteellinen tai kansankielinen",
  "learning.histogram.barTitle":
    "{label}: Uusi {newPercent}%, Opettelussa {learningPercent}%, Vahvistumassa {strengtheningPercent}%, Hallussa {masteredPercent}%",

  "test.completed.title": "Testi valmis!",
  "test.completed.scoreLine":
    "Sait oikein {correctAnswers} / {totalQuestions}",
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
  "auth.signIn.googleWelcomeDescription":
    "Du har loggat in med Google.",

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

  "home.title": "Lär dig arter",
  "home.subtitle": "Välj en stack för kortstudier eller test",
  "home.noLearningDataYet": "Ingen lärdata ännu",
  "home.learn": "Lär",
  "home.takeTest": "Gör test",
  "home.noStacksInGroup": "Inga stackar finns i gruppen ännu",
  "home.noMaterialsTitle": "Inget läromaterial tillgängligt ännu",
  "home.noMaterialsSubtitle":
    "Kom tillbaka senare eller kontakta en redaktör för att lägga till innehåll",

  "test.settings.title": "Testinställningar",
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
  "test.settings.acceptedAnswer": "Godkänt svar",
  "test.settings.answer.scientific": "Endast vetenskapligt namn",
  "test.settings.answer.vernacular": "Endast vardagligt namn",
  "test.settings.answer.either": "Vetenskapligt eller vardagligt",
  "test.settings.answer.description":
    "Gäller båda testlägen; svar ignorerar versaler och extra mellanslag.",
  "test.settings.start": "Starta ⏎",
  "test.multipleChoice.eliminateHalf": "Ta bort 50 %",
  "test.multipleChoice.eliminateHalfUsed": "50/50 använd",
  "test.multipleChoice.eliminated": "Borttagen",
  "test.species.prompt": "Vilken art visas på bilden?",
  "test.species.expectedFamiliarity": "Förväntad igenkänning",
  "test.species.familiarityPercent": "{percent} %",
  "test.species.noFamiliarityData": "Ingen bekantskapsdata ännu",
  "test.species.imageAlt": "Art att identifiera",
  "test.species.noImage": "Ingen bild tillgänglig",

  "learning.histogram.mastered": "Behärskad",
  "learning.histogram.strengthening": "Stärks",
  "learning.histogram.learning": "Lärs in",
  "learning.histogram.new": "Ny",
  "learning.histogram.label.scientific": "Vetenskaplig",
  "learning.histogram.label.vernacular": "Vardaglig",
  "learning.histogram.label.either": "Vetenskaplig eller vardaglig",
  "learning.histogram.barTitle":
    "{label}: Ny {newPercent}%, Lärs in {learningPercent}%, Stärks {strengtheningPercent}%, Behärskad {masteredPercent}%",

  "test.completed.title": "Testet är klart!",
  "test.completed.scoreLine":
    "Du fick {correctAnswers} av {totalQuestions} rätt",
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

function formatMessage(
  template: string,
  params?: TranslationParams,
): string {
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
