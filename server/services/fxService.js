// FX Service - Real-time Currency Conversion
const axios = require('axios');

class FXService {
    constructor(database) {
        this.db = database;
        this.cacheTimeout = 300000; // 5 minutes in milliseconds
        this.fxApiUrl = 'https://api.exchangerate-api.com/v4/latest/';
        this.fallbackRates = {
            'USD': 35.50,
            'EUR': 38.20,
            'GBP': 44.80,
            'JPY': 0.24
        };
    }

    // Get current FX rate with caching
    async getFXRate(fromCurrency, toCurrency = 'THB') {
        if (fromCurrency === toCurrency) {
            return 1.0;
        }

        const cacheKey = `${fromCurrency}_${toCurrency}`;
        
        // Check cache first
        const cached = await this.db.get(`
            SELECT rate, created_at FROM fx_rates 
            WHERE from_currency = ? AND to_currency = ? 
            AND created_at > datetime('now', '-5 minutes')
            ORDER BY created_at DESC LIMIT 1
        `, [fromCurrency, toCurrency]);

        if (cached) {
            console.log(`✅ Using cached FX rate: ${fromCurrency}/${toCurrency} = ${cached.rate}`);
            return parseFloat(cached.rate);
        }

        try {
            // Fetch new rate
            const rate = await this.fetchLiveRate(fromCurrency, toCurrency);
            
            // Cache the rate
            await this.db.run(`
                INSERT INTO fx_rates (from_currency, to_currency, rate)
                VALUES (?, ?, ?)
            `, [fromCurrency, toCurrency, rate]);

            console.log(`✅ Fetched and cached new FX rate: ${fromCurrency}/${toCurrency} = ${rate}`);
            return rate;

        } catch (error) {
            console.warn(`⚠️ Failed to fetch live FX rate, using fallback: ${error.message}`);
            
            // Use fallback rate
            const fallbackRate = this.fallbackRates[fromCurrency] || 35.50; // Default to USD rate
            
            // Cache fallback rate with shorter expiry
            await this.db.run(`
                INSERT INTO fx_rates (from_currency, to_currency, rate)
                VALUES (?, ?, ?)
            `, [fromCurrency, toCurrency, fallbackRate]);

            return fallbackRate;
        }
    }

    // Fetch live FX rate from external API
    async fetchLiveRate(fromCurrency, toCurrency = 'THB') {
        try {
            // Try primary API first
            const response = await axios.get(`${this.fxApiUrl}${fromCurrency}`, {
                timeout: 5000
            });

            const rates = response.data.rates;
            if (rates && rates[toCurrency]) {
                return parseFloat(rates[toCurrency]);
            }

            throw new Error(`Rate not found for ${fromCurrency}/${toCurrency}`);

        } catch (error) {
            console.warn(`Primary FX API failed: ${error.message}`);
            
            // Try alternative approach - convert via USD
            if (fromCurrency !== 'USD') {
                try {
                    const usdToFrom = await this.fetchLiveRate('USD', fromCurrency);
                    const usdToThb = await this.fetchLiveRate('USD', 'THB');
                    return usdToThb / usdToFrom;
                } catch (altError) {
                    console.warn(`Alternative FX calculation failed: ${altError.message}`);
                }
            }

            throw error;
        }
    }

    // Convert amount from one currency to another
    async convertAmount(amount, fromCurrency, toCurrency = 'THB') {
        const rate = await this.getFXRate(fromCurrency, toCurrency);
        return parseFloat((amount * rate).toFixed(2));
    }

    // Get cached rates for display
    async getCachedRates() {
        const rates = await this.db.all(`
            SELECT from_currency, to_currency, rate, created_at
            FROM fx_rates 
            WHERE created_at > datetime('now', '-1 hour')
            ORDER BY created_at DESC
        `);

        const rateMap = {};
        rates.forEach(rate => {
            const key = `${rate.from_currency}_${rate.to_currency}`;
            if (!rateMap[key] || new Date(rate.created_at) > new Date(rateMap[key].created_at)) {
                rateMap[key] = {
                    rate: parseFloat(rate.rate),
                    timestamp: rate.created_at
                };
            }
        });

        return rateMap;
    }

    // Clean old cache entries
    async cleanCache() {
        await this.db.run(`
            DELETE FROM fx_rates 
            WHERE created_at < datetime('now', '-24 hours')
        `);
        console.log('✅ Cleaned old FX cache entries');
    }
}

module.exports = FXService;
