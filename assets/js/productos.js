document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productCards = document.querySelectorAll('.product-card[data-filter]');
    let activeFilters = [];

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filterValue = this.getAttribute('data-filter');

            if (filterValue === 'all') {
                activeFilters = [];
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            } else {
                this.classList.toggle('active');

                if (this.classList.contains('active')) {
                    activeFilters.push(filterValue);
                } else {
                    activeFilters = activeFilters.filter(f => f !== filterValue);
                }

                if (activeFilters.length > 0) {
                    document.querySelector('.filter-btn[data-filter="all"]').classList.remove('active');
                } else {
                    document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
                }
            }

            applyFilters();
        });
    });

    function applyFilters() {
        productCards.forEach(card => {
            const cardFilters = card.getAttribute('data-filter').split(' ');

            if (activeFilters.length === 0) {
                card.style.display = 'block';
            } else {
                const shouldShow = activeFilters.some(filter => cardFilters.includes(filter));
                card.style.display = shouldShow ? 'block' : 'none';
            }
        });
    }
});
