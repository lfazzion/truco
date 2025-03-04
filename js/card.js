// Card class to represent playing cards in the Truco game
class Card {
    constructor(suit, rank, value) {
        this.suit = suit;       // Suit of the card (Ouros, Copas, Espadas, Paus)
        this.rank = rank;       // Rank of the card (A, 2, 3, etc.)
        this.value = value;     // Numerical value for comparison
        this.manilha = false;   // Whether this card is a manilha (special card)
        this.element = null;    // DOM element representing this card
    }

    // Get the color of the card based on suit
    getColor() {
        return (this.suit === 'Copas' || this.suit === 'Ouros') ? 'red' : 'black';
    }

    // Create a DOM element to represent this card
    createElement(faceUp = false) {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${this.getColor()}`;
        
        if (faceUp) {
            // Show the card face
            const suitSymbol = this.getSuitSymbol();
            cardElement.innerHTML = `
                <div class="card-rank">${this.rank}</div>
                <div class="card-suit">${suitSymbol}</div>
            `;
            
            // Add special styling for manilha cards
            if (this.manilha) {
                cardElement.classList.add('manilha');
            }
        } else {
            // Show the card back
            cardElement.classList.add('card-back');
        }

        // Store reference to the element
        this.element = cardElement;
        
        return cardElement;
    }

    // Get the symbol for the card suit
    getSuitSymbol() {
        switch (this.suit) {
            case 'Copas': return '♥';
            case 'Ouros': return '♦';
            case 'Espadas': return '♠';
            case 'Paus': return '♣';
            default: return '';
        }
    }

    // Set this card as a manilha (special card)
    setAsManilha() {
        this.manilha = true;
        // Manilhas have special values in Truco
        switch (this.rank) {
            case '4': this.value = 10; break;  // 4 is the weakest manilha
            case '7': this.value = 11; break;
            case 'A': this.value = 12; break;
            case '2': this.value = 13; break;  // 2 is the strongest manilha
            default: break;
        }
    }

    // Compare this card with another card
    compareTo(otherCard) {
        // Manilhas always beat non-manilhas
        if (this.manilha && !otherCard.manilha) return 1;
        if (!this.manilha && otherCard.manilha) return -1;
        
        // If both are manilhas, compare by suit hierarchy
        if (this.manilha && otherCard.manilha) {
            const suitValues = { 'Paus': 4, 'Copas': 3, 'Espadas': 2, 'Ouros': 1 };
            return suitValues[this.suit] - suitValues[otherCard.suit];
        }
        
        // Otherwise compare by card value
        return this.value - otherCard.value;
    }

    // Return a string representation of the card
    toString() {
        return `${this.rank}${this.getSuitSymbol()}`;
    }
}