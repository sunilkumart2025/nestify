export interface Admin {
    id: string;
    full_name: string;
    hostel_name: string;
    hostel_address: string;
    phone: string;
    stay_key: string;
}

export interface Room {
    id: string;
    admin_id: string;
    room_number: string;
    type: 'ac' | 'non-ac' | 'dormitory' | string;
    capacity: number;
    price: number;
    occupancy?: number;
    amenities?: string[];
    floor_number?: number;
}

export interface Tenure {
    id: string;
    admin_id: string;
    full_name: string;
    email: string;
    phone: string;
    room_id?: string;
    status: 'pending' | 'active' | 'inactive';
    created_at: string;
    room?: Room;
    unread_count?: number;
    trust_score?: number;
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
    due_date?: string;
    tenure?: Tenure;
    admin?: Admin; // Join result
}

export interface InvoiceItem {
    description: string;
    amount: number;
    type?: string;
}

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: string;
    is_read: boolean;
    created_at: string;
}
