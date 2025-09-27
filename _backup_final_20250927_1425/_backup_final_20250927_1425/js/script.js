// SMS Verification Service - Main Script
class SMSVerificationService {
    constructor() {
        this.API_BASE_URL = '/api'; // Use our proxy server
        this.API_KEY = '7ccb326980edc2bfec78dcd66326aad7';
        this.LANG = 'en';
        
        this.countriesData = [];
        this.operatorsData = [];
        this.servicesData = [];
        this.filteredServices = [];
        this.currentCountry = null;
        this.currentOperator = 'any';
        this.userBalance = 0;
        this.activations = [];
        this.servicesToShow = 999999; // Show all services
        this.maxServicesToShow = 999999;
        this.timerInterval = null; // Timer for countdown
        this.statusCheckInterval = null; // Timer for automatic status checking
        
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
        this.loadInitialData();
        this.startTimer();
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

        // Show more services - removed

        // Modal events - removed (no more login modal)

        // Close modals when clicking outside - removed (no more login modal)

        // Form submissions - removed (no more login form)
    }

    async loadInitialData() {
        try {
            this.showLoading();
            console.log('📡 กำลังโหลดข้อมูลเริ่มต้น...');
            
            // Try to load from API first
            try {
                await Promise.all([
                    this.loadCountries(),
                    this.loadBalance()
                ]);
                
                // Set default country to Thailand (ID: 7)
                this.setDefaultCountry();
                
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
            
            this.updateServicesDisplay();
            this.updateStatistics();
            
            console.log(`✅ โหลดบริการ ${services.length} รายการ`);
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ ข้อผิดพลาดในการโหลดบริการ:', error);
            throw error;
        }
    }

    async loadBalance() {
        try {
            console.log('💰 กำลังโหลดยอดเงิน...');
            
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getBalance&lang=${this.LANG}`;
            const balance = await this.makeApiCall(url);
            
            console.log('การตอบสนองยอดเงิน:', balance);
            this.userBalance = parseFloat(balance);
            console.log(`✅ ยอดเงิน: $${this.userBalance}`);
            
        } catch (error) {
            console.error('❌ ข้อผิดพลาดในการโหลดยอดเงิน:', error);
            this.userBalance = 0;
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

    updateServicesDisplay() {
        const container = document.getElementById('servicesGrid');
        const showMoreBtn = document.getElementById('showMoreBtn');
        
        if (this.filteredServices.length === 0) {
            container.innerHTML = '<div class="loading">ไม่มีบริการที่พร้อมใช้งาน</div>';
            showMoreBtn.style.display = 'none';
            return;
        }
        
        // Show all services
        container.innerHTML = '';
        
        this.filteredServices.forEach(service => {
            const serviceCard = this.createServiceCard(service);
            container.appendChild(serviceCard);
        });
        
        // Hide "Show More" button
        showMoreBtn.style.display = 'none';
    }

    createServiceCard(service) {
        const card = document.createElement('div');
        card.className = 'service-card';
        
        const isAvailable = parseInt(service.quantity) > 0;
        const price = parseFloat(service.price);
        const quantity = parseInt(service.quantity);
        
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
        
        card.innerHTML = `
            <div class="service-header">
                <div>
                    <div class="service-name">${this.translateServiceName(service.name)}</div>
                    <div class="service-quantity">มีหมายเลข ${quantity} หมายเลข</div>
                    <div class="service-status ${status}">${statusText}</div>
                </div>
                <div class="service-price">$${price.toFixed(2)}</div>
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

    filterServices(category) {
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
        
        this.updateServicesDisplay();
        this.updateStatistics();
    }

    async handleBuyService(service) {
        console.log('🛒 กำลังซื้อบริการ:', service);
        
        try {
            // Call real API to get number
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getNumber&service=${service.id}&operator=${this.currentOperator}&country=${this.currentCountry}&lang=${this.LANG}`;
            
            console.log('📡 เรียก API:', url);
            const result = await this.makeApiCall(url);
            console.log('📄 การตอบสนอง API:', result);
            
            if (result.includes('NO_BALANCE')) {
                this.showMessage('ยอดเงินไม่เพียงพอ', 'error');
                return;
            }
            
            if (result.includes('NO_NUMBERS')) {
                // Show loading modal and refresh prices
                await this.handleNoNumbersAvailable(service);
                return;
            }
            
            if (result.includes('WRONG_MAX_PRICE')) {
                const minPrice = result.split(':')[1];
                this.showMessage(`ราคาต่ำเกินไป ราคาขั้นต่ำ: $${minPrice}`, 'error');
                return;
            }
            
            if (result.startsWith('ACCESS_NUMBER:')) {
                // Parse the response: ACCESS_NUMBER:ID:NUMBER
                const parts = result.split(':');
                const activationId = parts[1];
                const phoneNumber = parts[2];
                
                const activation = {
                    id: parseInt(activationId), // Convert to number for consistency
                    service: service,
                    phoneNumber: phoneNumber,
                    status: 'waiting',
                    startTime: new Date(),
                    endTime: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes
                    country: this.countriesData.find(c => c.id === this.currentCountry)?.name || 'ไม่ทราบ'
                };
                
                this.activations.push(activation);
                this.updateActivationsDisplay();
                
                // Show waiting SMS modal
                this.showWaitingSMSModal(activation);
                
                // Scroll to activation section
                this.scrollToActivationSection();
                
                this.showMessage(`ซื้อบริการสำเร็จ: ${service.name}`, 'success');
                
                // Update balance after purchase
                this.loadBalance();
                
            } else {
                this.showMessage(`การตอบสนองไม่คาดคิด: ${result}`, 'error');
            }
            
        } catch (error) {
            console.error('❌ ข้อผิดพลาดในการซื้อบริการ:', error);
            this.showMessage(`ข้อผิดพลาด: ${error.message}`, 'error');
        }
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

    async requestAnotherSMS(activationId) {
        try {
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=setStatus&id=${activationId}&status=3&lang=${this.LANG}`;
            const result = await this.makeApiCall(url);
            console.log('📄 การตอบสนองขอ SMS:', result);
            
            if (result === 'ACCESS_RETRY_GET') {
                this.showMessage('รอรับ SMS ใหม่', 'success');
            } else {
                this.showMessage(`การร้องขอล้มเหลว: ${result}`, 'error');
            }
            
        } catch (error) {
            console.error('❌ Error requesting SMS:', error);
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
    
    updateActivationsDisplay() {
        const container = document.getElementById('activationsList');
        
        if (this.activations.length === 0) {
            container.innerHTML = `
                <div class="no-activations">
                    <i class="fas fa-mobile-alt"></i>
                    <p>ยังไม่มีหมายเลขที่ใช้งาน</p>
                    <p>ซื้อบริการด้านบนเพื่อเริ่มต้น</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        this.activations.forEach(activation => {
            const activationCard = this.createActivationCard(activation);
            container.appendChild(activationCard);
        });
    }

    createActivationCard(activation) {
    const card = document.createElement('div');
        card.className = 'activation-card';
        
        const timeLeft = Math.max(0, Math.floor((activation.endTime - new Date()) / 1000 / 60));
        const secondsLeft = Math.max(0, Math.floor((activation.endTime - new Date()) / 1000) % 60);
        
        // Determine status text and icon
        let statusText = '';
        let statusIcon = '';
        let statusClass = activation.status;
        
        switch (activation.status) {
            case 'waiting':
                statusText = 'รอรับ SMS';
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
        
        // Check if 2 minutes have passed for cancel/request buttons
        const timeSinceOrder = new Date() - activation.startTime;
        const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds
        const canCancel = timeSinceOrder >= twoMinutes;
        const remainingTime = Math.ceil((twoMinutes - timeSinceOrder) / 1000);
    
    card.innerHTML = `
            <div class="activation-header-card">
                <div class="activation-info">
                    <div class="country-flag">🇹🇭</div>
                    <div class="activation-details">
                        <h3>${this.translateServiceName(activation.service.name)}</h3>
                        <p>${activation.country} • ${activation.currentOperator || 'สุ่ม'}</p>
                    </div>
                </div>
                <div class="activation-status ${statusClass}">
                    <i class="${statusIcon}"></i>
                    ${statusText}
        </div>
            </div>
            
            <div class="phone-number">${activation.phoneNumber}</div>
            
            ${activation.smsCode ? `
                <div class="sms-code">
                    <i class="fas fa-key"></i>
                    รหัส SMS: <strong>${activation.smsCode}</strong>
                </div>
            ` : activation.status === 'expired' ? `
                <div class="activation-timer expired">
                    <i class="fas fa-exclamation-triangle"></i>
                    หมดเวลา - ไม่ได้รับ SMS
                </div>
            ` : `
                <div class="activation-timer">
                    <i class="fas fa-hourglass-half"></i>
                    เวลาที่เหลือ: ${timeLeft}:${secondsLeft.toString().padStart(2, '0')}
                </div>
            `}
            
            ${!canCancel && activation.status === 'waiting' ? `
                <div class="cooldown-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>รอ ${remainingTime} วินาที ก่อนที่จะยกเลิก/ขอ SMS</span>
                </div>
            ` : ''}
            
            <div class="activation-actions">
                <button class="btn btn-danger ${!canCancel ? 'disabled' : ''}" 
                        onclick="${canCancel ? `window.smsService.cancelActivation(${activation.id})` : 'return false'}"
                        ${!canCancel ? 'disabled' : ''}>
                    <i class="fas fa-times"></i>
                    ยกเลิก
                </button>
                <button class="btn btn-outline" onclick="window.smsService.checkActivationStatus(${activation.id})">
                    <i class="fas fa-sync"></i>
                    ตรวจสอบสถานะ
                </button>
                <button class="btn btn-success ${!canCancel ? 'disabled' : ''}" 
                        onclick="${canCancel ? `window.smsService.requestAnotherSMS(${activation.id})` : 'return false'}"
                        ${!canCancel ? 'disabled' : ''}>
                    <i class="fas fa-sms"></i>
                    ขอ SMS อีก
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
            
            // Convert string to number for comparison
            const id = parseInt(activationId);
            
            // Check if 2 minutes have passed
            const activation = this.activations.find(a => a.id === id);
            if (activation) {
                const timeSinceOrder = new Date() - activation.startTime;
                const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds
                
                if (timeSinceOrder < twoMinutes) {
                    const remainingTime = Math.ceil((twoMinutes - timeSinceOrder) / 1000);
                    this.showMessage(`ไม่สามารถยกเลิกได้ภายใน 2 นาที รออีก ${remainingTime} วินาที`, 'error');
                    return;
                }
            }
            
            const result = await this.makeApiCall(`${this.API_BASE_URL}?api_key=${this.API_KEY}&action=setStatus&id=${activationId}&status=8&lang=${this.LANG}`);
            
            console.log('การตอบสนองการยกเลิก:', result);
            
            if (result === 'ACCESS_CANCEL') {
                // Remove from local array - ensure both are numbers for comparison
                const idToRemove = parseInt(activationId);
                this.activations = this.activations.filter(a => a.id !== idToRemove);
                this.updateActivationsDisplay();
                this.showMessage('ยกเลิกการใช้งานสำเร็จ', 'success');
            } else if (result === 'CANNOT_BEFORE_2_MIN') {
                this.showMessage('ไม่สามารถยกเลิกได้ภายใน 2 นาที', 'error');
            } else if (result === 'BAD_STATUS') {
                // Activation already cancelled or invalid status
                const idToRemove = parseInt(activationId);
                this.activations = this.activations.filter(a => a.id !== idToRemove);
                this.updateActivationsDisplay();
                this.showMessage('การใช้งานถูกยกเลิกไปแล้ว', 'info');
            } else {
                this.showMessage(`การยกเลิกล้มเหลว: ${result}`, 'error');
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
            
            // Convert string to number for comparison
            const id = parseInt(activationId);
            
            const result = await this.makeApiCall(`${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getStatus&id=${activationId}&lang=${this.LANG}`);
            
            if (!silent) {
                console.log('การตอบสนองสถานะ:', result);
            }
            
            const idToFind = parseInt(activationId);
            const activation = this.activations.find(a => a.id === idToFind);
            if (activation) {
                if (result.startsWith('STATUS_OK:')) {
                    const smsCode = result.split(':')[1];
                    activation.status = 'completed';
                    activation.smsCode = smsCode;
                    this.showMessage(`ได้รับ SMS แล้ว! รหัส: ${smsCode}`, 'success');
                } else if (result === 'STATUS_WAIT_CODE') {
                    activation.status = 'waiting';
                    if (!silent) {
                        this.showMessage('ยังรอรับ SMS อยู่', 'info');
                    }
                } else if (result === 'STATUS_CANCEL') {
                    activation.status = 'cancelled';
                    this.showMessage('การใช้งานถูกยกเลิก', 'info');
                } else {
                    if (!silent) {
                        this.showMessage(`สถานะ: ${result}`, 'info');
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
            
            // Convert string to number for comparison
            const id = parseInt(activationId);
            
            // Check if 2 minutes have passed
            const activation = this.activations.find(a => a.id === id);
            if (activation) {
                const timeSinceOrder = new Date() - activation.startTime;
                const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds
                
                if (timeSinceOrder < twoMinutes) {
                    const remainingTime = Math.ceil((twoMinutes - timeSinceOrder) / 1000);
                    this.showMessage(`ไม่สามารถขอ SMS อีกได้ภายใน 2 นาที รออีก ${remainingTime} วินาที`, 'error');
                    return;
                }
            }
            
            const result = await this.makeApiCall(`${this.API_BASE_URL}?api_key=${this.API_KEY}&action=setStatus&id=${activationId}&status=3&lang=${this.LANG}`);
            
            console.log('การตอบสนองขอ SMS:', result);
            
            if (result === 'ACCESS_RETRY_GET') {
                const idToFind = parseInt(activationId);
                const activation = this.activations.find(a => a.id === idToFind);
                if (activation) {
                    activation.status = 'waiting';
                    activation.startTime = new Date();
                    activation.endTime = new Date(Date.now() + 20 * 60 * 1000);
                    this.updateActivationsDisplay();
                    this.showMessage('ขอ SMS อีกสำเร็จ', 'success');
                }
            } else {
                this.showMessage(`การร้องขอล้มเหลว: ${result}`, 'error');
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
        
        // Set balance
        const balanceDisplay = document.querySelector('.balance-display');
        if (balanceDisplay) {
            balanceDisplay.textContent = 'Balance: $1.71';
        }
        
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
        messageDiv.className = `message message-${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            ${message}
        `;
        
        // Add message styles
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            animation: slideInRight 0.3s ease;
            ${type === 'success' ? 'background: #059669;' : 'background: #dc2626;'}
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Initialize the service when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.smsService = new SMSVerificationService();
});

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