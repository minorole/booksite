import { type OrderStatus } from '@/lib/db/enums';
import { type LanguagePreference } from './context';

// Order domain types
export interface OrderBase {
  order_id: string;
  status: OrderStatus;
  tracking_number?: string;
  language_preference?: LanguagePreference;
}

export interface OrderUpdate extends OrderBase {
  admin_notes?: string;
  override_monthly?: boolean;
  processing_priority?: 'normal' | 'high' | 'urgent';
}
