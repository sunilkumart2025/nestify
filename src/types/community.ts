export type PostType = 'event' | 'announcement' | 'poll';

export interface PollOption {
    id: string;
    option_text: string;
    vote_count: number;
}

export interface CommunityPost {
    id: string;
    admin_id: string;
    type: PostType;
    title: string;
    content?: string;
    event_date?: string;
    created_at: string;
    options?: PollOption[]; // For polls
    user_vote_id?: string; // If current user voted, this is the vote ID (or option ID)
}
