import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GeneratedProductCatalog, generateProducts } from '../src/catalog/generatedProductCatalog.ts';

describe('generateProducts', () => {
  it('should generate the requested amount of products for the category', () => {
    // Arrange
    const count = 250;

    // Act
    const products = generateProducts('books', count);

    // Assert
    assert.equal(products.length, count);
    assert.ok(products.every((product) => product.category === 'books'));
  });

  it('should generate unique product ids', () => {
    // Arrange
    const count = 1000;

    // Act
    const products = generateProducts('electronics', count);

    // Assert
    assert.equal(new Set(products.map((product) => product.id)).size, count);
  });

  it('should return the same data for the same category', () => {
    // Arrange
    const first = generateProducts('clothing', 10);

    // Act
    const second = generateProducts('clothing', 10);

    // Assert
    assert.deepEqual(second, first);
  });

  it('should return different data for different categories', () => {
    // Arrange
    const books = generateProducts('books', 10);

    // Act
    const clothing = generateProducts('clothing', 10);

    // Assert
    assert.notDeepEqual(
      clothing.map((product) => product.name),
      books.map((product) => product.name)
    );
  });
});

describe('GeneratedProductCatalog', () => {
  it('should return the configured amount of products per category', () => {
    // Arrange
    const catalog = new GeneratedProductCatalog(40);

    // Act
    const products = catalog.listByCategory('electronics');

    // Assert
    assert.equal(products.length, 40);
  });

  it('should reuse the generated products on later requests', () => {
    // Arrange
    const catalog = new GeneratedProductCatalog(40);
    const first = catalog.listByCategory('books');

    // Act
    const second = catalog.listByCategory('books');

    // Assert
    assert.equal(second, first);
  });
});
