export interface ApiError {
  code: string;
}

export interface SortOptions {
  sortBy: string;
  order: 'asc' | 'desc';
}

export interface PaginationFilters {
  offset?: number;
  page?: number;
  pageSize: number;
}

export type FilterSortOptions = PaginationFilters & SortOptions;

export interface HttpPaginatedSuccessResponse<Data> extends PaginationFilters {
  data: Data;
  count: number;
  [key: string]: unknown | undefined;
}
