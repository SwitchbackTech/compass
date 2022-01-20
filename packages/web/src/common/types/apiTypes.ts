export interface ApiError {
  code: string;
}

export interface Options_Sort {
  sortBy: string;
  order: "asc" | "desc";
}

export interface Filters_Pagination {
  offset?: number;
  page?: number;
  pageSize: number;
}

export type Options_FilterSort = Filters_Pagination & Options_Sort;

export interface Response_HttpPaginatedSuccess<Data>
  extends Filters_Pagination {
  data: Data;
  count: number;
  [key: string]: unknown | undefined;
}
