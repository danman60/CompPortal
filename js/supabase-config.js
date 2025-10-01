// Supabase Configuration for GlowDance Competition Portal
// Connected to live Supabase instance

const SUPABASE_CONFIG = {
    url: 'https://cafugvuaatsgihrsmvvl.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhZnVndnVhYXRzZ2locnNtdnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTk5MzksImV4cCI6MjA3NDgzNTkzOX0.WqX70GzRkDRhcurYeEnqG8YFniTYFqpjv6u3mPlbdoc',

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

// Initialize Supabase Client
// Note: Requires @supabase/supabase-js CDN or npm package
let supabaseClient;

// Check if we're in browser and supabase library is loaded
if (typeof window !== 'undefined' && window.supabase) {
    supabaseClient = window.supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
    );
    console.log('✅ Supabase Client initialized for GlowDance Portal');
} else {
    console.warn('⚠️ Supabase library not loaded. Include from CDN: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    supabaseClient = null;
}

// Database Helper Functions
const DatabaseAPI = {
    // Insert a new dancer
    async insertDancer(dancerData) {
        if (!supabaseClient) throw new Error('Supabase client not initialized');

        const { data, error } = await supabaseClient
            .from('dancers')
            .insert([dancerData])
            .select();

        if (error) {
            console.error('Error inserting dancer:', error);
            throw error;
        }

        return { data, error };
    },

    // Create a reservation
    async insertReservation(reservationData) {
        if (!supabaseClient) throw new Error('Supabase client not initialized');

        const { data, error } = await supabaseClient
            .from('reservations')
            .insert([reservationData])
            .select();

        if (error) {
            console.error('Error inserting reservation:', error);
            throw error;
        }

        return { data, error };
    },

    // Fetch dancers with optional filters
    async getDancers(filters = {}) {
        if (!supabaseClient) throw new Error('Supabase client not initialized');

        let query = supabaseClient
            .from('dancers')
            .select('*');

        // Apply filters if provided
        if (filters.studio_id) {
            query = query.eq('studio_id', filters.studio_id);
        }
        if (filters.primary_style) {
            query = query.eq('primary_style', filters.primary_style);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching dancers:', error);
            return { data: null, error };
        }

        return { data, error };
    },

    // Fetch studios
    async getStudios() {
        if (!supabaseClient) throw new Error('Supabase client not initialized');

        const { data, error } = await supabaseClient
            .from('studios')
            .select('*');

        return { data, error };
    },

    // Fetch competitions
    async getCompetitions() {
        if (!supabaseClient) throw new Error('Supabase client not initialized');

        const { data, error } = await supabaseClient
            .from('competitions')
            .select('*')
            .order('event_date', { ascending: true });

        return { data, error };
    },

    // Real-time subscription to table changes
    subscribe(table, callback) {
        if (!supabaseClient) throw new Error('Supabase client not initialized');

        const subscription = supabaseClient
            .channel(`public:${table}`)
            .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
            .subscribe();

        return subscription;
    }
};

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

// Initialize and log status
console.log('🎭 GlowDance Supabase Integration Ready');
console.log('📋 Schema models loaded:', Object.keys(DataModels));
console.log('⚡ Helper functions available:', Object.keys(SupabaseHelpers));
console.log('🔌 Database API available:', Object.keys(DatabaseAPI));

// Export for use in HTML files
if (typeof window !== 'undefined') {
    window.GlowDanceDB = {
        client: supabaseClient,
        api: DatabaseAPI,
        helpers: SupabaseHelpers,
        models: DataModels,
        config: SUPABASE_CONFIG
    };
}