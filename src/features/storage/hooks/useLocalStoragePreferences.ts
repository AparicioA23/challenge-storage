import { useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LANGUAGES, THEMES, type Language, type Theme } from '../types/preference';
import { THEME_KEY, LANGUAGE_KEY, DEFAULT_THEME, DEFAULT_LANGUAGE } from '../const/preference';
import type { StorageManagerContext } from './useStorageManager';

const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);
const isLanguage = (value: unknown): value is Language => LANGUAGES.includes(value as Language);

const useLocalStoragePreferences = () => {
  const { snapshots, setItem, isLoading } = useOutletContext<StorageManagerContext>();

  const storedTheme = snapshots.localStorage[THEME_KEY];
  const storedLanguage = snapshots.localStorage[LANGUAGE_KEY];

  const theme = isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
  const language = isLanguage(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;

  const onChangeTheme = useCallback((value: Theme) => {
    void setItem(THEME_KEY, value);
  }, [setItem]);

  const onChangeLanguage = useCallback((value: Language) => {
    void setItem(LANGUAGE_KEY, value);
  }, [setItem]);

  return { theme, onChangeTheme, language, onChangeLanguage, disabled: isLoading };
};

export default useLocalStoragePreferences;
