// DOM Elements
const addStockForm = document.getElementById('add-stock-form');
const portfolioBody = document.getElementById('portfolio-body');
const emptyMessage = document.getElementById('empty-message');
const totalValueEl = document.getElementById('total-value');
const totalCostEl = document.getElementById('total-cost');
const totalGainEl = document.getElementById('total-gain');

// Cache for stock quotes
const quoteCache = {};

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value);
}

// Format percentage
function formatPercent(value) {
    const sign = value >= 0 ? '+' : '';
    return sign + value.toFixed(2) + '%';
}

// Fetch stock quote
async function fetchQuote(symbol) {
    if (quoteCache[symbol] && Date.now() - quoteCache[symbol].timestamp < 60000) {
        return quoteCache[symbol].data;
    }

    try {
        const response = await fetch(`/api/quote/${symbol}`);
        if (!response.ok) throw new Error('Quote not found');
        const data = await response.json();
        quoteCache[symbol] = { data, timestamp: Date.now() };
        return data;
    } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error);
        return null;
    }
}

// Fetch portfolio
async function fetchPortfolio() {
    try {
        const response = await fetch('/api/portfolio');
        return await response.json();
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return [];
    }
}

// Add stock to portfolio
async function addStock(symbol, quantity, purchasePrice) {
    try {
        const response = await fetch('/api/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, quantity, purchasePrice })
        });
        return await response.json();
    } catch (error) {
        console.error('Error adding stock:', error);
        return null;
    }
}

// Remove stock from portfolio
async function removeStock(symbol) {
    try {
        const response = await fetch(`/api/portfolio/${symbol}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        console.error('Error removing stock:', error);
        return null;
    }
}

// Render portfolio table
async function renderPortfolio() {
    const portfolio = await fetchPortfolio();

    if (portfolio.length === 0) {
        portfolioBody.innerHTML = '';
        emptyMessage.style.display = 'block';
        document.querySelector('.table-container').style.display = 'none';
        updateSummary(0, 0);
        return;
    }

    emptyMessage.style.display = 'none';
    document.querySelector('.table-container').style.display = 'block';

    let totalValue = 0;
    let totalCost = 0;

    // Create loading rows first
    portfolioBody.innerHTML = portfolio.map(position => `
        <tr data-symbol="${position.symbol}">
            <td><strong>${position.symbol}</strong></td>
            <td class="loading">Loading...</td>
            <td>${position.quantity.toFixed(2)}</td>
            <td>${formatCurrency(position.purchasePrice)}</td>
            <td class="loading">Loading...</td>
            <td class="loading">Loading...</td>
            <td class="loading">Loading...</td>
            <td><button class="delete-btn" onclick="handleDelete('${position.symbol}')">Remove</button></td>
        </tr>
    `).join('');

    // Fetch quotes in parallel
    const quotes = await Promise.all(portfolio.map(p => fetchQuote(p.symbol)));

    // Update rows with quote data
    portfolio.forEach((position, index) => {
        const quote = quotes[index];
        const row = document.querySelector(`tr[data-symbol="${position.symbol}"]`);

        if (!row) return;

        const cost = position.quantity * position.purchasePrice;
        totalCost += cost;

        if (quote) {
            const currentValue = position.quantity * quote.price;
            const gainLoss = currentValue - cost;
            const gainLossPercent = ((quote.price - position.purchasePrice) / position.purchasePrice) * 100;

            totalValue += currentValue;

            const gainClass = gainLoss >= 0 ? 'positive' : 'negative';

            row.innerHTML = `
                <td><strong>${position.symbol}</strong></td>
                <td>${quote.name}</td>
                <td>${position.quantity.toFixed(2)}</td>
                <td>${formatCurrency(position.purchasePrice)}</td>
                <td>${formatCurrency(quote.price)}</td>
                <td>${formatCurrency(currentValue)}</td>
                <td class="${gainClass}">${formatCurrency(gainLoss)} (${formatPercent(gainLossPercent)})</td>
                <td><button class="delete-btn" onclick="handleDelete('${position.symbol}')">Remove</button></td>
            `;
        } else {
            totalValue += cost;
            row.innerHTML = `
                <td><strong>${position.symbol}</strong></td>
                <td>N/A</td>
                <td>${position.quantity.toFixed(2)}</td>
                <td>${formatCurrency(position.purchasePrice)}</td>
                <td>Error</td>
                <td>${formatCurrency(cost)}</td>
                <td>N/A</td>
                <td><button class="delete-btn" onclick="handleDelete('${position.symbol}')">Remove</button></td>
            `;
        }
    });

    updateSummary(totalValue, totalCost);
}

// Update summary cards
function updateSummary(totalValue, totalCost) {
    const totalGain = totalValue - totalCost;
    const gainClass = totalGain >= 0 ? 'positive' : 'negative';

    totalValueEl.textContent = formatCurrency(totalValue);
    totalCostEl.textContent = formatCurrency(totalCost);
    totalGainEl.textContent = formatCurrency(totalGain);
    totalGainEl.className = `value ${gainClass}`;
}

// Handle form submission
addStockForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const symbol = document.getElementById('symbol').value.trim();
    const quantity = parseFloat(document.getElementById('quantity').value);
    const purchasePrice = parseFloat(document.getElementById('purchasePrice').value);

    if (!symbol || !quantity || !purchasePrice) {
        alert('Please fill in all fields');
        return;
    }

    const result = await addStock(symbol, quantity, purchasePrice);

    if (result && result.success) {
        addStockForm.reset();
        await renderPortfolio();
    } else {
        alert('Error adding stock. Please try again.');
    }
});

// Handle delete button click
async function handleDelete(symbol) {
    if (!confirm(`Are you sure you want to remove ${symbol} from your portfolio?`)) {
        return;
    }

    const result = await removeStock(symbol);

    if (result && result.success) {
        await renderPortfolio();
    } else {
        alert('Error removing stock. Please try again.');
    }
}

// Initial render
renderPortfolio();
