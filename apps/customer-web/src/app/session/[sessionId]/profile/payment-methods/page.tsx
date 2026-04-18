"use client";

import Link from "next/link";
import { use, useState } from "react";
import type { Route } from "next";

const SAVED_CARDS = [
  { id: "1", brand: "Visa", last4: "4242", expiry: "12/25", isDefault: true },
  { id: "2", brand: "Mastercard", last4: "8888", expiry: "06/26", isDefault: false },
];

const DIGITAL_WALLETS = [
  { id: "apple", name: "Apple Pay", connected: true },
  { id: "google", name: "Google Pay", connected: false },
];

export default function PaymentMethodsPage(props: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: publicToken } = use(props.params);
  const [cards, setCards] = useState(SAVED_CARDS);
  const [showForm, setShowForm] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  function handleAddCard() {
    if (cardNumber.length < 4) return;
    setCards((prev) => [
      ...prev,
      { id: Date.now().toString(), brand: "Card", last4: cardNumber.slice(-4), expiry, isDefault: false },
    ]);
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setShowForm(false);
  }

  return (
    <div className="subprofile-page">
      <div className="subprofile-header">
        <Link href={`/session/${publicToken}/profile` as Route} className="signin-back-btn" aria-label="Back">‹</Link>
        <span className="subprofile-header__title">Payment Methods</span>
        <div style={{ width: 36 }} />
      </div>

      <div className="subprofile-body">
        <p className="subprofile-section-label">Saved Cards</p>
        <div className="pm-list">
          {cards.map((card) => (
            <div key={card.id} className="pm-card">
              <div className="pm-card__icon">▬</div>
              <div className="pm-card__info">
                <span className="pm-card__name">{card.brand} •••• {card.last4}</span>
                <span className="pm-card__expiry">Expires {card.expiry}</span>
              </div>
              {card.isDefault && <span className="pm-default-badge">Default</span>}
              {!card.isDefault && <span className="pm-card__chevron">›</span>}
            </div>
          ))}
          <button type="button" className="pm-add-btn" onClick={() => setShowForm((v) => !v)}>+ Add New Card</button>
          {showForm && (
            <div className="pm-add-form">
              <input
                className="input"
                placeholder="Card number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="input"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  className="input"
                  placeholder="CVV"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
              <button type="button" className="pm-add-btn" onClick={handleAddCard}>Save Card</button>
            </div>
          )}
        </div>

        <p className="subprofile-section-label">Digital Wallets</p>
        <div className="pm-list">
          {DIGITAL_WALLETS.map((wallet) => (
            <div key={wallet.id} className="pm-card">
              <span className="pm-card__name">{wallet.name}</span>
              <span className={wallet.connected ? "pm-status pm-status--connected" : "pm-status pm-status--disconnected"}>
                {wallet.connected ? "● Connected" : "○ Not Connected"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
