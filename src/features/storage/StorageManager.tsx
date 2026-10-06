import React from "react";
import StorageDisplay from "@shared/components/StorageDisplay";
import {
  useStorageManager,
  type StorageManagerOptions,
} from "./hooks/useStorageManager";
import { Outlet } from "react-router-dom";

type StorageManagerProps = StorageManagerOptions;

export const StorageManager: React.FC<StorageManagerProps> = ({
  onError,
  onDataChange,
}) => {
  const manager = useStorageManager({ onError, onDataChange });
  const { activeStorage, snapshots, isLoading, error, switchStorage } = manager;

  return (
    <>
      <StorageDisplay
        localStorageData={snapshots.localStorage}
        sessionStorageData={snapshots.sessionStorage}
        cookieData={snapshots.cookie}
        indexedDBData={snapshots.indexedDB}
        activeStorage={activeStorage}
        onSelectStorage={switchStorage}
        isLoading={isLoading}
        error={error}
      />
      <Outlet context={manager} />
    </>
  );
};

export default StorageManager;

export type { StorageManagerProps };
