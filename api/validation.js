// Service Validation API functions
import { buildApiUrl, makeApiRequest, handleApiError } from './config.js';

/**
 * Validate service availability and pricing
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @param {string} serviceId - Service ID
 * @returns {Promise<Object>} Validation result
 */
export async function validateServiceAvailability(countryId, operatorId, serviceId) {
    try {
        const url = buildApiUrl('getServicesAndCost', {
            country: countryId,
            operator: operatorId
        });
        
        const response = await makeApiRequest(url);
        const data = JSON.parse(response);
        
        const service = data.find(s => s.id === serviceId);
        
        if (!service) {
            return {
                valid: false,
                available: false,
                reason: 'Service not found',
                timestamp: new Date().toISOString()
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
            lastChecked: new Date().toISOString(),
            service: {
                id: service.id,
                name: service.name
            }
        };
    } catch (error) {
        console.error('Error validating service availability:', error);
        return {
            valid: false,
            available: false,
            reason: 'Validation failed',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Check service pricing and availability in real-time
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @param {string} serviceId - Service ID
 * @returns {Promise<Object>} Real-time service status
 */
export async function checkServiceStatus(countryId, operatorId, serviceId) {
    try {
        const url = buildApiUrl('getServicesAndCost', {
            country: countryId,
            operator: operatorId
        });
        
        const response = await makeApiRequest(url);
        const data = JSON.parse(response);
        
        const service = data.find(s => s.id === serviceId);
        
        if (!service) {
            return {
                status: 'not_found',
                available: false,
                message: 'Service not found'
            };
        }
        
        const quantity = parseInt(service.quantity);
        const price = parseFloat(service.price);
        
        let status = 'available';
        let message = 'Service is available';
        
        if (quantity === 0) {
            status = 'out_of_stock';
            message = 'Service is out of stock';
        } else if (quantity < 5) {
            status = 'low_stock';
            message = 'Service has low stock';
        } else if (quantity < 20) {
            status = 'limited_stock';
            message = 'Service has limited stock';
        }
        
        return {
            status: status,
            available: quantity > 0,
            quantity: quantity,
            price: price,
            message: message,
            lastUpdated: new Date().toISOString(),
            service: {
                id: service.id,
                name: service.name
            }
        };
    } catch (error) {
        console.error('Error checking service status:', error);
        return {
            status: 'error',
            available: false,
            message: 'Failed to check service status'
        };
    }
}

/**
 * Validate multiple services at once
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @param {Array} serviceIds - Array of service IDs
 * @returns {Promise<Array>} Validation results
 */
export async function validateMultipleServices(countryId, operatorId, serviceIds) {
    try {
        const url = buildApiUrl('getServicesAndCost', {
            country: countryId,
            operator: operatorId
        });
        
        const response = await makeApiRequest(url);
        const data = JSON.parse(response);
        
        const results = serviceIds.map(serviceId => {
            const service = data.find(s => s.id === serviceId);
            
            if (!service) {
                return {
                    serviceId: serviceId,
                    valid: false,
                    available: false,
                    reason: 'Service not found'
                };
            }
            
            const quantity = parseInt(service.quantity);
            const price = parseFloat(service.price);
            
            return {
                serviceId: serviceId,
                valid: true,
                available: quantity > 0,
                quantity: quantity,
                price: price,
                reason: quantity > 0 ? 'Available' : 'Out of stock'
            };
        });
        
        return results;
    } catch (error) {
        console.error('Error validating multiple services:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Check service health and performance
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @returns {Promise<Object>} Service health status
 */
export async function checkServiceHealth(countryId, operatorId) {
    try {
        const url = buildApiUrl('getServicesAndCost', {
            country: countryId,
            operator: operatorId
        });
        
        const startTime = Date.now();
        const response = await makeApiRequest(url);
        const endTime = Date.now();
        
        const data = JSON.parse(response);
        
        const health = {
            status: 'healthy',
            responseTime: endTime - startTime,
            totalServices: data.length,
            availableServices: data.filter(s => parseInt(s.quantity) > 0).length,
            unavailableServices: data.filter(s => parseInt(s.quantity) === 0).length,
            averagePrice: calculateAveragePrice(data),
            lastChecked: new Date().toISOString()
        };
        
        // Determine health status
        if (health.responseTime > 5000) {
            health.status = 'slow';
        } else if (health.availableServices === 0) {
            health.status = 'no_services';
        } else if (health.availableServices < health.totalServices * 0.5) {
            health.status = 'limited';
        }
        
        return health;
    } catch (error) {
        console.error('Error checking service health:', error);
        return {
            status: 'error',
            message: 'Failed to check service health',
            lastChecked: new Date().toISOString()
        };
    }
}

/**
 * Get service validation history
 * @param {string} serviceId - Service ID
 * @param {number} hours - Number of hours to look back
 * @returns {Promise<Array>} Validation history
 */
export async function getServiceValidationHistory(serviceId, hours = 24) {
    try {
        // This would typically connect to a database
        // For now, we'll return a mock history
        const history = [];
        const now = new Date();
        
        for (let i = 0; i < hours; i++) {
            const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
            history.push({
                timestamp: timestamp.toISOString(),
                serviceId: serviceId,
                available: Math.random() > 0.3, // Mock data
                quantity: Math.floor(Math.random() * 100),
                price: (Math.random() * 50 + 1).toFixed(2)
            });
        }
        
        return history.reverse(); // Most recent first
    } catch (error) {
        console.error('Error fetching validation history:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Validate service before purchase
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @param {string} serviceId - Service ID
 * @param {number} maxPrice - Maximum price user is willing to pay
 * @returns {Promise<Object>} Pre-purchase validation
 */
export async function validateServiceForPurchase(countryId, operatorId, serviceId, maxPrice = null) {
    try {
        const validation = await validateServiceAvailability(countryId, operatorId, serviceId);
        
        if (!validation.valid) {
            return {
                canPurchase: false,
                reason: validation.reason,
                validation: validation
            };
        }
        
        if (!validation.available) {
            return {
                canPurchase: false,
                reason: 'Service is not available',
                validation: validation
            };
        }
        
        if (maxPrice && validation.price > maxPrice) {
            return {
                canPurchase: false,
                reason: 'Price exceeds maximum allowed',
                validation: validation
            };
        }
        
        return {
            canPurchase: true,
            reason: 'Service is ready for purchase',
            validation: validation
        };
    } catch (error) {
        console.error('Error validating service for purchase:', error);
        return {
            canPurchase: false,
            reason: 'Validation failed',
            validation: null
        };
    }
}

// Helper functions
function calculateAveragePrice(data) {
    const prices = data.map(s => parseFloat(s.price)).filter(p => p > 0);
    return prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
}

// Default export
export default {
    validateServiceAvailability,
    checkServiceStatus,
    validateMultipleServices,
    checkServiceHealth,
    getServiceValidationHistory,
    validateServiceForPurchase
};
