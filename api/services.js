// Services API functions
import { buildApiUrl, makeApiRequest, handleApiError } from './config.js';

/**
 * Get services and cost for a specific country and operator
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @returns {Promise<Array>} Array of services with prices and availability
 */
export async function getServicesAndCost(countryId, operatorId) {
    try {
        const url = buildApiUrl('getServicesAndCost', {
            country: countryId,
            operator: operatorId
        });
        
        const response = await makeApiRequest(url);
        
        // Parse JSON response
        const data = JSON.parse(response);
        
        // Transform data to our format
        return data.map(service => ({
            id: service.id,
            name: service.name,
            price: parseFloat(service.price),
            quantity: parseInt(service.quantity),
            available: parseInt(service.quantity) > 0,
            category: getServiceCategory(service.id),
            operatorId: operatorId,
            countryId: countryId
        }));
    } catch (error) {
        console.error('Error fetching services and cost:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get services with statistics
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @returns {Promise<Array>} Array of services with statistics
 */
export async function getServicesWithStatistics(countryId, operatorId) {
    try {
        const url = buildApiUrl('getServicesAndCostWithStatistics', {
            country: countryId,
            operator: operatorId
        });
        
        const response = await makeApiRequest(url);
        
        // Parse JSON response
        const data = JSON.parse(response);
        
        // Transform data to our format
        return data.map(service => ({
            id: service.id,
            name: service.name,
            price: parseFloat(service.price),
            quantity: parseInt(service.quantity),
            available: parseInt(service.quantity) > 0,
            category: getServiceCategory(service.id),
            operatorId: operatorId,
            countryId: countryId,
            statistics: {
                deliverability: parseFloat(service.deliverability) || 0,
                cheapPricesCountries: service.cheap_prices_countries || []
            }
        }));
    } catch (error) {
        console.error('Error fetching services with statistics:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get prices by country
 * @param {number} countryId - Country ID
 * @returns {Promise<Object>} Prices by country
 */
export async function getPricesByCountry(countryId) {
    try {
        const url = buildApiUrl('getPrices', {
            country: countryId
        });
        
        const response = await makeApiRequest(url);
        
        // Parse JSON response
        const data = JSON.parse(response);
        
        return data;
    } catch (error) {
        console.error('Error fetching prices by country:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get service by ID
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @param {string} serviceId - Service ID
 * @returns {Promise<Object>} Service object
 */
export async function getServiceById(countryId, operatorId, serviceId) {
    try {
        const services = await getServicesAndCost(countryId, operatorId);
        const service = services.find(s => s.id === serviceId);
        
        if (!service) {
            throw new Error('Service not found');
        }
        
        return service;
    } catch (error) {
        console.error('Error fetching service by ID:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Search services by name
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching services
 */
export async function searchServices(countryId, operatorId, searchTerm) {
    try {
        const services = await getServicesAndCost(countryId, operatorId);
        const searchLower = searchTerm.toLowerCase();
        
        return services.filter(service => 
            service.name.toLowerCase().includes(searchLower)
        );
    } catch (error) {
        console.error('Error searching services:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get services by category
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @param {string} category - Service category
 * @returns {Promise<Array>} Array of services in category
 */
export async function getServicesByCategory(countryId, operatorId, category) {
    try {
        const services = await getServicesAndCost(countryId, operatorId);
        
        return services.filter(service => 
            service.category === category
        );
    } catch (error) {
        console.error('Error fetching services by category:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get available services (quantity > 0)
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @returns {Promise<Array>} Array of available services
 */
export async function getAvailableServices(countryId, operatorId) {
    try {
        const services = await getServicesAndCost(countryId, operatorId);
        
        return services.filter(service => service.available);
    } catch (error) {
        console.error('Error fetching available services:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get recommended services (high deliverability, good price)
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @returns {Promise<Array>} Array of recommended services
 */
export async function getRecommendedServices(countryId, operatorId) {
    try {
        const services = await getServicesWithStatistics(countryId, operatorId);
        
        // Filter and sort by deliverability and price
        return services
            .filter(service => service.available && service.statistics.deliverability > 50)
            .sort((a, b) => {
                // Sort by deliverability first, then by price
                if (b.statistics.deliverability !== a.statistics.deliverability) {
                    return b.statistics.deliverability - a.statistics.deliverability;
                }
                return a.price - b.price;
            })
            .slice(0, 10); // Top 10 recommended services
    } catch (error) {
        console.error('Error fetching recommended services:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Determine service category based on service ID
 * @param {string} serviceId - Service ID
 * @returns {string} Service category
 */
function getServiceCategory(serviceId) {
    const categoryMap = {
        // Social Media
        'fb': 'social', 'ig': 'social', 'wa': 'social', 'tg': 'social',
        'sn': 'social', 'fu': 'social', 'ds': 'social', 'wb': 'social',
        'me': 'social', 'vi': 'social', 'bw': 'social',
        
        // Finance
        'ts': 'finance', 'nu': 'finance', 're': 'finance', 'aon': 'finance',
        'bo': 'finance', 'ij': 'finance', 'it': 'finance', 'yy': 'finance',
        'ge': 'finance', 'bc': 'finance',
        
        // Gaming
        'mt': 'gaming', 'blm': 'gaming', 'aml': 'gaming', 'hb': 'gaming',
        
        // Business
        'mm': 'business', 'go': 'business', 'tn': 'business', 'anf': 'business',
        'ali': 'business', 'aiv': 'business', 'abq': 'business',
        
        // Dating
        'oi': 'dating', 'mo': 'dating', 'qv': 'dating', 'yw': 'dating',
        'vz': 'dating', 'vm': 'dating', 'axr': 'dating', 'pf': 'dating',
        'oj': 'dating'
    };
    
    return categoryMap[serviceId] || 'other';
}

// Default export for convenience
export default {
    getServicesAndCost,
    getServicesWithStatistics,
    getPricesByCountry,
    getServiceById,
    searchServices,
    getServicesByCategory,
    getAvailableServices,
    getRecommendedServices
};
