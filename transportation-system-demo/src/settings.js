// JavaScript to handle section switching
const navItems = document.querySelectorAll('.settings-nav-item');
const sections = document.querySelectorAll('.settings-section');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Remove active class from all items and sections
        navItems.forEach(i => i.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));

        // Add active class to clicked item
        item.classList.add('active');

        // Show corresponding section
        const sectionId = item.dataset.section;
        document.getElementById(sectionId)?.classList.add('active');
    });
});

// Language selection handling
const languageOptions = document.querySelectorAll('.language-option');
let selectedLanguage = 'english'; // Default selected language

languageOptions.forEach(option => {
    // Initial setup - add check mark to default selected language (English)
    if (option.querySelector('.language-name').textContent === 'English (US)') {
        option.querySelector('.check-icon')?.classList.remove('hidden');
    }

    option.addEventListener('click', () => {
        // Remove check mark from all options
        document.querySelectorAll('.check-icon').forEach(icon => {
            icon.classList.add('hidden');
        });

        // Add check mark to selected option
        const checkIcon = option.querySelector('.check-icon');
        checkIcon?.classList.remove('hidden');

        // Update selected language
        selectedLanguage = option.querySelector('.language-name').textContent;
    });
});