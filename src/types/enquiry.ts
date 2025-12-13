/**
 * Enquiry Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the Enquiry module.
 */

export type EnquiryStatus = 'new' | 'won' | 'lost';
export type EnquiryPriority = 'low' | 'medium' | 'high' | 'urgent';
export type EnquirySource = 'website' | 'email' | 'phone' | 'trade_show' | 'referral' | 'other';

export interface EnquiryItem {
    id: string;
    enquiry_id: string;
    product_name: string;
    sku_code?: string;
    description?: string;
    quantity: number;
    unit: string;
    unit_price?: number;
    total_price?: number;
    notes?: string;
    created_at: string;
}

export interface Enquiry {
    id: string;
    company_id: string;
    enquiry_number: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    customer_company?: string;
    customer_country?: string;
    source: EnquirySource;
    subject: string;
    description?: string;
    priority: EnquiryPriority;
    status: EnquiryStatus;
    assigned_to?: string;
    next_follow_up_date?: string;
    lost_reason?: string;
    created_at: string;
    updated_at: string;
    version?: number;
    parent_enquiry_id?: string;
    enquiry_items?: EnquiryItem[];
    entities?: any;
    quotes?: any[]; // Related quotes for lineage
}

export interface EnquiryViewProps {
    enquiry: Enquiry;
    onRefresh?: () => void;
}
