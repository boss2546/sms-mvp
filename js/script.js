// SMS Verification Service - Main Script
class SMSVerificationService {
    constructor() {
        this.API_BASE_URL = '/api'; // Use our proxy server
        this.BUSINESS_API_BASE = '/api'; // Business API endpoints
        this.API_KEY = '7ccb326980edc2bfec78dcd66326aad7';
        this.LANG = 'en';
        
        this.countriesData = [];
        this.operatorsData = [];
        this.servicesData = [];
        this.filteredServices = [];
        this.currentCountry = null;
        this.currentOperator = 'any';
        this.activations = [];
        this.servicesToShow = 999999; // Show all services
        this.maxServicesToShow = 999999;
        this.timerInterval = null; // Timer for countdown
        this.statusCheckInterval = null; // Timer for automatic status checking
        
        // Business features
        this.walletBalance = 0;
        this.currentSessionId = this.generateSessionId();
        this.topupModal = null;
        this.topupStatusModal = null;
        this.topupStatusInterval = null;
        
        // Authentication features
        this.currentUser = null;
        this.accessToken = null;
        this.authModal = null;
        this.isAuthenticated = false;
        
        // Stability improvements
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        this.requestTimeout = 10000; // 10 seconds
        this.isLoading = false;
        
        // Service name translations
        this.serviceTranslations = {
            'Google,youtube,Gmail': 'Google, YouTube, Gmail',
            'Grab': 'Grab',
            'Facebook': 'Facebook',
            'WeChat': 'WeChat',
            'TikTok/Douyin': 'TikTok/Douyin',
            'Line msg': 'Line',
            'Shopee': 'Shopee',
            'Lazada': 'Lazada',
            'Telegram': 'Telegram',
            'RedBook': 'RedBook',
            'Imo': 'Imo',
            'WhatsApp': 'WhatsApp',
            'Discord': 'Discord',
            'BytePlus': 'BytePlus',
            'Blizzard': 'Blizzard',
            'Bolt': 'Bolt',
            'Tinder': 'Tinder',
            'Claude': 'Claude',
            'Signal': 'Signal',
            'Вконтакте (vk.ru)': 'VKontakte',
            'Apple': 'Apple',
            'TrueMoney': 'TrueMoney',
            'Microsoft': 'Microsoft',
            'Ticket Plus': 'Ticket Plus',
            'Instagram+Threads': 'Instagram+Threads',
            'Bumble': 'Bumble',
            'NHN Cloud': 'NHN Cloud',
            'TrueID': 'TrueID',
            'Netflix': 'Netflix',
            'CupidMedia': 'CupidMedia',
            'KeeTa 美团': 'KeeTa',
            'Happn': 'Happn',
            'Deliveroo': 'Deliveroo',
            'Payoneer': 'Payoneer',
            'Viber': 'Viber',
            'JDcom': 'JD.com',
            'AIS': 'AIS',
            'XM': 'XM',
            'eBay - Kleinanzeigen.de': 'eBay Kleinanzeigen',
            'Tencent QQ': 'QQ',
            'GNJOY': 'GNJOY',
            'AsianDating': 'AsianDating',
            'Amazon': 'Amazon',
            'Shopback': 'Shopback',
            '快手 Kuaishou': 'Kuaishou',
            'Xpress Super App': 'Xpress Super App',
            'InternationalCupid': 'InternationalCupid',
            'Fiverr': 'Fiverr',
            'TanTan': 'TanTan',
            'Yahoo': 'Yahoo',
            'Twitch': 'Twitch',
            'ProtonMail': 'ProtonMail',
            'FreeNow': 'FreeNow',
            'Baidu': 'Baidu',
            'Botim': 'Botim',
            'BigC': 'BigC',
            'mail.com': 'mail.com',
            'Redbubble': 'Redbubble',
            'WePoker': 'WePoker',
            'PayPal': 'PayPal',
            'Wise': 'Wise',
            'Sonline': 'Sonline',
            'Noon': 'Noon',
            'AliExpress': 'AliExpress',
            '7-Eleven': '7-Eleven',
            'Uber': 'Uber',
            'Grindr': 'Grindr',
            'Truecaller': 'Truecaller',
            'Ocard': 'Ocard',
            'MosGram': 'MosGram',
            'Snapchat': 'Snapchat',
            'Shopify': 'Shopify',
            'Naver': 'Naver',
            'Alipay/Alibaba': 'Alipay/Alibaba',
            'Rothmans': 'Rothmans',
            'Careem': 'Careem',
            'ChatGPT (openAI.com)': 'ChatGPT',
            'Airbnb': 'Airbnb',
            'Foodpanda': 'Foodpanda',
            'X.com (Twitter)': 'X (Twitter)',
            'Steam': 'Steam',
            'LinkedIN': 'LinkedIn',
            'Weibo': 'Weibo',
            'Bilibili': 'Bilibili',
            'Yalla': 'Yalla',
            'Zalo': 'Zalo',
            'Яндекс (Yandex)': 'Yandex',
            'AOL': 'AOL',
            'Michat': 'Michat',
            'Kimi': 'Kimi',
            'KKTIX': 'KKTIX',
            'Brevo': 'Brevo',
            'Supercell': 'Supercell',
            'Air India': 'Air India',
            'Anthropic': 'Anthropic',
            'Atlas Earth': 'Atlas Earth',
            'Chubb': 'Chubb',
            'COYO': 'COYO',
            'Coze': 'Coze',
            'DeepSeek': 'DeepSeek'
        };
        
        this.init();
    }

    // Translate service name to Thai
    translateServiceName(serviceName) {
        return this.serviceTranslations[serviceName] || serviceName;
    }

    init() {
        console.log('🚀 บริการรับ SMS เริ่มทำงาน');
        this.bindEvents();
        this.startTimer();
    }

    // Generate unique session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Load user's activations from database
    async loadUserActivations() {
        try {
            console.log('📱 กำลังโหลดรายการใช้งานของผู้ใช้...');
            
            // Try database first
            try {
                const response = await this.makeRequest('/api/activations', 'GET');
                
                if (response.activations && response.activations.length > 0) {
                    console.log('📱 พบรายการใช้งานจากฐานข้อมูล:', response.activations.length, 'รายการ');
                    
                    // Clear existing activations
                    this.activations = [];
                    
                    // Add each activation to the display
                    for (const activation of response.activations) {
                        this.addActivation({
                            orderId: activation.orderId,
                            serviceId: activation.serviceId,
                            serviceName: activation.serviceName || activation.serviceId,
                            activationId: activation.activationId,
                            phoneNumber: activation.phoneNumber,
                            price: activation.finalPriceTHB,
                            status: activation.status,
                            createdAt: activation.createdAt,
                            receivedSms: activation.receivedSms
                        });
                    }
                    
                    console.log('✅ โหลดรายการใช้งานจากฐานข้อมูลสำเร็จ');
                    return;
                }
            } catch (dbError) {
                console.log('⚠️ ไม่สามารถโหลดจากฐานข้อมูลได้:', dbError.message);
            }
            
            // Fallback: Load from localStorage
            console.log('📱 โหลดรายการใช้งานจาก localStorage...');
            const savedActivations = localStorage.getItem('sms_activations');
            if (savedActivations) {
                try {
                    const activations = JSON.parse(savedActivations);
                    if (Array.isArray(activations) && activations.length > 0) {
                        console.log('📱 พบรายการใช้งานจาก localStorage:', activations.length, 'รายการ');
                        
                        // Clear existing activations
                        this.activations = [];
                        
                        // Add each activation to the display
                        for (const activation of activations) {
                            this.addActivation({
                                orderId: activation.orderId,
                                serviceId: activation.serviceId,
                                serviceName: activation.serviceName || activation.serviceId,
                                activationId: activation.activationId,
                                phoneNumber: activation.phoneNumber,
                                price: activation.price,
                                status: activation.status,
                                createdAt: activation.createdAt,
                                receivedSms: activation.receivedSms
                            });
                        }
                        
                        console.log('✅ โหลดรายการใช้งานจาก localStorage สำเร็จ');
                        return;
                    }
                } catch (parseError) {
                    console.error('❌ Error parsing localStorage data:', parseError);
                }
            }
            
            console.log('📱 ไม่พบรายการใช้งาน');
            
        } catch (error) {
            console.error('❌ Error loading user activations:', error);
            // Don't show error message to user as this is not critical
        }
    }

    // Enhanced API call with retry mechanism
    async makeApiCall(url, options = {}) {
        const maxRetries = this.retryAttempts;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 เรียก API ครั้งที่ ${attempt}/${maxRetries}: ${url}`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.text();
                
                // Check for API-specific errors
                if (data.includes('BAD_KEY')) {
                    throw new Error('Invalid API key');
                }
                if (data.includes('ERROR_API')) {
                    throw new Error('API processing error');
                }
                if (data.includes('REQUEST_LIMIT')) {
                    throw new Error('Request rate limit exceeded');
                }
                
                console.log(`✅ เรียก API สำเร็จในครั้งที่ ${attempt}`);
                return data;
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ เรียก API ครั้งที่ ${attempt} ล้มเหลว:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = this.retryDelay * attempt; // Exponential backoff
                    console.log(`⏳ รอ ${delay}ms แล้วลองใหม่...`);
                    await this.sleep(delay);
                }
            }
        }
        
        throw new Error(`API call failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
    }

    // Sleep utility for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    bindEvents() {
        // Country selection
        document.getElementById('countrySelect').addEventListener('change', (e) => {
            this.handleCountryChange(parseInt(e.target.value));
        });

        // Operator selection
        document.getElementById('operatorSelect').addEventListener('change', (e) => {
            this.handleOperatorChange(e.target.value);
        });

        // Service filter
        document.getElementById('serviceFilter').addEventListener('change', (e) => {
            this.filterServices(e.target.value);
        });

        // QR Payment events (replaces old topup system)
        document.getElementById('qrPaymentBtn').addEventListener('click', () => {
            if (!this.isAuthenticated) {
                this.showAuthModal('login');
            } else {
                this.showQRPaymentModal();
            }
        });

        // Old topup system removed - using QR payment only

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });
    }

    async loadInitialData() {
        try {
            this.showLoading();
            console.log('📡 กำลังโหลดข้อมูลเริ่มต้น...');
            
                // Try to load from API first
                try {
                    await this.loadCountries();
                
                // Set default country to Thailand (ID: 7)
                this.setDefaultCountry();
                
                // Load services for the default country
                if (this.currentCountry) {
                    await this.loadServices(this.currentCountry, 'any');
                }
                
                // Load user's activations if authenticated
                if (this.isAuthenticated) {
                    await this.loadUserActivations();
                }
                
                this.hideLoading();
                this.showMessage('✅ ข้อมูลโหลดจาก API สำเร็จ', 'success');
                
            } catch (apiError) {
                console.warn('API failed, using fallback data:', apiError);
                this.loadFallbackData();
                this.hideLoading();
                this.showMessage('⚠️ ใช้ข้อมูลจำลองเนื่องจากไม่สามารถเชื่อมต่อ API ได้', 'info');
            }
            
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.loadFallbackData();
            this.hideLoading();
            this.showMessage('❌ ใช้ข้อมูลจำลอง', 'error');
        }
    }

    async loadCountries() {
        try {
            console.log('🌍 กำลังโหลดประเทศ...');
            this.showLoading('กำลังโหลดประเทศ...');
            
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getCountryAndOperators&lang=${this.LANG}`;
            const data = await this.makeApiCall(url);
            
            console.log('การตอบสนองประเทศ:', data);
            const countries = JSON.parse(data);
            this.countriesData = countries;
            
            this.updateCountrySelect(countries);
            this.updateStatistics();
            
            console.log(`✅ โหลดประเทศ ${countries.length} ประเทศ`);
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ ข้อผิดพลาดในการโหลดประเทศ:', error);
            this.hideLoading();
            throw error;
        }
    }

    setDefaultCountry() {
        // Find Thailand in the countries data
        const thailand = this.countriesData.find(country => 
            country.name.toLowerCase().includes('thailand') || 
            country.name.toLowerCase().includes('thai')
        );
        
        if (thailand) {
            this.currentCountry = thailand.id;
            document.getElementById('countrySelect').value = thailand.id;
            this.loadOperators(thailand.id);
        } else {
            // Fallback to first country
            if (this.countriesData.length > 0) {
                this.currentCountry = this.countriesData[0].id;
                document.getElementById('countrySelect').value = this.countriesData[0].id;
                this.loadOperators(this.countriesData[0].id);
            }
        }
    }

    async loadOperators(countryId) {
        try {
            console.log(`📱 กำลังโหลดผู้ให้บริการสำหรับประเทศ ${countryId}...`);
            
            const country = this.countriesData.find(c => c.id === countryId);
            if (!country) {
                throw new Error('ไม่พบประเทศ');
            }
            
            const operators = Object.keys(country.operators).map(key => ({
                id: key,
                name: country.operators[key]
            }));
            
            this.operatorsData = operators;
            this.updateOperatorSelect(operators);
            
            // Set to Random (any) by default
            this.currentOperator = 'any';
            document.getElementById('operatorSelect').value = 'any';
            
            // Load services for this country
            await this.loadServices(countryId, 'any');
            
            console.log(`✅ โหลดผู้ให้บริการ ${operators.length} รายการ`);
            
        } catch (error) {
            console.error('❌ ข้อผิดพลาดในการโหลดผู้ให้บริการ:', error);
            throw error;
        }
    }

    async loadServices(countryId, operatorId) {
        try {
            console.log(`🔧 กำลังโหลดบริการสำหรับประเทศ ${countryId}, ผู้ให้บริการ ${operatorId}...`);
            this.showLoading('กำลังโหลดบริการ...');
            
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getServicesAndCost&country=${countryId}&operator=${operatorId}&lang=${this.LANG}`;
            const data = await this.makeApiCall(url);
            
            console.log('การตอบสนองบริการ:', data);
            const services = JSON.parse(data);
            this.servicesData = services;
            this.filteredServices = [...services];
            
            await this.updateServicesDisplay();
            this.updateStatistics();
            
            console.log(`✅ โหลดบริการ ${services.length} รายการ`);
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ ข้อผิดพลาดในการโหลดบริการ:', error);
            throw error;
        }
    }


    updateCountrySelect(countries) {
        const countrySelect = document.getElementById('countrySelect');
        countrySelect.innerHTML = '';
        
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.id;
            option.textContent = country.name;
            countrySelect.appendChild(option);
        });
    }

    updateOperatorSelect(operators) {
        const operatorSelect = document.getElementById('operatorSelect');
        operatorSelect.innerHTML = '';
        
        // Add Random option first
        const randomOption = document.createElement('option');
        randomOption.value = 'any';
        randomOption.textContent = 'Random';
        operatorSelect.appendChild(randomOption);
        
        operators.forEach(operator => {
            if (operator.id !== 'any') {
                const option = document.createElement('option');
                option.value = operator.id;
                option.textContent = operator.name;
                operatorSelect.appendChild(option);
            }
        });
    }

    async updateServicesDisplay() {
        const container = document.getElementById('servicesGrid');
        const showMoreBtn = document.getElementById('showMoreBtn');
        
        if (this.filteredServices.length === 0) {
            container.innerHTML = '<div class="loading">ไม่มีบริการที่พร้อมใช้งาน</div>';
            showMoreBtn.style.display = 'none';
            return;
        }
        
        // Show loading
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดบริการ...</div>';
        
        // Create service cards synchronously for better performance
        container.innerHTML = '';
        this.filteredServices.forEach(service => {
            const card = this.createServiceCardSync(service);
            container.appendChild(card);
        });
        
        // Hide "Show More" button
        showMoreBtn.style.display = 'none';
    }

    createServiceCardSync(service) {
        const card = document.createElement('div');
        card.className = 'service-card';
        
        // Get quantity from API response or use fallback
        const quantity = parseInt(service.quantity || service.count || 200);
        const isAvailable = quantity > 0;
        
        // Determine service status
        let status = 'available';
        let statusText = 'พร้อมใช้งาน';
        
        if (quantity === 0) {
            status = 'out-of-stock';
            statusText = 'หมดสต็อก';
        } else if (quantity < 10) {
            status = 'low-stock';
            statusText = 'สต็อกน้อย';
        }

        // Use cost from API response or fallback pricing
        const apiPrice = parseFloat(service.cost || service.price);
        const estimatedPrice = apiPrice ? (apiPrice * 35.5 + 10).toFixed(2) : '15.00';
        let thbPrice = estimatedPrice;
        let priceNote = 'ราคาประมาณ';
        let fxRate = 35.5;
        
        card.innerHTML = `
            <div class="service-header">
                <div>
                    <div class="service-name">${this.translateServiceName(service.name)}</div>
                    <div class="service-quantity">มีหมายเลข ${quantity} หมายเลข</div>
                    <div class="service-status ${status}">${statusText}</div>
                </div>
                <div class="service-price">
                    <div class="price-thb">฿${thbPrice}</div>
                    <div class="price-note">${priceNote}</div>
                </div>
            </div>
            <div class="service-actions">
                <button class="btn btn-primary buy-btn" 
                        data-service-id="${service.id}" 
                        data-service-name="${service.name}"
                        data-price="${thbPrice}"
                        ${!isAvailable ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart"></i> ซื้อบริการ
                </button>
            </div>
        `;

        // Add click event listener
        const buyBtn = card.querySelector('.buy-btn');
        if (buyBtn && isAvailable) {
            buyBtn.addEventListener('click', () => this.handleBuyService(service.id, service.name, thbPrice));
        }

        return card;
    }

    async createServiceCard(service) {
        const card = document.createElement('div');
        card.className = 'service-card';
        
        // Get quantity from API response or use fallback
        const quantity = parseInt(service.quantity || service.count || 200);
        const isAvailable = quantity > 0;
        
        // Determine service status
        let status = 'available';
        let statusText = 'พร้อมใช้งาน';
        
        if (quantity === 0) {
            status = 'out-of-stock';
            statusText = 'หมดสต็อก';
        } else if (quantity < 10) {
            status = 'low-stock';
            statusText = 'สต็อกน้อย';
        }

        // Use cost from API response or fallback pricing
        const apiPrice = parseFloat(service.cost || service.price);
        const estimatedPrice = apiPrice ? (apiPrice * 35.5 + 10).toFixed(2) : '15.00';
        let thbPrice = estimatedPrice;
        let priceNote = 'ราคาประมาณ';
        let fxRate = 35.5;
        
        card.innerHTML = `
            <div class="service-header">
                <div>
                    <div class="service-name">${this.translateServiceName(service.name)}</div>
                    <div class="service-quantity">มีหมายเลข ${quantity} หมายเลข</div>
                    <div class="service-status ${status}">${statusText}</div>
                </div>
                <div class="service-price">
                    <div class="price-thb">฿${thbPrice}</div>
                    <div class="price-note">${priceNote}</div>
                </div>
            </div>
            <div class="service-actions">
                <button class="btn-buy" ${!isAvailable ? 'disabled' : ''} data-service='${JSON.stringify(service)}'>
                    ${isAvailable ? 'ซื้อ' : 'หมดสต็อก'}
                </button>
            </div>
        `;
        
        // Add click event for buy button
        const buyBtn = card.querySelector('.btn-buy');
        buyBtn.addEventListener('click', () => {
            if (isAvailable) {
                this.handleBuyService(service);
            }
        });
        
        return card;
    }

    updateStatistics() {
        document.getElementById('totalServices').textContent = this.filteredServices.length;
    }

    handleCountryChange(countryId) {
        this.currentCountry = countryId;
        
        try {
            this.loadOperators(countryId);
        } catch (error) {
            console.error('❌ Error:', error);
            this.showMessage('❌ ไม่สามารถโหลดข้อมูลได้', 'error');
        }
    }

    handleOperatorChange(operatorId) {
        this.currentOperator = operatorId;
        
        if (this.currentCountry) {
            try {
                this.loadServices(this.currentCountry, operatorId);
            } catch (error) {
                console.error('❌ Error:', error);
                this.showMessage('❌ ไม่สามารถโหลดข้อมูลได้', 'error');
            }
        }
    }

    async filterServices(category) {
        if (category === 'all') {
            this.filteredServices = [...this.servicesData];
        } else {
            // Simple category filtering based on service name patterns
            this.filteredServices = this.servicesData.filter(service => {
                const name = service.name.toLowerCase();
                switch (category) {
                    case 'social':
                        return name.includes('facebook') || name.includes('instagram') || 
                               name.includes('twitter') || name.includes('telegram') || 
                               name.includes('whatsapp') || name.includes('tiktok') ||
                               name.includes('snapchat') || name.includes('discord');
                    case 'finance':
                        return name.includes('paypal') || name.includes('wise') || 
                               name.includes('skrill') || name.includes('neteller') ||
                               name.includes('binance') || name.includes('coinbase');
                    case 'gaming':
                        return name.includes('steam') || name.includes('discord') || 
                               name.includes('twitch') || name.includes('blizzard') ||
                               name.includes('epic') || name.includes('origin');
                    case 'shopping':
                        return name.includes('amazon') || name.includes('ebay') || 
                               name.includes('shopee') || name.includes('lazada') ||
                               name.includes('alibaba') || name.includes('taobao');
                    default:
                        return true;
                }
            });
        }
        
        await this.updateServicesDisplay();
        this.updateStatistics();
    }

    async handleBuyService(serviceId, serviceName, price) {
        console.log('🛒 กำลังซื้อบริการ:', serviceId, serviceName, price);
        
        // Check if user is authenticated
        if (!this.isAuthenticated) {
            this.showAuthModal('login');
            return;
        }

        // Check if user has sufficient balance
        if (this.walletBalance < parseFloat(price)) {
            this.showMessage(`เครดิตไม่เพียงพอ — โปรดเติมเงิน\nยอดปัจจุบัน: ฿${this.walletBalance.toFixed(2)}\nต้องการ: ฿${price}`, 'error');
            this.showQRPaymentModal(parseFloat(price), serviceName);
            return;
        }

        // Confirm purchase
        const confirmed = confirm(`ต้องการซื้อบริการ ${serviceName}\nราคา ฿${price} หรือไม่?`);
        if (!confirmed) return;

        try {
            // Make purchase request
            const response = await this.makeRequest('/api/purchase', 'POST', {
                serviceId: serviceId,
                operatorCode: this.currentOperator,
                countryCode: this.currentCountry
            });

            // Update wallet balance
            this.walletBalance = response.balance;
            this.updateHeaderAuth();

            // Add to activations display
            this.addActivation({
                orderId: response.orderId,
                serviceId: serviceId,
                serviceName: serviceName,
                activationId: response.activationId,
                phoneNumber: response.phoneNumber,
                price: response.finalPriceTHB,
                status: 'active',
                createdAt: response.createdAt
            });

            // Show success message
            this.showMessage(`ซื้อสำเร็จ!\nหมายเลข: ${response.phoneNumber}\nID: ${response.activationId}`, 'success');

            // Scroll to activations section
            document.getElementById('activationSection')?.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('Purchase failed:', error);
            
            if (error.message.includes('INSUFFICIENT_CREDIT')) {
                this.showMessage('เครดิตไม่เพียงพอ — โปรดเติมเงิน', 'error');
                this.showQRPaymentModal(parseFloat(price), serviceName);
            } else if (error.message.includes('PRICE_CHANGED')) {
                // Handle price change error
                const errorData = error.response?.data || {};
                const oldPrice = errorData.oldPrice || price;
                const newPrice = errorData.newPrice || price;
                const changePercent = ((newPrice - oldPrice) / oldPrice * 100).toFixed(1);
                
                const confirmMessage = `ราคาเปลี่ยนแปลง ${changePercent}%\n\nราคาเดิม: ฿${oldPrice.toFixed(2)}\nราคาใหม่: ฿${newPrice.toFixed(2)}\n\nต้องการซื้อในราคาใหม่หรือไม่?`;
                
                if (confirm(confirmMessage)) {
                    // Retry purchase with new price
                    this.showMessage('กำลังซื้อในราคาใหม่...', 'info');
                    setTimeout(() => {
                        this.handleBuyService(serviceId, serviceName, newPrice);
                    }, 1000);
                    return;
                } else {
                    this.showMessage('ยกเลิกการซื้อเนื่องจากราคาเปลี่ยนแปลง', 'info');
                    return;
                }
            } else if (error.message.includes('NO_NUMBERS')) {
                // Handle no numbers available error with better message
                let message = `ไม่มีหมายเลขว่างสำหรับบริการ ${serviceName} ในประเทศ/ผู้ให้บริการที่เลือก`;
                if (error.response?.data?.suggestions) {
                    message += '\n\nแนะนำ:\n• ' + error.response.data.suggestions.join('\n• ');
                } else {
                    message += '\n\nแนะนำ:\n• ลองเลือกประเทศอื่น\n• ลองเลือกผู้ให้บริการอื่น\n• รอสักครู่แล้วลองใหม่';
                }
                this.showMessage(message, 'warning');
                return;
            } else if (error.message.includes('NO_SERVICES')) {
                // Handle no services available error
                let message = 'ไม่มีบริการใดๆ ที่พร้อมใช้งานในประเทศนี้';
                if (error.response?.data?.suggestions) {
                    message += '\n\nแนะนำ:\n• ' + error.response.data.suggestions.join('\n• ');
                } else {
                    message += '\n\nแนะนำ:\n• เปลี่ยนประเทศ\n• ลองใหม่ภายหลัง\n• ติดต่อเจ้าหน้าที่';
                }
                this.showMessage(message, 'warning');
                return;
            } else if (error.message.includes('SERVICE_NOT_FOUND')) {
                // Handle service not found error
                let message = `ไม่พบบริการ ${serviceName} ในระบบ`;
                if (error.response?.data?.suggestions) {
                    message += '\n\nแนะนำ:\n• ' + error.response.data.suggestions.join('\n• ');
                } else {
                    message += '\n\nแนะนำ:\n• ลองเลือกบริการอื่น\n• รีเฟรชหน้าจอ\n• ติดต่อเจ้าหน้าที่';
                }
                this.showMessage(message, 'warning');
                return;
            } else {
                // Improved general error handling
                let errorMessage = `ไม่สามารถซื้อบริการ ${serviceName} ได้`;
                
                // Try to extract meaningful error from API response
                try {
                    if (error.response && error.response.data) {
                        const errorData = error.response.data;
                        if (errorData.message) {
                            errorMessage = errorData.message;
                        } else if (errorData.error) {
                            errorMessage = this.getErrorMessage(errorData.error, serviceName);
                        }
                    } else if (error.message) {
                        errorMessage = this.getErrorMessage(error.message, serviceName);
                    }
                } catch (parseError) {
                    console.error('Error parsing error message:', parseError);
                }
                
                this.showMessage(errorMessage, 'error');
            }
        }
    }

    // Helper function to get user-friendly error messages
    getErrorMessage(errorCode, serviceName = '') {
        const errorMessages = {
            'NO_BALANCE': 'ยอดเงินไม่เพียงพอ กรุณาเติมเงินก่อน',
            'NO_NUMBERS': `ไม่มีหมายเลขว่างสำหรับบริการ ${serviceName} กรุณาลองใหม่หรือเปลี่ยนประเทศ/ผู้ให้บริการ`,
            'NO_SERVICES': 'ไม่มีบริการใดๆ ที่พร้อมใช้งานในประเทศนี้ กรุณาเปลี่ยนประเทศ',
            'SERVICE_NOT_FOUND': `ไม่พบบริการ ${serviceName} ในระบบ กรุณาลองเลือกบริการอื่น`,
            'PRICE_CHANGED': 'ราคาเปลี่ยนแปลง กรุณาลองใหม่',
            'INSUFFICIENT_CREDIT': 'เครดิตไม่เพียงพอ กรุณาเติมเงินก่อน',
            'VALIDATION_ERROR': 'ข้อมูลไม่ครบถ้วน กรุณาตรวจสอบอีกครั้ง',
            'INTERNAL_ERROR': 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่ภายหลัง',
            'PURCHASE_FAILED': `ไม่สามารถซื้อบริการ ${serviceName} ได้ กรุณาลองใหม่`,
            'SERVICE_CHECK_FAILED': 'ไม่สามารถตรวจสอบบริการได้ กรุณาลองใหม่',
            'CREDIT_DEDUCTION_FAILED': 'ไม่สามารถหักเงินได้ กรุณาลองใหม่',
            'WRONG_MAX_PRICE': 'ราคาต่ำสุดที่สามารถซื้อได้เกินกว่าที่กำหนด',
            'CANNOT_BEFORE_2_MIN': 'ไม่สามารถยกเลิกได้ภายใน 2 นาที',
            'ORDER_CREATION_FAILED': 'ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่',
            'ACTIVATION_CREATION_FAILED': 'ไม่สามารถสร้างการใช้งานได้ กรุณาลองใหม่',
            'ACCESS_CANCEL': 'ยกเลิกการใช้งานเรียบร้อย',
            'ACCESS_RETRY_GET': 'รอรับ SMS ใหม่',
            'ACCESS_ACTIVATION': 'การใช้งานเสร็จสิ้น',
            'STATUS_WAIT_CODE': 'รอรับ SMS',
            'STATUS_CANCEL': 'ยกเลิกแล้ว',
            'STATUS_OK': 'ได้รับ SMS แล้ว',
            'BALANCE_ERROR': 'ไม่สามารถตรวจสอบยอดเงินได้',
            'COUNTRIES_ERROR': 'ไม่สามารถโหลดรายการประเทศได้',
            'PRICES_ERROR': 'ไม่สามารถดึงราคาปัจจุบันได้',
            'SERVICES_ERROR': 'ไม่สามารถโหลดรายการบริการได้',
            'GET_NUMBER_ERROR': 'ไม่สามารถสั่งซื้อหมายเลขได้',
            'SET_STATUS_ERROR': 'ไม่สามารถเปลี่ยนสถานะได้',
            'GET_STATUS_ERROR': 'ไม่สามารถตรวจสอบสถานะได้'
        };

        // If it's a known error code, return the user-friendly message
        if (errorMessages[errorCode]) {
            return errorMessages[errorCode];
        }

        // If it contains error code in the message, try to extract it
        for (const [code, message] of Object.entries(errorMessages)) {
            if (errorCode.includes(code)) {
                return message;
            }
        }

        // Default message for unknown errors
        return `เกิดข้อผิดพลาด: ${errorCode}`;
    }

    async handleNoNumbersAvailable(service) {
        console.log('🔄 ไม่มีหมายเลขที่ใช้ได้ กำลังอัปเดตราคา...');
        
        // Show loading modal
        this.showPriceRefreshModal();
        
        try {
            // Get updated prices for this specific service
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getServicesAndCost&country=${this.currentCountry}&operator=${this.currentOperator}&lang=${this.LANG}`;
            
            console.log('📡 กำลังอัปเดตราคา:', url);
            const data = await this.makeApiCall(url);
            console.log('📄 การตอบสนองราคาที่อัปเดต:', data);
            
            if (data.includes('BAD_KEY')) {
                throw new Error('Invalid API key');
            }
            
            const services = JSON.parse(data);
            const updatedService = services.find(s => s.id === service.id);
            
            if (!updatedService) {
                this.hidePriceRefreshModal();
                this.showMessage('ไม่พบบริการในราคาที่อัปเดต', 'error');
                return;
            }
            
            // Hide loading modal
            this.hidePriceRefreshModal();
            
            // Show confirmation dialog
            const confirmed = await this.showPriceUpdateDialog(service, updatedService);
            
            if (confirmed) {
                // Try to buy with updated service data
                await this.handleBuyService(updatedService);
            }
            
        } catch (error) {
            console.error('❌ ข้อผิดพลาดในการอัปเดตราคา:', error);
            this.hidePriceRefreshModal();
            this.showMessage(`ไม่สามารถอัปเดตราคาได้: ${error.message}`, 'error');
        }
    }

    showPriceRefreshModal() {
        const modal = document.createElement('div');
        modal.id = 'priceRefreshModal';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Refreshing Prices</h3>
                </div>
                <div class="modal-body">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <p>กำลังดึงราคาล่าสุดสำหรับ ${this.currentCountry ? this.countriesData.find(c => c.id === this.currentCountry)?.name : 'ประเทศที่เลือก'}...</p>
                </div>
            </div>
        `;
        
        // Add modal styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        `;
        
        document.body.appendChild(modal);
    }

    hidePriceRefreshModal() {
        const modal = document.getElementById('priceRefreshModal');
        if (modal) {
            modal.remove();
        }
    }

    async showPriceUpdateDialog(oldService, newService) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.id = 'priceUpdateModal';
            modal.className = 'modal active';
            
            const oldPrice = parseFloat(oldService.price);
            const newPrice = parseFloat(newService.price);
            const oldQuantity = parseInt(oldService.quantity);
            const newQuantity = parseInt(newService.quantity);
            
            const priceChanged = oldPrice !== newPrice;
            const quantityChanged = oldQuantity !== newQuantity;
            
            let changeText = '';
            if (priceChanged && quantityChanged) {
                changeText = `ราคา: $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)}<br>จำนวนที่มี: ${oldQuantity} → ${newQuantity}`;
            } else if (priceChanged) {
                changeText = `ราคา: $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)}`;
            } else if (quantityChanged) {
                changeText = `จำนวนที่มี: ${oldQuantity} → ${newQuantity}`;
            } else {
                changeText = 'ไม่พบการเปลี่ยนแปลง';
            }
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>ราคาอัปเดตแล้ว</h3>
                    </div>
                    <div class="modal-body">
                        <div class="service-info">
                            <h4>${this.translateServiceName(newService.name)}</h4>
                            <div class="price-info">
                                <div class="current-price">$${newPrice.toFixed(2)}</div>
                                <div class="quantity-info">มีหมายเลข ${newQuantity} หมายเลข</div>
                            </div>
                            ${changeText !== 'ไม่พบการเปลี่ยนแปลง' ? `
                                <div class="changes">
                                    <strong>การเปลี่ยนแปลง:</strong><br>
                                    ${changeText}
                                </div>
                            ` : ''}
                        </div>
                        <p>คุณต้องการซื้อบริการนี้ในราคาที่อัปเดตแล้วหรือไม่?</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="this.closest('.modal').remove(); window.smsService.resolvePriceUpdate(false);">
                            ยกเลิก
                        </button>
                        <button class="btn btn-primary" onclick="this.closest('.modal').remove(); window.smsService.resolvePriceUpdate(true);">
                            ซื้อเลย
                        </button>
                    </div>
                </div>
            `;
            
            // Add modal styles
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;
            
            // Store resolve function
            window.smsService.resolvePriceUpdate = resolve;
            
            document.body.appendChild(modal);
        });
    }

    async checkActivationStatus(activationId) {
        try {
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getStatus&id=${activationId}&lang=${this.LANG}`;
            const result = await this.makeApiCall(url);
            console.log('📄 การตอบสนองสถานะ:', result);
            
            if (result === 'STATUS_WAIT_CODE') {
                this.showMessage('ยังรอรับ SMS อยู่', 'info');
                return { status: 'waiting', code: null };
            } else if (result === 'STATUS_CANCEL') {
                this.showMessage('การใช้งานถูกยกเลิก', 'info');
                // Remove from activations
                this.activations = this.activations.filter(a => a.id !== parseInt(activationId));
                this.updateActivationsDisplay();
                return { status: 'cancelled', code: null };
            } else if (result.startsWith('STATUS_OK:')) {
                const code = result.split(':')[1];
                this.showMessage(`ได้รับ SMS แล้ว! รหัส: ${code}`, 'success');
                
                // Update activation status
                const activation = this.activations.find(a => a.id === parseInt(activationId));
                if (activation) {
                    activation.status = 'completed';
                    activation.smsCode = code;
                    this.updateActivationsDisplay();
                }
                
                return { status: 'completed', code: code };
            }
            
            this.showMessage(`สถานะไม่ทราบ: ${result}`, 'error');
            return { status: 'unknown', code: null };
            
        } catch (error) {
            console.error('❌ ข้อผิดพลาดในการตรวจสอบสถานะ:', error);
            this.showMessage(`ข้อผิดพลาด: ${error.message}`, 'error');
            return { status: 'error', code: null };
        }
    }

    async cancelActivation(activationId) {
        try {
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=setStatus&id=${activationId}&status=8&lang=${this.LANG}`;
            const result = await this.makeApiCall(url);
            console.log('📄 การตอบสนองการยกเลิก:', result);
            
            if (result === 'ACCESS_CANCEL') {
                // Remove from activations
                this.activations = this.activations.filter(a => a.id !== parseInt(activationId));
                this.updateActivationsDisplay();
                this.showMessage('ยกเลิกการใช้งานแล้ว', 'success');
            } else if (result === 'CANNOT_BEFORE_2_MIN') {
                this.showMessage('ไม่สามารถยกเลิกได้ภายใน 2 นาที', 'error');
            } else {
                this.showMessage(`การยกเลิกล้มเหลว: ${result}`, 'error');
            }
            
        } catch (error) {
            console.error('❌ Error cancelling activation:', error);
            this.showMessage(`ข้อผิดพลาด: ${error.message}`, 'error');
        }
    }


    startTimer() {
        // Clear existing timers
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
        
        // Start new timer that updates every second
        this.timerInterval = setInterval(() => {
            this.updateTimers();
        }, 1000);
        
        // Start automatic status checking for waiting activations
        this.statusCheckInterval = setInterval(() => {
            this.checkAllWaitingActivations();
        }, 5000); // Check every 5 seconds
    }
    
    // Check all waiting activations automatically
    async checkAllWaitingActivations() {
        const waitingActivations = this.activations.filter(a => a.status === 'waiting');
        
        for (const activation of waitingActivations) {
            try {
                await this.checkActivationStatus(activation.id, true); // true = silent check
            } catch (error) {
                console.warn(`⚠️ ไม่สามารถตรวจสอบสถานะ activation ${activation.id}:`, error.message);
            }
        }
    }

    // Show modal while waiting for SMS
    showWaitingSMSModal(activation) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = `waiting-modal-${activation.id}`;
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>รอรับ SMS</h3>
                </div>
                <div class="modal-body">
                    <div class="waiting-sms-info">
                        <div class="service-info">
                            <h4>${this.translateServiceName(activation.service.name)}</h4>
                            <p>หมายเลข: <strong>${activation.phoneNumber}</strong></p>
                        </div>
                        <div class="waiting-animation">
                            <i class="fas fa-sms fa-pulse"></i>
                            <p>กำลังรอรับ SMS...</p>
                        </div>
                        <div class="waiting-timer">
                            <p>เวลาที่เหลือ: <span id="waiting-timer-${activation.id}">20:00</span></p>
                        </div>
                        <div class="waiting-note">
                            <p><i class="fas fa-info-circle"></i> ระบบจะตรวจสอบสถานะอัตโนมัติทุก 5 วินาที</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal').remove();">
                        ปิด
                    </button>
                    <button class="btn btn-primary" onclick="window.smsService.checkActivationStatus(${activation.id}); this.closest('.modal').remove();">
                        ตรวจสอบสถานะ
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Start countdown timer for this modal
        this.startWaitingModalTimer(activation.id);
    }

    // Start countdown timer for waiting modal
    startWaitingModalTimer(activationId) {
        const timerElement = document.getElementById(`waiting-timer-${activationId}`);
        if (!timerElement) return;
        
        const updateTimer = () => {
            const activation = this.activations.find(a => a.id === activationId);
            if (!activation || activation.status !== 'waiting') {
                // Remove modal if activation is no longer waiting
                const modal = document.getElementById(`waiting-modal-${activationId}`);
                if (modal) {
                    modal.remove();
                }
                return;
            }
            
            const timeLeft = Math.max(0, Math.floor((activation.endTime - new Date()) / 1000));
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft > 0) {
                setTimeout(updateTimer, 1000);
            } else {
                // Time expired
                timerElement.textContent = 'หมดเวลา';
                const modal = document.getElementById(`waiting-modal-${activationId}`);
                if (modal) {
                    modal.remove();
                }
            }
        };
        
        updateTimer();
    }

    updateTimers() {
        const now = new Date();
        let hasActiveActivations = false;
        
        this.activations.forEach(activation => {
            const timeLeft = Math.max(0, Math.floor((activation.endTime - now) / 1000 / 60));
            
            if (timeLeft <= 0 && activation.status === 'waiting') {
                // Time expired, mark as expired
                activation.status = 'expired';
                this.showMessage(`หมดเวลาสำหรับ ${this.translateServiceName(activation.service.name)}`, 'error');
            }
            
            if (activation.status === 'waiting' || activation.status === 'expired') {
                hasActiveActivations = true;
            }
        });
        
        // Update display if there are active activations
        if (hasActiveActivations) {
            this.updateActivationsDisplay();
        }
    }
    

    createActivationCard(activation) {
        const card = document.createElement('div');
        card.className = 'activation-card';
        
        // Determine status text and icon
        let statusText = '';
        let statusIcon = '';
        let statusClass = activation.status;
        
        switch (activation.status) {
            case 'active':
                statusText = 'กำลังรอ SMS';
                statusIcon = 'fas fa-clock';
                break;
            case 'completed':
                statusText = 'ได้รับ SMS';
                statusIcon = 'fas fa-check-circle';
                break;
            case 'expired':
                statusText = 'หมดเวลา';
                statusIcon = 'fas fa-exclamation-triangle';
                break;
            case 'cancelled':
                statusText = 'ยกเลิกแล้ว';
                statusIcon = 'fas fa-times-circle';
                break;
            default:
                statusText = 'ไม่ทราบ';
                statusIcon = 'fas fa-question-circle';
        }
        
        card.innerHTML = `
            <div class="activation-header-card">
                <div class="activation-info">
                    <div class="country-flag">🇹🇭</div>
                    <div class="activation-details">
                        <h3>${activation.serviceName}</h3>
                        <p>Thailand • ${this.currentOperator || 'สุ่ม'}</p>
                    </div>
                </div>
                <div class="activation-status ${statusClass}">
                    <i class="${statusIcon}"></i>
                    ${statusText}
                </div>
            </div>
            
            <div class="phone-number">${activation.phoneNumber}</div>
            
            ${activation.status === 'active' || activation.status === 'waiting' ? `
                <div class="countdown-timer" id="timer-${activation.activationId}">
                    <div class="timer-icon">⏰</div>
                    <div class="timer-text">หมดเวลาใน: <span class="time-remaining">${this.formatTimeRemaining(activation)}</span></div>
                    <div class="timer-note">(นับจากเวลาที่ได้รับหมายเลข)</div>
                </div>
            ` : ''}
            
            <div class="activation-details">
                <div class="activation-id">ID: ${activation.activationId}</div>
                <div class="activation-price">฿${activation.price.toFixed(2)}</div>
                <div class="activation-time">${new Date(activation.createdAt).toLocaleString('th-TH')}</div>
            </div>
            
            <div class="activation-actions">
                <button class="btn btn-outline" onclick="window.smsService.checkActivationStatus(${activation.activationId})">
                    <i class="fas fa-sync"></i>
                    ตรวจสอบสถานะ
                </button>
                <button class="btn btn-primary" onclick="window.smsService.requestAnotherSMS(${activation.activationId})">
                    <i class="fas fa-redo"></i>
                    ขอ SMS อีก
                </button>
                <button class="btn btn-danger" onclick="window.smsService.cancelActivation(${activation.activationId})">
                    <i class="fas fa-times"></i>
                    ยกเลิก
                </button>
            </div>
        `;
        
        return card;
    }

    scrollToActivationSection() {
        const activationSection = document.getElementById('activationSection');
        activationSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }

    async cancelActivation(activationId) {
        try {
            console.log('กำลังยกเลิกการใช้งาน:', activationId);
            
            // Use new API endpoint
            const response = await this.makeRequest(`/api/activation/${activationId}/cancel`, 'POST');
            
            console.log('การตอบสนองการยกเลิก:', response);
            
            if (response.success) {
                // Remove from local array
                this.activations = this.activations.filter(a => a.activationId !== parseInt(activationId));
                this.updateActivationsDisplay();
                this.showMessage('ยกเลิกการใช้งานสำเร็จ', 'success');
            } else {
                this.showMessage(`การยกเลิกล้มเหลว: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('ข้อผิดพลาดในการยกเลิกการใช้งาน:', error);
            this.showMessage(`ไม่สามารถยกเลิกการใช้งานได้: ${error.message}`, 'error');
        }
    }

    async checkActivationStatus(activationId, silent = false) {
        try {
            if (!silent) {
                console.log('กำลังตรวจสอบสถานะการใช้งาน:', activationId);
            }
            
            // Use new API endpoint
            const response = await this.makeRequest(`/api/activation/${activationId}/status`, 'GET');
            
            if (!silent) {
                console.log('การตอบสนองสถานะ:', response);
            }
            
            const activation = this.activations.find(a => a.activationId === parseInt(activationId));
            if (activation) {
                if (response.status === 'completed' && response.smsCode) {
                    activation.status = 'completed';
                    activation.smsCode = response.smsCode;
                    this.showMessage(`ได้รับ SMS แล้ว! รหัส: ${response.smsCode}`, 'success');
                } else if (response.status === 'waiting') {
                    activation.status = 'active';
                    if (!silent) {
                        this.showMessage('ยังรอรับ SMS อยู่', 'info');
                    }
                } else if (response.status === 'cancelled') {
                    activation.status = 'cancelled';
                    this.showMessage('การใช้งานถูกยกเลิก', 'info');
                } else {
                    if (!silent) {
                        this.showMessage(`สถานะ: ${response.status}`, 'info');
                    }
                }
                this.updateActivationsDisplay();
            }
        } catch (error) {
            console.error('ข้อผิดพลาดในการตรวจสอบสถานะ:', error);
            this.showMessage('ไม่สามารถตรวจสอบสถานะได้', 'error');
        }
    }

    async requestAnotherSMS(activationId) {
        try {
            console.log('กำลังขอ SMS อีกสำหรับการใช้งาน:', activationId);
            
            const response = await this.makeRequest(`/api/activation/${activationId}/request-sms`, 'POST');
            
            if (response.success) {
                const idToFind = parseInt(activationId);
                const activation = this.activations.find(a => a.id === idToFind);
                if (activation) {
                    activation.status = 'waiting';
                    activation.startTime = new Date();
                    activation.endTime = new Date(Date.now() + 20 * 60 * 1000);
                    this.updateActivationsDisplay();
                }
                this.showMessage('ขอ SMS อีกสำเร็จ', 'success');
            } else {
                this.showMessage(`การร้องขอล้มเหลว: ${response.message}`, 'error');
            }
        } catch (error) {
            console.error('ข้อผิดพลาดในการขอ SMS อีก:', error);
            this.showMessage(`ไม่สามารถขอ SMS อีกได้: ${error.message}`, 'error');
        }
    }

    // Auth modal functions removed - no more login system

    // Load Fallback Data
    loadFallbackData() {
        console.log('📋 กำลังโหลดข้อมูลสำรอง...');
        
        // Fallback countries with operators
        this.countriesData = [
            { 
                id: 52, 
                name: 'Thailand', 
                operators: {
                    'any': 'Any',
                    'ais': 'AIS',
                    'dtac': 'DTAC',
                    'truemove': 'TrueMove',
                    'cat_mobile': 'CAT Mobile',
                    'my': 'My'
                }
            },
            { 
                id: 0, 
                name: 'Russia', 
                operators: {
                    'any': 'Any',
                    'tele2': 'Tele2',
                    'tinkoff': 'Tinkoff',
                    'ttk': 'TTK',
                    'yota': 'Yota'
                }
            },
            { 
                id: 1, 
                name: 'Ukraine', 
                operators: {
                    'any': 'Any',
                    'kyivstar': 'Kyivstar',
                    'life': 'Life',
                    'lycamobile': 'Lycamobile',
                    'mts': 'MTS',
                    'utel': 'Utel',
                    'vodafone': 'Vodafone'
                }
            },
            { 
                id: 6, 
                name: 'Indonesia', 
                operators: {
                    'any': 'Any',
                    'telkomsel': 'Telkomsel',
                    'indosat': 'Indosat',
                    'xl': 'XL',
                    'tri': 'Tri'
                }
            },
            { 
                id: 10, 
                name: 'Vietnam', 
                operators: {
                    'any': 'Any',
                    'viettel': 'Viettel',
                    'mobifone': 'Mobifone',
                    'vinaphone': 'Vinaphone'
                }
            }
        ];
        
        // Fallback operators for first country
        this.operatorsData = Object.keys(this.countriesData[0].operators).map(key => ({
            id: key,
            name: this.countriesData[0].operators[key]
        }));
        
        // Fallback services
        this.servicesData = [
            { id: 'fb', name: 'Facebook', price: 0.22, quantity: 1299 },
            { id: 'go', name: 'Google', price: 0.33, quantity: 7446 },
            { id: 'wa', name: 'WhatsApp', price: 1.07, quantity: 10169 },
            { id: 'ig', name: 'Instagram', price: 0.17, quantity: 32144 },
            { id: 'tg', name: 'Telegram', price: 1.07, quantity: 10169 },
            { id: 'lf', name: 'TikTok', price: 0.05, quantity: 13786 },
            { id: 'me', name: 'Line', price: 0.86, quantity: 17912 },
            { id: 'ka', name: 'Shopee', price: 0.33, quantity: 21115 },
            { id: 'dl', name: 'Lazada', price: 0.03, quantity: 21078 },
            { id: 'jg', name: 'Grab', price: 0.03, quantity: 21747 }
        ];
        
        // Set current values
        this.currentCountry = this.countriesData[0].id;
        this.currentOperator = 'any';
        
        // Update UI
        this.updateCountrySelect(this.countriesData);
        this.updateOperatorSelect(this.operatorsData);
        
        // Set filtered services and update display
        this.filteredServices = this.servicesData;
        this.updateServicesDisplay();
        this.updateStatistics();
        
        
        console.log('✅ โหลดข้อมูลสำรองเสร็จสิ้น');
    }

    showLoading(message = 'Loading...') {
        this.isLoading = true;
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('active');
            const spinner = overlay.querySelector('.loading-spinner p');
            if (spinner) {
                spinner.textContent = message;
            }
        }
        console.log(`⏳ ${message}`);
    }

    hideLoading() {
        this.isLoading = false;
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        console.log('✅ โหลดเสร็จสิ้น');
    }

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `toast toast-${type}`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 20px 25px;
            border-radius: 12px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 450px;
            word-wrap: break-word;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            font-size: 14px;
            line-height: 1.4;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: flex-start;
            gap: 12px;
        `;
        
        // Set background color based on type
        switch (type) {
            case 'success':
                messageDiv.style.backgroundColor = 'rgba(40, 167, 69, 0.9)';
                messageDiv.style.borderColor = 'rgba(40, 167, 69, 0.3)';
                break;
            case 'error':
                messageDiv.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
                messageDiv.style.borderColor = 'rgba(220, 53, 69, 0.3)';
                break;
            case 'warning':
                messageDiv.style.backgroundColor = 'rgba(255, 193, 7, 0.9)';
                messageDiv.style.color = '#212529';
                messageDiv.style.borderColor = 'rgba(255, 193, 7, 0.3)';
                break;
            case 'info':
                messageDiv.style.backgroundColor = 'rgba(23, 162, 184, 0.9)';
                messageDiv.style.borderColor = 'rgba(23, 162, 184, 0.3)';
                break;
            default:
                messageDiv.style.backgroundColor = 'rgba(108, 117, 125, 0.9)';
                messageDiv.style.borderColor = 'rgba(108, 117, 125, 0.3)';
        }
        
        const icon = type === 'success' ? '✅' : 
                    type === 'error' ? '❌' : 
                    type === 'warning' ? '⚠️' : 'ℹ️';
        
        messageDiv.innerHTML = `
            <div style="font-size: 18px; margin-top: 2px;">${icon}</div>
            <div style="flex: 1;">${message.replace(/\n/g, '<br>')}</div>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: inherit;
                font-size: 18px;
                cursor: pointer;
                opacity: 0.7;
                margin-left: 10px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">×</button>
        `;
        
        document.body.appendChild(messageDiv);
        
        // Auto-hide after appropriate time
        const hideDelay = type === 'error' ? 7000 : 5000;
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.opacity = '0';
                messageDiv.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.remove();
                    }
                }, 300);
            }
        }, hideDelay);
    }

    // Wallet Methods

    updateWalletDisplay() {
        const balanceElement = document.getElementById('walletBalance');
        if (balanceElement) {
            balanceElement.textContent = `฿${this.walletBalance.toFixed(2)}`;
        }
    }

    async calculateServicePrice(serviceId) {
        const response = await fetch(`${this.BUSINESS_API_BASE}/pricing/calculate?serviceId=${serviceId}&countryCode=${this.currentCountry}&operatorCode=${this.currentOperator}`);
        
        if (!response.ok) {
            throw new Error('Failed to calculate price');
        }
        
        return await response.json();
    }

    // Top-up Methods
    showTopupModal() {
        const modal = document.getElementById('topupModal');
        modal.classList.add('active');
        this.topupModal = modal;
    }

    closeTopupModal() {
        if (this.topupModal) {
            this.topupModal.classList.remove('active');
            this.resetTopupForm();
        }
    }

    handleTopupMethodChange(method) {
        // Hide all method-specific inputs
        document.getElementById('topupFileUpload').style.display = 'none';
        document.getElementById('topupPayload').style.display = 'none';
        document.getElementById('topupUrl').style.display = 'none';
        document.getElementById('topupBase64').style.display = 'none';
        document.getElementById('topupTrueWallet').style.display = 'none';

        // Show the selected method
        switch (method) {
            case 'image':
                document.getElementById('topupFileUpload').style.display = 'block';
                break;
            case 'payload':
                document.getElementById('topupPayload').style.display = 'block';
                break;
            case 'url':
                document.getElementById('topupUrl').style.display = 'block';
                break;
            case 'base64':
                document.getElementById('topupBase64').style.display = 'block';
                break;
            case 'truewallet':
                document.getElementById('topupTrueWallet').style.display = 'block';
                break;
        }
    }

    resetTopupForm() {
        document.getElementById('topupAmount').value = '';
        document.querySelector('input[name="topupMethod"][value="image"]').checked = true;
        document.getElementById('topupFile').value = '';
        document.getElementById('topupPayloadInput').value = '';
        document.getElementById('topupUrlInput').value = '';
        document.getElementById('topupBase64Input').value = '';
        document.getElementById('topupTrueWalletFile').value = '';
        this.handleTopupMethodChange('image');
    }

    async submitTopup() {
        const amount = parseFloat(document.getElementById('topupAmount').value);
        const method = document.querySelector('input[name="topupMethod"]:checked').value;
        const checkDuplicate = document.getElementById('checkDuplicate').checked;

        if (!amount || amount <= 0) {
            this.showMessage('กรุณากรอกจำนวนเงินที่ถูกต้อง', 'error');
            return;
        }

        try {
            // Initiate top-up using makeRequest for consistent auth handling
            const response = await this.makeRequest('/api/topup/initiate', 'POST', {
                amountTHB: amount,
                method: method
            });

            const topupId = response.topupId;
            this.closeTopupModal();
            this.showTopupStatusModal(topupId);

            // Submit verification based on method
            await this.submitTopupVerification(topupId, method, checkDuplicate);

        } catch (error) {
            console.error('Top-up error:', error);
            this.showMessage(`ข้อผิดพลาด: ${error.message}`, 'error');
        }
    }

    async submitTopupVerification(topupId, method, checkDuplicate) {
        try {
            let formData = new FormData();
            formData.append('topupId', topupId);
            formData.append('checkDuplicate', checkDuplicate);

            let endpoint = '';

            switch (method) {
                case 'image':
                    const fileInput = document.getElementById('topupFile');
                    if (!fileInput.files[0]) {
                        throw new Error('กรุณาเลือกไฟล์รูปสลิป');
                    }
                    formData.append('file', fileInput.files[0]);
                    endpoint = '/topup/verify/image';
                    break;

                case 'payload':
                    const payload = document.getElementById('topupPayloadInput').value.trim();
                    if (!payload) {
                        throw new Error('กรุณากรอก QR Code Payload');
                    }
                    const payloadResult = await this.makeRequest('/api/topup/verify/payload', 'POST', {
                        topupId: topupId,
                        payload: payload,
                        checkDuplicate: checkDuplicate
                    });
                    this.handleTopupResult(payloadResult);
                    return;

                case 'url':
                    const url = document.getElementById('topupUrlInput').value.trim();
                    if (!url) {
                        throw new Error('กรุณากรอก URL รูปภาพ');
                    }
                    const urlResult = await this.makeRequest('/api/topup/verify/payload', 'POST', {
                        topupId: topupId,
                        url: url,
                        checkDuplicate: checkDuplicate
                    });
                    this.handleTopupResult(urlResult);
                    return;

                case 'base64':
                    const base64 = document.getElementById('topupBase64Input').value.trim();
                    if (!base64) {
                        throw new Error('กรุณากรอก Base64 รูปภาพ');
                    }
                    const base64Result = await this.makeRequest('/api/topup/verify/payload', 'POST', {
                        topupId: topupId,
                        base64: base64,
                        checkDuplicate: checkDuplicate
                    });
                    this.handleTopupResult(base64Result);
                    return;

                case 'truewallet':
                    const trueWalletFile = document.getElementById('topupTrueWalletFile');
                    if (!trueWalletFile.files[0]) {
                        throw new Error('กรุณาเลือกไฟล์สลิป TrueMoney');
                    }
                    formData.append('file', trueWalletFile.files[0]);
                    endpoint = '/topup/verify/truewallet';
                    break;
            }

            // Submit form data for image uploads using makeRequest with FormData
            const result = await this.makeRequestWithFormData(`/api${endpoint}`, formData);
            this.handleTopupResult(result);

        } catch (error) {
            console.error('Top-up verification error:', error);
            this.updateTopupStatus('error', error.message);
        }
    }

    handleTopupResult(result) {
        if (result.status === 'verified') {
            this.updateTopupStatus('success', `เติมเงินสำเร็จ ฿${result.amountTHB}`);
            this.walletBalance += result.amountTHB;
            this.updateWalletDisplay();
        } else {
            this.updateTopupStatus('error', result.reason || 'การตรวจสอบล้มเหลว');
        }
    }

    showTopupStatusModal(topupId) {
        const modal = document.getElementById('topupStatusModal');
        modal.classList.add('active');
        this.topupStatusModal = modal;
        
        this.updateTopupStatus('loading', 'กำลังตรวจสอบหลักฐาน...');
        
        // Start polling for status
        this.topupStatusInterval = setInterval(async () => {
            try {
                const status = await this.makeRequest(`/api/topup/status/${topupId}`, 'GET');
                
                if (status.status !== 'pending') {
                    clearInterval(this.topupStatusInterval);
                    if (status.status === 'verified') {
                        this.updateTopupStatus('success', `เติมเงินสำเร็จ ฿${status.amountTHB}`);
                        this.walletBalance += status.amountTHB;
                        this.updateWalletDisplay();
                    } else {
                        this.updateTopupStatus('error', status.reason || 'การตรวจสอบล้มเหลว');
                    }
                }
            } catch (error) {
                console.error('Status check error:', error);
            }
        }, 3000);
    }

    closeTopupStatusModal() {
        if (this.topupStatusModal) {
            this.topupStatusModal.classList.remove('active');
        }
        if (this.topupStatusInterval) {
            clearInterval(this.topupStatusInterval);
        }
    }

    updateTopupStatus(type, message) {
        const content = document.getElementById('topupStatusContent');
        let icon = '';
        let className = '';
        
        switch (type) {
            case 'loading':
                icon = 'fa-spinner fa-spin';
                className = 'status-loading';
                break;
            case 'success':
                icon = 'fa-check-circle';
                className = 'status-success';
                break;
            case 'error':
                icon = 'fa-exclamation-circle';
                className = 'status-error';
                break;
        }
        
        content.innerHTML = `
            <div class="${className}">
                <i class="fas ${icon}"></i>
                <div class="status-message">${message}</div>
            </div>
        `;
    }

    closeModal(modal) {
        modal.classList.remove('active');
        if (modal.id === 'topupStatusModal') {
            this.closeTopupStatusModal();
        }
    }

    // Authentication Methods
    async initAuth() {
        // Check if user is already logged in
        await this.checkAuthStatus();
        
        // Set up auth modal
        this.authModal = document.getElementById('authModal');
        
        // Set up event listeners
        this.setupAuthEventListeners();
        
        // Update header based on auth status
        this.updateHeaderAuth();
        
        // Load initial data after authentication check
        await this.loadInitialData();
        await this.loadWalletBalance();
    }

    setupAuthEventListeners() {
        // Auth modal buttons
        document.getElementById('loginBtn')?.addEventListener('click', () => this.showAuthModal('login'));
        document.getElementById('registerBtn')?.addEventListener('click', () => this.showAuthModal('register'));
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('historyBtn')?.addEventListener('click', () => this.showTransactionHistory());
        
        // Auth modal close
        document.getElementById('authModalClose')?.addEventListener('click', () => this.hideAuthModal());
        
        // Auth modal tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchAuthTab(tabName);
            });
        });
        
        // Auth forms
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // Old topup button removed - using QR payment only
    }

    async checkAuthStatus() {
        try {
            // ตรวจสอบ token จาก localStorage ก่อน
            const storedToken = localStorage.getItem('accessToken');
            if (storedToken) {
                this.accessToken = storedToken;
            }
            
            const response = await this.makeRequest('/api/auth/me', 'GET');
            if (response.user) {
                this.currentUser = response.user;
                this.isAuthenticated = true;
                await this.loadWalletBalance();
                // Load user's activations when authenticated
                await this.loadUserActivations();
            }
        } catch (error) {
            // User not authenticated - ล้างข้อมูลเก่า
            this.currentUser = null;
            this.isAuthenticated = false;
            this.accessToken = null;
            localStorage.removeItem('accessToken');
        }
    }

    showAuthModal(tab = 'login') {
        this.authModal.classList.add('show');
        this.switchAuthTab(tab);
        this.clearAuthMessages();
    }

    hideAuthModal() {
        this.authModal.classList.remove('show');
        this.clearAuthMessages();
        this.clearAuthForms();
    }

    switchAuthTab(tabName) {
        // Update tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update forms
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${tabName}Form`).classList.add('active');
        
        // Update title
        document.querySelector('.auth-modal-title').textContent = 
            tabName === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก';
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        this.setAuthButtonLoading('loginSubmitBtn', true);
        this.clearAuthMessages();
        
        try {
            const response = await this.makeRequest('/api/auth/login', 'POST', {
                email,
                password
            });
            
            this.currentUser = response.user;
            this.accessToken = response.accessToken;
            this.isAuthenticated = true;
            
            // เก็บ token ใน localStorage
            localStorage.setItem('accessToken', response.accessToken);
            
            this.showAuthMessage('success', 'เข้าสู่ระบบสำเร็จ!');
            
            // Load wallet balance and update UI
            await this.loadWalletBalance();
            // Load user's activations after login
            await this.loadUserActivations();
            this.updateHeaderAuth();
            
            // Close modal after short delay
            setTimeout(() => {
                this.hideAuthModal();
            }, 1500);
            
        } catch (error) {
            this.showAuthMessage('error', error.message || 'เข้าสู่ระบบไม่สำเร็จ');
        } finally {
            this.setAuthButtonLoading('loginSubmitBtn', false);
        }
    }

    async handleRegister() {
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
        // Validate passwords match
        if (password !== confirmPassword) {
            this.showAuthMessage('error', 'รหัสผ่านไม่ตรงกัน');
            return;
        }
        
        this.setAuthButtonLoading('registerSubmitBtn', true);
        this.clearAuthMessages();
        
        try {
            const response = await this.makeRequest('/api/auth/register', 'POST', {
                email,
                password
            });
            
            this.currentUser = response.user;
            this.accessToken = response.accessToken;
            this.isAuthenticated = true;
            
            // เก็บ token ใน localStorage
            localStorage.setItem('accessToken', response.accessToken);
            
            this.showAuthMessage('success', response.message || 'สมัครสมาชิกสำเร็จ!');
            
            // Load wallet balance and update UI
            await this.loadWalletBalance();
            this.updateHeaderAuth();
            
            // Close modal after short delay
            setTimeout(() => {
                this.hideAuthModal();
            }, 1500);
            
        } catch (error) {
            this.showAuthMessage('error', error.message || 'สมัครสมาชิกไม่สำเร็จ');
        } finally {
            this.setAuthButtonLoading('registerSubmitBtn', false);
        }
    }

    async logout() {
        try {
            await this.makeRequest('/api/auth/logout', 'POST');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.currentUser = null;
            this.accessToken = null;
            this.isAuthenticated = false;
            this.walletBalance = 0;
            
            // ลบ token จาก localStorage
            localStorage.removeItem('accessToken');
            
            this.updateHeaderAuth();
            this.hideAuthModal();
        }
    }

    // Refresh access token using refresh token
    async refreshAccessToken() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include' // ส่ง cookies
            });
            
            if (response.ok) {
                const data = await response.json();
                this.accessToken = data.accessToken;
                localStorage.setItem('accessToken', data.accessToken);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    updateHeaderAuth() {
        const notLoggedIn = document.getElementById('headerAuthNotLoggedIn');
        const loggedIn = document.getElementById('headerAuthLoggedIn');
        
        if (this.isAuthenticated) {
            notLoggedIn.style.display = 'none';
            loggedIn.style.display = 'flex';
            
            // Update user info
            const userName = document.getElementById('userName');
            const userBalance = document.getElementById('userBalance');
            const userAvatar = document.getElementById('userAvatar');
            
            if (userName) userName.textContent = this.currentUser.email;
            
            // Fix walletBalance.toFixed error by ensuring it's a number
            const balance = typeof this.walletBalance === 'number' ? this.walletBalance : 0;
            if (userBalance) userBalance.textContent = `฿${balance.toFixed(2)}`;
            
            if (userAvatar) userAvatar.textContent = this.currentUser.email.charAt(0).toUpperCase();
        } else {
            notLoggedIn.style.display = 'flex';
            loggedIn.style.display = 'none';
        }
    }

    async loadWalletBalance() {
        if (!this.isAuthenticated) {
            console.log('⚠️ Not authenticated, skipping wallet balance load');
            return;
        }
        
        try {
            console.log('🔄 Loading wallet balance from API...');
            const response = await this.makeRequest('/api/wallet/balance', 'GET');
            console.log('📊 API response:', response);
            
            // Ensure walletBalance is always a number
            // API returns { balance: { balance: number } } so we need response.balance.balance
            const balanceValue = response.balance?.balance || response.balance || 0;
            this.walletBalance = typeof balanceValue === 'number' ? balanceValue : 0;
            console.log('💰 Wallet balance set to:', this.walletBalance);
            
            this.updateHeaderAuth();
            console.log('✅ Header auth updated');
        } catch (error) {
            console.error('❌ Failed to load wallet balance:', error);
            // Set default balance on error
            this.walletBalance = 0;
            this.updateHeaderAuth();
        }
    }

    // QR Payment Methods - Using static PromptPay QR Code

    showQRPaymentModal(amount = null, serviceName = null) {
        const modal = document.getElementById('qrPaymentModal');
        modal.classList.add('active');
        
        if (serviceName) {
            document.querySelector('#qrPaymentModal .modal-header h3').textContent = `เติมเงิน - ${serviceName}`;
        } else {
            document.querySelector('#qrPaymentModal .modal-header h3').textContent = 'เติมเงินด้วย QR พร้อมเพย์';
        }
        
        // Setup file upload area interactions
        this.setupFileUploadArea();
    }

    closeQRPaymentModal() {
        const modal = document.getElementById('qrPaymentModal');
        modal.classList.remove('active');
        
        // Clear file input and status
        document.getElementById('qrPaymentSlipFile').value = '';
        document.getElementById('qrPaymentStatus').innerHTML = '';
        document.getElementById('selectedFileName').style.display = 'none';
        
        // Reset modal title
        document.querySelector('#qrPaymentModal .modal-header h3').textContent = 'เติมเงินด้วย QR พร้อมเพย์';
    }


    
    setupFileUploadArea() {
        const fileInput = document.getElementById('qrPaymentSlipFile');
        const fileUploadArea = document.getElementById('fileUploadArea');
        const selectedFileName = document.getElementById('selectedFileName');
        const fileNameText = document.getElementById('fileNameText');
        
        // File input change event
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Show selected file name
                fileNameText.textContent = `ไฟล์ที่เลือก: ${file.name}`;
                selectedFileName.style.display = 'block';
                
                // Change upload area style
                fileUploadArea.style.borderColor = '#4caf50';
                fileUploadArea.style.backgroundColor = '#f1f8e9';
            }
        });
        
        // Drag and drop functionality
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.style.borderColor = '#2196f3';
            fileUploadArea.style.backgroundColor = '#e3f2fd';
        });
        
        fileUploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileUploadArea.style.borderColor = '#ccc';
            fileUploadArea.style.backgroundColor = '#fafafa';
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            }
            fileUploadArea.style.borderColor = '#ccc';
            fileUploadArea.style.backgroundColor = '#fafafa';
        });
    }


    async uploadSlipForQRPayment() {
        const fileInput = document.getElementById('qrPaymentSlipFile');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showMessage('กรุณาเลือกไฟล์สลิป', 'error');
            return;
        }
        
        try {
            // Show loading
            document.getElementById('qrPaymentStatus').innerHTML = `
                <div class="status-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>กำลังตรวจสอบสลิป...</p>
                </div>
            `;
            
            // Upload and verify slip
            const formData = new FormData();
            formData.append('file', file);
            formData.append('method', 'image');
            formData.append('checkDuplicate', true);
            
            const response = await this.makeRequestWithFormData('/api/topup/verify/image', formData);
            
            console.log('🔍 Top-up response:', response);
            
            if (response.success) {
                // Payment successful
                document.getElementById('qrPaymentStatus').innerHTML = `
                    <div class="status-success">
                        <i class="fas fa-check-circle"></i>
                        <p class="status-message">เติมเงินสำเร็จ!</p>
                        <p class="status-details">จำนวนเงิน: ฿${response.amount.toFixed(2)}</p>
                        <p class="status-details">ยอดเงินคงเหลือ: ฿${response.newBalance.toFixed(2)}</p>
                    </div>
                `;
                
                // Update wallet balance
                console.log('🔄 Loading wallet balance after top-up...');
                await this.loadWalletBalance();
                console.log('✅ Wallet balance updated:', this.walletBalance);
                
                // Auto close modal after 3 seconds
                setTimeout(() => {
                    this.closeQRPaymentModal();
                }, 3000);
                
            } else {
                console.log('❌ Top-up failed:', response);
                throw new Error(response.message || response.error || 'การตรวจสอบสลิปล้มเหลว');
            }
            
        } catch (error) {
            console.error('QR Payment error:', error);
            document.getElementById('qrPaymentStatus').innerHTML = `
                <div class="status-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p class="status-message">การเติมเงินล้มเหลว</p>
                    <p class="status-details">${error.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'}</p>
                </div>
            `;
        }
    }

    showPaymentChoiceModal() {
        // Always show QR payment modal - old topup system removed
        this.showQRPaymentModal();
    }

    showAuthMessage(type, message) {
        const successMsg = document.getElementById('authSuccessMessage');
        const errorMsg = document.getElementById('authErrorMessage');
        
        if (type === 'success') {
            successMsg.textContent = message;
            successMsg.classList.add('show');
            errorMsg.classList.remove('show');
        } else {
            errorMsg.textContent = message;
            errorMsg.classList.add('show');
            successMsg.classList.remove('show');
        }
    }

    clearAuthMessages() {
        document.getElementById('authSuccessMessage').classList.remove('show');
        document.getElementById('authErrorMessage').classList.remove('show');
    }

    clearAuthForms() {
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
    }

    setAuthButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    async showTransactionHistory() {
        if (!this.isAuthenticated) {
            this.showAuthModal('login');
            return;
        }
        
        try {
            const response = await this.makeRequest('/api/wallet/transactions', 'GET');
            this.displayTransactionHistory(response);
        } catch (error) {
            console.error('Failed to load transaction history:', error);
            alert('ไม่สามารถโหลดประวัติธุรกรรมได้');
        }
    }

    displayTransactionHistory(transactions) {
        // Create a simple modal to show transaction history
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>ประวัติธุรกรรม</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="transaction-list">
                        ${transactions.map(tx => `
                            <div class="transaction-item">
                                <div class="transaction-info">
                                    <div class="transaction-type">${this.getTransactionTypeText(tx.type)}</div>
                                    <div class="transaction-description">${tx.description || ''}</div>
                                    <div class="transaction-date">${new Date(tx.createdAt).toLocaleString('th-TH')}</div>
                                </div>
                                <div class="transaction-amount ${tx.amount >= 0 ? 'positive' : 'negative'}">
                                    ${tx.amount >= 0 ? '+' : ''}฿${tx.amount.toFixed(2)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    getTransactionTypeText(type) {
        const types = {
            'topup': 'เติมเงิน',
            'purchase': 'ซื้อบริการ',
            'refund': 'คืนเงิน',
            'adjustment': 'ปรับปรุง'
        };
        return types[type] || type;
    }


    // Add activation to the display
    addActivation(activation) {
        if (!this.activations) {
            this.activations = [];
        }
        
        // Set end time (20 minutes from creation time or now if loading from database)
        const now = new Date();
        if (activation.createdAt) {
            // Loading from database - calculate end time from creation time
            const createdTime = new Date(activation.createdAt).getTime();
            activation.endTime = createdTime + (20 * 60 * 1000); // 20 minutes from creation
            activation.startTime = new Date(createdTime);
        } else {
            // New activation - set end time from now
            activation.endTime = now.getTime() + (20 * 60 * 1000); // 20 minutes from now
            activation.startTime = now;
        }
        
        this.activations.unshift(activation);
        this.updateActivationsDisplay();
        
        // Save to localStorage for persistence
        this.saveActivationsToLocalStorage();
    }

    // Save activations to localStorage
    saveActivationsToLocalStorage() {
        try {
            const activationsToSave = this.activations.map(activation => ({
                orderId: activation.orderId,
                serviceId: activation.serviceId,
                serviceName: activation.serviceName,
                activationId: activation.activationId,
                phoneNumber: activation.phoneNumber,
                price: activation.price,
                status: activation.status,
                createdAt: activation.createdAt,
                receivedSms: activation.receivedSms,
                endTime: activation.endTime,
                startTime: activation.startTime
            }));
            
            localStorage.setItem('sms_activations', JSON.stringify(activationsToSave));
            console.log('💾 บันทึกรายการใช้งานลง localStorage สำเร็จ');
        } catch (error) {
            console.error('❌ Error saving to localStorage:', error);
        }
    }

    // Update activations display
    updateActivationsDisplay() {
        const container = document.getElementById('activationsList');
        if (!container) return;

        if (this.activations.length === 0) {
            container.innerHTML = `
                <div class="no-activations">
                    <i class="fas fa-mobile-alt"></i>
                    <p>ยังไม่มีหมายเลขที่ใช้งาน</p>
                    <p>ซื้อบริการด้านบนเพื่อเริ่มต้น</p>
                </div>
            `;
            // Save empty state to localStorage
            this.saveActivationsToLocalStorage();
            return;
        }

        container.innerHTML = '';
        
        this.activations.forEach(activation => {
            const activationCard = this.createActivationCard(activation);
            container.appendChild(activationCard);
        });

        // Start timer for active activations
        this.startActivationTimers();
        
        // Save to localStorage after updating display
        this.saveActivationsToLocalStorage();
    }

    // Format time remaining for display
    formatTimeRemaining(activation) {
        const now = new Date();
        // Use endTime that was set when number was received
        const endTime = activation.endTime || (now.getTime() + 20 * 60 * 1000);
        const remaining = Math.max(0, endTime - now.getTime());
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Start timers for all active activations
    startActivationTimers() {
        // Clear existing timers
        if (this.timerIntervals) {
            this.timerIntervals.forEach(interval => clearInterval(interval));
        }
        this.timerIntervals = [];

        this.activations.forEach(activation => {
            if (activation.status === 'active' || activation.status === 'waiting') {
                const timerId = `timer-${activation.activationId}`;
                const timerElement = document.getElementById(timerId);
                
                if (timerElement) {
                    const interval = setInterval(() => {
                        const timeRemaining = this.formatTimeRemaining(activation);
                        const timeSpan = timerElement.querySelector('.time-remaining');
                        
                        if (timeSpan) {
                            timeSpan.textContent = timeRemaining;
                            
                            // Check if time expired (from when number was received)
                            const now = new Date();
                            const endTime = activation.endTime || (now.getTime() + 20 * 60 * 1000);
                            
                            if (now.getTime() >= endTime) {
                                clearInterval(interval);
                                activation.status = 'expired';
                                this.updateActivationsDisplay();
                                this.showMessage(`หมายเลข ${activation.phoneNumber} หมดเวลาแล้ว (หมดเวลา 20 นาทีหลังได้รับหมายเลข)`, 'warning');
                            }
                        }
                    }, 1000);
                    
                    this.timerIntervals.push(interval);
                }
            }
        });
    }

    getActivationStatusText(status) {
        const statusTexts = {
            'active': 'กำลังรอ SMS',
            'completed': 'สำเร็จ',
            'cancelled': 'ยกเลิก',
            'expired': 'หมดอายุ'
        };
        return statusTexts[status] || status;
    }

    // Override makeRequest to include auth headers with auto refresh
    async makeRequest(url, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (this.accessToken) {
            options.headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        // ตรวจสอบ token หมดอายุและ refresh อัตโนมัติ
        if (!response.ok && response.status === 401 && this.accessToken) {
            try {
                console.log('🔄 Token expired, attempting refresh...');
                const refreshResult = await this.refreshAccessToken();
                console.log('🔄 Refresh result:', refreshResult);
                
                // ลองใหม่ด้วย token ใหม่
                if (this.accessToken) {
                    console.log('🔄 Retrying request with new token...');
                    options.headers['Authorization'] = `Bearer ${this.accessToken}`;
                    const retryResponse = await fetch(url, options);
                    console.log('🔄 Retry response status:', retryResponse.status);
                    
                    if (retryResponse.ok) {
                        return await retryResponse.json();
                    } else {
                        // ถ้า retry ก็ยัง 401 แสดงว่า refresh ไม่สำเร็จ
                        console.error('❌ Retry also failed with 401');
                        this.logout();
                        throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
                    }
                } else {
                    console.error('❌ No access token after refresh');
                    this.logout();
                    throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
                }
            } catch (refreshError) {
                console.error('❌ Token refresh failed:', refreshError);
                // Refresh ล้มเหลว - ล็อกเอาท์
                this.logout();
                throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
            }
        }
        
        if (!response.ok) {
            let errorData = {};
            try {
                const responseText = await response.text();
                if (responseText) {
                    errorData = JSON.parse(responseText);
                }
            } catch (parseError) {
                console.warn('Could not parse error response as JSON:', parseError);
                errorData = { message: response.statusText || 'Unknown error' };
            }
            
            console.error('API Error:', response.status, errorData);
            
            // Create error object with more details
            const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.response = { data: errorData };
            error.error = errorData.error || 'UNKNOWN_ERROR';
            
            throw error;
        }
        
        return await response.json();
    }

    // Method for handling FormData uploads with authentication
    async makeRequestWithFormData(url, formData) {
        const options = {
            method: 'POST',
            headers: {}
        };
        
        if (this.accessToken) {
            options.headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        
        // Don't set Content-Type for FormData, let browser set it with boundary
        options.body = formData;
        
        const response = await fetch(url, options);
        
        // ตรวจสอบ token หมดอายุและ refresh อัตโนมัติ
        if (!response.ok && response.status === 401 && this.accessToken) {
            try {
                await this.refreshAccessToken();
                // ลองใหม่ด้วย token ใหม่
                if (this.accessToken) {
                    options.headers['Authorization'] = `Bearer ${this.accessToken}`;
                    const retryResponse = await fetch(url, options);
                    if (retryResponse.ok) {
                        return await retryResponse.json();
                    }
                }
            } catch (refreshError) {
                // Refresh ล้มเหลว - ล็อกเอาท์
                this.logout();
                throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
            }
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }
        
        return await response.json();
    }
}

// Initialize the service when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    window.smsService = new SMSVerificationService();
    await window.smsService.initAuth();
});

// Global functions for modal buttons - old topup functions removed

// Add CSS for message animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style);