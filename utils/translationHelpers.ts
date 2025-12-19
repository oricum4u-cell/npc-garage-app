import { EstimateStatus, PromotionType, UserRole, LoyaltyTier, ChecklistItemStatus, OrderStatus } from '../types.ts';

export const getStatusKey = (status: EstimateStatus) => `estimateStatus.${status}`;
export const getPromotionTypeKey = (type: PromotionType) => `promotionType.${type}`;
export const getUserRoleKey = (role: UserRole) => `userRole.${role}`;
export const getLoyaltyTierNameKey = (tier: LoyaltyTier) => `loyalty.tierName.${tier}`;
export const getChecklistItemStatusKey = (status: ChecklistItemStatus) => `checklistItemStatus.${status}`;
export const getOrderStatusKey = (status: OrderStatus) => `orderStatus.${status}`;