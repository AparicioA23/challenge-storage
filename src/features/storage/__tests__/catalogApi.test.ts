import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HttpCatalogApi } from "../services/catalogApi";
import type { CatalogProduct } from "../types/catalog";

const BASE_URL = "http://catalog.test";

const BOOK: CatalogProduct = {
  id: "books-1",
  sku: "LIB-00001",
  name: "Novela ilustrada 1",
  category: "books",
  brand: "Prisma",
  price: 45000,
  stock: 12,
  rating: 4.5,
  tags: ["ficción"],
  description: "Novela de prueba.",
  createdAt: "2024-03-01T00:00:00.000Z",
};

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("HttpCatalogApi", () => {
  const fetchMock = vi.fn();
  let api: HttpCatalogApi;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    api = new HttpCatalogApi(`${BASE_URL}/`);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("should request the category from the backend bypassing the browser HTTP cache", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      jsonResponse(200, { category: "books", total: 1, products: [BOOK] })
    );
    const controller = new AbortController();

    // Act
    const products = await api.getProductsByCategory(
      "books",
      controller.signal
    );

    // Assert
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/api/catalog/products?category=books`);
    expect(init).toMatchObject({
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    expect(products).toEqual([BOOK]);
  });

  it("should reject with an http error when the backend answers with an error status", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      jsonResponse(400, { type: "/problems/validation-error", status: 400 })
    );

    // Act
    const request = api.getProductsByCategory("books");

    // Assert
    await expect(request).rejects.toMatchObject({ reason: "http" });
  });

  it("should reject with an unexpected-response error when the body breaks the contract", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, { products: "nope" }));

    // Act
    const request = api.getProductsByCategory("books");

    // Assert
    await expect(request).rejects.toMatchObject({
      reason: "unexpected-response",
    });
  });

  it("should reject with a network error when the backend is unreachable", async () => {
    // Arrange
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    // Act
    const request = api.getProductsByCategory("books");

    // Assert
    await expect(request).rejects.toMatchObject({ reason: "network" });
  });

  it("should propagate the abort error when the request is cancelled", async () => {
    // Arrange
    fetchMock.mockRejectedValue(
      new DOMException("The operation was aborted.", "AbortError")
    );

    // Act
    const request = api.getProductsByCategory("books");

    // Assert
    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
});
