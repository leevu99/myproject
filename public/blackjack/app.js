// Blackjack Game Logic

// Game State
let deck = [];
let playerHand = [];
let dealerHand = [];
let balance = 1000;
let currentBet = 0;
let gameInProgress = false;
let stats = { wins: 0, losses: 0, pushes: 0 };

// Card suits and ranks
const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const suitSymbols = {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660'
};
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// DOM Elements
const balanceEl = document.getElementById('balance');
const currentBetEl = document.getElementById('current-bet');
const dealerCardsEl = document.getElementById('dealer-cards');
const playerCardsEl = document.getElementById('player-cards');
const dealerValueEl = document.getElementById('dealer-value');
const playerValueEl = document.getElementById('player-value');
const gameMessageEl = document.getElementById('game-message');
const bettingAreaEl = document.getElementById('betting-area');
const gameControlsEl = document.getElementById('game-controls');
const newGameAreaEl = document.getElementById('new-game-area');
const winsEl = document.getElementById('wins');
const lossesEl = document.getElementById('losses');
const pushesEl = document.getElementById('pushes');

// Buttons
const dealBtn = document.getElementById('deal-btn');
const clearBetBtn = document.getElementById('clear-bet');
const hitBtn = document.getElementById('hit-btn');
const standBtn = document.getElementById('stand-btn');
const doubleBtn = document.getElementById('double-btn');
const newGameBtn = document.getElementById('new-game-btn');
const chipButtons = document.querySelectorAll('.chip');

// Initialize game
function init() {
    loadGameState();
    updateDisplay();
    attachEventListeners();
}

// Create a new deck
function createDeck() {
    const newDeck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            newDeck.push({ suit, rank });
        }
    }
    return newDeck;
}

// Shuffle deck using Fisher-Yates algorithm
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Get card value
function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.rank)) {
        return 10;
    }
    if (card.rank === 'A') {
        return 11;
    }
    return parseInt(card.rank);
}

// Calculate hand value
function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
        value += getCardValue(card);
        if (card.rank === 'A') {
            aces++;
        }
    }

    // Adjust for aces
    while (value > 21 && aces > 0) {
        value -= 10;
        aces--;
    }

    return value;
}

// Check if hand is blackjack
function isBlackjack(hand) {
    return hand.length === 2 && calculateHandValue(hand) === 21;
}

// Create card element
function createCardElement(card, hidden = false) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';

    if (hidden) {
        cardEl.classList.add('hidden');
        return cardEl;
    }

    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    cardEl.classList.add(isRed ? 'red' : 'black');

    const suitSymbol = suitSymbols[card.suit];

    cardEl.innerHTML = `
        <div class="card-corner top">
            <span class="card-rank">${card.rank}</span>
            <span class="card-suit">${suitSymbol}</span>
        </div>
        <div class="card-center">${suitSymbol}</div>
        <div class="card-corner bottom">
            <span class="card-rank">${card.rank}</span>
            <span class="card-suit">${suitSymbol}</span>
        </div>
    `;

    return cardEl;
}

// Render hand
function renderHand(hand, containerEl, hideFirst = false) {
    containerEl.innerHTML = '';
    hand.forEach((card, index) => {
        const hidden = hideFirst && index === 0;
        const cardEl = createCardElement(card, hidden);
        containerEl.appendChild(cardEl);
    });
}

// Update display
function updateDisplay() {
    balanceEl.textContent = `$${balance}`;
    currentBetEl.textContent = `$${currentBet}`;
    winsEl.textContent = stats.wins;
    lossesEl.textContent = stats.losses;
    pushesEl.textContent = stats.pushes;

    // Update deal button state
    dealBtn.disabled = currentBet === 0;
}

// Update hand values display
function updateHandValues(hideDealer = false) {
    const playerValue = calculateHandValue(playerHand);
    playerValueEl.textContent = playerValue;

    if (hideDealer && dealerHand.length > 0) {
        // Show only visible card value
        const visibleCard = dealerHand[1];
        dealerValueEl.textContent = getCardValue(visibleCard);
    } else if (dealerHand.length > 0) {
        dealerValueEl.textContent = calculateHandValue(dealerHand);
    } else {
        dealerValueEl.textContent = '';
    }
}

// Add chip to bet
function addToBet(amount) {
    if (amount <= balance) {
        currentBet += amount;
        balance -= amount;
        updateDisplay();
        saveGameState();
    }
}

// Clear bet
function clearBet() {
    balance += currentBet;
    currentBet = 0;
    updateDisplay();
    saveGameState();
}

// Deal cards
function deal() {
    if (currentBet === 0) return;

    // Create and shuffle deck
    deck = shuffleDeck(createDeck());

    // Deal initial cards
    playerHand = [deck.pop(), deck.pop()];
    dealerHand = [deck.pop(), deck.pop()];

    // Render hands
    renderHand(playerHand, playerCardsEl);
    renderHand(dealerHand, dealerCardsEl, true);
    updateHandValues(true);

    gameInProgress = true;
    gameMessageEl.textContent = '';
    gameMessageEl.className = '';

    // Show game controls
    bettingAreaEl.style.display = 'none';
    gameControlsEl.style.display = 'flex';
    newGameAreaEl.style.display = 'none';

    // Check for double down availability
    doubleBtn.disabled = balance < currentBet;

    // Check for blackjack
    if (isBlackjack(playerHand)) {
        if (isBlackjack(dealerHand)) {
            // Both have blackjack - push
            endGame('push');
        } else {
            // Player blackjack - pays 3:2
            endGame('blackjack');
        }
    } else if (isBlackjack(dealerHand)) {
        // Dealer blackjack
        endGame('dealer-blackjack');
    }

    saveGameState();
}

// Player hits
function hit() {
    playerHand.push(deck.pop());
    renderHand(playerHand, playerCardsEl);
    updateHandValues(true);

    // Disable double after hit
    doubleBtn.disabled = true;

    const playerValue = calculateHandValue(playerHand);
    if (playerValue > 21) {
        endGame('bust');
    } else if (playerValue === 21) {
        stand();
    }

    saveGameState();
}

// Player stands
function stand() {
    dealerPlay();
}

// Player doubles down
function doubleDown() {
    if (balance >= currentBet) {
        balance -= currentBet;
        currentBet *= 2;
        updateDisplay();

        // Take one card and stand
        playerHand.push(deck.pop());
        renderHand(playerHand, playerCardsEl);
        updateHandValues(true);

        const playerValue = calculateHandValue(playerHand);
        if (playerValue > 21) {
            endGame('bust');
        } else {
            stand();
        }
    }
}

// Dealer plays
function dealerPlay() {
    // Reveal dealer's hidden card
    renderHand(dealerHand, dealerCardsEl);
    updateHandValues(false);

    const playerValue = calculateHandValue(playerHand);

    // Dealer draws until 17 or higher
    function dealerDraw() {
        const dealerValue = calculateHandValue(dealerHand);

        if (dealerValue < 17) {
            setTimeout(() => {
                dealerHand.push(deck.pop());
                renderHand(dealerHand, dealerCardsEl);
                updateHandValues(false);
                dealerDraw();
            }, 500);
        } else {
            // Determine winner
            setTimeout(() => {
                determineWinner(playerValue, dealerValue);
            }, 300);
        }
    }

    setTimeout(dealerDraw, 500);
}

// Determine winner
function determineWinner(playerValue, dealerValue) {
    dealerValue = calculateHandValue(dealerHand);

    if (dealerValue > 21) {
        endGame('dealer-bust');
    } else if (playerValue > dealerValue) {
        endGame('win');
    } else if (dealerValue > playerValue) {
        endGame('lose');
    } else {
        endGame('push');
    }
}

// End game
function endGame(result) {
    gameInProgress = false;
    gameControlsEl.style.display = 'none';
    newGameAreaEl.style.display = 'flex';

    // Reveal dealer's hand
    renderHand(dealerHand, dealerCardsEl);
    updateHandValues(false);

    switch (result) {
        case 'blackjack':
            gameMessageEl.textContent = 'BLACKJACK! You win!';
            gameMessageEl.className = 'blackjack';
            balance += currentBet * 2.5; // 3:2 payout
            stats.wins++;
            break;
        case 'win':
            gameMessageEl.textContent = 'You win!';
            gameMessageEl.className = 'win';
            balance += currentBet * 2;
            stats.wins++;
            break;
        case 'dealer-bust':
            gameMessageEl.textContent = 'Dealer busts! You win!';
            gameMessageEl.className = 'win';
            balance += currentBet * 2;
            stats.wins++;
            break;
        case 'lose':
            gameMessageEl.textContent = 'Dealer wins!';
            gameMessageEl.className = 'lose';
            stats.losses++;
            break;
        case 'dealer-blackjack':
            gameMessageEl.textContent = 'Dealer has Blackjack!';
            gameMessageEl.className = 'lose';
            stats.losses++;
            break;
        case 'bust':
            gameMessageEl.textContent = 'Bust! You lose!';
            gameMessageEl.className = 'lose';
            stats.losses++;
            break;
        case 'push':
            gameMessageEl.textContent = 'Push! Bet returned.';
            gameMessageEl.className = 'push';
            balance += currentBet;
            stats.pushes++;
            break;
    }

    currentBet = 0;
    updateDisplay();
    saveGameState();

    // Check if player is out of money
    if (balance === 0) {
        setTimeout(() => {
            if (confirm('You\'re out of money! Would you like to start over with $1000?')) {
                resetGame();
            }
        }, 1000);
    }
}

// Start new hand
function newHand() {
    playerHand = [];
    dealerHand = [];
    currentBet = 0;

    playerCardsEl.innerHTML = '';
    dealerCardsEl.innerHTML = '';
    playerValueEl.textContent = '';
    dealerValueEl.textContent = '';
    gameMessageEl.textContent = '';
    gameMessageEl.className = '';

    bettingAreaEl.style.display = 'block';
    gameControlsEl.style.display = 'none';
    newGameAreaEl.style.display = 'none';

    updateDisplay();
}

// Reset game completely
function resetGame() {
    balance = 1000;
    stats = { wins: 0, losses: 0, pushes: 0 };
    newHand();
    saveGameState();
}

// Save game state to localStorage
function saveGameState() {
    const state = {
        balance,
        stats
    };
    localStorage.setItem('blackjack-state', JSON.stringify(state));
}

// Load game state from localStorage
function loadGameState() {
    const saved = localStorage.getItem('blackjack-state');
    if (saved) {
        const state = JSON.parse(saved);
        balance = state.balance || 1000;
        stats = state.stats || { wins: 0, losses: 0, pushes: 0 };
    }
}

// Attach event listeners
function attachEventListeners() {
    // Chip buttons
    chipButtons.forEach(chip => {
        chip.addEventListener('click', () => {
            const value = parseInt(chip.dataset.value);
            addToBet(value);
        });
    });

    // Bet actions
    clearBetBtn.addEventListener('click', clearBet);
    dealBtn.addEventListener('click', deal);

    // Game actions
    hitBtn.addEventListener('click', hit);
    standBtn.addEventListener('click', stand);
    doubleBtn.addEventListener('click', doubleDown);

    // New game
    newGameBtn.addEventListener('click', newHand);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (!gameInProgress) return;

        switch (e.key.toLowerCase()) {
            case 'h':
                hit();
                break;
            case 's':
                stand();
                break;
            case 'd':
                if (!doubleBtn.disabled) {
                    doubleDown();
                }
                break;
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
