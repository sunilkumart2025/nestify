import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UAParser } from 'ua-parser-js';

export function useDeviceTracker() {
    useEffect(() => {
        const trackDevice = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            try {
                // 1. Get Device Info
                const parser = new UAParser();
                const result = parser.getResult();
                const deviceName = `${result.browser.name || 'Browser'} on ${result.os.name || 'OS'}`;

                // 2. Get IP (Client-side best effort)
                let ip = 'Unknown';
                try {
                    const ipRes = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipRes.json();
                    ip = ipData.ip;
                } catch (e) {
                    console.warn('Could not fetch IP', e);
                }

                // 3. Register securely
                await supabase.rpc('register_device_login', {
                    p_device_name: deviceName,
                    p_ip_address: ip,
                    p_location: 'Unknown' // Ideally use a GeoIP service here if available
                });

            } catch (error) {
                console.error('Device tracking failed:', error);
            }
        };

        trackDevice();
        // Run once on mount (or when session changes, but mount is safer to avoid loops)
    }, []);
}
