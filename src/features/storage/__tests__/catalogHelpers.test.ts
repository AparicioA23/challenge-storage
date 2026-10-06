import { describe, it, expect } from "vitest";
import {
  CatalogApiError,
  describeCatalogError,
  describeCatalogResult,
  isCatalogCategory,
  toCatalogProducts,
} from "../services/catalogHelpers";
import type { CatalogProduct } from "../types/catalog";

const buildBook = (position: number): CatalogProduct => ({
  id: `books-${position}`,
  sku: `LIB-0000${position}`,
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

const BOOKS = [buildBook(1), buildBook(2), buildBook(3)];

describe("catalogHelpers", () => {
  describe("isCatalogCategory", () => {
    it("should accept a known category", () => {
      // Arrange
      const value = "books";

      // Act
      const isValid = isCatalogCategory(value);

      // Assert
      expect(isValid).toBe(true);
    });

    it("should reject an inherited object key", () => {
      // Arrange
      const value = "toString";

      // Act
      const isValid = isCatalogCategory(value);

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe("toCatalogProducts", () => {
    it("should return the products when the body matches the contract", () => {
      // Arrange
      const body = { category: "books", total: 3, products: BOOKS };

      // Act
      const products = toCatalogProducts(body, "books");

      // Assert
      expect(products).toEqual(BOOKS);
    });

    it("should reject a body without a products list", () => {
      // Arrange
      const body = { category: "books", total: 0 };

      // Act
      const parse = () => toCatalogProducts(body, "books");

      // Assert
      expect(parse).toThrow(CatalogApiError);
    });

    it("should reject products with an invalid shape", () => {
      // Arrange
      const body = { products: [{ ...buildBook(1), price: "45000" }] };

      // Act
      const parse = () => toCatalogProducts(body, "books");

      // Assert
      expect(parse).toThrow(
        expect.objectContaining({ reason: "unexpected-response" })
      );
    });

    it("should reject products from a different category than the requested one", () => {
      // Arrange
      const body = { products: BOOKS };

      // Act
      const parse = () => toCatalogProducts(body, "clothing");

      // Assert
      expect(parse).toThrow(CatalogApiError);
    });
  });

  describe("describeCatalogError", () => {
    it("should explain that the backend is unreachable on network errors", () => {
      // Arrange
      const error = new CatalogApiError("network");

      // Act
      const feedback = describeCatalogError(error);

      // Assert
      expect(feedback).toEqual({
        kind: "error",
        text: "No fue posible conectar con el servicio del catálogo. Verifica que el backend esté corriendo.",
      });
    });

    it("should use a generic message for unknown errors without exposing details", () => {
      // Arrange
      const error = new Error("socket hang up at 10.0.0.1");

      // Act
      const feedback = describeCatalogError(error);

      // Assert
      expect(feedback.text).toBe(
        "No fue posible consultar el catálogo. Intenta de nuevo."
      );
    });
  });

  describe("describeCatalogResult", () => {
    it("should mention the IndexedDB cache when data comes from cache", () => {
      // Arrange
      const result = {
        category: "books" as const,
        products: BOOKS,
        source: "cache" as const,
        elapsedMs: 4,
      };

      // Act
      const feedback = describeCatalogResult(result);

      // Assert
      expect(feedback).toEqual({
        kind: "success",
        text: "3 productos de Libros recuperados desde la caché de IndexedDB.",
      });
    });

    it("should mention the service when data was fetched", () => {
      // Arrange
      const result = {
        category: "books" as const,
        products: BOOKS,
        source: "service" as const,
        elapsedMs: 1200,
      };

      // Act
      const feedback = describeCatalogResult(result);

      // Assert
      expect(feedback.text).toBe(
        "3 productos de Libros consultados al servicio y guardados en caché."
      );
    });
  });
});
