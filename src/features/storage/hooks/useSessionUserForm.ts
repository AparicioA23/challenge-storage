import { useCallback, useMemo, useState } from "react";
import type { UserFormField, UserFormValues } from "../types/user";
import { EMPTY_USER_FORM, USER_FORM_FIELDS, USER_FORM_STORAGE_KEY } from "../const/user";
import { useOutletContext } from "react-router";
import { StorageManagerContext } from "./useStorageManager";

type FieldChangeHandlers = Record<UserFormField, (value: string) => void>;

const useSessionUserForm = () => {
  const { snapshots, setItem, isLoading } =
    useOutletContext<StorageManagerContext>();
  const storedUserData = snapshots.sessionStorage[USER_FORM_STORAGE_KEY];
  const userValues = storedUserData ? JSON.parse(storedUserData.toString()) : EMPTY_USER_FORM;

  const [userInfo, setUserInfo] = useState<UserFormValues>(userValues);

  const updateField = useCallback((field: UserFormField, value: string) => {
    setUserInfo((prev) => {
      const newUserData = { ...prev, [field]: value };
      return newUserData;
    });
  }, [userValues]);

  const updateStoredUserData = useCallback((newUserData: UserFormValues) => {
    setItem(USER_FORM_STORAGE_KEY, JSON.stringify(newUserData));
  }, [setItem]);

  const onChangeField = useMemo(
    () =>
      Object.fromEntries(
        USER_FORM_FIELDS.map((field) => [
          field,
          (value: string) => updateField(field, value),
        ])
      ) as FieldChangeHandlers,
    [updateField]
  );

  const resetForm = useCallback(() => {
    setUserInfo(EMPTY_USER_FORM);
    setItem(USER_FORM_STORAGE_KEY, JSON.stringify(EMPTY_USER_FORM));
  }, [setItem]);


    return { userValues: userInfo, onChangeField, resetForm, disabled: isLoading, updateStoredUserData };
  
};

export default useSessionUserForm;
