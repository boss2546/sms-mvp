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
        
        this.init();
    }

    init() {
        console.log('🚀 SMS Verification Service started');
        this.bindEvents();
        this.loadInitialData();
        this.startTimer();
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
            console.log('📡 Loading initial data...');
            
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
            console.log('🌍 Loading countries...');
            
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getCountryAndOperators&lang=${this.LANG}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.text();
            console.log('Countries response:', data);
            
            if (data.includes('BAD_KEY')) {
                throw new Error('Invalid API key');
            }
            
            const countries = JSON.parse(data);
            this.countriesData = countries;
            
            this.updateCountrySelect(countries);
            this.updateStatistics();
            
            console.log(`✅ Loaded ${countries.length} countries`);
            
        } catch (error) {
            console.error('❌ Error loading countries:', error);
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
            console.log(`📱 Loading operators for country ${countryId}...`);
            
            const country = this.countriesData.find(c => c.id === countryId);
            if (!country) {
                throw new Error('Country not found');
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
            
            console.log(`✅ Loaded ${operators.length} operators`);
            
        } catch (error) {
            console.error('❌ Error loading operators:', error);
            throw error;
        }
    }

    async loadServices(countryId, operatorId) {
        try {
            console.log(`🔧 Loading services for country ${countryId}, operator ${operatorId}...`);
            
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getServicesAndCost&country=${countryId}&operator=${operatorId}&lang=${this.LANG}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.text();
            console.log('Services response:', data);
            
            if (data.includes('BAD_KEY')) {
                throw new Error('Invalid API key');
            }
            
            const services = JSON.parse(data);
            this.servicesData = services;
            this.filteredServices = [...services];
            
            this.updateServicesDisplay();
            this.updateStatistics();
            
            console.log(`✅ Loaded ${services.length} services`);
            
        } catch (error) {
            console.error('❌ Error loading services:', error);
            throw error;
        }
    }

    async loadBalance() {
        try {
            console.log('💰 Loading balance...');
            
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getBalance&lang=${this.LANG}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const balance = await response.text();
            console.log('Balance response:', balance);
            
            if (balance.includes('BAD_KEY')) {
                throw new Error('Invalid API key');
            }
            
            this.userBalance = parseFloat(balance);
            console.log(`✅ Balance: $${this.userBalance}`);
            
        } catch (error) {
            console.error('❌ Error loading balance:', error);
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
            container.innerHTML = '<div class="loading">No services available</div>';
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
        let statusText = 'Available';
        
        if (quantity === 0) {
            status = 'out-of-stock';
            statusText = 'Out of Stock';
        } else if (quantity < 10) {
            status = 'low-stock';
            statusText = 'Low Stock';
        }
        
        card.innerHTML = `
            <div class="service-header">
                <div>
                    <div class="service-name">${service.name}</div>
                    <div class="service-quantity">${quantity} numbers available</div>
                    <div class="service-status ${status}">${statusText}</div>
                </div>
                <div class="service-price">$${price.toFixed(2)}</div>
            </div>
            <div class="service-actions">
                <button class="btn-buy" ${!isAvailable ? 'disabled' : ''} data-service='${JSON.stringify(service)}'>
                    ${isAvailable ? 'Buy' : 'Out of Stock'}
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
            this.showMessage('❌ Failed to load data', 'error');
        }
    }

    handleOperatorChange(operatorId) {
        this.currentOperator = operatorId;
        
        if (this.currentCountry) {
            try {
                this.loadServices(this.currentCountry, operatorId);
            } catch (error) {
                console.error('❌ Error:', error);
                this.showMessage('❌ Failed to load data', 'error');
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
        console.log('🛒 Buying service:', service);
        
        try {
            // Call real API to get number
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getNumber&service=${service.id}&operator=${this.currentOperator}&country=${this.currentCountry}&lang=${this.LANG}`;
            
            console.log('📡 Calling API:', url);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.text();
            console.log('📄 API Response:', result);
            
            if (result.includes('NO_BALANCE')) {
                this.showMessage('Insufficient balance', 'error');
                return;
            }
            
            if (result.includes('NO_NUMBERS')) {
                // Show loading modal and refresh prices
                await this.handleNoNumbersAvailable(service);
                return;
            }
            
            if (result.includes('WRONG_MAX_PRICE')) {
                const minPrice = result.split(':')[1];
                this.showMessage(`Price too low. Minimum price: $${minPrice}`, 'error');
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
                    country: this.countriesData.find(c => c.id === this.currentCountry)?.name || 'Unknown'
                };
                
                this.activations.push(activation);
                this.updateActivationsDisplay();
                
                // Scroll to activation section
                this.scrollToActivationSection();
                
                this.showMessage(`Service purchased: ${service.name}`, 'success');
                
                // Update balance after purchase
                this.loadBalance();
                
            } else {
                this.showMessage(`Unexpected response: ${result}`, 'error');
            }
            
        } catch (error) {
            console.error('❌ Error buying service:', error);
            this.showMessage(`Error: ${error.message}`, 'error');
        }
    }

    async handleNoNumbersAvailable(service) {
        console.log('🔄 No numbers available, refreshing prices...');
        
        // Show loading modal
        this.showPriceRefreshModal();
        
        try {
            // Get updated prices for this specific service
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getServicesAndCost&country=${this.currentCountry}&operator=${this.currentOperator}&lang=${this.LANG}`;
            
            console.log('📡 Refreshing prices:', url);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.text();
            console.log('📄 Updated prices response:', data);
            
            if (data.includes('BAD_KEY')) {
                throw new Error('Invalid API key');
            }
            
            const services = JSON.parse(data);
            const updatedService = services.find(s => s.id === service.id);
            
            if (!updatedService) {
                this.hidePriceRefreshModal();
                this.showMessage('Service not found in updated prices', 'error');
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
            console.error('❌ Error refreshing prices:', error);
            this.hidePriceRefreshModal();
            this.showMessage(`Failed to refresh prices: ${error.message}`, 'error');
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
                    <p>Getting latest prices for ${this.currentCountry ? this.countriesData.find(c => c.id === this.currentCountry)?.name : 'selected country'}...</p>
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
                changeText = `Price: $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)}<br>Available: ${oldQuantity} → ${newQuantity}`;
            } else if (priceChanged) {
                changeText = `Price: $${oldPrice.toFixed(2)} → $${newPrice.toFixed(2)}`;
            } else if (quantityChanged) {
                changeText = `Available: ${oldQuantity} → ${newQuantity}`;
            } else {
                changeText = 'No changes detected';
            }
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Price Updated</h3>
                    </div>
                    <div class="modal-body">
                        <div class="service-info">
                            <h4>${newService.name}</h4>
                            <div class="price-info">
                                <div class="current-price">$${newPrice.toFixed(2)}</div>
                                <div class="quantity-info">${newQuantity} numbers available</div>
                            </div>
                            ${changeText !== 'No changes detected' ? `
                                <div class="changes">
                                    <strong>Changes:</strong><br>
                                    ${changeText}
                                </div>
                            ` : ''}
                        </div>
                        <p>Would you like to purchase this service at the updated price?</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="this.closest('.modal').remove(); window.smsService.resolvePriceUpdate(false);">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="this.closest('.modal').remove(); window.smsService.resolvePriceUpdate(true);">
                            Buy Now
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
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.text();
            console.log('📄 Status response:', result);
            
            if (result === 'STATUS_WAIT_CODE') {
                this.showMessage('Still waiting for SMS', 'info');
                return { status: 'waiting', code: null };
            } else if (result === 'STATUS_CANCEL') {
                this.showMessage('Activation was cancelled', 'info');
                // Remove from activations
                this.activations = this.activations.filter(a => a.id !== parseInt(activationId));
                this.updateActivationsDisplay();
                return { status: 'cancelled', code: null };
            } else if (result.startsWith('STATUS_OK:')) {
                const code = result.split(':')[1];
                this.showMessage(`SMS received! Code: ${code}`, 'success');
                
                // Update activation status
                const activation = this.activations.find(a => a.id === parseInt(activationId));
                if (activation) {
                    activation.status = 'completed';
                    activation.smsCode = code;
                    this.updateActivationsDisplay();
                }
                
                return { status: 'completed', code: code };
            }
            
            this.showMessage(`Unknown status: ${result}`, 'error');
            return { status: 'unknown', code: null };
            
        } catch (error) {
            console.error('❌ Error checking status:', error);
            this.showMessage(`Error: ${error.message}`, 'error');
            return { status: 'error', code: null };
        }
    }

    async cancelActivation(activationId) {
        try {
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=setStatus&id=${activationId}&status=8&lang=${this.LANG}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.text();
            console.log('📄 Cancel response:', result);
            
            if (result === 'ACCESS_CANCEL') {
                // Remove from activations
                this.activations = this.activations.filter(a => a.id !== parseInt(activationId));
                this.updateActivationsDisplay();
                this.showMessage('Activation cancelled', 'success');
            } else if (result === 'CANNOT_BEFORE_2_MIN') {
                this.showMessage('Cannot cancel before 2 minutes', 'error');
            } else {
                this.showMessage(`Cancel failed: ${result}`, 'error');
            }
            
        } catch (error) {
            console.error('❌ Error cancelling activation:', error);
            this.showMessage(`Error: ${error.message}`, 'error');
        }
    }

    async requestAnotherSMS(activationId) {
        try {
            const url = `${this.API_BASE_URL}?api_key=${this.API_KEY}&action=setStatus&id=${activationId}&status=3&lang=${this.LANG}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.text();
            console.log('📄 Request SMS response:', result);
            
            if (result === 'ACCESS_RETRY_GET') {
                this.showMessage('Waiting for new SMS', 'success');
            } else {
                this.showMessage(`Request failed: ${result}`, 'error');
            }
            
        } catch (error) {
            console.error('❌ Error requesting SMS:', error);
            this.showMessage(`Error: ${error.message}`, 'error');
        }
    }

    startTimer() {
        // Clear existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Start new timer that updates every second
        this.timerInterval = setInterval(() => {
            this.updateTimers();
        }, 1000);
    }
    
    updateTimers() {
        const now = new Date();
        let hasActiveActivations = false;
        
        this.activations.forEach(activation => {
            const timeLeft = Math.max(0, Math.floor((activation.endTime - now) / 1000 / 60));
            
            if (timeLeft <= 0 && activation.status === 'waiting') {
                // Time expired, mark as expired
                activation.status = 'expired';
                this.showMessage(`Time expired for ${activation.service.name}`, 'error');
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
                    <p>No active numbers yet</p>
                    <p>Buy a service above to get started</p>
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
                statusText = 'Waiting for SMS';
                statusIcon = 'fas fa-clock';
                break;
            case 'completed':
                statusText = 'SMS Received';
                statusIcon = 'fas fa-check-circle';
                break;
            case 'expired':
                statusText = 'Time Expired';
                statusIcon = 'fas fa-exclamation-triangle';
                break;
            case 'cancelled':
                statusText = 'Cancelled';
                statusIcon = 'fas fa-times-circle';
                break;
            default:
                statusText = 'Unknown';
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
                        <h3>${activation.service.name}</h3>
                        <p>${activation.country} • ${activation.currentOperator || 'Random'}</p>
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
                    SMS Code: <strong>${activation.smsCode}</strong>
                </div>
            ` : activation.status === 'expired' ? `
                <div class="activation-timer expired">
                    <i class="fas fa-exclamation-triangle"></i>
                    Time expired - No SMS received
                </div>
            ` : `
                <div class="activation-timer">
                    <i class="fas fa-hourglass-half"></i>
                    Time remaining: ${timeLeft}:${secondsLeft.toString().padStart(2, '0')}
                </div>
            `}
            
            ${!canCancel && activation.status === 'waiting' ? `
                <div class="cooldown-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Wait ${remainingTime}s before cancel/request actions</span>
                </div>
            ` : ''}
            
            <div class="activation-actions">
                <button class="btn btn-danger ${!canCancel ? 'disabled' : ''}" 
                        onclick="${canCancel ? `window.smsService.cancelActivation(${activation.id})` : 'return false'}"
                        ${!canCancel ? 'disabled' : ''}>
                    <i class="fas fa-times"></i>
                    Cancel
                </button>
                <button class="btn btn-outline" onclick="window.smsService.checkActivationStatus(${activation.id})">
                    <i class="fas fa-sync"></i>
                    Check Status
                </button>
                <button class="btn btn-success ${!canCancel ? 'disabled' : ''}" 
                        onclick="${canCancel ? `window.smsService.requestAnotherSMS(${activation.id})` : 'return false'}"
                        ${!canCancel ? 'disabled' : ''}>
                    <i class="fas fa-sms"></i>
                    Request Another SMS
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
            console.log('Cancelling activation:', activationId);
            
            // Convert string to number for comparison
            const id = parseInt(activationId);
            
            // Check if 2 minutes have passed
            const activation = this.activations.find(a => a.id === id);
            if (activation) {
                const timeSinceOrder = new Date() - activation.startTime;
                const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds
                
                if (timeSinceOrder < twoMinutes) {
                    const remainingTime = Math.ceil((twoMinutes - timeSinceOrder) / 1000);
                    this.showMessage(`Cannot cancel before 2 minutes. Wait ${remainingTime} seconds more.`, 'error');
                    return;
                }
            }
            
            const response = await fetch(`${this.API_BASE_URL}?api_key=${this.API_KEY}&action=setStatus&id=${activationId}&status=8&lang=${this.LANG}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.text();
            
            console.log('Cancel response:', result);
            
            if (result === 'ACCESS_CANCEL') {
                // Remove from local array - ensure both are numbers for comparison
                const idToRemove = parseInt(activationId);
                this.activations = this.activations.filter(a => a.id !== idToRemove);
                this.updateActivationsDisplay();
                this.showMessage('Activation cancelled successfully', 'success');
            } else if (result === 'CANNOT_BEFORE_2_MIN') {
                this.showMessage('Cannot cancel before 2 minutes', 'error');
            } else if (result === 'BAD_STATUS') {
                // Activation already cancelled or invalid status
                const idToRemove = parseInt(activationId);
                this.activations = this.activations.filter(a => a.id !== idToRemove);
                this.updateActivationsDisplay();
                this.showMessage('Activation was already cancelled', 'info');
            } else {
                this.showMessage(`Cancel failed: ${result}`, 'error');
            }
        } catch (error) {
            console.error('Error cancelling activation:', error);
            this.showMessage(`Failed to cancel activation: ${error.message}`, 'error');
        }
    }

    async checkActivationStatus(activationId) {
        try {
            console.log('Checking status for activation:', activationId);
            
            // Convert string to number for comparison
            const id = parseInt(activationId);
            
            const response = await fetch(`${this.API_BASE_URL}?api_key=${this.API_KEY}&action=getStatus&id=${activationId}&lang=${this.LANG}`);
            const result = await response.text();
            
            console.log('Status response:', result);
            
            const idToFind = parseInt(activationId);
            const activation = this.activations.find(a => a.id === idToFind);
            if (activation) {
                if (result.startsWith('STATUS_OK:')) {
                    const smsCode = result.split(':')[1];
                    activation.status = 'completed';
                    activation.smsCode = smsCode;
                    this.showMessage(`SMS received! Code: ${smsCode}`, 'success');
                } else if (result === 'STATUS_WAIT_CODE') {
                    activation.status = 'waiting';
                    this.showMessage('Still waiting for SMS', 'info');
                } else if (result === 'STATUS_CANCEL') {
                    activation.status = 'cancelled';
                    this.showMessage('Activation was cancelled', 'info');
                } else {
                    this.showMessage(`Status: ${result}`, 'info');
                }
                this.updateActivationsDisplay();
            }
        } catch (error) {
            console.error('Error checking status:', error);
            this.showMessage('Failed to check status', 'error');
        }
    }

    async requestAnotherSMS(activationId) {
        try {
            console.log('Requesting another SMS for activation:', activationId);
            
            // Convert string to number for comparison
            const id = parseInt(activationId);
            
            // Check if 2 minutes have passed
            const activation = this.activations.find(a => a.id === id);
            if (activation) {
                const timeSinceOrder = new Date() - activation.startTime;
                const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds
                
                if (timeSinceOrder < twoMinutes) {
                    const remainingTime = Math.ceil((twoMinutes - timeSinceOrder) / 1000);
                    this.showMessage(`Cannot request another SMS before 2 minutes. Wait ${remainingTime} seconds more.`, 'error');
                    return;
                }
            }
            
            const response = await fetch(`${this.API_BASE_URL}?api_key=${this.API_KEY}&action=setStatus&id=${activationId}&status=3&lang=${this.LANG}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.text();
            
            console.log('Request SMS response:', result);
            
            if (result === 'ACCESS_RETRY_GET') {
                const idToFind = parseInt(activationId);
                const activation = this.activations.find(a => a.id === idToFind);
                if (activation) {
                    activation.status = 'waiting';
                    activation.startTime = new Date();
                    activation.endTime = new Date(Date.now() + 20 * 60 * 1000);
                    this.updateActivationsDisplay();
                    this.showMessage('Another SMS requested successfully', 'success');
                }
            } else {
                this.showMessage(`Request failed: ${result}`, 'error');
            }
        } catch (error) {
            console.error('Error requesting another SMS:', error);
            this.showMessage(`Failed to request another SMS: ${error.message}`, 'error');
        }
    }

    // Auth modal functions removed - no more login system

    // Load Fallback Data
    loadFallbackData() {
        console.log('📋 Loading fallback data...');
        
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
        
        console.log('✅ Fallback data loaded');
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
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