document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded successfully!');
    
    // Initialize all features
    initNavigation();
    initScrollEffects();
    initInteractiveTools();
    initContactForm();
    initSkillBars();
});


/* ============================================
   NAVIGATION
   ============================================ */
function initNavigation() {
    const mobileMenu = document.getElementById('mobile-menu');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Mobile menu toggle
    // When hamburger icon is clicked, show/hide menu
    if (mobileMenu) {
        mobileMenu.addEventListener('click', function() {
            // toggle() adds class if not present, removes if present
            navMenu.classList.toggle('active');
            
            // Add animation to hamburger icon
            this.classList.toggle('active');
        });
    }
    
    // Close mobile menu when a link is clicked
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            if (mobileMenu) {
                mobileMenu.classList.remove('active');
            }
        });
    });
    
    // Highlight active section in navigation
    highlightActiveSection();
    
    // Update active section on scroll
    window.addEventListener('scroll', highlightActiveSection);
}

function highlightActiveSection() {
    // Get all sections
    const sections = document.querySelectorAll('.section, .hero');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Current scroll position
    let current = '';
    
    // Loop through sections to find which one is in viewport
    sections.forEach(function(section) {
        // getBoundingClientRect() gets element position relative to viewport
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        // If we've scrolled past the section top minus 200px
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    // Remove active class from all links
    navLinks.forEach(function(link) {
        link.classList.remove('active');
        
        // Add active class to current section's link
        if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
        }
    });
}


/* ============================================
   SCROLL EFFECTS
   ============================================ */

function initScrollEffects() {
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const navbar = document.getElementById('navbar');
    
    // Show/hide scroll to top button
    window.addEventListener('scroll', function() {
        // Show button after scrolling 300px from top
        if (window.pageYOffset > 300) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
        
        // Add shadow to navbar on scroll
        if (window.pageYOffset > 100) {
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
        } else {
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        }
    });
    
    // Scroll to top when button is clicked
    scrollTopBtn.addEventListener('click', function() {
        // Smooth scroll to top
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/* ============================================
   SKILL BARS ANIMATION
   ============================================ */
function initSkillBars() {
    const skillBars = document.querySelectorAll('.progress-fill');
    
    /**
     * Intersection Observer detects when elements enter viewport
     * More efficient than scroll event listeners
     */
    const observer = new IntersectionObserver(function(entries) {
        // entries is an array of observed elements
        entries.forEach(function(entry) {
            // isIntersecting is true when element is in viewport
            if (entry.isIntersecting) {
                const progressBar = entry.target;
                // Get progress value from data attribute
                const progress = progressBar.getAttribute('data-progress');
                
                // Animate width
                progressBar.style.width = progress + '%';
                
                // Stop observing this element (only animate once)
                observer.unobserve(progressBar);
            }
        });
    }, {
        // Trigger when 20% of element is visible
        threshold: 0.2
    });
    
    // Observe all skill bars
    skillBars.forEach(function(bar) {
        observer.observe(bar);
    });
}


/* ============================================
   UTILITY FUNCTIONS
   ============================================ */

/**
 * Debounce function - limits how often a function can run
 * Useful for expensive operations on scroll/resize events
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    
    return function executedFunction(...args) {
        // Clear previous timeout
        clearTimeout(timeout);
        
        // Set new timeout
        timeout = setTimeout(function() {
            func(...args);
        }, wait);
    };
}

/**
 * Throttle function - ensures function runs at most once per specified time
 * Different from debounce - runs at regular intervals during continuous events
 * 
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds between executions
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            
            setTimeout(function() {
                inThrottle = false;
            }, limit);
        }
    };
}

/* ============================================
   FETCH API EXAMPLE
   ============================================ */

/**
 * Example of fetching data from an API
 * fetch() is the modern way to make HTTP requests in JavaScript
 * 
 * @param {string} url - API endpoint
 * @returns {Promise} Promise that resolves with the data
 */
async function fetchData(url) {
    try {
        // await pauses execution until promise resolves
        // fetch returns a Promise
        const response = await fetch(url);
        
        // Check if request was successful
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        // Parse JSON response
        const data = await response.json();
        console.log('Fetched data:', data);
        return data;
        
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

/**
 * Example of posting data to an API
 * 
 * @param {string} url - API endpoint
 * @param {Object} data - Data to send
 * @returns {Promise} Promise that resolves with the response
 */
async function postData(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',                    // HTTP method
            headers: {
                'Content-Type': 'application/json'  // Tell server we're sending JSON
            },
            body: JSON.stringify(data)         // Convert data to JSON string
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const result = await response.json();
        console.log('Post successful:', result);
        return result;
        
    } catch (error) {
        console.error('Error posting data:', error);
        return null;
    }
}

// Log that JavaScript is loaded
console.log('main.js loaded successfully!');
console.log('All interactive features initialized.');
