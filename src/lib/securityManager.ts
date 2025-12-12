import { supabase } from '../lib/supabase';

interface RateLimitCheck {
    allowed: boolean;
    attemptsRemaining: number;
    unlockAt?: string;
    isPermanent?: boolean;
}

interface LoginAttemptResult {
    shouldLock: boolean;
    unlockAt?: string;
    attemptsRemaining: number;
}

export class SecurityManager {
    /**
     * Check if account is locked before attempting login
     */
    static async checkAccountLocked(email: string): Promise<RateLimitCheck> {
        try {
            const { data, error } = await supabase.rpc('check_account_locked', {
                p_email: email
            });

            if (error) throw error;

            return {
                allowed: !data.is_locked,
                attemptsRemaining: data.is_locked ? 0 : 999, // Will be calculated on attempt
                unlockAt: data.unlock_at,
                isPermanent: data.is_permanent
            };
        } catch (error) {
            console.error('Failed to check account lock:', error);
            // Fail open for availability
            return {
                allowed: true, attemptsRemaining

                    : 5
            };
        }
    }

    /**
     * Record login attempt (success or failure)
     */
    static async recordLoginAttempt(
        email: string,
        success: boolean,
        reason?: string
    ): Promise<LoginAttemptResult> {
        try {
            // Get client IP (best effort)
            const ipAddress = await this.getClientIP();
            const userAgent = navigator.userAgent;

            const { data, error } = await supabase.rpc('record_login_attempt', {
                p_email: email,
                p_ip_address: ipAddress,
                p_user_agent: userAgent,
                p_success: success,
                p_reason: reason
            });

            if (error) throw error;

            return {
                shouldLock: data.should_lock,
                unlockAt: data.unlock_at,
                attemptsRemaining: data.attempts_remaining
            };
        } catch (error) {
            console.error('Failed to record login attempt:', error);
            return { shouldLock: false, attemptsRemaining: 5 };
        }
    }

    /**
     * Get client IP address (best effort)
     */
    private static async getClientIP(): Promise<string> {
        try {
            // Use a public IP service
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip || 'unknown';
        } catch {
            return 'unknown';
        }
    }

    /**
     * Check generic rate limit for any resource
     */
    static async checkRateLimit(
        resourceType: 'payment' | 'invoice' | 'login',
        identifier: string
    ): Promise<RateLimitCheck> {
        try {
            const { data, error } = await supabase.rpc('check_rate_limit', {
                p_resource_type: resourceType,
                p_identifier: identifier
            });

            if (error) throw error;

            return {
                allowed: data.allowed,
                attemptsRemaining: data.max_attempts || 0
            };
        } catch (error) {
            console.error('Rate limit check failed:', error);
            return { allowed: true, attemptsRemaining: 999 };
        }
    }

    /**
     * Format time remaining for unlock
     */
    static formatUnlockTime(unlockAt: string): string {
        const now = new Date();
        const unlock = new Date(unlockAt);
        const diffMs = unlock.getTime() - now.getTime();
        const diffMins = Math.ceil(diffMs / 60000);

        if (diffMins < 1) return 'less than a minute';
        if (diffMins === 1) return '1 minute';
        if (diffMins < 60) return `${diffMins} minutes`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) return '1 hour';
        return `${diffHours} hours`;
    }
}

// Payment Key Encryption Manager
export class KeyVaultManager {
    /**
     * Store encrypted payment key
     */
    static async storeKey(
        keyType: 'razorpay_key' | 'razorpay_secret' | 'cashfree_app' | 'cashfree_secret',
        plainKey: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Get master password from environment (should be in Supabase Edge Function)
            const masterPassword = import.meta.env.VITE_VAULT_MASTER_KEY;

            const { data, error } = await supabase.rpc('store_encrypted_key', {
                p_admin_id: user.id,
                p_key_type: keyType,
                p_plain_key: plainKey,
                p_encryption_password: masterPassword
            });

            if (error) throw error;

            return data;
        } catch (error: any) {
            console.error('Failed to store key:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get decrypted key (use sparingly, log all access)
     */
    static async getKey(
        keyType: 'razorpay_key' | 'razorpay_secret' | 'cashfree_app' | 'cashfree_secret'
    ): Promise<string | null> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const masterPassword = import.meta.env.VITE_VAULT_MASTER_KEY;

            const { data, error } = await supabase.rpc('get_decrypted_key', {
                p_admin_id: user.id,
                p_key_type: keyType,
                p_encryption_password: masterPassword
            });

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Failed to decrypt key:', error);
            return null;
        }
    }

    /**
     * Check if keys need rotation
     */
    static async checkRotationStatus(): Promise<any[]> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await supabase.rpc('check_key_rotation_status', {
                p_admin_id: user.id
            });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Failed to check rotation status:', error);
            return [];
        }
    }
}
