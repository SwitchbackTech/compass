import Foundation

/// Mirrors `BILLING_PLAN` in `packages/core/src/constants/billing.constants.ts`.
public enum BillingPlanConstants {
    public static let trialLengthDays = 7

    public static let displayPriceAmountMinor: Double = 1200
    public static let displayPriceCurrency = "usd"
    public static let displayPriceInterval = "month"
}
