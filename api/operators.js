// Operators API functions
import { buildApiUrl, makeApiRequest, handleApiError } from './config.js';

/**
 * Get operators for a specific country
 * @param {number} countryId - Country ID
 * @returns {Promise<Array>} Array of operators
 */
export async function getOperators(countryId) {
    try {
        const url = buildApiUrl('getCountryAndOperators');
        const response = await makeApiRequest(url);
        
        // Parse JSON response
        const data = JSON.parse(response);
        
        // Find the country
        const country = data.find(c => c.id === countryId);
        
        if (!country) {
            throw new Error('Country not found');
        }
        
        // Transform operators data
        return Object.keys(country.operators).map(key => ({
            id: key,
            name: country.operators[key],
            code: key,
            countryId: countryId,
            countryName: country.name
        }));
    } catch (error) {
        console.error('Error fetching operators:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get operator by ID and country
 * @param {number} countryId - Country ID
 * @param {string} operatorId - Operator ID
 * @returns {Promise<Object>} Operator object
 */
export async function getOperatorById(countryId, operatorId) {
    try {
        const operators = await getOperators(countryId);
        const operator = operators.find(op => op.id === operatorId);
        
        if (!operator) {
            throw new Error('Operator not found');
        }
        
        return operator;
    } catch (error) {
        console.error('Error fetching operator by ID:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Search operators by name
 * @param {number} countryId - Country ID
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching operators
 */
export async function searchOperators(countryId, searchTerm) {
    try {
        const operators = await getOperators(countryId);
        const searchLower = searchTerm.toLowerCase();
        
        return operators.filter(operator => 
            operator.name.toLowerCase().includes(searchLower)
        );
    } catch (error) {
        console.error('Error searching operators:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get all operators across all countries
 * @returns {Promise<Array>} Array of all operators
 */
export async function getAllOperators() {
    try {
        const url = buildApiUrl('getCountryAndOperators');
        const response = await makeApiRequest(url);
        
        // Parse JSON response
        const data = JSON.parse(response);
        
        // Transform all operators
        const allOperators = [];
        data.forEach(country => {
            Object.keys(country.operators).forEach(key => {
                allOperators.push({
                    id: key,
                    name: country.operators[key],
                    code: key,
                    countryId: country.id,
                    countryName: country.name
                });
            });
        });
        
        return allOperators;
    } catch (error) {
        console.error('Error fetching all operators:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get operators with statistics
 * @param {number} countryId - Country ID
 * @returns {Promise<Array>} Array of operators with statistics
 */
export async function getOperatorsWithStats(countryId) {
    try {
        const operators = await getOperators(countryId);
        
        // Add statistics (this would need additional API calls in real implementation)
        return operators.map(operator => ({
            ...operator,
            stats: {
                totalServices: 0, // Would be fetched from services API
                averagePrice: 0,  // Would be calculated from services
                availability: 'high' // Would be determined by service availability
            }
        }));
    } catch (error) {
        console.error('Error fetching operators with stats:', error);
        throw new Error(handleApiError(error));
    }
}

// Default export for convenience
export default {
    getOperators,
    getOperatorById,
    searchOperators,
    getAllOperators,
    getOperatorsWithStats
};
