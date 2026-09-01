import React, { useState, useEffect } from 'react';

export default function TicketingPage({ onNavigate }) {
  const currentBus = localStorage.getItem('assigned_bus') || "Bus 001";
  const totalSeats = parseInt(localStorage.getItem('assigned_bus_seats')) || 50;
  const currentRoute = localStorage.getItem('assigned_route') || 'Davao City - Tagum City';
  
  // We use this shared key across Manual and Digital Ticketing
  const storageKey = 'occupied_seats';

  // States
  const [destination, setDestination] = useState('Tagum City');
  const [passengerType, setPassengerType] = useState('Regular');
  const [fareAmount, setFareAmount] = useState('₱80.00');
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [seatStates, setSeatStates] = useState([]);

  // Fare Matrix Configuration
  const fareMatrix = {
    "Panabo City": 50.00,
    "Carmen": 65.00,
    "Tagum City": 80.00
  };

  // Sync Seat Grid with LocalStorage (Array of Occupied Seat Numbers)
  useEffect(() => {
    const handleStorageSync = () => {
      const occupiedNumbers = JSON.parse(localStorage.getItem(storageKey)) || [];
      
      const newSeatStates = Array.from({ length: totalSeats }).map((_, index) => {
        const seatNum = index + 1;
        return occupiedNumbers.includes(seatNum) ? 'occupied' : 'available';
      });

      setSeatStates(newSeatStates);
    };

    // Load initial on mount
    handleStorageSync();

    // Listen to changes if they happen in another tab/window
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, [totalSeats, storageKey]);

  // Update Fare Calculation
  useEffect(() => {
    const basePrice = fareMatrix[destination] || 0;
    let finalPrice = basePrice;

    if (['Student', 'Senior Citizen', 'PWD'].includes(passengerType)) {
      finalPrice = basePrice * 0.80;
    }

    setFareAmount(`₱${finalPrice.toFixed(2)}`);
  }, [destination, passengerType]);

  // Toggle Seat State (Manual Booking)
  const handleSeatClick = (index) => {
    const seatNumInt = index + 1;
    let currentOccupied = JSON.parse(localStorage.getItem(storageKey)) || [];

    if (seatStates[index] === 'available') {
      // Mark as occupied
      if (!currentOccupied.includes(seatNumInt)) {
        currentOccupied.push(seatNumInt);
      }
      setSelectedSeat(seatNumInt.toString());
    } else {
      // Deselect / Mark as available
      currentOccupied = currentOccupied.filter(num => num !== seatNumInt);
      if (selectedSeat === seatNumInt.toString()) {
        setSelectedSeat(null);
      }
    }

    // Save updated array to localStorage and update local state
    localStorage.setItem(storageKey, JSON.stringify(currentOccupied));
    
    // Immediately reflect visual changes
    const updatedStates = [...seatStates];
    updatedStates[index] = updatedStates[index] === 'available' ? 'occupied' : 'available';
    setSeatStates(updatedStates);
  };

  // Mark All Seats Occupied
  const handleMarkFull = () => {
    const allSeatNumbers = Array.from({ length: totalSeats }, (_, i) => i + 1);
    localStorage.setItem(storageKey, JSON.stringify(allSeatNumbers));
    
    const full = new Array(totalSeats).fill('occupied');
    setSeatStates(full);
  };

  // Submit & Generate Ticket
  const handleGenerateTicket = (e) => {
    e.preventDefault();

    if (!selectedSeat) {
      alert("Please choose a seat from the Seat Layout first!");
      return;
    }

    const fareNumeric = parseFloat(fareAmount.replace(/[^0-9.-]+/g, "")) || 0;

    const newTransaction = {
      ticketId: 'TCK-' + Date.now().toString().slice(-6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      destination: destination,
      passengerType: passengerType,
      fare: fareNumeric,
      seatNumber: selectedSeat,
      paymentMethod: 'Cash'
    };

    const existingTransactions = JSON.parse(localStorage.getItem('shift_transactions')) || [];
    existingTransactions.push(newTransaction);
    localStorage.setItem('shift_transactions', JSON.stringify(existingTransactions));

    alert(`Ticket Generated!\nID: ${newTransaction.ticketId}\nSeat: ${selectedSeat}\nFare: ₱${fareNumeric.toFixed(2)}`);

    setSelectedSeat(null);
  };

  // Passenger Load Calculation
  const occupiedCount = seatStates.filter(status => status === 'occupied').length;
  const loadPercentage = totalSeats > 0 ? (occupiedCount / totalSeats) * 100 : 0;

  // Render Grid Layout Rows
  const renderSeats = () => {
    const rows = [];
    const totalRows = Math.ceil(totalSeats / 4);

    for (let r = 0; r < totalRows; r++) {
      const leftSeats = [];
      const rightSeats = [];

      for (let i = 0; i < 2; i++) {
        const seatIdx = r * 4 + i;
        if (seatIdx < totalSeats) {
          leftSeats.push(
            <button
              key={seatIdx}
              type="button"
              className={`seat ${seatStates[seatIdx] || 'available'}`}
              onClick={() => handleSeatClick(seatIdx)}
            >
              <i className="fa-solid fa-couch"></i>
            </button>
          );
        }
      }

      for (let i = 2; i < 4; i++) {
        const seatIdx = r * 4 + i;
        if (seatIdx < totalSeats) {
          rightSeats.push(
            <button
              key={seatIdx}
              type="button"
              className={`seat ${seatStates[seatIdx] || 'available'}`}
              onClick={() => handleSeatClick(seatIdx)}
            >
              <i className="fa-solid fa-couch"></i>
            </button>
          );
        }
      }

      rows.push(
        <React.Fragment key={r}>
          <div className="seat-pair left">{leftSeats}</div>
          <div className="seat-pair right">{rightSeats}</div>
        </React.Fragment>
      );
    }

    return rows;
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <i className="fa-solid fa-bus"></i>
        </div>

        <nav className="sidebar-menu">
          <a href="#" className="menu-item" onClick={() => onNavigate && onNavigate('start-shift')}>
            <i className="fa-solid fa-clock-rotate-left"></i>
            <span>Shift</span>
          </a>

          <a href="#" className="menu-item active-nav">
            <i className="fa-solid fa-ticket"></i>
            <span>Ticketing</span>
          </a>

          <a href="#" className="menu-item" onClick={() => onNavigate && onNavigate('scan-ticket')}>
            <i className="fa-solid fa-qrcode"></i>
            <span>Scan Ticket</span>
          </a>
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-header ticketing-header">
          <div className="route-info">
            <h3>{currentBus} - {currentRoute}</h3>
          </div>
          <div className="load-tracker">
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${loadPercentage}%` }}></div>
            </div>
            <span className="load-text">
              Passenger Load : <strong>{occupiedCount}</strong> / <span>{totalSeats}</span> Seats
            </span>
          </div>
        </header>

        <div className="ticketing-workspace">
          <div className="bus-layout-card">
            <div className="seat-layout-card">
              <div className="seat-card-header">
                <h4>Seat Layout</h4>
              </div>

              <div className="bus-seat-scroll-container">
                <div className="driver-row">
                  <div className="driver-seat-box">
                    <i className="fa-solid fa-dharmachakra"></i>
                    <span>Driver</span>
                  </div>
                </div>

                <div className="seats-grid">
                  {renderSeats()}
                </div>
              </div>

              <div className="seat-card-footer">
                <div className="seat-legend-row">
                  <div className="legend-item">
                    <span className="legend-dot occupied"></span>
                    <span>Occupied</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot available"></span>
                    <span>Available</span>
                  </div>
                </div>

                <button type="button" className="btn-mark-occupied" onClick={handleMarkFull}>
                  Mark Fully Occupied
                </button>
              </div>
            </div>
          </div>

          <div className="ticket-panel">
            <div className="ticket-card">
              <h4>Manual Cash Ticket</h4>

              <form onSubmit={handleGenerateTicket}>
                <div className="form-group">
                  <label>Select Destination</label>
                  <select 
                    className="form-select" 
                    value={destination} 
                    onChange={(e) => setDestination(e.target.value)}
                  >
                    <option value="Tagum City">Tagum City</option>
                    <option value="Carmen">Carmen</option>
                    <option value="Panabo City">Panabo City</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="passengerTypeSelect">Passenger Type</label>
                  <select 
                    className="form-select" 
                    id="passengerTypeSelect"
                    value={passengerType}
                    onChange={(e) => setPassengerType(e.target.value)}
                  >
                    <option value="Regular">Regular</option>
                    <option value="Student">Student (20% Off)</option>
                    <option value="Senior Citizen">Senior Citizen (20% Off)</option>
                    <option value="PWD">PWD (20% Off)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Fare amount (PHP)</label>
                  <input type="text" value={fareAmount} className="form-input-fare" readOnly />
                </div>

                <button type="submit" className="btn-generate">Generate Ticket</button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}