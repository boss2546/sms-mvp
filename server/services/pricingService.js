// Pricing Service - Real-time pricing with FX conversion
class PricingService {
    constructor(database, fxService) {
        this.db = database;
        this.fxService = fxService;
        this.markupTHB = 10.00; // Fixed markup
        this.cacheTimeout = 300000; // 5 minutes
    }

    // Calculate final price for a service
    async calculatePrice(serviceId, countryCode, operatorCode) {
        try {
            // Get base vendor price (from SMS API)
            const basePrice = await this.getVendorPrice(serviceId, countryCode, operatorCode);
            
            // Convert to THB
            const baseTHB = await this.fxService.convertAmount(
                basePrice.amount, 
                basePrice.currency, 
                'THB'
            );

            // Add markup
            const finalTHB = parseFloat((baseTHB + this.markupTHB).toFixed(2));

            // Get current FX rate for display
            const fxRate = await this.fxService.getFXRate(basePrice.currency, 'THB');

            return {
                baseVendor: basePrice.amount,
                vendorCurrency: basePrice.currency,
                fxRate: parseFloat(fxRate.toFixed(4)),
                baseTHB: parseFloat(baseTHB.toFixed(2)),
                markupTHB: this.markupTHB,
                finalTHB: finalTHB
            };

        } catch (error) {
            console.error('❌ Pricing calculation error:', error);
            throw new Error(`Failed to calculate price: ${error.message}`);
        }
    }

    // Get vendor price from SMS API
    async getVendorPrice(serviceId, countryCode, operatorCode) {
        // Check cache first
        const cached = await this.db.get(`
            SELECT base_vendor_price, vendor_currency, cached_at
            FROM service_pricing 
            WHERE service_id = ? AND country_code = ? AND operator_code = ?
            AND cached_at > datetime('now', '-5 minutes')
            ORDER BY cached_at DESC LIMIT 1
        `, [serviceId, countryCode, operatorCode]);

        if (cached) {
            console.log(`✅ Using cached price for ${serviceId}`);
            return {
                amount: cached.base_vendor_price,
                currency: cached.vendor_currency
            };
        }

        // Fetch from SMS API
        const smsApiUrl = process.env.SMS_API_URL || 'https://sms-verification-number.com/stubs/handler_api';
        const apiKey = process.env.SMS_API_KEY || '7ccb326980edc2bfec78dcd66326aad7';

        try {
            const axios = require('axios');
            const response = await axios.get(smsApiUrl, {
                params: {
                    api_key: apiKey,
                    action: 'getServicesAndCost',
                    country: countryCode,
                    operator: operatorCode,
                    lang: 'en'
                },
                timeout: 10000
            });

            let services;
            if (typeof response.data === 'string') {
                services = JSON.parse(response.data);
            } else {
                services = response.data;
            }
            const service = services.find(s => s.id === serviceId);

            if (!service) {
                throw new Error(`Service ${serviceId} not found`);
            }

            // Cache the price
            await this.db.run(`
                INSERT INTO service_pricing (service_id, country_code, operator_code, base_vendor_price, vendor_currency)
                VALUES (?, ?, ?, ?, ?)
            `, [serviceId, countryCode, operatorCode, parseFloat(service.price), 'USD']);

            console.log(`✅ Fetched and cached price for ${serviceId}: $${service.price}`);

            return {
                amount: parseFloat(service.price),
                currency: 'USD' // SMS API typically returns USD prices
            };

        } catch (error) {
            console.error('❌ Failed to fetch vendor price:', error);
            
            // Use fallback price
            const fallbackPrice = 0.50; // Default fallback
            console.log(`⚠️ Using fallback price: $${fallbackPrice}`);
            
            return {
                amount: fallbackPrice,
                currency: 'USD'
            };
        }
    }

    // Get pricing for multiple services
    async getBulkPricing(services, countryCode, operatorCode) {
        const pricingPromises = services.map(async (service) => {
            try {
                const pricing = await this.calculatePrice(service.id, countryCode, operatorCode);
                return {
                    serviceId: service.id,
                    serviceName: service.name,
                    ...pricing
                };
            } catch (error) {
                console.warn(`⚠️ Failed to get pricing for ${service.id}: ${error.message}`);
                return {
                    serviceId: service.id,
                    serviceName: service.name,
                    error: error.message
                };
            }
        });

        return await Promise.all(pricingPromises);
    }

    // Clean old pricing cache
    async cleanCache() {
        await this.db.run(`
            DELETE FROM service_pricing 
            WHERE cached_at < datetime('now', '-24 hours')
        `);
        console.log('✅ Cleaned old pricing cache entries');
    }

    // Get pricing summary for display
    getPricingSummary(pricing) {
        return {
            baseVendor: pricing.baseVendor,
            vendorCurrency: pricing.vendorCurrency,
            fxRate: pricing.fxRate,
            baseTHB: pricing.baseTHB,
            markupTHB: pricing.markupTHB,
            finalTHB: pricing.finalTHB,
            fxTimestamp: new Date().toISOString(),
            markupNote: `รวมค่าบริการ +${pricing.markupTHB} บาท`,
            fxNote: `อัตราแลกเปลี่ยน ณ เวลาออกคำสั่ง: 1 ${pricing.vendorCurrency} ≈ ${pricing.fxRate} THB`
        };
    }
}

module.exports = PricingService;
