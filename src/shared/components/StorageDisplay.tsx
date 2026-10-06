import React from 'react';
import { StorageData, StorageType } from '@features/storage/types/storageTypes';

interface StorageDisplayProps {
  localStorageData: StorageData;
  sessionStorageData: StorageData;
  cookieData: StorageData;
  indexedDBData: StorageData;
  activeStorage: StorageType;
  onSelectStorage: (type: StorageType) => void;
  isLoading?: boolean;
  error?: string | null;
}

interface StorageCardProps {
  title: string;
  type: StorageType;
  data: StorageData;
  isActive: boolean;
  itemCount: number;
  onSelect: (type: StorageType) => void;
}

const StorageCard: React.FC<StorageCardProps> = ({
  title,
  type,
  data,
  isActive,
  itemCount,
  onSelect
}) => {
  const handleClick = () => {
    onSelect(type);
  };

  const dataKeys = Object.keys(data);
  const hasData = dataKeys.length > 0;

  return (
    <div
      className={`storage-card ${isActive ? 'active' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-pressed={isActive}
      aria-label={`Almacenamiento ${title}`}
    >
      <div className="storage-card-header">
        <h3 className="storage-card-title">{title}</h3>
        <span className="storage-badge" aria-label={`${itemCount} elementos`}>
          {itemCount}
        </span>
      </div>
      <div className="storage-card-body">
        {hasData ? (
          <ul className="storage-list" aria-label="Claves almacenadas">
            {dataKeys.slice(0, 5).map((key) => (
              <li key={key} className="storage-item">
                <span className="storage-key">{key}</span>
                <span className="storage-value">
                  {typeof data[key] === 'string' && data[key].length > 20
                    ? `${data[key].substring(0, 20)}...`
                    : String(data[key])}
                </span>
              </li>
            ))}
            {dataKeys.length > 5 && (
              <li className="storage-more">
                +{dataKeys.length - 5} más
              </li>
            )}
          </ul>
        ) : (
          <p className="storage-empty">Sin datos</p>
        )}
      </div>
      <div className="storage-card-footer">
        <span className={`status-indicator ${hasData ? 'has-data' : 'empty'}`}>
          {hasData ? 'Datos guardados' : 'Vacío'}
        </span>
      </div>
    </div>
  );
};

const StorageDisplay: React.FC<StorageDisplayProps> = ({
  localStorageData,
  sessionStorageData,
  cookieData,
  indexedDBData,
  activeStorage,
  onSelectStorage,
  isLoading = false,
  error = null
}) => {
  const storageTypes = [
    { type: 'localStorage' as StorageType, title: 'Local Storage', data: localStorageData },
    { type: 'sessionStorage' as StorageType, title: 'Session Storage', data: sessionStorageData },
    { type: 'cookie' as StorageType, title: 'Cookies', data: cookieData },
    { type: 'indexedDB' as StorageType, title: 'IndexedDB', data: indexedDBData }
  ];

  const getItemCount = (data: StorageData): number => {
    return Object.keys(data).length;
  };

  if (isLoading) {
    return (
      <div className="storage-display loading" role="status" aria-live="polite">
        <div className="loading-spinner" aria-label="Cargando datos de almacenamiento"></div>
        <p>Cargando datos de almacenamiento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="storage-display error" role="alert">
        <p className="error-message">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="storage-display" role="region" aria-label="Visualización de almacenamiento">
      <h2 className="storage-display-title">Almacenamiento del Navegador</h2>
      <div className="storage-grid" role="list" aria-label="Tipos de almacenamiento disponibles">
        {storageTypes.map(({ type, title, data }) => (
          <StorageCard
            key={type}
            title={title}
            type={type}
            data={data}
            isActive={activeStorage === type}
            itemCount={getItemCount(data)}
            onSelect={onSelectStorage}
          />
        ))}
      </div>
      <div className="storage-info" aria-live="polite">
        <p>
          Almacenamiento activo: <strong>{storageTypes.find(s => s.type === activeStorage)?.title}</strong>
        </p>
      </div>
    </div>
  );
};

export default StorageDisplay;