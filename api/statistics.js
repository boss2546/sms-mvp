// Service Statistics API functions
import { buildApiUrl, makeApiRequest, handleApiError } from './config.js';

/**
 * Get service statistics and usage data
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @returns {Promise<Object>} Service statistics
 */
export async function getServiceStatistics(countryId, operatorId) {
    try {
        const url = buildApiUrl('getServicesAndCostWithStatistics', {
            country: countryId,
            operator: operatorId
        });
        
        const response = await makeApiRequest(url);
        const data = JSON.parse(response);
        
        // Calculate statistics
        const stats = {
            totalServices: data.length,
            availableServices: data.filter(s => parseInt(s.quantity) > 0).length,
            unavailableServices: data.filter(s => parseInt(s.quantity) === 0).length,
            averagePrice: calculateAveragePrice(data),
            mostPopular: getMostPopularService(data),
            cheapestService: getCheapestService(data),
            categories: getCategoryStats(data),
            deliverability: calculateAverageDeliverability(data)
        };
        
        return stats;
    } catch (error) {
        console.error('Error fetching service statistics:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get pricing information for services
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @returns {Promise<Object>} Pricing information
 */
export async function getServicePricing(countryId, operatorId) {
    try {
        const url = buildApiUrl('getServicesAndCost', {
            country: countryId,
            operator: operatorId
        });
        
        const response = await makeApiRequest(url);
        const data = JSON.parse(response);
        
        // Calculate pricing statistics
        const pricing = {
            services: data.map(service => ({
                id: service.id,
                name: service.name,
                price: parseFloat(service.price),
                quantity: parseInt(service.quantity),
                available: parseInt(service.quantity) > 0,
                priceRange: getPriceRange(parseFloat(service.price))
            })),
            priceRange: {
                min: Math.min(...data.map(s => parseFloat(s.price))),
                max: Math.max(...data.map(s => parseFloat(s.price))),
                average: calculateAveragePrice(data)
            },
            categories: getCategoryPricing(data)
        };
        
        return pricing;
    } catch (error) {
        console.error('Error fetching service pricing:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get service status and availability
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @returns {Promise<Object>} Service status information
 */
export async function getServiceStatus(countryId, operatorId) {
    try {
        const url = buildApiUrl('getServicesAndCost', {
            country: countryId,
            operator: operatorId
        });
        
        const response = await makeApiRequest(url);
        const data = JSON.parse(response);
        
        // Analyze service status
        const status = {
            totalServices: data.length,
            available: data.filter(s => parseInt(s.quantity) > 0),
            unavailable: data.filter(s => parseInt(s.quantity) === 0),
            lowStock: data.filter(s => parseInt(s.quantity) > 0 && parseInt(s.quantity) < 10),
            outOfStock: data.filter(s => parseInt(s.quantity) === 0),
            statusSummary: {
                available: data.filter(s => parseInt(s.quantity) > 0).length,
                unavailable: data.filter(s => parseInt(s.quantity) === 0).length,
                lowStock: data.filter(s => parseInt(s.quantity) > 0 && parseInt(s.quantity) < 10).length
            }
        };
        
        return status;
    } catch (error) {
        console.error('Error fetching service status:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Validate service availability
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @param {string} serviceId - Service ID
 * @returns {Promise<Object>} Service validation result
 */
export async function validateService(countryId, operatorId, serviceId) {
    try {
        const url = buildApiUrl('getServicesAndCost', {
            country: countryId,
            operator: operatorId
        });
        
        const response = await makeApiRequest(url);
        const data = JSON.parse(response);
        
        // Find the specific service
        const service = data.find(s => s.id === serviceId);
        
        if (!service) {
            return {
                valid: false,
                reason: 'Service not found',
                available: false
            };
        }
        
        const quantity = parseInt(service.quantity);
        const price = parseFloat(service.price);
        
        return {
            valid: true,
            available: quantity > 0,
            quantity: quantity,
            price: price,
            reason: quantity > 0 ? 'Available' : 'Out of stock',
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error validating service:', error);
        return {
            valid: false,
            reason: 'Validation failed',
            available: false
        };
    }
}

/**
 * Get service recommendations based on statistics
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @returns {Promise<Array>} Recommended services
 */
export async function getServiceRecommendations(countryId, operatorId) {
    try {
        const url = buildApiUrl('getServicesAndCostWithStatistics', {
            country: countryId,
            operator: operatorId
        });
        
        const response = await makeApiRequest(url);
        const data = JSON.parse(response);
        
        // Filter and sort by deliverability and price
        const recommendations = data
            .filter(service => parseInt(service.quantity) > 0)
            .map(service => ({
                id: service.id,
                name: service.name,
                price: parseFloat(service.price),
                quantity: parseInt(service.quantity),
                deliverability: parseFloat(service.deliverability) || 0,
                score: calculateRecommendationScore(service)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Top 5 recommendations
        
        return recommendations;
    } catch (error) {
        console.error('Error fetching service recommendations:', error);
        throw new Error(handleApiError(error));
    }
}

// Helper functions
function calculateAveragePrice(data) {
    const prices = data.map(s => parseFloat(s.price)).filter(p => p > 0);
    return prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
}

function getMostPopularService(data) {
    return data.reduce((prev, current) => 
        parseInt(prev.quantity) > parseInt(current.quantity) ? prev : current
    );
}

function getCheapestService(data) {
    const availableServices = data.filter(s => parseInt(s.quantity) > 0);
    return availableServices.reduce((prev, current) => 
        parseFloat(prev.price) < parseFloat(current.price) ? prev : current
    );
}

function getCategoryStats(data) {
    const categories = {};
    data.forEach(service => {
        const category = getServiceCategory(service.id);
        if (!categories[category]) {
            categories[category] = { count: 0, totalPrice: 0, available: 0 };
        }
        categories[category].count++;
        categories[category].totalPrice += parseFloat(service.price);
        if (parseInt(service.quantity) > 0) {
            categories[category].available++;
        }
    });
    
    // Calculate averages
    Object.keys(categories).forEach(category => {
        categories[category].averagePrice = categories[category].totalPrice / categories[category].count;
    });
    
    return categories;
}

function getCategoryPricing(data) {
    const categories = {};
    data.forEach(service => {
        const category = getServiceCategory(service.id);
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push({
            id: service.id,
            name: service.name,
            price: parseFloat(service.price),
            quantity: parseInt(service.quantity)
        });
    });
    
    // Calculate price ranges for each category
    Object.keys(categories).forEach(category => {
        const prices = categories[category].map(s => s.price);
        categories[category].priceRange = {
            min: Math.min(...prices),
            max: Math.max(...prices),
            average: prices.reduce((a, b) => a + b, 0) / prices.length
        };
    });
    
    return categories;
}

function getPriceRange(price) {
    if (price < 1) return 'very-low';
    if (price < 5) return 'low';
    if (price < 15) return 'medium';
    if (price < 30) return 'high';
    return 'very-high';
}

function calculateAverageDeliverability(data) {
    const deliverabilities = data.map(s => parseFloat(s.deliverability) || 0);
    return deliverabilities.length > 0 ? 
        deliverabilities.reduce((a, b) => a + b, 0) / deliverabilities.length : 0;
}

function calculateRecommendationScore(service) {
    const deliverability = parseFloat(service.deliverability) || 0;
    const price = parseFloat(service.price);
    const quantity = parseInt(service.quantity);
    
    // Score based on deliverability (70%), price (20%), and availability (10%)
    const deliverabilityScore = deliverability * 0.7;
    const priceScore = Math.max(0, (50 - price) * 0.2); // Lower price = higher score
    const availabilityScore = Math.min(quantity, 100) * 0.1;
    
    return deliverabilityScore + priceScore + availabilityScore;
}

function getServiceCategory(serviceId) {
    const categoryMap = {
        'fb': 'social', 'ig': 'social', 'wa': 'social', 'tg': 'social',
        'sn': 'social', 'fu': 'social', 'ds': 'social', 'wb': 'social',
        'ts': 'finance', 'nu': 'finance', 're': 'finance', 'aon': 'finance',
        'bo': 'finance', 'ij': 'finance', 'it': 'finance', 'yy': 'finance',
        'mt': 'gaming', 'blm': 'gaming', 'aml': 'gaming', 'hb': 'gaming',
        'mm': 'business', 'go': 'business', 'tn': 'business', 'anf': 'business',
        'oi': 'dating', 'mo': 'dating', 'qv': 'dating', 'yw': 'dating'
    };
    
    return categoryMap[serviceId] || 'other';
}

// Default export
export default {
    getServiceStatistics,
    getServicePricing,
    getServiceStatus,
    validateService,
    getServiceRecommendations
};
