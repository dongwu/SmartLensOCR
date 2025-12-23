
export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface TextRegion {
  id: string;
  box: BoundingBox;
  order: number;
  description: string;
  extractedText?: string; 
  isActive: boolean;
}

export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  DETECTING_REGIONS = 'DETECTING_REGIONS',
  INTERACTING = 'INTERACTING',
  EXTRACTING = 'EXTRACTING',
  FINISHED = 'FINISHED'
}

export interface User {
  id: string;
  email: string;
  credits: number;
  isPro: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  credits: number;
  popular?: boolean;
}
