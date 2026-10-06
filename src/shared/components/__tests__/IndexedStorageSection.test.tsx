import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import IndexedStorageSection from "../IndexedStorageSection";
import { catalogApi } from "@features/storage/services/catalogApi";
import { catalogCache } from "@features/storage/services/catalogCache";
import type { CatalogProduct } from "@features/storage/types/catalog";

vi.mock("@features/storage/services/catalogApi", () => ({
  catalogApi: { getProductsByCategory: vi.fn() },
}));

vi.mock("@features/storage/services/catalogCache", () => ({
  catalogCache: { getItem: vi.fn(), setItem: vi.fn() },
}));

const buildBook = (position: number): CatalogProduct => ({
  id: `books-${position}`,
  sku: `LIB-${String(position).padStart(5, "0")}`,
  name: `Novela ilustrada ${position}`,
  category: "books",
  brand: "Prisma",
  price: 45000,
  stock: 12,
  rating: 4.5,
  tags: ["ficción"],
  description: "Novela de prueba.",
  createdAt: "2024-03-01T00:00:00.000Z",
});

const BOOKS = Array.from({ length: 30 }, (_, index) => buildBook(index + 1));

const renderSection = () => {
  const context = { refresh: vi.fn().mockResolvedValue(undefined) };
  render(
    <MemoryRouter initialEntries={["/indexeddb"]}>
      <Routes>
        <Route path="/" element={<Outlet context={context} />}>
          <Route path="indexeddb" element={<IndexedStorageSection />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
  return context;
};

const queryCategory = (category: string) => {
  fireEvent.change(screen.getByLabelText("Categoría"), {
    target: { value: category },
  });
  fireEvent.click(screen.getByRole("button", { name: "Consultar" }));
};

describe("IndexedStorageSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(catalogCache.getItem).mockResolvedValue(null);
    vi.mocked(catalogCache.setItem).mockResolvedValue(undefined);
    vi.mocked(catalogApi.getProductsByCategory).mockResolvedValue(BOOKS);
  });

  it("should list the three catalog categories", () => {
    // Arrange
    renderSection();

    // Act
    const options = screen.getAllByRole("option");

    // Assert
    expect(options.map((option) => option.textContent)).toEqual([
      "Electrónica",
      "Libros",
      "Ropa",
    ]);
  });

  it("should query the service and cache the response when the category is not cached", async () => {
    // Arrange
    const context = renderSection();

    // Act
    queryCategory("books");

    // Assert
    expect(
      await screen.findByText(/consultados al servicio y guardados en caché/)
    ).toBeInTheDocument();
    expect(catalogApi.getProductsByCategory).toHaveBeenCalledWith(
      "books",
      expect.any(AbortSignal)
    );
    expect(catalogCache.setItem).toHaveBeenCalledWith("books", BOOKS);
    expect(context.refresh).toHaveBeenCalled();
  });

  it("should return the cached data without calling the service when the category is cached", async () => {
    // Arrange
    vi.mocked(catalogCache.getItem).mockResolvedValue(BOOKS);
    renderSection();

    // Act
    queryCategory("books");

    // Assert
    expect(
      await screen.findByText(/recuperados desde la caché de IndexedDB/)
    ).toBeInTheDocument();
    expect(catalogCache.getItem).toHaveBeenCalledWith("books");
    expect(catalogApi.getProductsByCategory).not.toHaveBeenCalled();
    expect(catalogCache.setItem).not.toHaveBeenCalled();
  });

  it("should show a preview of the products and the total amount received", async () => {
    // Arrange
    renderSection();

    // Act
    queryCategory("books");

    // Assert
    const table = await screen.findByRole("table");
    expect(table).toHaveTextContent("Mostrando 20 de 30 productos");
    expect(screen.getAllByRole("row")).toHaveLength(21);
  });

  it("should show an error message when the service fails", async () => {
    // Arrange
    vi.mocked(catalogApi.getProductsByCategory).mockRejectedValue(
      new Error("boom")
    );
    renderSection();

    // Act
    queryCategory("clothing");

    // Assert
    expect(
      await screen.findByText(
        "No fue posible consultar el catálogo. Intenta de nuevo."
      )
    ).toBeInTheDocument();
    expect(catalogCache.setItem).not.toHaveBeenCalled();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("should disable the query button while the request is in progress", async () => {
    // Arrange
    vi.mocked(catalogApi.getProductsByCategory).mockReturnValue(
      new Promise<CatalogProduct[]>(() => {})
    );
    renderSection();

    // Act
    queryCategory("electronics");

    // Assert
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Consultando…" })
      ).toBeDisabled()
    );
  });
});
