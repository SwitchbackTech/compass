import { LocalStorage } from "@web/common/constants/web.constants";

export const headers = (token?: string) => {
  if (token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  } else {
    return {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(LocalStorage.TOKEN)}`,
      },
    };
  }
};

export const roundByNumber = (number: number, roundBy: number): number =>
  Math.ceil(number / roundBy) * roundBy;
