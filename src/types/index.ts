import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  points: number;
  phoneNumber?: string;
  createdAt: Timestamp;
  lastVisit?: Timestamp;
  lastQRCheckIn?: {
    timestamp: Timestamp;
    qrCode: string;
  };
  language?: 'en' | 'ja';
  role?: 'user' | 'admin';
  notifications?: {
    isEnabled: boolean;
    token?: string;
    lastUpdated?: Timestamp;
    preferences: {
      pointsUpdates: boolean;
      expiringRewards: boolean;
      specialOffers: boolean;
    };
  };
}

export interface Coupon {
  id: string;
  name: string;
  nameJa: string;
  description: string;
  descriptionJa: string;
  pointsCost: number;
  isActive: boolean;
  couponType: 'in_store' | 'online_delivery';
  imageUrl?: string;
}

// For backwards compatibility
export type Reward = Coupon;

export interface Redemption {
  id: string;
  userId: string;
  rewardId: string;
  rewardName: string;
  rewardNameJa: string;
  rewardDescription?: string;
  rewardType?: string;
  pointsCost?: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  used: boolean;
  imageUrl?: string;
  code?: string;
}

export interface OnlineOrderCode {
  code: string;
  isUsed: boolean;
  createdAt: Timestamp;
  usedAt?: Timestamp;
  userId?: string;
  pointsAwarded: number;
  expiresAt: Timestamp;
}

export interface PointsTransaction {
  id: string;
  userId: string;
  points: number; // Positive for credits, negative for debits
  type: 'in-store' | 'online-order' | 'reward-redemption' | 'admin-adjustment';
  createdAt: Timestamp;
  rewardId?: string;
  codeId?: string;
  adminId?: string;
  note?: string;
}

export type PointsHistoryEntry = {
  id: string;
  userId: string;
  points: number;
  type: 'earn' | 'redeem';
  source: 'in_store_visit' | 'delivery_order' | 'in_store_item' | 'in_store_discount' | 'direct_order_coupon' | 'admin_adjustment';
  timestamp: Timestamp;
  metadata?: any;
};

export type RestaurantInfo = {
  name: string;
  address: string;
  phone: string;
  website: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  openingHours: {
    [key: string]: {
      open: string;
      close: string;
    }[];
  };
};

export type ScanResult = {
  success: boolean;
  message: string;
  pointsAdded?: number;
  currentPoints?: number;
};

export type RedemptionResult = {
  redemptionId: string;
  expiresAt: Date;
  rewardName: string;
  rewardNameJa?: string;
  rewardDescription: string;
  pointsCost?: number;
  createdAt?: Date;
  code?: string;
  imageUrl?: string;
};

// Admin Types
export type DeliveryCoupon = {
  id: string;
  code: string;
  used: boolean;
  createdAt: Date;
  expiresAt: Date;
  usedBy?: string;
  usedAt?: Date;
};

export type DashboardStats = {
  totalUsers: number;
  activeUsers: number;
  totalRewards: number;
  totalRedemptions: number;
  pointsIssued: number;
  pointsRedeemed: number;
};
