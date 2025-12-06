// Slider functionality
let currentSlides = [0, 0, 0, 0, 0, 0, 0];

function changeSlide(projectIndex, direction) {
    const sliders = document.querySelectorAll('.project-slider');
    if (!sliders[projectIndex]) return;
    const slider = sliders[projectIndex];
    const container = slider.querySelector('.slider-container');
    const dots = slider.querySelectorAll('.slider-dot');
    const totalSlides = dots.length;

    currentSlides[projectIndex] += direction;

    if (currentSlides[projectIndex] < 0) {
        currentSlides[projectIndex] = totalSlides - 1;
    } else if (currentSlides[projectIndex] >= totalSlides) {
        currentSlides[projectIndex] = 0;
    }

    container.style.transform = `translateX(-${currentSlides[projectIndex] * 100}%)`;
    updateDots(projectIndex);
}

function goToSlide(projectIndex, slideIndex) {
    const sliders = document.querySelectorAll('.project-slider');
    if (!sliders[projectIndex]) return;
    const slider = sliders[projectIndex];
    const container = slider.querySelector('.slider-container');
    
    currentSlides[projectIndex] = slideIndex;
    container.style.transform = `translateX(-${slideIndex * 100}%)`;
    updateDots(projectIndex);
}

function updateDots(projectIndex) {
    const sliders = document.querySelectorAll('.project-slider');
    if (!sliders[projectIndex]) return;
    const slider = sliders[projectIndex];
    const dots = slider.querySelectorAll('.slider-dot');
    
    dots.forEach((dot, index) => {
        if (index === currentSlides[projectIndex]) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Auto-play sliders
setInterval(() => {
    for (let i = 0; i < currentSlides.length; i++) {
        changeSlide(i, 1);
    }
}, 5000);

function showContactMessage(event) {
    event.preventDefault();
}

// Add smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href !== '#contact') {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        }
    });
});

// Mobile menu toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close menu when a link is clicked
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            // Allow smooth scroll to work, then close menu
            if (href !== '#contact') {
                e.preventDefault();
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            } else {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    });
}

// Add entrance animation to cards
const cards = document.querySelectorAll('.card');
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(30px)';
            entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, 100);
            
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

cards.forEach(card => {
    observer.observe(card);
});

document.addEventListener('DOMContentLoaded', () => {
    // Move the Xpromo project item to the top of the Project Showcase
    try {
        const firstProjectItem = document.querySelector('.project-item');
        if (firstProjectItem) {
            const projectCard = firstProjectItem.parentElement; // container that holds .project-item children
            const xpromo = Array.from(projectCard.querySelectorAll('.project-item'))
                .find(item => {
                    const nameEl = item.querySelector('.project-name');
                    return nameEl && nameEl.textContent.includes('Xpromo');
                });
            if (xpromo) {
                projectCard.insertBefore(xpromo, projectCard.querySelector('.project-item'));
            }
        }
    } catch (e) {
        // no-op
    }

    // initialize slider state after DOM order is correct
    currentSlides = Array.from(document.querySelectorAll('.project-slider')).map(() => 0);
    currentSlides.forEach((_, i) => updateDots(i));
});