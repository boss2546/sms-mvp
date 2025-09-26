// SMS Verification API Configuration
export const API_CONFIG = {
    // Base URL for SMS Verification API
    BASE_URL: 'https://sms-verification-number.com/stubs/handler_api',
    
    // API Key (should be moved to environment variables in production)
    API_KEY: '7ccb326980edc2bfec78dcd66326aad7',
    
    // Language setting (en for English, ru for Russian)
    LANGUAGE: 'en',
    
    // Rate limiting
    RATE_LIMIT: 150, // requests per second
    
    // Timeout settings
    TIMEOUT: 10000, // 10 seconds
    
    // Retry settings
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
};

// API Endpoints
export const API_ENDPOINTS = {
    // Get balance
    GET_BALANCE: 'getBalance',
    
    // Get countries and operators
    GET_COUNTRIES_AND_OPERATORS: 'getCountryAndOperators',
    
    // Get prices by country
    GET_PRICES: 'getPrices',
    
    // Get services and cost
    GET_SERVICES_AND_COST: 'getServicesAndCost',
    
    // Get services with statistics
    GET_SERVICES_WITH_STATISTICS: 'getServicesAndCostWithStatistics',
    
    // Order number
    GET_NUMBER: 'getNumber',
    GET_NUMBER_V2: 'getNumberV2',
    
    // Status management
    SET_STATUS: 'setStatus',
    GET_STATUS: 'getStatus',
    
    // Current activations
    GET_CURRENT_ACTIVATIONS: 'getCurrentActivationsList',
};

// Error messages
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    API_ERROR: 'API error. Please try again later.',
    INVALID_RESPONSE: 'Invalid response from server.',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please wait before trying again.',
    INSUFFICIENT_BALANCE: 'Insufficient balance.',
    NO_NUMBERS_AVAILABLE: 'No numbers available for selected parameters.',
    INVALID_PARAMETERS: 'Invalid parameters provided.',
};

// Utility function to build API URL
export function buildApiUrl(action, params = {}) {
    const url = new URL(API_CONFIG.BASE_URL);
    
    // Add required parameters
    url.searchParams.append('api_key', API_CONFIG.API_KEY);
    url.searchParams.append('action', action);
    url.searchParams.append('lang', API_CONFIG.LANGUAGE);
    
    // Add additional parameters
    Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
            url.searchParams.append(key, params[key]);
        }
    });
    
    return url.toString();
}

// Utility function to handle API errors
export function handleApiError(error) {
    console.error('API Error:', error);
    
    if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        
        switch (status) {
            case 400:
                return ERROR_MESSAGES.INVALID_PARAMETERS;
            case 401:
                return 'Invalid API key.';
            case 403:
                return 'Access denied.';
            case 429:
                return ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
            case 500:
                return 'Server error. Please try again later.';
            default:
                return ERROR_MESSAGES.API_ERROR;
        }
    } else if (error.request) {
        // Network error
        return ERROR_MESSAGES.NETWORK_ERROR;
    } else {
        // Other error
        return ERROR_MESSAGES.API_ERROR;
    }
}

// Utility function to make API request with retry
export async function makeApiRequest(url, options = {}, retries = API_CONFIG.MAX_RETRIES) {
    try {
        const response = await fetch(url, {
            ...options,
            timeout: API_CONFIG.TIMEOUT,
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.text();
        
        // Check for API-specific errors
        if (data.includes('BAD_KEY')) {
            throw new Error('Invalid API key');
        } else if (data.includes('NO_BALANCE')) {
            throw new Error('Insufficient balance');
        } else if (data.includes('NO_NUMBERS')) {
            throw new Error('No numbers available');
        } else if (data.includes('REQUEST_LIMIT')) {
            throw new Error('Rate limit exceeded');
        }
        
        return data;
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying request... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
            return makeApiRequest(url, options, retries - 1);
        }
        throw error;
    }
}
