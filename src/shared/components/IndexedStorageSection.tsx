import React from "react";
import Select from "@shared/components/UI/Select";
import Button from "@shared/components/UI/Button";
import useCatalogQuery from "@/features/storage/hooks/useCatalogQuery";
import {
  CATALOG_CATEGORY_LABELS,
  CATALOG_CATEGORY_OPTIONS,
} from "@/features/storage/const/catalog";
import { formatPrice } from "@/features/storage/services/catalogHelpers";
import type {
  CatalogProduct,
  CatalogQueryResult,
} from "@/features/storage/types/catalog";

const SOURCE_LABELS: Record<CatalogQueryResult["source"], string> = {
  cache: "Caché IndexedDB",
  service: "Servicio",
};

interface CatalogSummaryProps {
  result: CatalogQueryResult;
  payloadSizeKb: number;
}

const CatalogSummary = React.memo(function CatalogSummary({
  result,
  payloadSizeKb,
}: CatalogSummaryProps) {
  return (
    <dl className="indexed-storage-section__summary">
      <div>
        <dt>Categoría</dt>
        <dd>{CATALOG_CATEGORY_LABELS[result.category]}</dd>
      </div>
      <div>
        <dt>Origen</dt>
        <dd className={`indexed-storage-section__source--${result.source}`}>
          {SOURCE_LABELS[result.source]}
        </dd>
      </div>
      <div>
        <dt>Productos</dt>
        <dd>{result.products.length}</dd>
      </div>
      <div>
        <dt>Tamaño</dt>
        <dd>{payloadSizeKb} KB</dd>
      </div>
      <div>
        <dt>Tiempo</dt>
        <dd>{result.elapsedMs} ms</dd>
      </div>
    </dl>
  );
});

interface CatalogPreviewTableProps {
  products: CatalogProduct[];
  total: number;
}

const CatalogPreviewTable = React.memo(function CatalogPreviewTable({
  products,
  total,
}: CatalogPreviewTableProps) {
  return (
    <div
      className="indexed-storage-section__table-wrapper"
      role="region"
      aria-label="Vista previa de productos"
      tabIndex={0}
    >
      <table className="indexed-storage-section__table">
        <caption>
          Mostrando {products.length} de {total} productos
        </caption>
        <thead>
          <tr>
            <th scope="col">SKU</th>
            <th scope="col">Producto</th>
            <th scope="col">Marca</th>
            <th scope="col">Precio</th>
            <th scope="col">Stock</th>
            <th scope="col">Rating</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.sku}</td>
              <td>{product.name}</td>
              <td>{product.brand}</td>
              <td>{formatPrice(product.price)}</td>
              <td>{product.stock}</td>
              <td>{product.rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

const IndexedStorageSection = () => {
  const {
    category,
    onChangeCategory,
    query,
    isQuerying,
    feedback,
    result,
    previewProducts,
    payloadSizeKb,
  } = useCatalogQuery();

  return (
    <section
      className="indexed-storage-section"
      aria-labelledby="indexed-storage-section-title"
      aria-busy={isQuerying}
    >
      <h2
        id="indexed-storage-section-title"
        className="indexed-storage-section__title"
      >
        Catálogo con caché en IndexedDB
      </h2>
      <div className="indexed-storage-section__controls">
        <Select
          label="Categoría"
          name="catalog-category"
          options={CATALOG_CATEGORY_OPTIONS}
          value={category}
          onChange={onChangeCategory}
          disabled={isQuerying}
        />
        <Button
          title={isQuerying ? "Consultando…" : "Consultar"}
          onClick={query}
          disabled={isQuerying}
        />
      </div>
      <p
        role="status"
        className={`indexed-storage-section__feedback indexed-storage-section__feedback--${feedback?.kind ?? "idle"}`}
      >
        {feedback?.text}
      </p>
      {result && (
        <>
          <CatalogSummary result={result} payloadSizeKb={payloadSizeKb} />
          <CatalogPreviewTable
            products={previewProducts}
            total={result.products.length}
          />
        </>
      )}
    </section>
  );
};

export default React.memo(IndexedStorageSection);
