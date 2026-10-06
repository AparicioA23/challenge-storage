import React, { useCallback } from "react";
import Select, { SelectOption } from "@shared/components/UI/Select";
import { Language, Theme } from "@/features/storage/types/preference";
import {
  LANGUAGE_OPTIONS,
  THEME_OPTIONS,
} from "@/features/storage/const/preference";
import useLocalStoragePreferences from "@/features/storage/hooks/useLocalStoragePreferences";

const LocalStorageSection = () => {
  const { theme, onChangeTheme, language, onChangeLanguage, disabled } =
    useLocalStoragePreferences();

  const handleThemeChange = useCallback(
    (value: string) => {
      if (value) {
        console.log("Theme changed to:", value);
        onChangeTheme(value as Theme);
      }
    },
    [onChangeTheme]
  );

  const handleLanguageChange = useCallback(
    (value: string) => {
      if (value) onChangeLanguage(value as Language);
    },
    [onChangeLanguage]
  );

  return (
    <section
      className="local-storage-section"
      aria-labelledby="local-storage-section-title"
    >
      <h2
        id="local-storage-section-title"
        className="local-storage-section__title"
      >
        Preferencias
      </h2>
      <div className="local-storage-section__fields">
        <Select
          label="Tema"
          options={THEME_OPTIONS}
          value={theme}
          onChange={handleThemeChange}
          disabled={disabled}
        />
        <Select
          label="Idioma"
          options={LANGUAGE_OPTIONS}
          value={language}
          onChange={handleLanguageChange}
          disabled={disabled}
        />
      </div>
    </section>
  );
};

export default React.memo(LocalStorageSection);
