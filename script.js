// Helper to show the main site after successful login/register
function showMainSite() {
    // Hide the Wix-style overlay
    var overlay = document.getElementById('entryAuthOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';

    // Replace Login/Register button with user profile after login
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;
    // Remove Login/Register button if present
    const loginBtn = document.getElementById('loginRegisterBtn');
    if (loginBtn) loginBtn.remove();

    // Remove any previous user profile if present
    const oldProfile = document.getElementById('userProfileMenu');
    if (oldProfile) oldProfile.remove();

    // Get user info from Firebase
    const user = firebase.auth().currentUser;
    let displayName = user && user.displayName ? user.displayName : (user && user.email ? user.email.split('@')[0] : 'User');

    // Create profile menu
    const profileMenu = document.createElement('div');
    profileMenu.id = 'userProfileMenu';
    profileMenu.style.position = 'relative';
    profileMenu.style.display = 'flex';
    profileMenu.style.alignItems = 'center';
    profileMenu.style.gap = '8px';
    profileMenu.innerHTML = `
        <button id="profileBtn" style="background:none;border:none;display:flex;align-items:center;gap:8px;cursor:pointer;">
            <img src='https://cdn-icons-png.flaticon.com/512/3033/3033143.png' alt='Profile' style='width:32px;height:32px;border-radius:50%;object-fit:cover;'>
            <span style="font-weight:600;font-size:1.08rem;color:inherit;">${displayName}</span>
            <i class="fas fa-caret-down" style="font-size:1.1rem;"></i>
        </button>
        <div id="profileDropdown" style="display:none;position:absolute;top:110%;right:0;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.13);border-radius:10px;min-width:160px;z-index:1001;overflow:hidden;">
            <a href="#" id="profileView" style="display:block;padding:12px 18px;color:#222;text-decoration:none;font-size:1rem;">Profile</a>
            <a href="#" id="profileLogout" style="display:block;padding:12px 18px;color:#222;text-decoration:none;font-size:1rem;">Logout</a>
        </div>
    `;
    headerActions.insertBefore(profileMenu, headerActions.firstChild);

    // Dropdown logic
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileBtn && profileDropdown) {
        profileBtn.onclick = function(e) {
            e.stopPropagation();
            profileDropdown.style.display = profileDropdown.style.display === 'block' ? 'none' : 'block';
        };
        // Hide dropdown on outside click
        document.addEventListener('click', function hideDropdown(e) {
            if (!profileMenu.contains(e.target)) {
                profileDropdown.style.display = 'none';
            }
        });
    }
    // Logout logic
    const logoutBtn = document.getElementById('profileLogout');
    if (logoutBtn) {
        logoutBtn.onclick = async function(e) {
            e.preventDefault();
            await firebase.auth().signOut();
            // Remove profile menu and restore Login/Register button
            profileMenu.remove();
            if (!document.getElementById('loginRegisterBtn')) {
                const btn = document.createElement('button');
                btn.className = 'login-btn';
                btn.id = 'loginRegisterBtn';
                btn.textContent = 'Login / Register';
                btn.onclick = function() {
                    const authModal = document.getElementById('entryAuthOverlay');
                    if (authModal) authModal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                };
                headerActions.insertBefore(btn, headerActions.firstChild);
            }
        };
    }
}
const AppState = {
    vehicles: [],
    filteredVehicles: [],
    currentPage: 1,
    itemsPerPage: 12,
    currentView: 'grid',
    currentSort: 'date_desc',
    activeFilters: {},
    map: null,
    markers: [],
    searchTimeout: null
};

// Sample vehicle data (in production, this would come from API)
const sampleVehicles = [
    {
        id: 1,
        title: "Maruti Suzuki Swift VXI",
        price: 485000,
        originalPrice: 520000,
        year: 2019,
        make: "Maruti Suzuki",
        model: "Swift",
        variant: "VXI",
        fuelType: "petrol",
        transmission: "manual",
        kms: 42000,
        condition: "Good",
        location: "Mumbai, Maharashtra",
        lat: 19.0760,
        lng: 72.8777,
        bank: "HDFC Bank",
        images: [
            "https://images.unsplash.com/photo-1494976688602-d440f2af51e2?w=400&h=250&fit=crop",
            "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=250&fit=crop"
        ],
        featured: true,
        auctionDate: "2025-07-25T10:00:00Z",
        vehicleType: "car",
        registrationNumber: "MH01AB1234",
        description: "Well maintained Swift with complete service history. Single owner, all documents clear."
    },
    {
        id: 2,
        title: "Honda Activa 6G Standard",
        price: 68000,
        originalPrice: 75000,
        year: 2021,
        make: "Honda",
        model: "Activa 6G",
        variant: "Standard",
        fuelType: "petrol",
        transmission: "automatic",
        kms: 15000,
        condition: "Excellent",
        location: "Delhi, New Delhi",
        lat: 28.6139,
        lng: 77.2090,
        bank: "SBI",
        images: [
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=250&fit=crop",
            "https://images.unsplash.com/photo-1574518220517-edeefe43e4ab?w=400&h=250&fit=crop"
        ],
        featured: false,
        auctionDate: "2025-07-28T14:00:00Z",
        vehicleType: "motorcycle",
        registrationNumber: "DL8SAA9876",
        description: "Almost new Activa with minimal usage. Perfect for city commuting."
    },
    {
        id: 3,
        title: "Mahindra Scorpio S10",
        price: 875000,
        originalPrice: 950000,
        year: 2018,
        make: "Mahindra",
        model: "Scorpio",
        variant: "S10",
        fuelType: "diesel",
        transmission: "manual",
        kms: 85000,
        condition: "Good",
        location: "Bangalore, Karnataka",
        lat: 12.9716,
        lng: 77.5946,
        bank: "Axis Bank",
        images: [
            "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=250&fit=crop",
            "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400&h=250&fit=crop"
        ],
        featured: false,
        auctionDate: "2025-07-30T11:00:00Z",
        vehicleType: "suv",
        registrationNumber: "KA03MN5678",
        description: "Powerful SUV perfect for family trips. Well maintained with regular servicing."
    },
    {
        id: 4,
        title: "Hyundai i20 Asta",
        price: 625000,
        originalPrice: 680000,
        year: 2020,
        make: "Hyundai",
        model: "i20",
        variant: "Asta",
        fuelType: "petrol",
        transmission: "automatic",
        kms: 32000,
        condition: "Very Good",
        location: "Chennai, Tamil Nadu",
        lat: 13.0827,
        lng: 80.2707,
        bank: "ICICI Bank",
        images: [
            "https://images.unsplash.com/photo-1549399421-ac9b7d6b11b9?w=400&h=250&fit=crop",
            "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=250&fit=crop"
        ],
        featured: true,
        auctionDate: "2025-08-02T09:00:00Z",
        vehicleType: "car",
        registrationNumber: "TN09CD4321",
        description: "Premium hatchback with advanced features and excellent fuel economy."
    },
    {
        id: 5,
        title: "Royal Enfield Classic 350",
        price: 145000,
        originalPrice: 165000,
        year: 2019,
        make: "Royal Enfield",
        model: "Classic 350",
        variant: "Standard",
        fuelType: "petrol",
        transmission: "manual",
        kms: 28000,
        condition: "Good",
        location: "Pune, Maharashtra",
        lat: 18.5204,
        lng: 73.8567,
        bank: "PNB",
        images: [
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=250&fit=crop",
            "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=400&h=250&fit=crop"
        ],
        featured: false,
        auctionDate: "2025-08-05T13:00:00Z",
        vehicleType: "motorcycle",
        registrationNumber: "MH12EF7890",
        description: "Classic motorcycle with timeless appeal. Regular maintenance done."
    },
    {
        id: 6,
        title: "Tata Nexon XZ+",
        price: 785000,
        originalPrice: 845000,
        year: 2021,
        make: "Tata",
        model: "Nexon",
        variant: "XZ+",
        fuelType: "petrol",
        transmission: "automatic",
        kms: 18000,
        condition: "Excellent",
        location: "Hyderabad, Telangana",
        lat: 17.3850,
        lng: 78.4867,
        bank: "Bank of Baroda",
        images: [
            "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=400&h=250&fit=crop",
            "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=250&fit=crop"
        ],
        featured: true,
        auctionDate: "2025-08-08T15:00:00Z",
        vehicleType: "suv",
        registrationNumber: "TS07GH2468",
        description: "Compact SUV with modern features and safety ratings. Low mileage vehicle."
    }
];

// Utility Functions
const Utils = {
    // Format price in Indian currency
    formatPrice: (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price);
    },

    // Calculate vehicle age
    calculateAge: (year) => {
        return new Date().getFullYear() - year;
    },

    // Format date for display
    formatDate: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Debounce function for search
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Get distance between two points
    getDistance: (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
};

// Search and Filter Functions
const SearchFilter = {
    // Apply all active filters
    applyFilters: () => {
        let filtered = [...AppState.vehicles];

        // Text search
        if (AppState.activeFilters.query) {
            const query = AppState.activeFilters.query.toLowerCase();
            filtered = filtered.filter(vehicle =>
                vehicle.title.toLowerCase().includes(query) ||
                vehicle.make.toLowerCase().includes(query) ||
                vehicle.model.toLowerCase().includes(query) ||
                vehicle.location.toLowerCase().includes(query)
            );
        }

        // Location filter
        if (AppState.activeFilters.location && AppState.activeFilters.location !== '') {
            filtered = filtered.filter(vehicle =>
                vehicle.location.includes(AppState.activeFilters.location)
            );
        }

        // Vehicle type filter
        if (AppState.activeFilters.vehicleType && AppState.activeFilters.vehicleType !== 'all') {
            filtered = filtered.filter(vehicle =>
                vehicle.vehicleType === AppState.activeFilters.vehicleType
            );
        }

        // Price range filter
        if (AppState.activeFilters.minPrice || AppState.activeFilters.maxPrice) {
            filtered = filtered.filter(vehicle => {
                const price = vehicle.price;
                const min = AppState.activeFilters.minPrice || 0;
                const max = AppState.activeFilters.maxPrice || Infinity;
                return price >= min && price <= max;
            });
        }

        // Age filter
        if (AppState.activeFilters.minAge || AppState.activeFilters.maxAge) {
            filtered = filtered.filter(vehicle => {
                const age = Utils.calculateAge(vehicle.year);
                const minAge = AppState.activeFilters.minAge || 0;
                const maxAge = AppState.activeFilters.maxAge || Infinity;
                return age >= minAge && age <= maxAge;
            });
        }

        // Brand filter
        if (AppState.activeFilters.brands && AppState.activeFilters.brands.length > 0) {
            filtered = filtered.filter(vehicle =>
                AppState.activeFilters.brands.includes(vehicle.make)
            );
        }

        // Fuel type filter
        if (AppState.activeFilters.fuelType && AppState.activeFilters.fuelType !== 'all') {
            filtered = filtered.filter(vehicle =>
                vehicle.fuelType === AppState.activeFilters.fuelType
            );
        }

        // Transmission filter
        if (AppState.activeFilters.transmission && AppState.activeFilters.transmission !== 'all') {
            filtered = filtered.filter(vehicle =>
                vehicle.transmission === AppState.activeFilters.transmission
            );
        }

        // KMs driven filter
        if (AppState.activeFilters.minKms || AppState.activeFilters.maxKms) {
            filtered = filtered.filter(vehicle => {
                const kms = vehicle.kms;
                const min = AppState.activeFilters.minKms || 0;
                const max = AppState.activeFilters.maxKms || Infinity;
                return kms >= min && kms <= max;
            });
        }

        // Condition filter
        if (AppState.activeFilters.condition && AppState.activeFilters.condition !== 'all') {
            filtered = filtered.filter(vehicle =>
                vehicle.condition === AppState.activeFilters.condition
            );
        }

        // Bank filter
        if (AppState.activeFilters.bank && AppState.activeFilters.bank !== 'all') {
            filtered = filtered.filter(vehicle =>
                vehicle.bank === AppState.activeFilters.bank
            );
        }

        AppState.filteredVehicles = filtered;
        SearchFilter.applySorting();
    },

    // Apply sorting
    applySorting: () => {
        const sortBy = AppState.currentSort;
        
        AppState.filteredVehicles.sort((a, b) => {
            switch (sortBy) {
                case 'price_asc':
                    return a.price - b.price;
                case 'price_desc':
                    return b.price - a.price;
                case 'age_asc':
                    return Utils.calculateAge(b.year) - Utils.calculateAge(a.year);
                case 'age_desc':
                    return Utils.calculateAge(a.year) - Utils.calculateAge(b.year);
                case 'kms_asc':
                    return a.kms - b.kms;
                case 'kms_desc':
                    return b.kms - a.kms;
                case 'date_asc':
                    return new Date(a.auctionDate) - new Date(b.auctionDate);
                case 'date_desc':
                default:
                    return new Date(b.auctionDate) - new Date(a.auctionDate);
            }
        });

        UI.updateResults();
        UI.updatePagination();
    },

    // Quick filter handlers
    applyQuickFilter: (filterType, value) => {
        switch (filterType) {
            case 'price_under_5l':
                AppState.activeFilters.maxPrice = 500000;
                document.getElementById('maxPrice').value = 500000;
                break;
            case 'cars':
                AppState.activeFilters.vehicleType = 'car';
                document.getElementById('vehicleTypeSelect').value = 'car';
                break;
            case 'motorcycles':
                AppState.activeFilters.vehicleType = 'motorcycle';
                document.getElementById('vehicleTypeSelect').value = 'motorcycle';
                break;
            case 'this_week':
                // Filter vehicles with auction this week
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                // This would be implemented based on auction dates
                break;
            case 'low_kms':
                AppState.activeFilters.maxKms = 20000;
                document.getElementById('maxKms').value = 20000;
                break;
        }
        SearchFilter.applyFilters();
    }
};

// UI Management Functions
const UI = {
    // Initialize the application
    init: () => {
        AppState.vehicles = sampleVehicles;
        AppState.filteredVehicles = [...sampleVehicles];
        
        UI.bindEvents();
        UI.updateResults();
        UI.updatePagination();
        UI.initializeMap();
        // Hide loading spinner after UI is ready
        document.getElementById('loadingSpinner').style.display = 'none';
    },

    // Bind all event listeners
    bindEvents: () => {
        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', UI.handleSearch);
        document.getElementById('searchQuery').addEventListener('keyup', 
            Utils.debounce(UI.handleSearch, 500));

        // Main search form
        document.getElementById('locationSelect').addEventListener('change', UI.handleLocationChange);
        document.getElementById('vehicleTypeSelect').addEventListener('change', UI.handleVehicleTypeChange);

        // Filter events
        document.getElementById('minPrice').addEventListener('input', UI.handlePriceFilter);
        document.getElementById('maxPrice').addEventListener('input', UI.handlePriceFilter);
        document.getElementById('minAge').addEventListener('input', UI.handleAgeFilter);
        document.getElementById('maxAge').addEventListener('input', UI.handleAgeFilter);
        document.getElementById('minKms').addEventListener('input', UI.handleKmsFilter);
        document.getElementById('maxKms').addEventListener('input', UI.handleKmsFilter);

        // Select filters
        document.getElementById('fuelTypeSelect').addEventListener('change', UI.handleFuelTypeFilter);
        document.getElementById('transmissionSelect').addEventListener('change', UI.handleTransmissionFilter);
        document.getElementById('conditionSelect').addEventListener('change', UI.handleConditionFilter);
        document.getElementById('bankSelect').addEventListener('change', UI.handleBankFilter);

        // Brand checkboxes
        document.querySelectorAll('.brand-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', UI.handleBrandFilter);
        });

        // Price chips
        document.querySelectorAll('.price-chip').forEach(chip => {
            chip.addEventListener('click', UI.handlePriceChip);
        });

        // Age chips
        document.querySelectorAll('.age-chip').forEach(chip => {
            chip.addEventListener('click', UI.handleAgeChip);
        });

        // KMs chips
        document.querySelectorAll('.kms-chip').forEach(chip => {
            chip.addEventListener('click', UI.handleKmsChip);
        });

        // Quick filters
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', UI.handleQuickFilter);
        });

        // View toggle
        document.getElementById('gridView').addEventListener('click', () => UI.changeView('grid'));
        document.getElementById('listView').addEventListener('click', () => UI.changeView('list'));
        document.getElementById('mapView').addEventListener('click', () => UI.changeView('map'));

        // Sort dropdown
        document.getElementById('sortSelect').addEventListener('change', UI.handleSort);

        // Clear filters
        document.getElementById('clearFilters').addEventListener('click', UI.clearAllFilters);

        // Mobile filter toggle
        document.getElementById('showFilters').addEventListener('click', UI.toggleMobileFilters);
        document.getElementById('closeFilters').addEventListener('click', UI.toggleMobileFilters);

        // Pagination
        document.getElementById('prevPage').addEventListener('click', UI.prevPage);
        document.getElementById('nextPage').addEventListener('click', UI.nextPage);
    },

    // Event Handlers
    handleSearch: () => {
        const query = document.getElementById('searchQuery').value;
        AppState.activeFilters.query = query;
        SearchFilter.applyFilters();
    },

    handleLocationChange: (e) => {
        AppState.activeFilters.location = e.target.value;
        SearchFilter.applyFilters();
    },

    handleVehicleTypeChange: (e) => {
        AppState.activeFilters.vehicleType = e.target.value;
        SearchFilter.applyFilters();
    },

    handlePriceFilter: () => {
        const minPrice = document.getElementById('minPrice').value;
        const maxPrice = document.getElementById('maxPrice').value;
        
        AppState.activeFilters.minPrice = minPrice ? parseInt(minPrice) : null;
        AppState.activeFilters.maxPrice = maxPrice ? parseInt(maxPrice) : null;
        
        SearchFilter.applyFilters();
    },

    handleAgeFilter: () => {
        const minAge = document.getElementById('minAge').value;
        const maxAge = document.getElementById('maxAge').value;
        
        AppState.activeFilters.minAge = minAge ? parseInt(minAge) : null;
        AppState.activeFilters.maxAge = maxAge ? parseInt(maxAge) : null;
        
        SearchFilter.applyFilters();
    },

    handleKmsFilter: () => {
        const minKms = document.getElementById('minKms').value;
        const maxKms = document.getElementById('maxKms').value;
        
        AppState.activeFilters.minKms = minKms ? parseInt(minKms) : null;
        AppState.activeFilters.maxKms = maxKms ? parseInt(maxKms) : null;
        
        SearchFilter.applyFilters();
    },

    handleFuelTypeFilter: (e) => {
        AppState.activeFilters.fuelType = e.target.value;
        SearchFilter.applyFilters();
    },

    handleTransmissionFilter: (e) => {
        AppState.activeFilters.transmission = e.target.value;
        SearchFilter.applyFilters();
    },

    handleConditionFilter: (e) => {
        AppState.activeFilters.condition = e.target.value;
        SearchFilter.applyFilters();
    },

    handleBankFilter: (e) => {
        AppState.activeFilters.bank = e.target.value;
        SearchFilter.applyFilters();
    },

    handleBrandFilter: () => {
        const selectedBrands = [];
        document.querySelectorAll('.brand-checkbox:checked').forEach(checkbox => {
            selectedBrands.push(checkbox.value);
        });
        AppState.activeFilters.brands = selectedBrands;
        SearchFilter.applyFilters();
    },

    handlePriceChip: (e) => {
        const range = e.target.dataset.range.split(',');
        const min = range[0] ? parseInt(range[0]) : null;
        const max = range[1] ? parseInt(range[1]) : null;
        
        document.getElementById('minPrice').value = min || '';
        document.getElementById('maxPrice').value = max || '';
        
        AppState.activeFilters.minPrice = min;
        AppState.activeFilters.maxPrice = max;
        
        // Update chip states
        document.querySelectorAll('.price-chip').forEach(chip => chip.classList.remove('active'));
        e.target.classList.add('active');
        
        SearchFilter.applyFilters();
    },

    handleAgeChip: (e) => {
        const range = e.target.dataset.range.split(',');
        const min = range[0] ? parseInt(range[0]) : null;
        const max = range[1] ? parseInt(range[1]) : null;
        
        document.getElementById('minAge').value = min || '';
        document.getElementById('maxAge').value = max || '';
        
        AppState.activeFilters.minAge = min;
        AppState.activeFilters.maxAge = max;
        
        // Update chip states
        document.querySelectorAll('.age-chip').forEach(chip => chip.classList.remove('active'));
        e.target.classList.add('active');
        
        SearchFilter.applyFilters();
    },

    handleKmsChip: (e) => {
        const range = e.target.dataset.range.split(',');
        const min = range[0] ? parseInt(range[0]) : null;
        const max = range[1] ? parseInt(range[1]) : null;
        
        document.getElementById('minKms').value = min || '';
        document.getElementById('maxKms').value = max || '';
        
        AppState.activeFilters.minKms = min;
        AppState.activeFilters.maxKms = max;
        
        // Update chip states
        document.querySelectorAll('.kms-chip').forEach(chip => chip.classList.remove('active'));
        e.target.classList.add('active');
        
        SearchFilter.applyFilters();
    },

    handleQuickFilter: (e) => {
        const filterText = e.target.textContent.toLowerCase();
        if (filterText.includes('under ₹5l')) {
            SearchFilter.applyQuickFilter('price_under_5l');
        } else if (filterText === 'cars') {
            SearchFilter.applyQuickFilter('cars');
        } else if (filterText === 'motorcycles') {
            SearchFilter.applyQuickFilter('motorcycles');
        } else if (filterText === 'this week') {
            SearchFilter.applyQuickFilter('this_week');
        } else if (filterText === 'low kms') {
            SearchFilter.applyQuickFilter('low_kms');
        }
    },

    handleSort: (e) => {
        AppState.currentSort = e.target.value;
        SearchFilter.applySorting();
    },

    // View Management
    changeView: (view) => {
        AppState.currentView = view;
        
        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(view + 'View').classList.add('active');
        
        // Show/hide appropriate containers
        const vehicleContainer = document.getElementById('vehicleContainer');
        const mapContainer = document.getElementById('mapContainer');
        
        if (view === 'map') {
            vehicleContainer.style.display = 'none';
            mapContainer.style.display = 'block';
            UI.updateMapMarkers();
        } else {
            vehicleContainer.style.display = 'block';
            mapContainer.style.display = 'none';
            
            vehicleContainer.className = view === 'grid' ? 'vehicle-grid' : 'vehicle-list';
            UI.updateResults();
        }
    },

    // Results Management
    updateResults: () => {
        const container = document.getElementById('vehicleContainer');
        const startIndex = (AppState.currentPage - 1) * AppState.itemsPerPage;
        const endIndex = startIndex + AppState.itemsPerPage;
        const vehiclesToShow = AppState.filteredVehicles.slice(startIndex, endIndex);
        
        // Update results count
        document.getElementById('resultsCount').textContent = AppState.filteredVehicles.length;
        
        if (vehiclesToShow.length === 0) {
            container.innerHTML = UI.getNoResultsHTML();
            return;
        }
        
        container.innerHTML = vehiclesToShow.map(vehicle => 
            AppState.currentView === 'list' ? UI.getVehicleListHTML(vehicle) : UI.getVehicleCardHTML(vehicle)
        ).join('');
        
        // Bind vehicle card events
        UI.bindVehicleEvents();
    },

    // Vehicle Card HTML Generation
    getVehicleCardHTML: (vehicle) => {
        const age = Utils.calculateAge(vehicle.year);
        return `
            <div class="vehicle-card" data-id="${vehicle.id}">
                <div class="vehicle-image">
                    <img src="${vehicle.images[0]}" alt="${vehicle.title}" loading="lazy">
                    <div class="vehicle-badges">
                        ${vehicle.featured ? '<span class="badge featured">Featured</span>' : ''}
                        <span class="badge">${age} years old</span>
                    </div>
                    <button class="wishlist-btn" data-id="${vehicle.id}">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                <div class="vehicle-details">
                    <h3 class="vehicle-title">${vehicle.title}</h3>
                    <div class="vehicle-price">
                        ${Utils.formatPrice(vehicle.price)}
                        ${vehicle.originalPrice > vehicle.price ? 
                            `<span class="original-price">${Utils.formatPrice(vehicle.originalPrice)}</span>` : ''}
                    </div>
                    <div class="vehicle-specs">
                        <div class="spec-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${vehicle.year}</span>
                        </div>
                        <div class="spec-item">
                            <i class="fas fa-gas-pump"></i>
                            <span>${vehicle.fuelType.charAt(0).toUpperCase() + vehicle.fuelType.slice(1)}</span>
                        </div>
                        <div class="spec-item">
                            <i class="fas fa-cog"></i>
                            <span>${vehicle.transmission.charAt(0).toUpperCase() + vehicle.transmission.slice(1)}</span>
                        </div>
                        <div class="spec-item">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>${vehicle.kms.toLocaleString('en-IN')} km</span>
                        </div>
                    </div>
                    <div class="vehicle-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${vehicle.location}</span>
                    </div>
                    <div class="vehicle-bank">${vehicle.bank}</div>
                    <div class="vehicle-actions">
                        <button class="btn-secondary view-details" data-id="${vehicle.id}">View Details</button>
                        <button class="btn-contact" data-id="${vehicle.id}">Contact</button>
                    </div>
                </div>
            </div>
        `;
    },

    // Vehicle List HTML Generation (for list view)
    getVehicleListHTML: (vehicle) => {
        const age = Utils.calculateAge(vehicle.year);
        return `
            <div class="vehicle-card" data-id="${vehicle.id}">
                <div class="vehicle-image">
                    <img src="${vehicle.images[0]}" alt="${vehicle.title}" loading="lazy">
                    <div class="vehicle-badges">
                        ${vehicle.featured ? '<span class="badge featured">Featured</span>' : ''}
                    </div>
                    <button class="wishlist-btn" data-id="${vehicle.id}">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                <div class="vehicle-details">
                    <h3 class="vehicle-title">${vehicle.title}</h3>
                    <div class="vehicle-price">
                        ${Utils.formatPrice(vehicle.price)}
                        ${vehicle.originalPrice > vehicle.price ? 
                            `<span class="original-price">${Utils.formatPrice(vehicle.originalPrice)}</span>` : ''}
                    </div>
                    <div class="vehicle-specs">
                        <div class="spec-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${vehicle.year} (${age} years)</span>
                        </div>
                        <div class="spec-item">
                        <i class="fas fa-gas-pump"></i>
                            <span>${vehicle.fuelType.charAt(0).toUpperCase() + vehicle.fuelType.slice(1)}</span>
                        </div>
                        <div class="spec-item">
                            <i class="fas fa-cog"></i>
                            <span>${vehicle.transmission.charAt(0).toUpperCase() + vehicle.transmission.slice(1)}</span>
                        </div>
                        <div class="spec-item">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>${vehicle.kms.toLocaleString('en-IN')} km</span>
                        </div>
                        <div class="spec-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${vehicle.location}</span>
                        </div>
                    </div>
                    <div class="vehicle-bank">${vehicle.bank}</div>
                    <div class="vehicle-description">
                        <p>${vehicle.description}</p>
                    </div>
                    <div class="vehicle-auction-date">
                        <i class="fas fa-calendar"></i>
                        <span>Auction: ${Utils.formatDate(vehicle.auctionDate)}</span>
                    </div>
                    <div class="vehicle-actions">
                        <button class="btn-secondary view-details" data-id="${vehicle.id}">View Details</button>
                        <button class="btn-contact" data-id="${vehicle.id}">Contact</button>
                        <button class="wishlist-btn" data-id="${vehicle.id}">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // No results HTML
    getNoResultsHTML: () => {
        return `
            <div class="no-results">
                <div class="no-results-icon">
                    <i class="fas fa-search"></i>
                </div>
                <h3>No vehicles found</h3>
                <p>Try adjusting your search criteria or filters</p>
                <button class="btn-primary" id="clearFiltersBtn">Clear All Filters</button>
            </div>
        `;
    },

    // Bind vehicle card events
    bindVehicleEvents: () => {
        // View details buttons
        document.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vehicleId = e.target.dataset.id;
                UI.showVehicleModal(vehicleId);
            });
        });

        // Contact buttons
        document.querySelectorAll('.btn-contact').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vehicleId = e.target.dataset.id;
                UI.showContactModal(vehicleId);
            });
        });

        // Wishlist buttons
        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vehicleId = e.target.dataset.id;
                UI.toggleWishlist(vehicleId);
            });
        });

        // Clear filters button in no results
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', UI.clearAllFilters);
        }
    },

    // Pagination Management
    updatePagination: () => {
        const totalPages = Math.ceil(AppState.filteredVehicles.length / AppState.itemsPerPage);
        const pageNumbers = document.getElementById('pageNumbers');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');

        // Update button states
        prevBtn.disabled = AppState.currentPage === 1;
        nextBtn.disabled = AppState.currentPage === totalPages || totalPages === 0;

        // Generate page numbers
        let paginationHTML = '';
        const maxVisiblePages = 5;
        let startPage = Math.max(1, AppState.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        // Adjust start page if we're near the end
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Add first page and ellipsis if needed
        if (startPage > 1) {
            paginationHTML += `<button class="page-number" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="page-ellipsis">...</span>`;
            }
        }

        // Add visible page numbers
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-number ${i === AppState.currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        // Add last page and ellipsis if needed
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="page-ellipsis">...</span>`;
            }
            paginationHTML += `<button class="page-number" data-page="${totalPages}">${totalPages}</button>`;
        }

        pageNumbers.innerHTML = paginationHTML;

        // Bind page number events
        document.querySelectorAll('.page-number').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                UI.goToPage(page);
            });
        });
    },

    // Page navigation
    prevPage: () => {
        if (AppState.currentPage > 1) {
            AppState.currentPage--;
            UI.updateResults();
            UI.updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },

    nextPage: () => {
        const totalPages = Math.ceil(AppState.filteredVehicles.length / AppState.itemsPerPage);
        if (AppState.currentPage < totalPages) {
            AppState.currentPage++;
            UI.updateResults();
            UI.updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },

    goToPage: (page) => {
        AppState.currentPage = page;
        UI.updateResults();
        UI.updatePagination();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // Clear all filters
    clearAllFilters: () => {
        // Reset all filter values
        AppState.activeFilters = {};
        
        // Clear form inputs
        document.getElementById('searchQuery').value = '';
        document.getElementById('locationSelect').value = '';
        document.getElementById('vehicleTypeSelect').value = 'all';
        document.getElementById('minPrice').value = '';
        document.getElementById('maxPrice').value = '';
        document.getElementById('minAge').value = '';
        document.getElementById('maxAge').value = '';
        document.getElementById('minKms').value = '';
        document.getElementById('maxKms').value = '';
        document.getElementById('fuelTypeSelect').value = 'all';
        document.getElementById('transmissionSelect').value = 'all';
        document.getElementById('conditionSelect').value = 'all';
        document.getElementById('bankSelect').value = 'all';

        // Clear brand checkboxes
        document.querySelectorAll('.brand-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });

        // Clear active chips
        document.querySelectorAll('.price-chip, .age-chip, .kms-chip').forEach(chip => {
            chip.classList.remove('active');
        });

        // Reset page and apply filters
        AppState.currentPage = 1;
        SearchFilter.applyFilters();
    },

    // Mobile filter toggle
    toggleMobileFilters: () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('show');
    },

    // Modal Functions
    showVehicleModal: (vehicleId) => {
        const vehicle = AppState.vehicles.find(v => v.id == vehicleId);
        if (!vehicle) return;

        const modal = UI.createVehicleModal(vehicle);
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    },

    createVehicleModal: (vehicle) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content vehicle-modal">
                <button class="modal-close">&times;</button>
                <div class="modal-header">
                    <h2>${vehicle.title}</h2>
                    <div class="vehicle-price-large">
                        ${Utils.formatPrice(vehicle.price)}
                        ${vehicle.originalPrice > vehicle.price ? 
                            `<span class="original-price">${Utils.formatPrice(vehicle.originalPrice)}</span>` : ''}
                    </div>
                </div>
                
                <div class="modal-body">
                    <div class="vehicle-gallery">
                        <div class="main-image">
                            <img src="${vehicle.images[0]}" alt="${vehicle.title}">
                        </div>
                        <div class="image-thumbnails">
                            ${vehicle.images.map((img, index) => 
                                `<img src="${img}" alt="Image ${index + 1}" class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">`
                            ).join('')}
                        </div>
                    </div>
                    
                    <div class="vehicle-info">
                        <div class="info-grid">
                            <div class="info-item">
                                <label>Year</label>
                                <span>${vehicle.year}</span>
                            </div>
                            <div class="info-item">
                                <label>Make</label>
                                <span>${vehicle.make}</span>
                            </div>
                            <div class="info-item">
                                <label>Model</label>
                                <span>${vehicle.model}</span>
                            </div>
                            <div class="info-item">
                                <label>Variant</label>
                                <span>${vehicle.variant}</span>
                            </div>
                            <div class="info-item">
                                <label>Fuel Type</label>
                                <span>${vehicle.fuelType.charAt(0).toUpperCase() + vehicle.fuelType.slice(1)}</span>
                            </div>
                            <div class="info-item">
                                <label>Transmission</label>
                                <span>${vehicle.transmission.charAt(0).toUpperCase() + vehicle.transmission.slice(1)}</span>
                            </div>
                            <div class="info-item">
                                <label>KMs Driven</label>
                                <span>${vehicle.kms.toLocaleString('en-IN')} km</span>
                            </div>
                            <div class="info-item">
                                <label>Condition</label>
                                <span>${vehicle.condition}</span>
                            </div>
                            <div class="info-item">
                                <label>Location</label>
                                <span>${vehicle.location}</span>
                            </div>
                            <div class="info-item">
                                <label>Bank</label>
                                <span>${vehicle.bank}</span>
                            </div>
                            <div class="info-item">
                                <label>Registration No.</label>
                                <span>${vehicle.registrationNumber}</span>
                            </div>
                            <div class="info-item">
                                <label>Auction Date</label>
                                <span>${Utils.formatDate(vehicle.auctionDate)}</span>
                            </div>
                        </div>
                        
                        <div class="vehicle-description-full">
                            <h3>Description</h3>
                            <p>${vehicle.description}</p>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn-primary contact-bank" data-id="${vehicle.id}">Contact Bank</button>
                            <button class="btn-secondary schedule-visit" data-id="${vehicle.id}">Schedule Visit</button>
                            <button class="wishlist-btn" data-id="${vehicle.id}">
                                <i class="far fa-heart"></i> Add to Wishlist
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Bind modal events
        modal.querySelector('.modal-close').addEventListener('click', UI.closeModal);
        modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === modal) UI.closeModal();
        });

        // Bind gallery events
        modal.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                const mainImage = modal.querySelector('.main-image img');
                mainImage.src = vehicle.images[index];
                
                modal.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        return modal;
    },

    showContactModal: (vehicleId) => {
        const vehicle = AppState.vehicles.find(v => v.id == vehicleId);
        if (!vehicle) return;

        const modal = UI.createContactModal(vehicle);
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
    },

    createContactModal: (vehicle) => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content contact-modal">
                <button class="modal-close">&times;</button>
                <div class="modal-header">
                    <h2>Contact for ${vehicle.title}</h2>
                </div>
                
                <div class="modal-body">
                    <form class="contact-form">
                        <div class="form-group">
                            <label>Full Name *</label>
                            <input type="text" required placeholder="Enter your full name">
                        </div>
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" required placeholder="Enter your email">
                        </div>
                        <div class="form-group">
                            <label>Phone Number *</label>
                            <input type="tel" required placeholder="Enter your phone number">
                        </div>
                        <div class="form-group">
                            <label>Message</label>
                            <textarea placeholder="Any specific questions about this vehicle?"></textarea>
                        </div>
                        
                        <div class="bank-contact-info">
                            <h3>Bank Contact Information</h3>
                            <p><strong>Bank:</strong> ${vehicle.bank}</p>
                            <p><strong>Vehicle:</strong> ${vehicle.title}</p>
                            <p><strong>Reference ID:</strong> VR${vehicle.id.toString().padStart(6, '0')}</p>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="submit" class="btn-primary">Send Inquiry</button>
                            <button type="button" class="btn-secondary modal-close">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Bind modal events
        modal.querySelector('.modal-close').addEventListener('click', UI.closeModal);
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', UI.closeModal);
        });

        // Bind form submission
        modal.querySelector('.contact-form').addEventListener('submit', (e) => {
            e.preventDefault();
            UI.handleContactSubmission(vehicle);
        });

        return modal;
    },

    closeModal: () => {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    },

    handleContactSubmission: (vehicle) => {
        // Here you would typically send the form data to your backend
        alert(`Thank you for your interest in ${vehicle.title}. We'll contact you soon!`);
        UI.closeModal();
    },

    toggleWishlist: (vehicleId) => {
        // Here you would typically update the wishlist in your backend
        const btn = document.querySelector(`[data-id="${vehicleId}"].wishlist-btn`);
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon.classList.contains('far')) {
                icon.classList.replace('far', 'fas');
                btn.classList.add('active');
            } else {
                icon.classList.replace('fas', 'far');
                btn.classList.remove('active');
            }
        }
    },

    // Map Functions
    initializeMap: () => {
        if (typeof google === 'undefined') {
            console.log('Google Maps not loaded');
            return;
        }

        const mapOptions = {
            zoom: 6,
            center: { lat: 20.5937, lng: 78.9629 }, // Center of India
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        AppState.map = new google.maps.Map(document.getElementById('googleMap'), mapOptions);
        UI.updateMapMarkers();
    },

    updateMapMarkers: () => {
        if (!AppState.map) return;

        // Clear existing markers
        AppState.markers.forEach(marker => marker.setMap(null));
        AppState.markers = [];

        // Add markers for filtered vehicles
        AppState.filteredVehicles.forEach(vehicle => {
            const marker = new google.maps.Marker({
                position: { lat: vehicle.lat, lng: vehicle.lng },
                map: AppState.map,
                title: vehicle.title,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="20" cy="20" r="18" fill="#007bff" stroke="#fff" stroke-width="2"/>
                            <text x="20" y="25" text-anchor="middle" fill="#fff" font-size="12" font-weight="bold">₹${Math.round(vehicle.price/100000)}</text>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(40, 40)
                }
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div class="map-info-window">
                        <img src="${vehicle.images[0]}" alt="${vehicle.title}" style="width: 200px; height: 120px; object-fit: cover;">
                        <h3>${vehicle.title}</h3>
                        <p class="price">${Utils.formatPrice(vehicle.price)}</p>
                        <p class="location">${vehicle.location}</p>
                        <button onclick="UI.showVehicleModal(${vehicle.id})" class="btn-primary">View Details</button>
                    </div>
                `
            });

            marker.addListener('click', () => {
                AppState.markers.forEach(m => {
                    if (m.infoWindow) m.infoWindow.close();
                });
                infoWindow.open(AppState.map, marker);
                marker.infoWindow = infoWindow;
            });

            AppState.markers.push(marker);
        });

        // Fit map bounds to show all markers
        if (AppState.markers.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            AppState.markers.forEach(marker => {
                bounds.extend(marker.getPosition());
            });
            AppState.map.fitBounds(bounds);
        }
    }
};

// --- Login/Register Modal Logic ---
(function() {
    // Modal elements
    const loginRegisterBtn = document.getElementById('loginRegisterBtn');
    const authModal = document.getElementById('authModal');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (!loginRegisterBtn) return;

    // Open modal
    loginRegisterBtn.addEventListener('click', function() {
        authModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });
    // Close modal
    closeAuthModal.addEventListener('click', function() {
        authModal.style.display = 'none';
        document.body.style.overflow = '';
    });
    // Switch tabs
    loginTab.addEventListener('click', function() {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = '';
        registerForm.style.display = 'none';
    });
    registerTab.addEventListener('click', function() {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        loginForm.style.display = 'none';
        registerForm.style.display = '';
    });
    // Prevent form submission (demo only)
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Login submitted! (Demo only)');
        authModal.style.display = 'none';
        document.body.style.overflow = '';
    });
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Registration submitted! (Demo only)');
        authModal.style.display = 'none';
        document.body.style.overflow = '';
    });
})();

// --- Entry Login/Register Overlay Logic ---
// (This section has been removed since we only use the Wix-style overlay now)

// --- Wix-style Auth Overlay Logic ---


// (Removed duplicate/legacy Wix-style Auth Overlay IIFE. Only robust bindWixAuthEvents() logic remains.)

// --- Dark Mode Toggle Logic ---
(function() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (!darkModeToggle) return;
    // Load preference
    if (localStorage.getItem('towbid-dark') === '1') {
        document.body.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    darkModeToggle.onclick = function() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        darkModeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('towbid-dark', isDark ? '1' : '0');
    };
})();

// Global function for Google Maps callback
window.initMap = UI.initializeMap;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', UI.init);

// Handle window resize for responsive design
window.addEventListener('resize', () => {
    if (AppState.currentView === 'map' && AppState.map) {
        google.maps.event.trigger(AppState.map, 'resize');
    }
});

// Handle escape key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        UI.closeModal();
    }
});

// Add interactive hover effect to vehicle cards
const style = document.createElement('style');
style.innerHTML = `
    .vehicle-card {
        transition: transform 0.2s, box-shadow 0.2s;
    }
    .vehicle-card:hover {
        transform: translateY(-8px) scale(1.03);
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        z-index: 2;
    }
    .btn-primary, .btn-secondary, .btn-contact {
        transition: background 0.2s, color 0.2s, box-shadow 0.2s;
    }
    .btn-primary:hover, .btn-secondary:hover, .btn-contact:hover {
        filter: brightness(1.1);
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    .wishlist-btn.active i {
        color: #e74c3c;
    }
    .vehicle-card .vehicle-image img {
        transition: filter 0.2s;
    }
    .vehicle-card:hover .vehicle-image img {
        filter: brightness(1.08) saturate(1.1);
    }
`;
document.head.appendChild(style);

// Animate results count
const resultsCount = document.getElementById('resultsCount');
if (resultsCount) {
    let lastCount = 0;
    const animateCount = (to) => {
        let start = lastCount;
        let end = to;
        let duration = 400;
        let startTime = null;
        function step(ts) {
            if (!startTime) startTime = ts;
            let progress = Math.min((ts - startTime) / duration, 1);
            resultsCount.textContent = Math.floor(start + (end - start) * progress);
            if (progress < 1) requestAnimationFrame(step);
            else lastCount = end;
        }
        requestAnimationFrame(step);
    };
    const origUpdateResults = UI.updateResults;
    UI.updateResults = function() {
        animateCount(AppState.filteredVehicles.length);
        origUpdateResults.apply(this, arguments);
    };
}


// --- Firebase Auth Logic ---

// --- Robust Wix Auth Overlay Event Binding ---
function bindWixAuthEvents() {
    const overlay = document.getElementById('entryAuthOverlay');
    const registerForm = document.getElementById('wixRegisterForm');
    const loginForm = document.getElementById('wixLoginForm');
    const googleBtn = document.getElementById('wixGoogleBtn');
    const facebookBtn = document.getElementById('wixFacebookBtn');
    const showLogin = document.getElementById('wixShowLogin');
    const forgotPassword = document.getElementById('wixForgotPassword');
    const authSubtitle = document.getElementById('wixAuthSubtitle');

    // Helper: show/hide overlay
    function showMainSite() {
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
        window.scrollTo(0, 0);
    }
    window.showMainSite = showMainSite;

    // Switch to login form
    if (showLogin) {
        showLogin.onclick = function() {
            if (registerForm) registerForm.style.display = 'none';
            if (loginForm) loginForm.style.display = '';
            if (authSubtitle) authSubtitle.innerHTML = 'Log In to TowBid<br><span style="font-size:1rem;font-weight:400;">Don\'t have an account? <span class="wix-auth-login-link" id="wixShowRegister">Sign Up</span></span>';
            
            // Re-bind the "Sign Up" link
            const showRegister = document.getElementById('wixShowRegister');
            if (showRegister) {
                showRegister.onclick = function() {
                    if (loginForm) loginForm.style.display = 'none';
                    if (registerForm) registerForm.style.display = '';
                    if (authSubtitle) authSubtitle.innerHTML = 'Sign Up to TowBid<br><span style="font-size:1rem;font-weight:400;">Already have an account? <span class="wix-auth-login-link" id="wixShowLogin">Log In</span></span>';
                    bindWixAuthEvents(); // Re-bind events
                };
            }
        };
    }

    // Forgot password
    if (forgotPassword) {
        forgotPassword.onclick = function() {
            alert('Password reset link sent! (Demo only)');
        };
    }

    // Email/password sign up
    if (registerForm) {
        registerForm.onsubmit = async function(e) {
            e.preventDefault();
            const email = registerForm.querySelector('input[placeholder="Email"]')?.value;
            const confirmEmail = registerForm.querySelector('input[placeholder="Confirm email"]')?.value;
            const password = registerForm.querySelector('input[placeholder="Choose a password"]')?.value;
            const confirmPassword = registerForm.querySelector('input[placeholder="Confirm password"]')?.value;
            if (email !== confirmEmail) {
                alert('Emails do not match!');
                return false;
            }
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return false;
            }
            try {
                await firebase.auth().createUserWithEmailAndPassword(email, password);
                showMainSite();
            } catch (err) {
                alert(err.message);
            }
            return false;
        };
    }
    // Email/password login
    if (loginForm) {
        loginForm.onsubmit = async function(e) {
            e.preventDefault();
            const email = loginForm.querySelector('input[placeholder="Email"]')?.value;
            const password = loginForm.querySelector('input[placeholder="Password"]')?.value;
            try {
                await firebase.auth().signInWithEmailAndPassword(email, password);
                showMainSite();
            } catch (err) {
                alert(err.message);
            }
            return false;
        };
    }
    // Google sign-in
    if (googleBtn) {
        // Remove previous event listener if any
        googleBtn.onclick = null;
        googleBtn.onclick = async function(e) {
            e.preventDefault();
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await firebase.auth().signInWithPopup(provider);
                showMainSite();
            } catch (err) {
                alert(err.message);
            }
            return false;
        };
    }
    // Facebook sign-in (optional, needs Facebook app setup)
    if (facebookBtn) {
        facebookBtn.onclick = null;
        facebookBtn.onclick = async function(e) {
            e.preventDefault();
            alert('Facebook login not set up. Use Google or email for now.');
            return false;
        };
    }
}

// Bind events on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    bindWixAuthEvents();
    // Also re-bind when overlay is shown (in case of dynamic DOM changes)
    const overlay = document.getElementById('entryAuthOverlay');
    if (overlay) {
        const observer = new MutationObserver(() => {
            bindWixAuthEvents();
        });
        observer.observe(overlay, { childList: true, subtree: true });
    }
});
