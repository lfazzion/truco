// Deck class to manage the cards in the Truco game
class Deck {
    constructor() {
        this.cards = [];
        this.vira = null;  // The card that determines manilhas
        this.initialize();
    }

    // Initialize the deck with Truco cards
    initialize() {
        const suits = ['Ouros', 'Copas', 'Espadas', 'Paus'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', 'J', 'Q', 'K'];
        const values = { 'A': 8, '2': 9, '3': 7, '4': 1, '5': 2, '6': 3, '7': 4, 'J': 5, 'Q': 6, 'K': 7 };

        // Create cards for each suit and rank
        for (let suit of suits) {
            for (let rank of ranks) {
                this.cards.push(new Card(suit, rank, values[rank]));
            }
        }
    }

    // Shuffle the deck
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    // Draw a card from the deck
    drawCard() {
        if (this.cards.length === 0) return null;
        return this.cards.pop();
    }

    // Draw the vira card and set manilhas
    drawVira() {
        this.vira = this.drawCard();
        if (!this.vira) return null;

        // Get the next rank after vira to determine manilhas
        const ranks = ['4', '5', '6', '7', 'J', 'Q', 'K', 'A', '2', '3'];
        const viraIndex = ranks.indexOf(this.vira.rank);
        const manilhaRank = ranks[(viraIndex + 1) % ranks.length];

        // Set manilha cards
        this.cards.forEach(card => {
            if (card.rank === manilhaRank) {
                card.setAsManilha();
            }
        });

        return this.vira;
    }

    // Deal cards to players
    dealCards(numPlayers = 4) {
        const hands = Array(numPlayers).fill().map(() => []);
        
        // Deal 3 cards to each player
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < numPlayers; j++) {
                const card = this.drawCard();
                if (card) hands[j].push(card);
            }
        }

        return hands;
    }

    // Reset the deck
    reset() {
        this.cards = [];
        this.vira = null;
        this.initialize();
        this.shuffle();
    }
}