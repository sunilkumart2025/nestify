export interface Admin {
    id: string;
    full_name: string;
    hostel_name: string;
    hostel_address: string;
    phone: string;
    stay_key: string;
    id: string;
    admin_id: string;
    full_name: string;
    email: string;
    phone: string;
    room_id?: string;
    status: 'pending' | 'active';
    created_at: string;
    room?: Room;
    unread_count?: number;
}

export interface Invoice {
    id: string;
    tenure_id: string;
    admin_id: string;
    month: string;
    year: number;
    status: 'pending' | 'paid' | 'cancelled';
    items: InvoiceItem[];
    subtotal: number;
    total_amount: number;
    created_at: string;
    due_date?: string; // Added for compatibility
    tenure?: Tenure;
}

export interface InvoiceItem {
    description: string;
    amount: number;
}
