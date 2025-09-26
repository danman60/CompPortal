// Supabase Configuration for GlowDance Competition Portal
// Note: This is a demo configuration showing schema alignment
// In production, these values would be stored as environment variables

const SUPABASE_CONFIG = {
    url: 'https://your-project-url.supabase.co',
    anonKey: 'your-anon-key-here',

    // Database Schema Alignment (per CLAUDE.md requirements)
    tables: {
        dancers: 'dancers',
        studios: 'studios',
        reservations: 'reservations',
        competitions: 'competitions',
        entries: 'entries',
        users: 'users'
    }
};

// Schema-aligned data models
const DataModels = {
    dancer: {
        name: 'string',
        date_of_birth: 'date',
        age_override: 'integer',
        primary_style: 'string',
        experience_years: 'integer',
        studio_id: 'uuid',
        created_at: 'timestamp',
        updated_at: 'timestamp'
    },

    reservation: {
        studio_id: 'uuid',
        competition_id: 'uuid',
        entry_spaces: 'integer',
        agent_name: 'string',
        agent_phone: 'string',
        agent_email: 'string',
        special_requirements: 'text',
        liability_waiver: 'boolean',
        photo_consent: 'boolean',
        age_consent: 'boolean',
        status: 'string', // pending, approved, rejected
        total_cost: 'decimal',
        created_at: 'timestamp',
        updated_at: 'timestamp'
    },

    studio: {
        name: 'string',
        director_name: 'string',
        email: 'string',
        phone: 'string',
        address: 'text',
        status: 'string', // pending, approved
        user_id: 'uuid',
        created_at: 'timestamp',
        updated_at: 'timestamp'
    }
};

// Demo Supabase Client (would use actual @supabase/supabase-js in production)
class DemoSupabaseClient {
    constructor() {
        this.isDemo = true;
        console.log('🎭 Demo Supabase Client initialized for GlowDance Portal');
    }

    // Simulate adding a new dancer
    async insertDancer(dancerData) {
        console.log('📝 Demo: Would insert dancer to Supabase:', dancerData);

        // Simulate validation against schema
        const requiredFields = ['name', 'date_of_birth'];
        const missingFields = requiredFields.filter(field => !dancerData[field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Simulate successful insert
        return {
            data: {
                id: 'demo-uuid-' + Date.now(),
                ...dancerData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            error: null
        };
    }

    // Simulate creating a reservation
    async insertReservation(reservationData) {
        console.log('🎟️ Demo: Would insert reservation to Supabase:', reservationData);

        // Simulate schema validation
        const requiredFields = ['competition_id', 'entry_spaces', 'agent_name', 'liability_waiver', 'age_consent'];
        const missingFields = requiredFields.filter(field => !reservationData[field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Simulate successful insert
        return {
            data: {
                id: 'demo-reservation-' + Date.now(),
                ...reservationData,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            error: null
        };
    }

    // Simulate fetching dancers for sorting/filtering
    async getDancers(filters = {}) {
        console.log('📊 Demo: Would fetch dancers with filters:', filters);

        // Return demo data that matches our existing UI
        return {
            data: [
                {
                    id: 'demo-1',
                    name: 'Emma Sullivan',
                    date_of_birth: '2011-08-15',
                    age_override: null,
                    primary_style: 'Ballet',
                    experience_years: 6,
                    created_at: '2024-01-15T10:30:00Z'
                },
                {
                    id: 'demo-2',
                    name: 'Maya Singh',
                    date_of_birth: '2009-12-03',
                    age_override: null,
                    primary_style: 'Jazz',
                    experience_years: 8,
                    created_at: '2024-02-20T14:15:00Z'
                },
                {
                    id: 'demo-3',
                    name: 'Ava Rodriguez',
                    date_of_birth: '2013-06-22',
                    age_override: null,
                    primary_style: 'Contemporary',
                    experience_years: 4,
                    created_at: '2024-03-10T09:45:00Z'
                }
            ],
            error: null
        };
    }

    // Simulate real-time subscription for live updates
    subscribe(table, callback) {
        console.log(`🔄 Demo: Would subscribe to ${table} changes`);

        // Simulate receiving updates
        setTimeout(() => {
            callback({
                eventType: 'INSERT',
                new: {
                    id: 'demo-new-' + Date.now(),
                    name: 'New Dancer Added',
                    primary_style: 'Hip Hop'
                }
            });
        }, 5000);

        return {
            unsubscribe: () => console.log('Demo: Unsubscribed from changes')
        };
    }
}

// Export for use in production (would be actual supabase client)
const supabaseClient = new DemoSupabaseClient();

// Integration helper functions that align with existing schema
const SupabaseHelpers = {
    // Convert form data to database schema format
    formatDancerForDB(formData) {
        return {
            name: formData.name,
            date_of_birth: formData.dateOfBirth,
            age_override: formData.ageOverride ? parseInt(formData.ageOverride) : null,
            primary_style: formData.primaryStyle,
            experience_years: formData.experienceYears || 0,
            studio_id: 'current-studio-uuid' // Would come from session
        };
    },

    formatReservationForDB(formData) {
        return {
            competition_id: formData.location, // Map location to competition ID
            entry_spaces: parseInt(formData.entrySpaces),
            agent_name: formData.agentName,
            agent_phone: formData.agentPhone,
            agent_email: formData.agentEmail,
            special_requirements: formData.specialRequirements,
            liability_waiver: formData.liabilityWaiver,
            photo_consent: formData.photoConsent,
            age_consent: formData.ageConsent,
            studio_id: 'current-studio-uuid' // Would come from session
        };
    },

    // Calculate derived fields
    calculateAge(dateOfBirth, ageOverride) {
        if (ageOverride) return ageOverride;

        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    }
};

// Demo usage examples
console.log('🎭 GlowDance Supabase Integration Demo Ready');
console.log('📋 Schema models loaded:', Object.keys(DataModels));
console.log('⚡ Helper functions available:', Object.keys(SupabaseHelpers));

// Export for use in HTML files
if (typeof window !== 'undefined') {
    window.GlowDanceDB = {
        client: supabaseClient,
        helpers: SupabaseHelpers,
        models: DataModels
    };
}