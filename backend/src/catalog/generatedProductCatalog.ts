import type { CatalogCategory, CatalogProduct, ProductCatalog } from './catalogTypes.ts';

interface CategoryVocabulary {
  label: string;
  skuPrefix: string;
  brands: string[];
  items: string[];
  qualifiers: string[];
  tags: string[];
  priceRange: [number, number];
}

type Random = () => number;

const VOCABULARIES: Record<CatalogCategory, CategoryVocabulary> = {
  electronics: {
    label: 'electrónica',
    skuPrefix: 'ELE',
    brands: ['Voltix', 'Nexa', 'Orbitron', 'Lumen', 'Kairo', 'Synthia'],
    items: ['Audífonos', 'Monitor', 'Teclado', 'Router', 'Tablet', 'Parlante', 'Cámara', 'Smartwatch'],
    qualifiers: ['Pro', 'Max', 'Lite', 'Ultra', 'Air', 'Plus'],
    tags: ['inalámbrico', 'bluetooth', '4k', 'usb-c', 'gaming', 'oficina', 'portátil', 'eco'],
    priceRange: [90_000, 4_500_000],
  },
  books: {
    label: 'libros',
    skuPrefix: 'LIB',
    brands: ['Editorial Andina', 'Prisma', 'Letras del Sur', 'Ámbar', 'Norte Ediciones'],
    items: ['Novela', 'Ensayo', 'Manual', 'Antología', 'Biografía', 'Crónica', 'Guía', 'Poemario'],
    qualifiers: ['ilustrada', 'de bolsillo', 'tapa dura', 'edición aniversario', 'comentada', 'bilingüe'],
    tags: ['ficción', 'historia', 'tecnología', 'infantil', 'negocios', 'ciencia', 'arte', 'clásico'],
    priceRange: [25_000, 280_000],
  },
  clothing: {
    label: 'ropa',
    skuPrefix: 'ROP',
    brands: ['Tejido Vivo', 'Urbano', 'Montaña', 'Costa', 'Linaje', 'Atelier 9'],
    items: ['Camiseta', 'Chaqueta', 'Pantalón', 'Vestido', 'Buzo', 'Falda', 'Abrigo', 'Camisa'],
    qualifiers: ['slim', 'oversize', 'térmica', 'de lino', 'impermeable', 'básica'],
    tags: ['algodón', 'unisex', 'verano', 'invierno', 'deportivo', 'formal', 'reciclado', 'casual'],
    priceRange: [35_000, 650_000],
  },
};

const CATALOG_EPOCH_MS = Date.UTC(2024, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;
const TAGS_PER_PRODUCT = 3;
const MAX_STOCK = 500;
const MAX_AGE_DAYS = 600;

function hashText(text: string): number {
  return [...text].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0, 2166136261);
}

function createSeededRandom(seed: number): Random {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: Random, values: T[]): T {
  return values[Math.floor(random() * values.length)];
}

function randomBetween(random: Random, [min, max]: [number, number]): number {
  return Math.round(min + random() * (max - min));
}

function pickTags(random: Random, tags: string[]): string[] {
  return [...new Set(Array.from({ length: TAGS_PER_PRODUCT }, () => pick(random, tags)))];
}

function buildProduct(category: CatalogCategory, index: number, random: Random): CatalogProduct {
  const vocabulary = VOCABULARIES[category];
  const position = index + 1;
  const brand = pick(random, vocabulary.brands);
  const name = `${pick(random, vocabulary.items)} ${pick(random, vocabulary.qualifiers)} ${position}`;
  const tags = pickTags(random, vocabulary.tags);
  return {
    id: `${category}-${position}`,
    sku: `${vocabulary.skuPrefix}-${String(position).padStart(5, '0')}`,
    name,
    category,
    brand,
    price: randomBetween(random, vocabulary.priceRange),
    stock: randomBetween(random, [0, MAX_STOCK]),
    rating: Math.round((1 + random() * 4) * 10) / 10,
    tags,
    description: `${name} de ${brand}. Producto de la categoría ${vocabulary.label} pensado para uso ${tags.join(', ')}.`,
    createdAt: new Date(CATALOG_EPOCH_MS + randomBetween(random, [0, MAX_AGE_DAYS]) * DAY_MS).toISOString(),
  };
}

export function generateProducts(category: CatalogCategory, count: number): CatalogProduct[] {
  const random = createSeededRandom(hashText(category));
  return Array.from({ length: count }, (_, index) => buildProduct(category, index, random));
}

export class GeneratedProductCatalog implements ProductCatalog {
  readonly #productsPerCategory: number;
  readonly #productsByCategory = new Map<CatalogCategory, CatalogProduct[]>();

  constructor(productsPerCategory: number) {
    this.#productsPerCategory = productsPerCategory;
  }

  listByCategory(category: CatalogCategory): CatalogProduct[] {
    const cached = this.#productsByCategory.get(category);
    if (cached) {
      return cached;
    }
    const products = generateProducts(category, this.#productsPerCategory);
    this.#productsByCategory.set(category, products);
    return products;
  }
}
