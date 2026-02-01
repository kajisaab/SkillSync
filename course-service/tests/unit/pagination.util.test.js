/**
 * Unit Tests: Pagination Utility
 */

const {
  parsePaginationParams,
  calculatePaginationMeta,
  formatPaginatedResponse,
} = require('../../src/utils/pagination.util');

describe('Pagination Utility', () => {
  describe('parsePaginationParams', () => {
    it('should use default values when no query params provided', () => {
      const result = parsePaginationParams({});

      expect(result).toEqual({
        page: 1,
        limit: 10,
        offset: 0,
      });
    });

    it('should parse valid page and limit from query', () => {
      const query = { page: '2', limit: '20' };
      const result = parsePaginationParams(query);

      expect(result).toEqual({
        page: 2,
        limit: 20,
        offset: 20,
      });
    });

    it('should cap limit at maximum value', () => {
      const query = { page: '1', limit: '200' };
      const result = parsePaginationParams(query);

      expect(result.limit).toBe(100);
    });

    it('should use minimum value of 1 for page', () => {
      const query = { page: '0', limit: '10' };
      const result = parsePaginationParams(query);

      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    it('should use minimum value of 1 for limit', () => {
      const query = { page: '1', limit: '0' };
      const result = parsePaginationParams(query);

      expect(result.limit).toBe(1);
    });

    it('should handle invalid numeric values', () => {
      const query = { page: 'invalid', limit: 'test' };
      const result = parsePaginationParams(query);

      expect(result).toEqual({
        page: 1,
        limit: 10,
        offset: 0,
      });
    });

    it('should calculate correct offset', () => {
      const query = { page: '3', limit: '15' };
      const result = parsePaginationParams(query);

      expect(result.offset).toBe(30); // (3-1) * 15
    });
  });

  describe('calculatePaginationMeta', () => {
    it('should calculate correct metadata for first page', () => {
      const result = calculatePaginationMeta(50, 1, 10);

      expect(result).toEqual({
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 50,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });

    it('should calculate correct metadata for middle page', () => {
      const result = calculatePaginationMeta(50, 3, 10);

      expect(result).toEqual({
        currentPage: 3,
        itemsPerPage: 10,
        totalItems: 50,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('should calculate correct metadata for last page', () => {
      const result = calculatePaginationMeta(50, 5, 10);

      expect(result).toEqual({
        currentPage: 5,
        itemsPerPage: 10,
        totalItems: 50,
        totalPages: 5,
        hasNextPage: false,
        hasPrevPage: true,
      });
    });

    it('should handle partial last page', () => {
      const result = calculatePaginationMeta(47, 5, 10);

      expect(result).toEqual({
        currentPage: 5,
        itemsPerPage: 10,
        totalItems: 47,
        totalPages: 5,
        hasNextPage: false,
        hasPrevPage: true,
      });
    });

    it('should handle empty results', () => {
      const result = calculatePaginationMeta(0, 1, 10);

      expect(result).toEqual({
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('should handle single page of results', () => {
      const result = calculatePaginationMeta(5, 1, 10);

      expect(result).toEqual({
        currentPage: 1,
        itemsPerPage: 10,
        totalItems: 5,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });
  });

  describe('formatPaginatedResponse', () => {
    it('should format response with items and pagination metadata', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = formatPaginatedResponse(items, 30, 2, 10);

      expect(result).toEqual({
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
        pagination: {
          currentPage: 2,
          itemsPerPage: 10,
          totalItems: 30,
          totalPages: 3,
          hasNextPage: true,
          hasPrevPage: true,
        },
      });
    });

    it('should handle empty items array', () => {
      const result = formatPaginatedResponse([], 0, 1, 10);

      expect(result).toEqual({
        items: [],
        pagination: {
          currentPage: 1,
          itemsPerPage: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    });
  });
});
