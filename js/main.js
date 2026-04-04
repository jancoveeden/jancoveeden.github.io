document.addEventListener('DOMContentLoaded', function() {
    initNavigation();
    initScrollEffects();
    initSkillBars();
    initThemeToggle();
    initCopyrightYear();
    initModal();
    initRevealAnimations();
    initContactMorph();
});

/* ============================================
   CONTACT MORPH (DYNAMIC ISLAND STYLE)
   ============================================ */
function initContactMorph() {
    const morphContainer = document.getElementById('contact-morph');
    if (!morphContainer) return;

    const items = morphContainer.querySelectorAll('.morph-item');
    
    items.forEach(item => {
        // Handle click/touch to "lock" an item open on mobile or for persistence
        item.addEventListener('click', function(e) {
            // If clicking the link itself, let it happen
            if (e.target.classList.contains('morph-link')) return;
            
            const isActive = this.classList.contains('active');
            
            // Wrap state change in View Transition if supported
            if (document.startViewTransition) {
                document.startViewTransition(() => toggleItem(this, !isActive));
            } else {
                toggleItem(this, !isActive);
            }
        });

        // Keyboard accessibility
        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    function toggleItem(selectedItem, shouldActivate) {
        items.forEach(item => {
            item.classList.remove('active');
        });

        if (shouldActivate) {
            selectedItem.classList.add('active');
        }
    }

    // Optional: Auto-close when clicking outside
    document.addEventListener('click', function(e) {
        if (!morphContainer.contains(e.target)) {
            items.forEach(item => item.classList.remove('active'));
        }
    });
}


/* ============================================
   COPYRIGHT YEAR
   ============================================ */
function initCopyrightYear() {
    const yearSpan = document.getElementById('copyright-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}


/* ============================================
   IMAGE MODAL
   ============================================ */
function initModal() {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const closeBtn = modal.querySelector('.modal-close');
    const thumbnails = document.querySelectorAll('.thumbnail-small');

    // Open modal on click or Enter/Space key
    thumbnails.forEach(function(thumb) {
        thumb.addEventListener('click', function() {
            openModal(this.src);
        });
        thumb.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(this.src);
            }
        });
    });

    // Close modal on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close modal on close button click
    closeBtn.addEventListener('click', function() {
        closeModal();
    });

    // Close modal on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeModal();
        }
    });

    var lastFocused = null;

    function openModal(imageSrc) {
        lastFocused = document.activeElement;
        modal.style.display = 'block';
        modalImg.src = imageSrc;
        closeBtn.focus();
    }

    function closeModal() {
        modal.style.display = 'none';
        if (lastFocused) {
            lastFocused.focus();
        }
    }

    // Expose for any remaining inline usage
    window.openModal = openModal;
    window.closeModal = closeModal;
}


/* ============================================
   NAVIGATION
   ============================================ */
function initNavigation() {
    const mobileMenu = document.getElementById('mobile-menu');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (mobileMenu) {
        mobileMenu.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.classList.toggle('active');
            var expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', String(!expanded));
        });
    }

    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            if (mobileMenu) {
                mobileMenu.classList.remove('active');
                mobileMenu.setAttribute('aria-expanded', 'false');
            }
        });
    });

    highlightActiveSection();
    window.addEventListener('scroll', highlightActiveSection);
}

function highlightActiveSection() {
    const sections = document.querySelectorAll('.section, .hero');
    const navLinks = document.querySelectorAll('.nav-link');

    let current = '';

    sections.forEach(function(section) {
        const sectionTop = section.offsetTop;
        if (window.pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(function(link) {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
        }
    });
}


/* ============================================
   THEME TOGGLE (mono → light → dark)
   ============================================ */
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const monoIcon = themeToggle.querySelector('.mono-icon');
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    const html = document.documentElement;

    var themes = ['mono', 'light', 'dark'];
    var savedTheme = localStorage.getItem('theme') || 'mono';
    if (themes.indexOf(savedTheme) === -1) savedTheme = 'mono';

    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', function() {
        var currentTheme = html.getAttribute('data-theme');
        var currentIndex = themes.indexOf(currentTheme);
        var newTheme = themes[(currentIndex + 1) % themes.length];

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        monoIcon.style.display = 'none';
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'none';

        if (theme === 'mono') {
            monoIcon.style.display = 'block';
        } else if (theme === 'light') {
            sunIcon.style.display = 'block';
        } else {
            moonIcon.style.display = 'block';
        }

        themeToggle.setAttribute('aria-label',
            'Current theme: ' + theme + '. Click to switch.');
    }
}


/* ============================================
   SCROLL EFFECTS
   ============================================ */
function initScrollEffects() {
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }

        if (window.pageYOffset > 100) {
            navbar.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.06)';
        }
    });

    scrollTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/* ============================================
   REVEAL ANIMATIONS
   ============================================ */
function initRevealAnimations() {
    // Add .reveal to cards and contact items
    var selectors = '.skill-card, .project-card, .morph-pill, .section-title, .section-description';
    document.querySelectorAll(selectors).forEach(function(el) {
        // Don't add to hero section titles (they animate via CSS)
        if (!el.closest('.hero')) {
            el.classList.add('reveal');
        }
    });

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.reveal').forEach(function(el) {
        observer.observe(el);
    });
}


/* ============================================
   SKILL BARS ANIMATION
   ============================================ */
function initSkillBars() {
    const skillBars = document.querySelectorAll('.progress-fill');

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                const progressBar = entry.target;
                const progress = progressBar.getAttribute('data-progress');
                progressBar.style.width = progress + '%';
                observer.unobserve(progressBar);
            }
        });
    }, {
        threshold: 0.2
    });

    skillBars.forEach(function(bar) {
        observer.observe(bar);
    });
}
