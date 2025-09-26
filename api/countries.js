// Countries API functions
import { buildApiUrl, makeApiRequest, handleApiError } from './config.js';

/**
 * Get all available countries and their operators
 * @returns {Promise<Array>} Array of countries with operators
 */
export async function getCountriesAndOperators() {
    try {
        const url = buildApiUrl('getCountryAndOperators');
        const response = await makeApiRequest(url);
        
        // Parse JSON response
        const data = JSON.parse(response);
        
        // Transform data to our format
        return data.map(country => ({
            id: country.id,
            name: country.name,
            code: country.id,
            operators: Object.keys(country.operators).map(key => ({
                id: key,
                name: country.operators[key],
                code: key
            }))
        }));
    } catch (error) {
        console.error('Error fetching countries and operators:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get countries list only
 * @returns {Promise<Array>} Array of countries
 */
export async function getCountries() {
    try {
        const countriesAndOperators = await getCountriesAndOperators();
        return countriesAndOperators.map(country => ({
            id: country.id,
            name: country.name,
            code: country.code
        }));
    } catch (error) {
        console.error('Error fetching countries:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get operators for a specific country
 * @param {number} countryId - Country ID
 * @returns {Promise<Array>} Array of operators for the country
 */
export async function getOperatorsByCountry(countryId) {
    try {
        const countriesAndOperators = await getCountriesAndOperators();
        const country = countriesAndOperators.find(c => c.id === countryId);
        
        if (!country) {
            throw new Error('Country not found');
        }
        
        return country.operators;
    } catch (error) {
        console.error('Error fetching operators for country:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Get country by ID
 * @param {number} countryId - Country ID
 * @returns {Promise<Object>} Country object
 */
export async function getCountryById(countryId) {
    try {
        const countries = await getCountries();
        const country = countries.find(c => c.id === countryId);
        
        if (!country) {
            throw new Error('Country not found');
        }
        
        return country;
    } catch (error) {
        console.error('Error fetching country by ID:', error);
        throw new Error(handleApiError(error));
    }
}

/**
 * Search countries by name
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching countries
 */
export async function searchCountries(searchTerm) {
    try {
        const countries = await getCountries();
        const searchLower = searchTerm.toLowerCase();
        
        return countries.filter(country => 
            country.name.toLowerCase().includes(searchLower)
        );
    } catch (error) {
        console.error('Error searching countries:', error);
        throw new Error(handleApiError(error));
    }
}

// Default export for convenience
export default {
    getCountriesAndOperators,
    getCountries,
    getOperatorsByCountry,
    getCountryById,
    searchCountries
};
