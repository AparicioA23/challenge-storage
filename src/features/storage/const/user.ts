import type { SelectOption } from "@shared/components/UI/Select";
import type { UserFormField, UserFormValues } from "../types/user";

export const EMPTY_USER_FORM: UserFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  documentType: "",
  documentNumber: "",
  country: "",
};

export const USER_FORM_STORAGE_KEY = "userForm";
export const USER_FORM_FIELDS = Object.keys(EMPTY_USER_FORM) as UserFormField[];

export const DOCUMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "PA", label: "Pasaporte" },
];

export const COUNTRY_OPTIONS: SelectOption[] = [
  { value: "CO", label: "Colombia" },
  { value: "MX", label: "México" },
  { value: "PE", label: "Perú" },
  { value: "CL", label: "Chile" },
  { value: "AR", label: "Argentina" },
  { value: "ES", label: "España" },
];
