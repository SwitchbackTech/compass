/*
describe("[OLD] assignEventToRow - By Comparison", () => {
  it("doesnt fit when row full: 2022-23", () => {
    const rows = {
      0: [["2022-12-01", "2023-02-02"]],
    };
    const eventThatDoesntFit = {
      startDate: "2022-12-15",
      endDate: "2022-01-02",
    };
    const fitResult = assignEventToRowByComparison(eventThatDoesntFit, rows);
    expect(fitResult.fits).toBe(false);
  });
  it("fits event in row 2: mar13-19", () => {
    //   ++++ = event being tested
    //   r = row number

    //   r | 13  14  15  16  17  18  19
    //   4 | <------------------------>
    //   3 |    ----------
    //   2 |    --   ++++++
    //   1 |    ----------
    //   0 |    --  --  -- --

    const rows = {
      0: [
        ["2022-01-14", "2022-03-15"],
        ["2022-03-17", "2022-03-18"],
        ["2022-03-16", "2022-03-17"],
        ["2022-03-15", "2022-03-16"],
      ],
      1: [["2022-03-14", "2022-03-17"]],
      2: ["2022-03-14", "2022-03-15"],
      3: ["2022-03-14", "2022-03-17"],
      4: ["2022-01-01", "2022-03-22"],
    };
    const eventThatFits = {
      startDate: "2022-03-15",
      endDate: "2022-03-17",
    };
    const fitResult = assignEventToRowByComparison(eventThatFits, rows);
    expect(fitResult.fits).toBe(true);
    expect(fitResult.rowNum).toBe(2);
  });

  it("[OLD] tbd", () => {
    //   ++++ = event being tested
    //   r = row number
  
    //   r | 13  14  15  16  17  18  19  
    //   6 |     ++  ------
    //   5 |     ----------
    //   4 | --------------
    //   3 |     --  --  --  -- 
    //   2 |     ----------------------> 
    //   1 | ------ ----------    
    const rows = {
      1: [
        ["2022-03-13", "2022-03-15"],
        ["2022-03-15", "2022-03-18"],
        ["2022-03-14", "2022-03-22"],
      ],
      2: [
        ["2022-03-17", "2022-03-18"],
        ["2022-03-16", "2022-03-17"],
        ["2022-03-15", "2022-03-16"],
        ["2022-03-13", "2022-03-17"],
        ["2022-03-14", "2022-03-15"],
      ],
      3: [["2022-03-14", "2022-03-17"]],
      4: [["2022-03-15", "2022-03-17"]],
    };
    const fitResult = assignEventToRowByComparison(
      { startDate: "2022-03-14", endDate: "2022-03-15" },
      rows
    );
    expect(fitResult.fits).toBe(false);
    // expect(fitResult.rowNum).toBe(6);
  });
});
*/
