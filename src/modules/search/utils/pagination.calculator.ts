export class PaginationCalculator {
  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  static calculateTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }

  static validatePagination(page: number, limit: number): void {
    if (page < 1) {
      throw new Error('Page must be greater than 0');
    }
    
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }
  }
}