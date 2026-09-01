import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function ScanTicketPage({ onNavigate }) {
  const [scannedTickets, setScannedTickets] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  useEffect(() => {
    const loaded = JSON.parse(localStorage.getItem('scanned_tickets')) || [];
    setScannedTickets(loaded);
  }, []);

  const handleScanSuccess = (decodedText) => {
    const existingScans = JSON.parse(localStorage.getItem('scanned_tickets')) || [];
    let scannedId = decodedText;
    let parsedPayload = null;
    let seatNo = null;

    try {
      parsedPayload = JSON.parse(decodedText);
      scannedId = parsedPayload.id || parsedPayload.ticketId || scannedId;
      seatNo = parsedPayload.seatNo || parsedPayload.seat || null;
    } catch (e) {
      // Plain text payload
    }

    const isDuplicate = existingScans.some((ticket) => ticket.id === scannedId);
    if (isDuplicate) {
      alert(`Error: Ticket [${scannedId}] has already been scanned!`);
      return;
    }

    let destination = 'Tagum City';
    let fare = 80;
    if (parsedPayload) {
      destination = parsedPayload.destination || destination;
      fare = parseFloat(parsedPayload.fare || parsedPayload.amount || fare);
    }

    if (seatNo) {
      const occupiedSeats = JSON.parse(localStorage.getItem('occupied_seats')) || [];
      const seatInt = parseInt(seatNo);

      if (!occupiedSeats.includes(seatInt)) {
        const updatedSeats = [...occupiedSeats, seatInt];
        localStorage.setItem('occupied_seats', JSON.stringify(updatedSeats));
      }
    }

    const now = new Date();
    const formattedDateTime = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newScan = {
      id: scannedId,
      destination: destination,
      seatNo: seatNo || 'N/A',
      dateTime: formattedDateTime,
      fare: fare
    };

    const updatedList = [newScan, ...existingScans];
    localStorage.setItem('scanned_tickets', JSON.stringify(updatedList));
    setScannedTickets(updatedList);

    alert(`TICKET VALIDATED!\n\nID: ${scannedId}\nSeat #: ${seatNo || 'N/A'}\nDestination: ${destination}`);
  };

  const handleSimulateScan = (testSeatNum) => {
    const randomTicketId = 'QR-TCK-' + Math.floor(1000 + Math.random() * 9000);
    const mockQrPayload = JSON.stringify({
      ticketId: randomTicketId,
      seatNo: testSeatNum,
      destination: 'Tagum City',
      fare: 80.00
    });

    handleScanSuccess(mockQrPayload);
  };

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      alert("Camera permission is blocked! Please check browser permissions.");
      return;
    }

    setIsScanning(true);

    setTimeout(() => {
      if (!scannerRef.current) {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 180, height: 180 } },
          (decodedText) => handleScanSuccess(decodedText),
          () => {}
        ).catch((err) => {
          alert("Unable to start camera stream: " + err);
          setIsScanning(false);
          scannerRef.current = null;
        });
      }
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(console.error);
      }
    };
  }, []);

  return (
    <div className="dashboard-container">
      <style>{`
        /* 1. STRICT SCANNER CENTERING FIX */
        .scanner-card {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          text-align: center !important;
        }

        .scanner-card h4, 
        .scanner-card div:last-child {
          width: 100% !important;
          text-align: center !important;
        }

        #scannerContainer {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 10px auto !important;
          width: 100% !important;
        }

        #scanPlaceholder {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
        }

        .qr-viewport {
          margin: 0 auto !important;
        }

        /* 2. SCROLLED TICKETS CARD & FORCED VERTICAL/HORIZONTAL SCROLLBAR FIX */
        .scanned-history-card {
          display: flex !important;
          flex-direction: column !important;
          height: 420px !important;
          max-height: 420px !important;
          overflow: hidden !important;
        }

        .scanned-records-container {
          height: 310px !important;
          max-height: 310px !important;
          overflow-y: scroll !important;
          overflow-x: auto !important;
          margin-top: 10px !important;
          width: 100% !important;
        }

        .scanned-records-container::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
          display: block !important;
        }
        .scanned-records-container::-webkit-scrollbar-track {
          background: #f1f1f1 !important;
        }
        .scanned-records-container::-webkit-scrollbar-thumb {
          background: #178a9c !important;
          border-radius: 4px !important;
        }

        .breakdown-table {
          width: 100% !important;
          border-collapse: collapse !important;
        }

        .breakdown-table thead th {
          position: sticky !important;
          top: 0 !important;
          background: #f8fafc !important;
          z-index: 5 !important;
        }
      `}</style>

      <aside className="sidebar">
        <div className="sidebar-brand">
          <i className="fa-solid fa-bus"></i>
        </div>

        <nav className="sidebar-menu">
          <a href="#" className="menu-item" onClick={() => onNavigate && onNavigate('start-shift')}>
            <i className="fa-solid fa-clock-rotate-left"></i>
            <span>Shift</span>
          </a>

          <a href="#" className="menu-item" onClick={() => onNavigate && onNavigate('ticketing')}>
            <i className="fa-solid fa-ticket"></i>
            <span>Ticketing</span>
          </a>

          <a href="#" className="menu-item active-nav">
            <i className="fa-solid fa-qrcode"></i>
            <span>Scan Ticket</span>
          </a>
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <h3>Scan Ticket</h3>
        </header>

        <div className="scan-page-content">
          
          <div className="scanner-card">
            <h4>Digital Fare / QR Scanner</h4>

            <div
              id="scannerContainer"
              onClick={!isScanning ? startCamera : undefined}
              style={{ cursor: !isScanning ? 'pointer' : 'default' }}
            >
              {!isScanning ? (
                <div id="scanPlaceholder">
                  <div className="qr-viewport">
                    <i className="fa-solid fa-qrcode qr-icon"></i>
                    <div className="scan-laser"></div>
                  </div>
                  <p className="scan-status-text">Ready To Scan</p>
                  <small>(Click frame to validate QR)</small>
                </div>
              ) : (
                <div id="reader"></div>
              )}
            </div>

            <div style={{ marginTop: '15px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn-test-scan"
                onClick={() => handleSimulateScan(5)}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  backgroundColor: '#178a9c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ⚡ Test Scan Ticket
              </button>
            </div>
          </div>

          <div className="scanned-history-card">
            <div className="scanned-card-header">
              <h4>Scanned Tickets</h4>
              <span className="scanned-date">{currentDate}</span>
            </div>

            <div className="scanned-records-container">
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Destination</th>
                    <th>Date / Time</th>
                  </tr>
                </thead>
                <tbody>
                  {scannedTickets.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                        No tickets scanned yet
                      </td>
                    </tr>
                  ) : (
                    scannedTickets.map((ticket, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: 'bold', color: '#178a9c' }}>{ticket.id}</td>
                        <td>{ticket.destination}</td>
                        <td style={{ fontSize: '11px', color: '#666' }}>{ticket.dateTime}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}