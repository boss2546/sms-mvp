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
countrySelect.addEventListener('change', (e) => {
    const countryId = e.target.value;
    console.log('Country changed to:', countryId);
    
    // TODO: Update operators based on country
    // TODO: Update services based on country and operator
});

operatorSelect.addEventListener('change', (e) => {
    const operator = e.target.value;
    console.log('Operator changed to:', operator);
    
    // TODO: Update services based on operator
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log('SMS Verification Service initialized');
    
    // TODO: Load initial data from APIs
    // TODO: Set up real-time updates
    // TODO: Initialize user session if exists
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