export type Colors = {
  [key in ColorNames]: string;
};

export type ColorName = keyof typeof ColorNames;

export enum ColorNames {
  BLUE_1 = "blue_1",
  BLUE_2 = "blue_2",
  BLUE_3 = "blue_3",
  BLUE_4 = "blue_4",
  BLUE_5 = "blue_5",
  BLUE_6 = "blue_6",
  BLUE_7 = "blue_7",
  BLUE_8 = "blue_8",

  GREY_1 = "grey_1",
  GREY_2 = "grey_2",
  GREY_3 = "grey_3",
  GREY_4 = "grey_4",
  GREY_5 = "grey_5",
  GREY_6 = "grey_6",

  TEAL_1 = "teal_1",
  TEAL_2 = "teal_2",
  TEAL_3 = "teal_3",
  TEAL_4 = "teal_4",
  TEAL_5 = "teal_5",

  WHITE_1 = "white_1",
  WHITE_2 = "white_2",
  WHITE_3 = "white_3",
  WHITE_4 = "white_4",
  WHITE_5 = "white_5",

  YELLOW_1 = "yellow_1",
  YELLOW_2 = "yellow_2",
  YELLOW_3 = "yellow_3",
  YELLOW_4 = "yellow_4",
  YELLOW_5 = "yellow_5",
}

export enum InvertedColorNames {
  BLUE_3 = "blue_3",
  GREY_3 = "grey_3",
  GREY_4 = "grey_4",
  TEAL_2 = "teal_2",
  WHITE_1 = "white_1",
}
