const express = require('express');
const fs = require('fs');
const path = require('path');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'portfolio.json');

app.use(express.json());
app.use(express.static('public'));

// Redirect /blackjack to blackjack app
app.get('/blackjack', (req, res) => {
    res.redirect('/blackjack/');
});

// Read portfolio data from JSON file
function readPortfolio() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Write portfolio data to JSON file
function writePortfolio(portfolio) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(portfolio, null, 2));
}

// GET /api/portfolio - Get all positions
app.get('/api/portfolio', (req, res) => {
    const portfolio = readPortfolio();
    res.json(portfolio);
});

// POST /api/portfolio - Add new position
app.post('/api/portfolio', (req, res) => {
    const { symbol, quantity, purchasePrice } = req.body;

    if (!symbol || !quantity || !purchasePrice) {
        return res.status(400).json({ error: 'Symbol, quantity, and purchase price are required' });
    }

    const portfolio = readPortfolio();

    // Check if symbol already exists
    const existingIndex = portfolio.findIndex(p => p.symbol.toUpperCase() === symbol.toUpperCase());

    if (existingIndex >= 0) {
        // Update existing position (average the purchase price)
        const existing = portfolio[existingIndex];
        const totalShares = existing.quantity + Number(quantity);
        const totalCost = (existing.quantity * existing.purchasePrice) + (Number(quantity) * Number(purchasePrice));
        existing.quantity = totalShares;
        existing.purchasePrice = totalCost / totalShares;
    } else {
        // Add new position
        portfolio.push({
            symbol: symbol.toUpperCase(),
            quantity: Number(quantity),
            purchasePrice: Number(purchasePrice),
            addedAt: new Date().toISOString()
        });
    }

    writePortfolio(portfolio);
    res.json({ success: true, portfolio });
});

// DELETE /api/portfolio/:symbol - Remove position
app.delete('/api/portfolio/:symbol', (req, res) => {
    const { symbol } = req.params;
    let portfolio = readPortfolio();

    const initialLength = portfolio.length;
    portfolio = portfolio.filter(p => p.symbol.toUpperCase() !== symbol.toUpperCase());

    if (portfolio.length === initialLength) {
        return res.status(404).json({ error: 'Position not found' });
    }

    writePortfolio(portfolio);
    res.json({ success: true, portfolio });
});

// GET /api/quote/:symbol - Get current stock price
app.get('/api/quote/:symbol', async (req, res) => {
    const { symbol } = req.params;

    try {
        const quote = await yahooFinance.quote(symbol.toUpperCase());
        res.json({
            symbol: quote.symbol,
            name: quote.shortName || quote.longName || symbol,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            currency: quote.currency
        });
    } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error.message);
        res.status(404).json({ error: `Could not fetch quote for ${symbol}` });
    }
});

app.listen(PORT, () => {
    console.log(`Stock Portfolio Tracker running at http://localhost:${PORT}`);
});
