export interface ChatAction {
    label: string;
    type: 'navigate' | 'link' | 'copy' | 'download_csv';
    value: string;
}

export interface Intent {
    id: string;
    patterns: RegExp[];
    responses: string[];
    actions?: ChatAction[];
}

export const TENURE_INTENTS: Intent[] = [
    {
        id: 'payment',
        patterns: [/pay.*rent/i, /pay.*bill/i, /due/i, /invoice/i, /payment/i],
        responses: [
            "You can manage your payments in the Payments section.",
            "Here's a link to your current dues."
        ],
        actions: [
            { label: 'Go to Payments', type: 'navigate', value: '/tenure/payments' },
            { label: 'View Latest Invoice', type: 'navigate', value: '/tenure/payments' }
        ]
    },
    {
        id: 'complaint',
        patterns: [/complaint/i, /issue/i, /broken/i, /not working/i, /fix/i],
        responses: [
            "Sorry to hear you're facing an issue. You can raise a complaint directly here.",
            "Let's get that fixed. Please file a complaint ticket."
        ],
        actions: [
            { label: 'Raise Complaint', type: 'navigate', value: '/tenure/complaints' }
        ]
    },
    {
        id: 'wifi',
        patterns: [/wifi/i, /internet/i, /password/i],
        responses: [
            "The Wifi Password is usually synced with your room details. Check the Room Info page.",
            "You can find network details in your Room Info."
        ],
        actions: [
            { label: 'View Room Info', type: 'navigate', value: '/tenure/room-info' }
        ]
    },
    {
        id: 'contact',
        patterns: [/call/i, /phone/i, /email/i, /contact/i, /admin/i, /owner/i],
        responses: [
            "You can find the Admin's contact details on your Dashboard Home.",
            "Need to talk? Here is the contact info."
        ],
        actions: [
            { label: 'Call Admin', type: 'navigate', value: '/' } // Actually just redirect to home where banner is
        ]
    },
    {
        id: 'nestid',
        patterns: [/nestid/i, /verify/i, /identity/i, /profile/i],
        responses: [
            "NestID helps secure your stay. Please ensure your identity is verified.",
            "You can check your verification status in your Profile."
        ],
        actions: [
            { label: 'My Profile', type: 'navigate', value: '/tenure/profile' }
        ]
    },
    {
        id: 'cleaning',
        patterns: [/clean/i, /dust/i, /garbage/i, /sweeping/i, /housekeeping/i],
        responses: [
            "Housekeeping rounds are usually in the morning. If you missed it, raise a request.",
            "Need a clean up? You can request housekeeping services."
        ],
        actions: [
            { label: 'Request Cleaning', type: 'navigate', value: '/tenure/complaints' }
        ]
    },
    {
        id: 'food',
        patterns: [/food/i, /hungry/i, /mess/i, /dinner/i, /lunch/i, /breakfast/i],
        responses: [
            "Hungry? The mess is serving delicious meals!",
            "Did you know? Today's special might be Biryani (or maybe Dal Chawal)."
        ] // No action, just chat
    },
    {
        id: 'joke',
        patterns: [/joke/i, /funny/i, /laugh/i],
        responses: [
            "Why did the developer go broke? Because he used up all his cache!",
            "I would tell you a UDP joke, but you might not get it.",
            "Why do programmers prefer dark mode? Because light attracts bugs!"
        ]
    },
    {
        id: 'features',
        patterns: [/what.*app/, /features/, /help/, /guide/],
        responses: [
            "Nestify is a complete Hostel Management System. You can manage Rooms, Tenants, Payments, and Complaints.",
            "I can help you with: 1. Tracking Revenue 2. Managing Occupancy 3. Resolving Complaints."
        ],
        actions: [
            { label: 'View Dashboard', type: 'navigate', value: '/admin' }
        ]
    },
    {
        id: 'how_to_add_room',
        patterns: [/add.*room/, /create.*room/, /new.*room/],
        responses: [
            "To add a room, go to the Rooms page and click 'Add Room'. You can specify capacity and amenities there."
        ],
        actions: [
            { label: 'Go to Rooms', type: 'navigate', value: '/admin/rooms' }
        ]
    },
    {
        id: 'how_to_bill',
        patterns: [/generate.*bill/, /invoice/, /billing support/],
        responses: [
            "You can generate monthly bills in the Payments section. We support auto-calculations for Rent and EB."
        ],
        actions: [
            { label: 'Go to Payments', type: 'navigate', value: '/admin/billing' }
        ]
    }
];

export const ADMIN_INTENTS: Intent[] = [
    {
        id: 'add_tenant',
        patterns: [/add.*tenant/i, /new.*tenant/i, /register/i, /onboard/i],
        responses: [
            "To add a new tenant, go to the Tenure Management page.",
            "You can register new occupants from the Tenure section."
        ],
        actions: [
            { label: 'Add Tenant', type: 'navigate', value: '/admin/tenures' }
        ]
    },
    {
        id: 'payments',
        patterns: [/payment/i, /dues/i, /collected/i, /finance/i],
        responses: [
            "You can track all incoming payments and platform dues in the Finance section.",
        ],
        actions: [
            { label: 'Billing Dashboard', type: 'navigate', value: '/admin/billing' }
        ]
    },
    {
        id: 'rooms',
        patterns: [/room/i, /vacant/i, /occupancy/i, /beds/i],
        responses: [
            "Manage your rooms and check occupancy status here.",
        ],
        actions: [
            { label: 'Room Manager', type: 'navigate', value: '/admin/rooms' }
        ]
    }
];
