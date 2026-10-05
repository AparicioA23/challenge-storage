import type { SelectOption } from "@shared/components/UI/Select";
import { Language, Theme } from "../types/preference";

export const THEME_KEY = 'theme';
export const LANGUAGE_KEY = 'language';
export const DEFAULT_THEME: Theme = 'light';
export const DEFAULT_LANGUAGE: Language = 'es';

export const THEME_OPTIONS: SelectOption[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

export const LANGUAGE_OPTIONS: SelectOption[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
];


