/**
 * Response Validation Helpers for E2E Tests
 *
 * These helpers validate the standardized API response format from Story 8.5-2
 */

/**
 * Validate Success Response Format
 * @param body - Response body
 * @param expectedStatus - Expected HTTP status code (default: 200)
 */
export const validateSuccessResponse = (body: any, expectedStatus = 200) => {
  expect(body).toHaveProperty('success', true);
  expect(body).toHaveProperty('status', expectedStatus);
  expect(body).toHaveProperty('data');
  expect(body).toHaveProperty('message');
  expect(typeof body.message).toBe('string');
};

/**
 * Validate Paginated Response Format
 * @param body - Response body
 * @param expectedStatus - Expected HTTP status code (default: 200)
 */
export const validatePaginatedResponse = (body: any, expectedStatus = 200) => {
  expect(body).toHaveProperty('success', true);
  expect(body).toHaveProperty('status', expectedStatus);
  expect(body).toHaveProperty('data');
  expect(Array.isArray(body.data)).toBe(true);
  expect(body).toHaveProperty('count');
  expect(typeof body.count).toBe('number');
  expect(body).toHaveProperty('message');
  expect(typeof body.message).toBe('string');
};

/**
 * Validate Error Response Format
 * @param body - Response body
 * @param expectedStatus - Expected HTTP status code
 */
export const validateErrorResponse = (body: any, expectedStatus: number) => {
  expect(body).toHaveProperty('success', false);
  expect(body).toHaveProperty('status', expectedStatus);
  expect(body).toHaveProperty('message');
  expect(typeof body.message).toBe('string');
};

/**
 * Validate Response with Pagination Metadata
 * @param body - Response body
 * @param expectedMeta - Expected metadata properties
 */
export const validatePaginationMeta = (
  body: any,
  expectedMeta?: {
    page?: number;
    limit?: number;
    totalPages?: number;
    totalCount?: number;
  },
) => {
  if (body.meta) {
    expect(body.meta).toHaveProperty('page');
    expect(body.meta).toHaveProperty('limit');

    if (expectedMeta) {
      if (expectedMeta.page !== undefined) {
        expect(body.meta.page).toBe(expectedMeta.page);
      }
      if (expectedMeta.limit !== undefined) {
        expect(body.meta.limit).toBe(expectedMeta.limit);
      }
      if (expectedMeta.totalPages !== undefined) {
        expect(body.meta.totalPages).toBe(expectedMeta.totalPages);
      }
      if (expectedMeta.totalCount !== undefined) {
        expect(body.meta.totalCount).toBe(expectedMeta.totalCount);
      }
    }
  }
};
