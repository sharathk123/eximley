export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            companies: {
                Row: {
                    id: string
                    name: string
                    address: string | null
                    gst: string | null
                    iec: string | null
                    logo_url: string | null
                    contact_email: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    address?: string | null
                    gst?: string | null
                    iec?: string | null
                    logo_url?: string | null
                    contact_email?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    address?: string | null
                    gst?: string | null
                    iec?: string | null
                    logo_url?: string | null
                    contact_email?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            company_users: {
                Row: {
                    id: string
                    company_id: string
                    user_id: string
                    role: 'admin' | 'executive' | 'viewer'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    user_id: string
                    role: 'admin' | 'executive' | 'viewer'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    user_id?: string
                    role?: 'admin' | 'executive' | 'viewer'
                    created_at?: string
                    updated_at?: string
                }
            }
            profiles: {
                Row: {
                    user_id: string
                    full_name: string | null
                    phone: string | null
                    avatar_url: string | null
                    job_title: string | null
                    timezone: string | null
                    last_login: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    full_name?: string | null
                    phone?: string | null
                    avatar_url?: string | null
                    job_title?: string | null
                    timezone?: string | null
                    last_login?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    full_name?: string | null
                    phone?: string | null
                    avatar_url?: string | null
                    job_title?: string | null
                    timezone?: string | null
                    last_login?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            shipments: {
                Row: {
                    id: string
                    company_id: string
                    created_by: string | null
                    type: 'import' | 'export' | null
                    status: string | null
                    buyer_name: string | null
                    supplier_name: string | null
                    reference_no: string | null
                    tracking_number: string | null
                    carrier: string | null
                    incoterm: string | null
                    incoterm_place: string | null
                    total_packages: number | null
                    total_weight: number | null
                    eta: string | null
                    etd: string | null
                    is_active: boolean | null
                    bl_number: string | null
                    bl_date: string | null
                    awb_number: string | null
                    awb_date: string | null
                    transport_mode: 'sea' | 'air' | 'road' | 'rail' | null
                    insurance_company: string | null
                    insurance_policy_number: string | null
                    insurance_value: number | null
                    insurance_currency: string | null
                    insurance_date: string | null
                    insurance_coverage_type: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    company_id: string
                    created_by?: string | null
                    type?: 'import' | 'export' | null
                    status?: string | null
                    buyer_name?: string | null
                    supplier_name?: string | null
                    reference_no?: string | null
                    tracking_number?: string | null
                    carrier?: string | null
                    incoterm?: string | null
                    incoterm_place?: string | null
                    total_packages?: number | null
                    total_weight?: number | null
                    eta?: string | null
                    etd?: string | null
                    is_active?: boolean | null
                    bl_number?: string | null
                    bl_date?: string | null
                    awb_number?: string | null
                    awb_date?: string | null
                    transport_mode?: 'sea' | 'air' | 'road' | 'rail' | null
                    insurance_company?: string | null
                    insurance_policy_number?: string | null
                    insurance_value?: number | null
                    insurance_currency?: string | null
                    insurance_date?: string | null
                    insurance_coverage_type?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    company_id?: string
                    created_by?: string | null
                    type?: 'import' | 'export' | null
                    status?: string | null
                    buyer_name?: string | null
                    supplier_name?: string | null
                    reference_no?: string | null
                    tracking_number?: string | null
                    carrier?: string | null
                    incoterm?: string | null
                    incoterm_place?: string | null
                    total_packages?: number | null
                    total_weight?: number | null
                    eta?: string | null
                    etd?: string | null
                    is_active?: boolean | null
                    bl_number?: string | null
                    bl_date?: string | null
                    awb_number?: string | null
                    awb_date?: string | null
                    transport_mode?: 'sea' | 'air' | 'road' | 'rail' | null
                    insurance_company?: string | null
                    insurance_policy_number?: string | null
                    insurance_value?: number | null
                    insurance_currency?: string | null
                    insurance_date?: string | null
                    insurance_coverage_type?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            proforma_invoices: {
                Row: {
                    id: string
                    company_id: string
                    invoice_number: string
                    invoice_date: string
                    status: string
                    buyer_name: string | null
                    total_amount: number | null
                    currency: string | null
                    created_at: string
                    updated_at: string
                    invoice_type: 'proforma' | 'commercial'
                    converted_to_commercial_at: string | null
                }
                Insert: {
                    id?: string
                    company_id: string
                    invoice_number: string
                    invoice_date: string
                    status?: string
                    buyer_name?: string | null
                    total_amount?: number | null
                    currency?: string | null
                    created_at?: string
                    updated_at?: string
                    invoice_type?: 'proforma' | 'commercial'
                    converted_to_commercial_at?: string | null
                }
                Update: {
                    id?: string
                    company_id?: string
                    invoice_number?: string
                    invoice_date?: string
                    status?: string
                    buyer_name?: string | null
                    total_amount?: number | null
                    currency?: string | null
                    created_at?: string
                    updated_at?: string
                    invoice_type?: 'proforma' | 'commercial'
                    converted_to_commercial_at?: string | null
                }
            }
        }
    }
}
