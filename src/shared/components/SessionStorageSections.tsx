import React from "react";
import TextField from "@shared/components/UI/TextField";
import Select from "@shared/components/UI/Select";
import Button from "@shared/components/UI/Button";
import {
  COUNTRY_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
} from "@/features/storage/const/user";
import useSessionUserForm from "@/features/storage/hooks/useSessionUserForm";

const SessionStorageSection = () => {
  const { userValues, onChangeField, resetForm, updateStoredUserData } =
    useSessionUserForm();

  return (
    <section
      className="session-storage-section"
      aria-labelledby="session-storage-section-title"
    >
      <h2
        id="session-storage-section-title"
        className="session-storage-section__title"
      >
        Datos de usuario
      </h2>
      <form className="session-storage-section__form" noValidate>
        <div className="session-storage-section__fields">
          <TextField
            label="Nombres"
            name="firstName"
            autoComplete="given-name"
            value={userValues.firstName}
            onChange={onChangeField.firstName}
          />
          <TextField
            label="Apellidos"
            name="lastName"
            autoComplete="family-name"
            value={userValues.lastName}
            onChange={onChangeField.lastName}
          />
          <TextField
            label="Correo electrónico"
            name="email"
            type="email"
            autoComplete="email"
            value={userValues.email}
            onChange={onChangeField.email}
          />
          <TextField
            label="Teléfono"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={userValues.phone}
            onChange={onChangeField.phone}
          />
          <Select
            label="Tipo de documento"
            name="documentType"
            placeholder="Selecciona un tipo"
            options={DOCUMENT_TYPE_OPTIONS}
            value={userValues.documentType}
            onChange={onChangeField.documentType}
          />
          <TextField
            label="Número de documento"
            name="documentNumber"
            inputMode="numeric"
            value={userValues.documentNumber}
            onChange={onChangeField.documentNumber}
          />
          <Select
            label="País"
            name="country"
            autoComplete="country"
            placeholder="Selecciona un país"
            options={COUNTRY_OPTIONS}
            value={userValues.country}
            onChange={onChangeField.country}
          />
        </div>
        <div className="session-storage-section__actions">
          <Button
            title="Guardar"
            onClick={() => updateStoredUserData(userValues)}
          />
          <Button title="Limpiar" onClick={resetForm} />
        </div>
      </form>
    </section>
  );
};

export default React.memo(SessionStorageSection);
