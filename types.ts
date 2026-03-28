
export enum ShootMode {
  ECOMMERCE = 'ECOMMERCE',
  CREATIVE = 'CREATIVE',
  LIFESTYLE = 'LIFESTYLE'
}

export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16'
}

export enum OutputMode {
  IMAGE = 'IMAGE',
  PROMPT = 'PROMPT'
}

export enum Tier {
  FREE = 'free',
  PRO = 'pro'
}

export interface GeneratedImage {
  id: string;
  userId: string;
  url: string;
  mode: ShootMode | 'EDITED';
  createdAt: number;
  expiresAt: number;
  prompt: string;
  originalPrompt?: string;
}

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  contactNumber: string;
  tier: Tier;
  role: 'user' | 'admin';
  credits: number;
  createdAt: number;
  totalImagesGenerated: number;
  subscriptionExpiresAt?: number;
}

export interface AppConfig {
  geminiApiKey: string;
  paymentQrCode: string;
  bankDetails: string;
}

export enum RequestType {
  PRO_UPGRADE = 'PRO_UPGRADE',
  CREDIT_PURCHASE = 'CREDIT_PURCHASE'
}

export interface ProRequest {
  id: string;
  userId: string;
  email: string;
  screenshotUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  type: RequestType;
  creditsToGrant?: number;
}
