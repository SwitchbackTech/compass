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
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    };
  }
};

export const roundByNumber = (number: number, roundBy: number): number =>
  Math.ceil(number / roundBy) * roundBy;
