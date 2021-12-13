export const daysFromNowTimestamp =(numDays: number, format: string) => {
    if (format === "ms") {
        const MS_IN_DAY = 86400000
        const msToAdd = numDays * MS_IN_DAY
        const daysFromNow = Date.now() + msToAdd
        return daysFromNow
    }
}