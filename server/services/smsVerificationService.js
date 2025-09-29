// SMS Verification Service - Using sms-verification-number.com API
const axios = require('axios');

class SMSVerificationService {
    constructor(database) {
        this.db = database;
        this.apiKey = '7ccb326980edc2bfec78dcd66326aad7';
        this.baseUrl = 'https://sms-verification-number.com/stubs/handler_api';
        this.lang = 'en'; // Use English for dollar pricing
    }

    // Get balance from SMS verification service
    async getBalance() {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    api_key: this.apiKey,
                    action: 'getBalance',
                    lang: this.lang
                },
                timeout: 10000
            });

            return {
                success: true,
                balance: parseFloat(response.data)
            };
        } catch (error) {
            console.error('❌ SMS API getBalance error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'BALANCE_ERROR',
                message: 'ไม่สามารถตรวจสอบยอดเงินได้'
            };
        }
    }

    // Get countries and operators
    async getCountriesAndOperators() {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    api_key: this.apiKey,
                    action: 'getCountryAndOperators',
                    lang: this.lang
                },
                timeout: 10000
            });

            return {
                success: true,
                countries: response.data
            };
        } catch (error) {
            console.error('❌ SMS API getCountriesAndOperators error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'COUNTRIES_ERROR',
                message: 'ไม่สามารถโหลดรายการประเทศได้'
            };
        }
    }

    // Get current prices by country (getPrices)
    async getPrices(countryId, operator = 'any', service = 'any') {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    api_key: this.apiKey,
                    action: 'getPrices',
                    country: countryId,
                    operator: operator,
                    service: service,
                    lang: this.lang
                },
                timeout: 10000
            });

            return {
                success: true,
                prices: response.data
            };
        } catch (error) {
            console.error('❌ SMS API getPrices error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'PRICES_ERROR',
                message: 'ไม่สามารถดึงราคาปัจจุบันได้'
            };
        }
    }

    // Get services and costs for a specific country/operator
    async getServicesAndCost(countryId, operator = 'any', service = 'any') {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    api_key: this.apiKey,
                    action: 'getServicesAndCost',
                    country: countryId,
                    operator: operator,
                    service: service,
                    lang: this.lang
                },
                timeout: 10000
            });

            return {
                success: true,
                services: response.data
            };
        } catch (error) {
            console.error('❌ SMS API getServicesAndCost error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'SERVICES_ERROR',
                message: 'ไม่สามารถโหลดรายการบริการได้'
            };
        }
    }

    // Get services with statistics
    async getServicesAndCostWithStatistics(countryId, operator = 'any', service = 'any') {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    api_key: this.apiKey,
                    action: 'getServicesAndCostWithStatistics',
                    country: countryId,
                    operator: operator,
                    service: service,
                    lang: this.lang
                },
                timeout: 10000
            });

            return {
                success: true,
                services: response.data
            };
        } catch (error) {
            console.error('❌ SMS API getServicesAndCostWithStatistics error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'SERVICES_STATS_ERROR',
                message: 'ไม่สามารถโหลดสถิติบริการได้'
            };
        }
    }

    // Order a number (getNumber)
    async getNumber(service, operator, country, maxPrice = null) {
        try {
            console.log('📱 SMS API getNumber params:', { service, operator, country, maxPrice });
            
            const params = {
                api_key: this.apiKey,
                action: 'getNumber',
                service: service,
                operator: operator,
                country: country,
                lang: this.lang
            };

            if (maxPrice) {
                params.maxPrice = maxPrice;
            }

            console.log('📱 SMS API request URL:', `${this.baseUrl}?${new URLSearchParams(params).toString()}`);

            const response = await axios.get(this.baseUrl, {
                params: params,
                timeout: 10000
            });

            const result = response.data;

            // Parse response based on API documentation
            if (result === 'NO_BALANCE') {
                return {
                    success: false,
                    error: 'NO_BALANCE',
                    message: 'ยอดเงินไม่เพียงพอ'
                };
            }

            if (result === 'NO_NUMBERS') {
                console.log('⚠️ No numbers available for service:', service);
                return {
                    success: false,
                    error: 'NO_NUMBERS',
                    message: `ไม่มีหมายเลขว่างสำหรับบริการ ${service} กรุณาลองใหม่หรือเปลี่ยนประเทศ/ผู้ให้บริการ`
                };
            }

            if (result.startsWith('ACCESS_NUMBER:')) {
                const parts = result.split(':');
                const activationId = parts[1];
                const phoneNumber = parts[2];

                return {
                    success: true,
                    activationId: parseInt(activationId),
                    phoneNumber: phoneNumber
                };
            }

            if (result.startsWith('WRONG_MAX_PRICE:')) {
                const minPrice = result.split(':')[1];
                return {
                    success: false,
                    error: 'WRONG_MAX_PRICE',
                    message: `ราคาต่ำสุดที่สามารถซื้อได้: $${minPrice}`,
                    minPrice: parseFloat(minPrice)
                };
            }

            return {
                success: false,
                error: 'UNKNOWN_RESPONSE',
                message: `การตอบสนองที่ไม่รู้จัก: ${result}`
            };

        } catch (error) {
            console.error('❌ SMS API getNumber error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'GET_NUMBER_ERROR',
                message: 'ไม่สามารถสั่งซื้อหมายเลขได้'
            };
        }
    }

    // Order a number (getNumberV2 - Enhanced version)
    async getNumberV2(service, operator, country, maxPrice = null) {
        try {
            const params = {
                api_key: this.apiKey,
                action: 'getNumberV2',
                service: service,
                operator: operator,
                country: country,
                lang: this.lang
            };

            if (maxPrice) {
                params.maxPrice = maxPrice;
            }

            const response = await axios.get(this.baseUrl, {
                params: params,
                timeout: 10000
            });

            const result = response.data;

            // Handle error responses
            if (result === 'NO_BALANCE') {
                return {
                    success: false,
                    error: 'NO_BALANCE',
                    message: 'ยอดเงินไม่เพียงพอ'
                };
            }

            if (result === 'NO_NUMBERS') {
                return {
                    success: false,
                    error: 'NO_NUMBERS',
                    message: 'ไม่มีหมายเลขว่าง กรุณาลองใหม่หรือเปลี่ยนประเทศ/ผู้ให้บริการ'
                };
            }

            if (result.startsWith('WRONG_MAX_PRICE:')) {
                const minPrice = result.split(':')[1];
                return {
                    success: false,
                    error: 'WRONG_MAX_PRICE',
                    message: `ราคาต่ำสุดที่สามารถซื้อได้: $${minPrice}`,
                    minPrice: parseFloat(minPrice)
                };
            }

            // Handle successful JSON response
            if (typeof result === 'object' && result.activationId) {
                return {
                    success: true,
                    activationId: result.activationId,
                    phoneNumber: result.phoneNumber,
                    activationCost: result.activationCost,
                    currency: result.currency,
                    countryCode: result.countryCode,
                    canGetAnotherSms: result.canGetAnotherSms,
                    activationTime: result.activationTime,
                    activationOperator: result.activationOperator
                };
            }

            return {
                success: false,
                error: 'UNKNOWN_RESPONSE',
                message: `การตอบสนองที่ไม่รู้จัก: ${JSON.stringify(result)}`
            };

        } catch (error) {
            console.error('❌ SMS API getNumberV2 error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'GET_NUMBER_V2_ERROR',
                message: 'ไม่สามารถสั่งซื้อหมายเลขได้'
            };
        }
    }

    // Set status (3=Request another SMS, 6=Finish, 8=Cancel)
    async setStatus(activationId, status) {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    api_key: this.apiKey,
                    action: 'setStatus',
                    id: activationId,
                    status: status,
                    lang: this.lang
                },
                timeout: 10000
            });

            const result = response.data;

            if (result === 'NO_BALANCE') {
                return {
                    success: false,
                    error: 'NO_BALANCE',
                    message: 'ยอดเงินไม่เพียงพอ'
                };
            }

            if (result === 'ACCESS_CANCEL') {
                return {
                    success: true,
                    message: 'ยกเลิกการใช้งานเรียบร้อย'
                };
            }

            if (result === 'ACCESS_RETRY_GET') {
                return {
                    success: true,
                    message: 'รอรับ SMS ใหม่'
                };
            }

            if (result === 'ACCESS_ACTIVATION') {
                return {
                    success: true,
                    message: 'การใช้งานเสร็จสิ้น'
                };
            }

            if (result === 'CANNOT_BEFORE_2_MIN' || result === 'EARLY_CANCEL_DENIED') {
                return {
                    success: false,
                    error: 'CANNOT_BEFORE_2_MIN',
                    message: 'ไม่สามารถยกเลิกได้ภายใน 2 นาที'
                };
            }

            return {
                success: false,
                error: 'UNKNOWN_RESPONSE',
                message: `การตอบสนองที่ไม่รู้จัก: ${result}`
            };

        } catch (error) {
            console.error('❌ SMS API setStatus error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'SET_STATUS_ERROR',
                message: 'ไม่สามารถเปลี่ยนสถานะได้'
            };
        }
    }

    // Get status
    async getStatus(activationId) {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    api_key: this.apiKey,
                    action: 'getStatus',
                    id: activationId,
                    lang: this.lang
                },
                timeout: 10000
            });

            const result = response.data;

            if (result === 'STATUS_WAIT_CODE') {
                return {
                    success: true,
                    status: 'waiting',
                    message: 'รอรับ SMS'
                };
            }

            if (result === 'STATUS_CANCEL') {
                return {
                    success: true,
                    status: 'cancelled',
                    message: 'ยกเลิกแล้ว'
                };
            }

            if (result.startsWith('STATUS_OK:')) {
                const smsCode = result.split(':')[1];
                return {
                    success: true,
                    status: 'completed',
                    smsCode: smsCode,
                    message: 'ได้รับ SMS แล้ว'
                };
            }

            return {
                success: false,
                error: 'UNKNOWN_STATUS',
                message: `สถานะที่ไม่รู้จัก: ${result}`
            };

        } catch (error) {
            console.error('❌ SMS API getStatus error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'GET_STATUS_ERROR',
                message: 'ไม่สามารถตรวจสอบสถานะได้'
            };
        }
    }

    // Get current activations list
    async getCurrentActivationsList(status = null, limit = 100, order = 'id', orderBy = 'DESC') {
        try {
            const params = {
                api_key: this.apiKey,
                action: 'getCurrentActivationsList',
                limit: limit,
                order: order,
                orderBy: orderBy,
                lang: this.lang
            };

            if (status !== null) {
                params.status = status;
            }

            const response = await axios.get(this.baseUrl, {
                params: params,
                timeout: 10000
            });

            return {
                success: true,
                activations: response.data
            };

        } catch (error) {
            console.error('❌ SMS API getCurrentActivationsList error:', error.response?.data || error.message);
            return {
                success: false,
                error: 'GET_ACTIVATIONS_ERROR',
                message: 'ไม่สามารถโหลดรายการการใช้งานได้'
            };
        }
    }

    // Convert country name to country ID
    getCountryId(countryName) {
        const countryMap = {
            'Thailand': 52,
            'Russia': 0,
            'Ukraine': 1,
            'Kazakhstan': 2,
            'China': 3,
            'Philippines': 4,
            'Myanmar': 5,
            'Indonesia': 6,
            'Malaysia': 7,
            'Kenya': 8,
            'Tanzania': 9,
            'Vietnam': 10,
            'Kyrgyzstan': 11,
            'USA': 12,
            'Israel': 13,
            'Hong Kong': 14,
            'Poland': 15,
            'England': 16,
            'UK': 16,
            'Madagascar': 17,
            'Congo': 18,
            'Nigeria': 19,
            'Macau': 20,
            'Egypt': 21,
            'India': 22,
            'Ireland': 23,
            'Cambodia': 24,
            'Laos': 25,
            'Haiti': 26,
            'Côte d\'Ivoire': 27,
            'Gambia': 28,
            'Serbia': 29,
            'Yemen': 30,
            'South Africa': 31,
            'Romania': 32,
            'Colombia': 33,
            'Estonia': 34,
            'Azerbaijan': 35,
            'Canada': 36,
            'Morocco': 37,
            'Ghana': 38,
            'Argentina': 39,
            'Uzbekistan': 40,
            'Cameroon': 41,
            'Chad': 42,
            'Germany': 43,
            'Lithuania': 44,
            'Croatia': 45,
            'Sweden': 46,
            'Iraq': 47,
            'Netherlands': 48,
            'Latvia': 49,
            'Austria': 50,
            'Belarus': 51,
            'Saudi Arabia': 53,
            'Mexico': 54,
            'Taiwan': 55,
            'Spain': 56,
            'Iran': 57,
            'Algeria': 58,
            'Slovenia': 59,
            'Bangladesh': 60,
            'Senegal': 61,
            'Turkey': 62,
            'Czech Republic': 63,
            'Sri Lanka': 64,
            'Peru': 65,
            'Pakistan': 66,
            'New Zealand': 67,
            'Guinea': 68,
            'Mali': 69,
            'Venezuela': 70,
            'Ethiopia': 71,
            'Mongolia': 72,
            'Brazil': 73,
            'Afghanistan': 74,
            'Uganda': 75,
            'Angola': 76,
            'Cyprus': 77,
            'France': 78,
            'Mozambique': 80,
            'Nepal': 81,
            'Belgium': 82,
            'Bulgaria': 83,
            'Hungary': 84,
            'Moldova': 85,
            'Italy': 86,
            'Paraguay': 87,
            'Honduras': 88,
            'Tunisia': 89,
            'Nicaragua': 90,
            'Timor-Leste': 91,
            'Bolivia': 92,
            'Costa Rica': 93,
            'Guatemala': 94,
            'UNITED ARAB EMIRATES': 95,
            'Zimbabwe': 96,
            'Puerto Rico': 97,
            'Sudan': 98,
            'Togo': 99,
            'Kuwait': 100,
            'El Salvador': 101,
            'Libya': 102,
            'Jamaica': 103,
            'Trinidad and Tobago': 104,
            'Ecuador': 105,
            'Swaziland': 106,
            'Oman': 107,
            'Bosnia and Herzegovina': 108,
            'Dominican Republic': 109,
            'Qatar': 111,
            'Panama': 112,
            'Cuba': 113,
            'Mauritania': 114,
            'Sierra Leone': 115,
            'Jordan': 116,
            'Portugal': 117,
            'Barbados': 118,
            'Burundi': 119,
            'Benin': 120,
            'Brunei': 121,
            'Bahamas': 122,
            'Botswana': 123,
            'Belize': 124,
            'CAR': 125,
            'Dominica': 126,
            'Grenada': 127,
            'Georgia': 128,
            'Greece': 129,
            'Guinea-Bissau': 130,
            'Guyana': 131,
            'Iceland': 132,
            'Comoros': 133,
            'St. Kitts and Nevis': 134,
            'Liberia': 135,
            'Lesotho': 136,
            'Malawi': 137,
            'Namibia': 138,
            'Niger': 139,
            'Rwanda': 140,
            'Slovakia': 141,
            'Suriname': 142,
            'Tajikistan': 143,
            'Monaco': 144,
            'Bahrain': 145,
            'Reunion': 146,
            'Zambia': 147,
            'Armenia': 148,
            'Somalia': 149,
            'Congo': 150,
            'Chile': 151,
            'Burkina Faso': 152,
            'Lebanon': 153,
            'Gabon': 154,
            'Albania': 155,
            'Uruguay': 156,
            'Mauritius': 157,
            'Bhutan': 158,
            'Maldives': 159,
            'Guadeloupe': 160,
            'Turkmenistan': 161,
            'French Guiana': 162,
            'Finland': 163,
            'St. Lucia': 164,
            'Luxembourg': 165,
            'Saint Pierre and Miquelon': 166,
            'Equatorial Guinea': 167,
            'Djibouti': 168,
            'Saint Kitts and Nevis': 169,
            'Cayman Islands': 170,
            'Montenegro': 171,
            'Denmark': 172,
            'Switzerland': 173,
            'Norway': 174,
            'Australia': 175,
            'Eritrea': 176,
            'South Sudan': 177,
            'Sao Tome and Principe': 178,
            'Aruba': 179,
            'Montserrat': 180,
            'Anguilla': 181,
            'Northern Macedonia': 183,
            'Republic of Seychelles': 184,
            'New Caledonia': 185,
            'Cape Verde': 186,
            'Palestine': 188,
            'Fiji': 189,
            'South Korea': 190,
            'Western Sahara': 192,
            'Solomon Islands': 193,
            'Singapore': 196,
            'Tonga': 197,
            'American Samoa': 198,
            'Malta': 199,
            'Gibraltar': 666,
            'Bermuda': 668,
            'Japan': 670,
            'Syria': 672,
            'Faroe Islands': 673,
            'Martinique': 674,
            'Turks and Caicos Islands': 675,
            'St. Barthélemy': 676,
            'Nauru': 678,
            'Curaçao': 680,
            'Samoa': 681,
            'Vanuatu': 682,
            'Greenland': 683,
            'Kosovo': 684,
            'Liechtenstein': 685,
            'Sint Maarten': 686,
            'Niue': 687
        };

        return countryMap[countryName] || null;
    }

    // Convert operator name to operator code
    getOperatorCode(operatorName, countryId) {
        // Default operators for each country
        const operatorMap = {
            52: { // Thailand
                'any': 'any',
                'ais': 'ais',
                'dtac': 'dtac',
                'true': 'truemove',
                'cat': 'cat_mobile',
                'my': 'my'
            },
            0: { // Russia
                'any': 'any',
                'beeline': 'beeline',
                'megafon': 'megafon',
                'mts': 'mts',
                'tele2': 'tele2',
                'yota': 'yota'
            },
            6: { // Indonesia
                'any': 'any',
                'telkomsel': 'telkomsel',
                'indosat': 'indosat',
                'xl': 'xl',
                'three': 'three',
                'smartfren': 'smartfren'
            },
            10: { // Vietnam
                'any': 'any',
                'viettel': 'viettel',
                'mobifone': 'mobifone',
                'vinaphone': 'vinaphone',
                'vietnamobile': 'vietnamobile'
            }
        };

        const countryOperators = operatorMap[countryId] || { 'any': 'any' };
        return countryOperators[operatorName] || 'any';
    }
}

module.exports = SMSVerificationService;
