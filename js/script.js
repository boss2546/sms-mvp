// Import API functions
import { getCountries, getOperatorsByCountry, getServicesAndCost, getRecommendedServices } from '../api/countries.js';
import { getOperators } from '../api/operators.js';
import { getServicesAndCost as getServices, getServicesByCategory, getAvailableServices } from '../api/services.js';

// DOM Elements
const authBtn = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const topupModal = document.getElementById('topupModal');
const closeTopupModal = document.getElementById('closeTopupModal');

// Auth Modal Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabBtns = document.querySelectorAll('.tab-btn');

// Service Elements
const filterBtns = document.querySelectorAll('.filter-btn');
const serviceCards = document.querySelectorAll('.service-card');
const buyBtns = document.querySelectorAll('.buy-btn');

// Country and Operator Selectors
const countrySelect = document.getElementById('countrySelect');
const operatorSelect = document.getElementById('operatorSelect');

// Top-up Elements
const topupAmount = document.getElementById('topupAmount');
const slipUpload = document.getElementById('slipUpload');

// Modal Functions
function openModal(modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Auth Modal Event Listeners
authBtn.addEventListener('click', () => {
    openModal(authModal);
});

closeAuthModal.addEventListener('click', () => {
    closeModal(authModal);
});

// Close modal when clicking outside
authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        closeModal(authModal);
    }
});

// Tab switching in auth modal
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update active tab
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show/hide forms
        if (tab === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }
    });
});

// Auth Form Submissions
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // TODO: Implement login logic
    console.log('Login attempt:', { email, password });
    
    // For now, just close modal
    closeModal(authModal);
    alert('เข้าสู่ระบบสำเร็จ! (Demo)');
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    
    if (password !== confirmPassword) {
        alert('รหัสผ่านไม่ตรงกัน');
        return;
    }
    
    if (!agreeTerms) {
        alert('กรุณายอมรับข้อกำหนดและเงื่อนไข');
        return;
    }
    
    // TODO: Implement registration logic
    console.log('Registration attempt:', { email, password, agreeTerms });
    
    // For now, just close modal
    closeModal(authModal);
    alert('สมัครสมาชิกสำเร็จ! (Demo)');
});

// Service Filtering
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        
        // Update active filter
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Filter service cards
        serviceCards.forEach(card => {
            if (category === 'all' || card.dataset.category === category) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

// Buy Button Functionality
buyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Check if user is logged in (demo)
        const isLoggedIn = false; // TODO: Check actual login status
        
        if (!isLoggedIn) {
            openModal(authModal);
            return;
        }
        
        // TODO: Check user balance and show top-up modal if needed
        const hasEnoughBalance = true; // TODO: Check actual balance
        
        if (!hasEnoughBalance) {
            openModal(topupModal);
            return;
        }
        
        // TODO: Implement purchase logic
        console.log('Purchase attempt');
        alert('ซื้อบริการสำเร็จ! (Demo)');
    });
});

// Top-up Modal Event Listeners
closeTopupModal.addEventListener('click', () => {
    closeModal(topupModal);
});

topupModal.addEventListener('click', (e) => {
    if (e.target === topupModal) {
        closeModal(topupModal);
    }
});

// Top-up Amount Selection
topupAmount.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        const customAmount = prompt('กรุณาใส่จำนวนเงินที่ต้องการเติม:');
        if (customAmount && !isNaN(customAmount) && customAmount > 0) {
            // TODO: Set custom amount
            console.log('Custom amount:', customAmount);
        }
    }
});

// Slip Upload
slipUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        console.log('Slip uploaded:', file.name);
        // TODO: Implement slip verification with Thunder API
    }
});

// Country and Operator Change Handlers
countrySelect.addEventListener('change', async (e) => {
    const countryId = parseInt(e.target.value);
    console.log('Country changed to:', countryId);
    
    try {
        // Update operators based on country
        await updateOperators(countryId);
        
        // Reset operator selection
        operatorSelect.value = 'any';
        
        // Update services
        await updateServices(countryId, 'any');
    } catch (error) {
        console.error('Error updating operators:', error);
        showError('ไม่สามารถโหลดข้อมูลผู้ให้บริการได้');
    }
});

operatorSelect.addEventListener('change', async (e) => {
    const operator = e.target.value;
    const countryId = parseInt(countrySelect.value);
    console.log('Operator changed to:', operator);
    
    try {
        // Update services based on operator
        await updateServices(countryId, operator);
    } catch (error) {
        console.error('Error updating services:', error);
        showError('ไม่สามารถโหลดข้อมูลบริการได้');
    }
});

// API Integration Functions
async function loadCountries() {
    try {
        const countries = await getCountries();
        updateCountrySelect(countries);
    } catch (error) {
        console.error('Error loading countries:', error);
        showError('ไม่สามารถโหลดข้อมูลประเทศได้');
    }
}

async function updateOperators(countryId) {
    try {
        const operators = await getOperatorsByCountry(countryId);
        updateOperatorSelect(operators);
    } catch (error) {
        console.error('Error updating operators:', error);
        showError('ไม่สามารถโหลดข้อมูลผู้ให้บริการได้');
    }
}

async function updateServices(countryId, operatorId) {
    try {
        const services = await getServicesAndCost(countryId, operatorId);
        updateServiceList(services);
    } catch (error) {
        console.error('Error updating services:', error);
        showError('ไม่สามารถโหลดข้อมูลบริการได้');
    }
}

function updateCountrySelect(countries) {
    // Clear existing options
    countrySelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'เลือกประเทศ';
    countrySelect.appendChild(defaultOption);
    
    // Add country options
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.id;
        option.textContent = country.name;
        countrySelect.appendChild(option);
    });
}

function updateOperatorSelect(operators) {
    // Clear existing options
    operatorSelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = 'any';
    defaultOption.textContent = 'สุ่ม (Any)';
    operatorSelect.appendChild(defaultOption);
    
    // Add operator options
    operators.forEach(operator => {
        const option = document.createElement('option');
        option.value = operator.id;
        option.textContent = operator.name;
        operatorSelect.appendChild(option);
    });
}

function updateServiceList(services) {
    const serviceList = document.querySelector('.service-list');
    
    // Clear existing services
    serviceList.innerHTML = '';
    
    if (services.length === 0) {
        serviceList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>ไม่มีบริการที่พร้อมใช้งาน</h3>
                <p>กรุณาเลือกประเทศและผู้ให้บริการอื่น</p>
            </div>
        `;
        return;
    }
    
    // Create service cards
    services.forEach(service => {
        const serviceCard = createServiceCard(service);
        serviceList.appendChild(serviceCard);
    });
}

function createServiceCard(service) {
    const card = document.createElement('div');
    card.className = `service-card ${service.available ? '' : 'unavailable'}`;
    card.dataset.category = service.category;
    
    const iconClass = getServiceIcon(service.id);
    const priceFormatted = formatPrice(service.price);
    const stockText = service.available ? `${service.quantity} หมายเลข` : 'หมด';
    
    card.innerHTML = `
        <div class="service-icon">
            <i class="${iconClass}"></i>
        </div>
        <div class="service-info">
            <h4>${service.name}</h4>
            <p class="service-desc">รับ SMS สำหรับ ${service.name}</p>
            <div class="service-meta">
                <span class="price">${priceFormatted}</span>
                <span class="stock">${stockText}</span>
            </div>
        </div>
        <button class="buy-btn" ${!service.available ? 'disabled' : ''}>
            ${service.available ? 'ซื้อ' : 'หมด'}
        </button>
    `;
    
    // Add event listener to buy button
    const buyBtn = card.querySelector('.buy-btn');
    if (service.available) {
        buyBtn.addEventListener('click', () => {
            handleServicePurchase(service);
        });
    }
    
    return card;
}

function getServiceIcon(serviceId) {
    const iconMap = {
        'fb': 'fab fa-facebook',
        'ig': 'fab fa-instagram',
        'wa': 'fab fa-whatsapp',
        'tg': 'fab fa-telegram',
        'sn': 'fab fa-snapchat',
        'ds': 'fab fa-discord',
        'ts': 'fab fa-paypal',
        're': 'fab fa-bitcoin',
        'mt': 'fab fa-steam',
        'go': 'fab fa-google',
        'mm': 'fab fa-microsoft'
    };
    
    return iconMap[serviceId] || 'fas fa-mobile-alt';
}

function showError(message) {
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('SMS Verification Service initialized');
    
    try {
        // Load initial data from APIs
        await loadCountries();
        
        // Set default country (Thailand)
        countrySelect.value = '52';
        await updateOperators(52);
        await updateServices(52, 'any');
        
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
});

// Utility Functions
function formatPrice(amount) {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB'
    }).format(amount);
}

function formatTimeRemaining(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
        return `${hours} ชั่วโมง ${mins} นาที`;
    }
    return `${mins} นาที`;
}

// Service Management Functions
function addServiceCard(service) {
    const serviceList = document.querySelector('.service-list');
    const card = createServiceCard(service);
    serviceList.appendChild(card);
}

function createServiceCard(service) {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.dataset.category = service.category;
    
    card.innerHTML = `
        <div class="service-icon">
            <i class="${service.icon}"></i>
        </div>
        <div class="service-info">
            <h4>${service.name}</h4>
            <p class="service-desc">${service.description}</p>
            <div class="service-meta">
                <span class="price">${formatPrice(service.price)}</span>
                <span class="stock">${service.stock}</span>
            </div>
        </div>
        <button class="buy-btn">ซื้อ</button>
    `;
    
    // Add event listener to buy button
    const buyBtn = card.querySelector('.buy-btn');
    buyBtn.addEventListener('click', () => {
        handleServicePurchase(service);
    });
    
    return card;
}

function handleServicePurchase(service) {
    console.log('Purchasing service:', service);
    // TODO: Implement actual purchase logic
}

// Demo data for testing
const demoServices = [
    {
        name: 'Facebook',
        description: 'รับ SMS สำหรับ Facebook',
        price: 15,
        stock: '20/100',
        category: 'social',
        icon: 'fab fa-facebook'
    },
    {
        name: 'Instagram',
        description: 'รับ SMS สำหรับ Instagram',
        price: 18,
        stock: '15/50',
        category: 'social',
        icon: 'fab fa-instagram'
    },
    {
        name: 'PayPal',
        description: 'รับ SMS สำหรับ PayPal',
        price: 25,
        stock: '8/30',
        category: 'finance',
        icon: 'fab fa-paypal'
    }
];

// Export functions for potential use in other modules
window.SMSVerification = {
    openModal,
    closeModal,
    formatPrice,
    formatTimeRemaining,
    addServiceCard,
    createServiceCard
};