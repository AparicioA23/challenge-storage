export interface UserFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: string;
  documentNumber: string;
  country: string;
}

export type UserFormField = keyof UserFormValues;
