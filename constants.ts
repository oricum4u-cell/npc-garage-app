
import { EstimateStatus, LoyaltyTier, LoyaltyConfig, OrderStatus } from './types.ts';

export const STATUS_COLORS: Record<EstimateStatus, string> = {
    [EstimateStatus.DRAFT]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    [EstimateStatus.AWAITING_PAYMENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    [EstimateStatus.COMPLETED]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
    [OrderStatus.PLACED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    [OrderStatus.SHIPPED]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    [OrderStatus.RECEIVED]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    [OrderStatus.CANCELLED]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};


export const INITIAL_LOYALTY_CONFIG: LoyaltyConfig = {
    POINTS_PER_RON: 0.1, // 1 point for every 10 RON
    TIERS: {
        [LoyaltyTier.BRONZE]: {
            points: 250,
            laborDiscount: 0.05, // 5%
            partsDiscount: 0,
        },
        [LoyaltyTier.SILVER]: {
            points: 500,
            laborDiscount: 0.10, // 10%
            partsDiscount: 0.02, // 2%
        },
        [LoyaltyTier.GOLD]: {
            points: 1500,
            laborDiscount: 0.15, // 15%
            partsDiscount: 0.05, // 5%
        },
        [LoyaltyTier.PLATINUM]: {
            points: 3000,
            laborDiscount: 0.20, // 20%
            partsDiscount: 0.07, // 7%
        },
        [LoyaltyTier.VETERAN]: {
            points: 5000,
            laborDiscount: 0.25, // 25%
            partsDiscount: 0.10, // 10%
        },
        [LoyaltyTier.STAFF]: {
            points: 999999, // Effectively impossible to reach via points
            laborDiscount: 1.0, // 100%
            partsDiscount: 0.15, // 15%
        },
    },
};