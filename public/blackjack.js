'use strict';

// ─── Deck ───────────────────────────────────────────────────────────────────

const SUITS  = ['♠', '♣', '♥', '♦'];
const RANKS  = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const RED_SUITS = new Set(['♥', '♦']);

function buildDeck() {
  const deck = [];
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ suit, rank });
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function cardValue(rank) {
  if (['J','Q','K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank, 10);
}

function handTotal(hand) {
  let total = 0;
  let aces  = 0;
  for (const { rank } of hand) {
    total += cardValue(rank);
    if (rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

// ─── State ──────────────────────────────────────────────────────────────────

let deck        = [];
let playerHand  = [];
let dealerHand  = [];
let balance     = 1000;
let currentBet  = 0;
let gameActive  = false;

// ─── DOM refs ────────────────────────────────────────────────────────────────

const balanceEl      = document.getElementById('balance');
const currentBetEl   = document.getElementById('current-bet');
const playerHandEl   = document.getElementById('player-hand');
const dealerHandEl   = document.getElementById('dealer-hand');
const playerScoreEl  = document.getElementById('player-score');
const dealerScoreEl  = document.getElementById('dealer-score');
const messageEl      = document.getElementById('message');
const betArea        = document.getElementById('bet-area');
const actionButtons  = document.getElementById('action-buttons');
const newGameArea    = document.getElementById('new-game-area');
const dealBtn        = document.getElementById('deal-btn');
const clearBetBtn    = document.getElementById('clear-bet-btn');
const hitBtn         = document.getElementById('hit-btn');
const standBtn       = document.getElementById('stand-btn');
const doubleBtn      = document.getElementById('double-btn');
const newGameBtn     = document.getElementById('new-game-btn');

// ─── Rendering ───────────────────────────────────────────────────────────────

function cardEl(card, faceDown = false) {
  const el = document.createElement('div');
  el.classList.add('card');
  if (faceDown) { el.classList.add('face-down'); return el; }

  const color = RED_SUITS.has(card.suit) ? 'red' : 'black';
  el.classList.add(color);
  el.innerHTML = `
    <div class="card-top">${card.rank}<br>${card.suit}</div>
    <div class="card-suit">${card.suit}</div>
    <div class="card-bottom">${card.rank}<br>${card.suit}</div>
  `;
  return el;
}

function renderHands(hideDealer = false) {
  playerHandEl.innerHTML = '';
  dealerHandEl.innerHTML = '';

  playerHand.forEach(c => playerHandEl.appendChild(cardEl(c)));

  dealerHand.forEach((c, i) => {
    dealerHandEl.appendChild(cardEl(c, hideDealer && i === 1));
  });

  const pTotal = handTotal(playerHand);
  playerScoreEl.textContent = playerHand.length ? `(${pTotal})` : '';

  if (hideDealer) {
    dealerScoreEl.textContent = dealerHand.length ? `(${cardValue(dealerHand[0].rank) === 11 ? 11 : cardValue(dealerHand[0].rank)})` : '';
  } else {
    dealerScoreEl.textContent = dealerHand.length ? `(${handTotal(dealerHand)})` : '';
  }
}

function setMessage(text, cls = '') {
  messageEl.textContent = text;
  messageEl.className = cls;
}

function updateBalance() {
  balanceEl.textContent = balance;
}

function updateBetDisplay() {
  currentBetEl.textContent = currentBet;
}

// ─── Game logic ──────────────────────────────────────────────────────────────

function ensureDeck() {
  if (deck.length < 15) {
    deck = [...buildDeck(), ...buildDeck(), ...buildDeck(), ...buildDeck()]; // 4-deck shoe
    shuffle(deck);
  }
}

function deal() {
  if (currentBet === 0) { setMessage('Place a bet first!'); return; }

  ensureDeck();
  playerHand = [deck.pop(), deck.pop()];
  dealerHand = [deck.pop(), deck.pop()];
  gameActive  = true;

  setMessage('');
  betArea.classList.add('hidden');
  actionButtons.classList.remove('hidden');
  newGameArea.classList.add('hidden');

  doubleBtn.disabled = balance < currentBet;

  renderHands(true);

  const pTotal = handTotal(playerHand);
  if (pTotal === 21) {
    // Check if dealer also has 21 (push) or player has blackjack
    revealAndFinish();
  }
}

function hit() {
  playerHand.push(deck.pop());
  doubleBtn.disabled = true;
  renderHands(true);
  const total = handTotal(playerHand);
  if (total >= 21) revealAndFinish();
}

function stand() {
  revealAndFinish();
}

function doubleDown() {
  balance     -= currentBet;
  currentBet  *= 2;
  updateBalance();
  updateBetDisplay();
  playerHand.push(deck.pop());
  renderHands(false);
  revealAndFinish();
}

function dealerPlay() {
  while (handTotal(dealerHand) < 17) {
    dealerHand.push(deck.pop());
  }
}

function revealAndFinish() {
  dealerPlay();
  renderHands(false);

  const pTotal = handTotal(playerHand);
  const dTotal = handTotal(dealerHand);
  const pBJ    = pTotal === 21 && playerHand.length === 2;
  const dBJ    = dTotal === 21 && dealerHand.length === 2;

  let msg = '';
  let cls = '';
  let payout = 0;

  if (pTotal > 21) {
    msg = 'Bust! You lose.';
    cls = 'lose';
  } else if (dTotal > 21) {
    msg = 'Dealer busts! You win!';
    cls = 'win';
    payout = currentBet * 2;
  } else if (pBJ && dBJ) {
    msg = 'Both Blackjack — Push!';
    cls = 'push';
    payout = currentBet;
  } else if (pBJ) {
    msg = 'Blackjack! You win!';
    cls = 'win';
    payout = Math.floor(currentBet * 2.5); // 3:2
  } else if (dBJ) {
    msg = 'Dealer Blackjack — You lose.';
    cls = 'lose';
  } else if (pTotal > dTotal) {
    msg = `${pTotal} vs ${dTotal} — You win!`;
    cls = 'win';
    payout = currentBet * 2;
  } else if (pTotal === dTotal) {
    msg = `${pTotal} vs ${dTotal} — Push!`;
    cls = 'push';
    payout = currentBet;
  } else {
    msg = `${pTotal} vs ${dTotal} — You lose.`;
    cls = 'lose';
  }

  balance += payout;
  updateBalance();
  setMessage(msg, cls);

  gameActive = false;
  actionButtons.classList.add('hidden');
  newGameArea.classList.remove('hidden');

  if (balance === 0) {
    setMessage('Out of chips! Restarting...', 'lose');
    setTimeout(resetGame, 2000);
  }
}

function resetBet() {
  currentBet = 0;
  updateBetDisplay();
}

function resetGame() {
  balance    = 1000;
  currentBet = 0;
  updateBalance();
  updateBetDisplay();
  playerHand = [];
  dealerHand = [];
  renderHands();
  setMessage('');
  betArea.classList.remove('hidden');
  newGameArea.classList.add('hidden');
  actionButtons.classList.add('hidden');
}

function newHand() {
  currentBet = 0;
  updateBetDisplay();
  playerHand = [];
  dealerHand = [];
  renderHands();
  setMessage('');
  betArea.classList.remove('hidden');
  newGameArea.classList.add('hidden');
  actionButtons.classList.add('hidden');
}

// ─── Event listeners ─────────────────────────────────────────────────────────

document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    if (gameActive) return;
    const value = parseInt(btn.dataset.value, 10);
    if (currentBet + value > balance) return;
    currentBet += value;
    updateBetDisplay();
  });
});

dealBtn.addEventListener('click', deal);
clearBetBtn.addEventListener('click', () => { if (!gameActive) resetBet(); });
hitBtn.addEventListener('click', hit);
standBtn.addEventListener('click', stand);
doubleBtn.addEventListener('click', doubleDown);
newGameBtn.addEventListener('click', newHand);

// ─── Init ─────────────────────────────────────────────────────────────────────

updateBalance();
updateBetDisplay();
