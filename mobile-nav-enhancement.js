// Mobile Navigation Enhancement Script
// This script adds mobile-responsive navigation to all CompPortal pages

const mobileNavEnhancements = {
    // Mobile navigation HTML template
    getMobileMenuButton() {
        return `
            <div class="md:hidden">
                <button id="mobile-menu-button" class="text-gray-300 hover:text-white hover:bg-white/10 p-2 rounded-md">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
        `;
    },

    getMobileMenu(currentPage = '') {
        const pages = [
            { href: 'sample-dashboard.html', name: 'Dashboard', key: 'dashboard' },
            { href: 'studios.html', name: 'Studios', key: 'studios' },
            { href: 'dancers.html', name: 'Dancers', key: 'dancers' },
            { href: 'reservations.html', name: 'Reservations', key: 'reservations' },
            { href: 'reports.html', name: 'Reports', key: 'reports' }
        ];

        let menuItems = '';
        pages.forEach(page => {
            const activeClass = currentPage === page.key
                ? 'block bg-white/20 text-white px-3 py-2 rounded-md text-base font-medium'
                : 'block text-gray-300 hover:text-white hover:bg-white/10 px-3 py-2 rounded-md text-base font-medium transition-colors';

            menuItems += `<a href="${page.href}" class="${activeClass}">${page.name}</a>\n                `;
        });

        return `
            <div id="mobile-menu" class="hidden md:hidden bg-white/10 backdrop-blur-md border-t border-white/20">
                <div class="px-4 py-3 space-y-2">
                    ${menuItems}

                    <!-- Mobile User Actions -->
                    <div class="pt-4 border-t border-white/20 mt-4">
                        <div class="flex items-center space-x-3 px-3 py-2">
                            <div class="h-10 w-10 bg-gradient-to-br from-dance-gold to-dance-pink rounded-full flex items-center justify-center text-white font-medium">
                                UDA
                            </div>
                            <div>
                                <p class="text-sm font-medium text-white">Uxbridge Dance Academy</p>
                                <p class="text-xs text-gray-300">Emily Einsmann</p>
                            </div>
                        </div>
                        <div class="flex space-x-2 mt-3">
                            <button class="flex-1 text-gray-300 hover:text-white hover:bg-white/10 p-2 rounded-md text-center">
                                <i class="fas fa-bell text-lg"></i>
                            </button>
                            <button class="flex-1 text-gray-300 hover:text-white hover:bg-white/10 p-2 rounded-md text-center">
                                <i class="fas fa-sign-out-alt text-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // JavaScript for mobile menu toggle
    getMobileMenuScript() {
        return `
            // Mobile menu toggle functionality
            const mobileMenuButton = document.getElementById('mobile-menu-button');
            const mobileMenu = document.getElementById('mobile-menu');

            if (mobileMenuButton && mobileMenu) {
                mobileMenuButton.addEventListener('click', function() {
                    mobileMenu.classList.toggle('hidden');

                    // Toggle hamburger/X icon
                    const icon = this.querySelector('i');
                    if (mobileMenu.classList.contains('hidden')) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    } else {
                        icon.classList.remove('fa-bars');
                        icon.classList.add('fa-times');
                    }
                });

                // Close mobile menu when clicking outside
                document.addEventListener('click', function(event) {
                    if (!mobileMenuButton.contains(event.target) && !mobileMenu.contains(event.target)) {
                        mobileMenu.classList.add('hidden');
                        const icon = mobileMenuButton.querySelector('i');
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                });
            }
        `;
    },

    // Responsive grid improvements
    getResponsiveGridClasses() {
        return {
            'md:grid-cols-4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
            'md:grid-cols-3': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
            'md:grid-cols-2': 'grid-cols-1 md:grid-cols-2',
            'lg:grid-cols-3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        };
    },

    // Apply mobile responsiveness to user menu
    makUserMenuResponsive() {
        return {
            from: 'flex items-center space-x-4',
            to: 'hidden sm:flex items-center space-x-4'
        };
    }
};

// Export for use in HTML files
if (typeof window !== 'undefined') {
    window.MobileNavEnhancements = mobileNavEnhancements;
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = mobileNavEnhancements;
}