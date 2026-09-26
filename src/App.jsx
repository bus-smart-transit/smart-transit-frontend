import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import './App.css';
import { User, Lock, Bus, Users, Ticket, QrCode, LogOut, Home, BarChart2, MoreHorizontal, CheckCircle, Clock, Wifi, WifiOff, RefreshCw, LogIn, Bell } from 'lucide-react';

export default function App() {
  // ================= STATE MANAGEMENT =================
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [chauffeurIdInput, setChauffeurIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Shift & Navigation State
  const [isShiftStarted, setIsShiftStarted] = useState(false);
  const [activeTab, setActiveTab] = useState('start-shift');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [chauffeurStatus, setChauffeurStatus] = useState('Active');

  // Notification States
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Bus & Driver Pairing Assigned',
      message: 'You are assigned to Bus #1 with driver Roberto "Berto" Garcia for today\'s shift.',
      time: 'Just now',
      read: false
    }
  ]);
  const [showNotifModal, setShowNotifModal] = useState(false);

  // Network & Offline Queue States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);

  // Ticketing States
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [destination, setDestination] = useState('Tagum City');
  const [passengerType, setPassengerType] = useState('Regular');
  const [occupiedSeats, setOccupiedSeats] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Scan Ticket States
  const [scannedTickets, setScannedTickets] = useState([]);

  // End Shift Protection State
  const [isReportDownloaded, setIsReportDownloaded] = useState(false);

  // ================= NETWORK LISTENER EFFECT =================
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ================= FARE MATRIX =================
  const fareMatrix = {
    'Panabo City': 50.00,
    'Carmen': 65.00,
    'Tagum City': 80.00
  };

  const getComputedFare = () => {
    const basePrice = fareMatrix[destination] || 80.00;
    if (['Student', 'Senior Citizen', 'PWD'].includes(passengerType)) {
      return basePrice * 0.80;
    }
    return basePrice;
  };

  // ================= LOGIN SUBMIT =================
  const handleLogin = (e) => {
    e.preventDefault();
    if (chauffeurIdInput === 'CFR-2026-001' && passwordInput === '123') {
      setIsLoggedIn(true);
      setActiveTab('start-shift');
      setIsShiftStarted(false);
      setShowMoreMenu(false);
      setShowNotifModal(false);
    } else {
      alert('Chauffeur ID or Password Incorrect!\n\nTest Account:\nID: CFR-2026-001\nPassword: 123');
    }
  };

  // ================= START SHIFT CONFIRM =================
  const handleStartShiftConfirm = (e) => {
    e.preventDefault();
    setIsShiftStarted(true);
    setActiveTab('ticketing');
    alert('Shift started successfully! You can now access other tabs.');
  };

  // ================= NOTIFICATION HANDLER =================
  const handleOpenNotifications = () => {
    setShowNotifModal(!showNotifModal);
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  // ================= SEAT SELECTION & TICKET =================
  const handleSeatClick = (seatNum) => {
    if (occupiedSeats.includes(seatNum)) return;
    setSelectedSeat(selectedSeat === seatNum ? null : seatNum);
  };

  const handleGenerateTicket = (e) => {
    e.preventDefault();
    if (!selectedSeat) {
      alert('Please select a seat from the bus layout first!');
      return;
    }

    const fare = getComputedFare();
    const newTx = {
      ticketId: 'TCK-' + Date.now().toString().slice(-6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      destination,
      passengerType,
      fare,
      seatNumber: selectedSeat
    };

    if (isOnline) {
      setTransactions([...transactions, newTx]);
      alert(`Ticket Generated Successfully!\nID: ${newTx.ticketId}\nSeat: ${newTx.seatNumber}\nFare: ₱${fare.toFixed(2)}`);
    } else {
      setOfflineQueue([...offlineQueue, newTx]);
      setTransactions([...transactions, newTx]);
      alert(`[OFFLINE MODE] Ticket saved locally!\nID: ${newTx.ticketId}\nWill sync when online.`);
    }

    setOccupiedSeats([...occupiedSeats, selectedSeat]);
    setSelectedSeat(null);
  };

  const handleSyncQueue = () => {
    if (!isOnline) {
      alert('Cannot sync while offline. Please check your connection.');
      return;
    }
    if (offlineQueue.length === 0) {
      alert('No pending offline transactions to sync.');
      return;
    }
    alert(`Successfully synced ${offlineQueue.length} offline transaction(s) to the server!`);
    setOfflineQueue([]);
  };

  // ================= SIMULATED SCANNER (WITH AUTO SEAT OCCUPY) =================
  const handleSimulateScan = () => {
    const scanId = 'QR-TCK-' + Math.floor(1000 + Math.random() * 9000);
    const isDuplicate = scannedTickets.some(t => t.id === scanId);

    if (isDuplicate) {
      alert(`Error: Ticket [${scanId}] has already been scanned!`);
      return;
    }

    const allSeats = Array.from({ length: 48 }, (_, i) => String(i + 1));
    const availableSeats = allSeats.filter(s => !occupiedSeats.includes(s));

    if (availableSeats.length === 0) {
      alert('Error: Bus is already fully booked/occupied!');
      return;
    }

    const assignedSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newScan = {
      id: scanId,
      destination: 'Tagum City',
      date: formattedDate,
      time: formattedTime,
      seatNumber: assignedSeat,
      fare: 80.00
    };

    setScannedTickets([newScan, ...scannedTickets]);
    setOccupiedSeats([...occupiedSeats, assignedSeat]);

    alert(`Ticket Validated Successfully!\nID: ${newScan.id}\nSeat Assigned: #${assignedSeat}\nScanned at: ${formattedDate}, ${formattedTime}`);
  };

  // ================= METRICS =================
  const cashCollected = transactions.reduce((acc, curr) => acc + (curr.fare || 0), 0);
  const digitalPayments = scannedTickets.reduce((acc, curr) => acc + (curr.fare || 0), 0);
  const totalRevenue = cashCollected + digitalPayments;
  const totalPassengers = transactions.length + scannedTickets.length;

  // ================= DOWNLOAD PDF REPORT (EXACT SAMPLE TEMPLATE) =================
  const handleDownloadPDF = () => {
    const reportContainer = document.createElement('div');
    reportContainer.style.padding = '40px';
    reportContainer.style.fontFamily = 'Arial, sans-serif';
    reportContainer.style.color = '#111827';
    reportContainer.style.backgroundColor = '#ffffff';

    const currentDateStr = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    const currentDateTimeStr = new Date().toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });

    reportContainer.innerHTML = `
      <div style="text-align: center; margin-bottom: 10px;">
        <h1 style="margin: 0; font-size: 20px; font-weight: bold; color: #1e3a8a; letter-spacing: 0.5px;">CHAUFFEUR SHIFT REVENUE REPORT</h1>
        <p style="margin: 6px 0 0; font-size: 11px; color: #4b5563;">Generated on: ${currentDateTimeStr}</p>
      </div>
      
      <div style="border-bottom: 2px solid #0d9488; margin-bottom: 20px;"></div>

      <!-- Top Info Panel -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: flex; justify-content: space-between; font-size: 11px;">
        <div>
          <p style="margin: 0 0 6px 0;"><strong>Chauffeur ID:</strong> CFR-2026-001</p>
          <p style="margin: 0 0 6px 0;"><strong>Assigned Vehicle:</strong> Bus 001</p>
          <p style="margin: 0;"><strong>Partner Driver:</strong> Roberto Garcia (DRV-2026-101)</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 6px 0;"><strong>Status:</strong> Shift Closed / Audited</p>
          <p style="margin: 0;"><strong>Shift Date:</strong> ${currentDateStr}</p>
        </div>
      </div>

      <!-- Financial Summary Section -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 12px; color: #1e3a8a; border-left: 3px solid #0d9488; padding-left: 8px; margin: 0 0 10px 0; text-transform: uppercase;">Financial Summary</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
          <thead>
            <tr style="background-color: #1e293b; color: #ffffff;">
              <th style="padding: 8px 12px; border: 1px solid #334155;">Total Revenue</th>
              <th style="padding: 8px 12px; border: 1px solid #334155;">Cash Collected</th>
              <th style="padding: 8px 12px; border: 1px solid #334155;">Digital Payments</th>
              <th style="padding: 8px 12px; border: 1px solid #334155;">Total Passengers</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px 12px; border: 1px solid #e2e8f0; font-weight: bold; color: #0d9488;">₱${totalRevenue.toFixed(2)}</td>
              <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">₱${cashCollected.toFixed(2)}</td>
              <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">₱${digitalPayments.toFixed(2)}</td>
              <td style="padding: 10px 12px; border: 1px solid #e2e8f0;">${totalPassengers}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Trip Breakdown Logs Section -->
      <div style="margin-bottom: 60px;">
        <h3 style="font-size: 12px; color: #1e3a8a; border-left: 3px solid #0d9488; padding-left: 8px; margin: 0 0 10px 0; text-transform: uppercase;">Trip Breakdown Logs</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
          <thead>
            <tr style="background-color: #e2e8f0; color: #1e293b;">
              <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Trip ID</th>
              <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Route</th>
              <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Start Time</th>
              <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">End Time</th>
              <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Earnings</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">TRP-001</td>
              <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">Davao City - Tagum City</td>
              <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">--:--</td>
              <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">--:--</td>
              <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${totalRevenue > 0 ? `₱${totalRevenue.toFixed(2)}` : 'In Progress'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Signatures Footer -->
      <div style="display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px;">
        <div style="width: 40%; text-align: center;">
          <div style="border-bottom: 1px solid #111827; margin-bottom: 5px; height: 30px;"></div>
          <span>Chauffeur Signature</span>
        </div>
        <div style="width: 40%; text-align: center;">
          <div style="border-bottom: 1px solid #111827; margin-bottom: 5px; height: 30px;"></div>
          <span>Inspector / Admin Signature</span>
        </div>
      </div>
    `;

    const opt = {
      margin: 10,
      filename: `Shift_Report_CFR-2026-001.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(reportContainer).save();
    setIsReportDownloaded(true);
  };

  const handleVerifyEndShift = () => {
    if (!isReportDownloaded) {
      alert('Please download the revenue report before ending your shift.');
      return;
    }
    if (window.confirm('Are you sure you want to end your shift and log out?')) {
      setTransactions([]);
      setOccupiedSeats([]);
      setScannedTickets([]);
      setSelectedSeat(null);
      setIsReportDownloaded(false);
      setIsShiftStarted(false);
      setIsLoggedIn(false);
      setShowMoreMenu(false);
      setShowNotifModal(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // ================= 1. LOGIN SCREEN =================
  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#07090e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#0d1117', border: '1px solid #1f2937', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', padding: '24px', boxSizing: 'border-box' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#161b22', border: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <Bus size={24} />
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Chauffeur Portal</h1>
            <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>Mobile Access</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>CHAUFFEUR ID</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: '#6b7280' }} />
                <input
                  type="text"
                  placeholder="CFR-2026-001"
                  value={chauffeurIdInput}
                  onChange={(e) => setChauffeurIdInput(e.target.value)}
                  required
                  style={{ width: '100%', backgroundColor: '#07090e', border: '1px solid #30363d', borderRadius: '10px', padding: '10px 10px 10px 38px', color: '#ffffff', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', top: '12px', left: '12px', color: '#6b7280' }} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  style={{ width: '100%', backgroundColor: '#07090e', border: '1px solid #30363d', borderRadius: '10px', padding: '10px 10px 10px 38px', color: '#ffffff', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            </div>

            <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', marginTop: '6px' }}>
              Sign In
            </button>
          </form>

          <div style={{ marginTop: '20px', backgroundColor: '#07090e', border: '1px solid #1f2937', borderRadius: '10px', padding: '10px', fontSize: '11px', color: '#9ca3af' }}>
            <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#d1d5db' }}>Test Account:</p>
            <p style={{ margin: 0 }}>ID: <strong>CFR-2026-001</strong> | Pwd: <strong>123</strong></p>
          </div>
        </div>
      </div>
    );
  }

  // ================= 2. MOBILE PHONE FRAME INTERFACE (PORTRAIT) =================
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1e1e1e', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', boxSizing: 'border-box' }}>
      
      <div style={{ width: '390px', height: '750px', backgroundColor: '#0d1117', display: 'flex', flexDirection: 'column', border: '4px solid #30363d', borderRadius: '32px', overflow: 'hidden', boxSizing: 'border-box', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', position: 'relative' }}>
        
        {/* Status Bar with Notification Bell Icon */}
        <div style={{ backgroundColor: '#161b22', height: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 12px', color: '#8b949e', fontSize: '9px', fontWeight: 'bold' }}>
          <span>CHAUFFEUR MOBILE PORTAL</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isOnline ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10b981' }}>
                <Wifi size={11} /> ONLINE
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#ef4444' }}>
                <WifiOff size={11} /> OFFLINE {offlineQueue.length > 0 && `(${offlineQueue.length})`}
              </span>
            )}
            
            <button 
              onClick={handleOpenNotifications}
              style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', color: '#e2e8f0', padding: 0 }}
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-6px', backgroundColor: '#ef4444', color: '#fff', fontSize: '7px', fontWeight: 'bold', padding: '1px 3px', borderRadius: '50%', border: '1px solid #161b22' }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Facebook-Style Top Navigation Bar */}
        <div style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '50px', padding: '0 6px', boxSizing: 'border-box', flexShrink: 0 }}>
          <button onClick={() => { setActiveTab('start-shift'); setShowMoreMenu(false); setShowNotifModal(false); }} style={{ background: 'none', border: 'none', borderBottom: (!showMoreMenu && !showNotifModal && activeTab === 'start-shift') ? '3px solid #00e676' : '3px solid transparent', height: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: (!showMoreMenu && !showNotifModal && activeTab === 'start-shift') ? '#00e676' : '#8b949e' }}>
            <Home size={20} />
          </button>
          <button onClick={() => { if (isShiftStarted) { setActiveTab('ticketing'); setShowMoreMenu(false); setShowNotifModal(false); } else alert('Please confirm Start Shift first!'); }} style={{ background: 'none', border: 'none', borderBottom: (!showMoreMenu && !showNotifModal && activeTab === 'ticketing') ? '3px solid #00e676' : '3px solid transparent', height: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: isShiftStarted ? 'pointer' : 'not-allowed', opacity: isShiftStarted ? 1 : 0.4, color: (!showMoreMenu && !showNotifModal && activeTab === 'ticketing') ? '#00e676' : '#8b949e' }}>
            <Ticket size={20} />
          </button>
          <button onClick={() => { if (isShiftStarted) { setActiveTab('scan-ticket'); setShowMoreMenu(false); setShowNotifModal(false); } else alert('Please confirm Start Shift first!'); }} style={{ background: 'none', border: 'none', borderBottom: (!showMoreMenu && !showNotifModal && activeTab === 'scan-ticket') ? '3px solid #00e676' : '3px solid transparent', height: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: isShiftStarted ? 'pointer' : 'not-allowed', opacity: isShiftStarted ? 1 : 0.4, color: (!showMoreMenu && !showNotifModal && activeTab === 'scan-ticket') ? '#00e676' : '#8b949e' }}>
            <QrCode size={20} />
          </button>
          <button onClick={() => { if (isShiftStarted) { setActiveTab('end-shift'); setShowMoreMenu(false); setShowNotifModal(false); } else alert('Please confirm Start Shift first!'); }} style={{ background: 'none', border: 'none', borderBottom: (!showMoreMenu && !showNotifModal && activeTab === 'end-shift') ? '3px solid #00e676' : '3px solid transparent', height: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: isShiftStarted ? 'pointer' : 'not-allowed', opacity: isShiftStarted ? 1 : 0.4, color: (!showMoreMenu && !showNotifModal && activeTab === 'end-shift') ? '#00e676' : '#8b949e' }}>
            <BarChart2 size={20} />
          </button>
          <button onClick={() => { setShowMoreMenu(!showMoreMenu); setShowNotifModal(false); }} style={{ background: 'none', border: 'none', borderBottom: (showMoreMenu && !showNotifModal) ? '3px solid #00e676' : '3px solid transparent', height: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: (showMoreMenu && !showNotifModal) ? '#00e676' : '#8b949e' }}>
            <MoreHorizontal size={22} />
          </button>
        </div>

        {/* Scrollable Main Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', boxSizing: 'border-box', backgroundColor: '#f3f4f6', position: 'relative' }}>
          
          {/* NOTIFICATION POPUP MODAL */}
          {showNotifModal ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #f3f4f6', paddingBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '13px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bell size={14} color="#2563eb" /> Notifications & Pairings
                  </h3>
                  <button onClick={() => setShowNotifModal(false)} style={{ background: 'none', border: 'none', fontSize: '11px', color: '#6b7280', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {notifications.map((notif) => (
                    <div key={notif.id} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e293b' }}>{notif.title}</span>
                        <span style={{ fontSize: '9px', color: '#64748b' }}>{notif.time}</span>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: '#475569', lineHeight: '1.3' }}>
                        {notif.message}
                      </p>
                      <button onClick={() => { setShowNotifModal(false); setActiveTab('start-shift'); }} style={{ width: '100%', padding: '5px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                        View Shift Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : showMoreMenu ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>CJ</div>
                  <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '14px', color: '#1f2937' }}>Chauffeur John</h3>
                    <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>ID: CFR-2026-001</p>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Chauffeur Status</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setChauffeurStatus('Active')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: chauffeurStatus === 'Active' ? '2px solid #059669' : '1px solid #d1d5db', backgroundColor: chauffeurStatus === 'Active' ? '#f0fdf4' : '#ffffff', color: chauffeurStatus === 'Active' ? '#065f46' : '#4b5563', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}>
                      <CheckCircle size={14} color="#059669" /> Active
                    </button>
                    <button onClick={() => setChauffeurStatus('Unavailable')} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: chauffeurStatus === 'Unavailable' ? '2px solid #d97706' : '1px solid #d1d5db', backgroundColor: chauffeurStatus === 'Unavailable' ? '#fffbeb' : '#ffffff', color: chauffeurStatus === 'Unavailable' ? '#92400e' : '#4b5563', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}>
                      <Clock size={14} color="#d97706" /> Unavailable
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '16px', backgroundColor: '#f9fafb', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151' }}>Offline Sync Queue</span>
                    <span style={{ fontSize: '11px', backgroundColor: '#e5e7eb', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{offlineQueue.length} items</span>
                  </div>
                  <button onClick={handleSyncQueue} style={{ width: '100%', padding: '6px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', cursor: 'pointer' }}>
                    <RefreshCw size={12} /> Sync Pending Data
                  </button>
                </div>

                <button onClick={handleVerifyEndShift} style={{ width: '100%', padding: '10px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
                  <LogOut size={16} /> Logout Account
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: HOME */}
              {activeTab === 'start-shift' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <div style={{ backgroundColor: '#ffffff', width: '100%', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', boxSizing: 'border-box' }}>
                    <h2 style={{ fontSize: '15px', color: '#1f2937', marginBottom: '4px', textAlign: 'center' }}>Welcome, Chauffeur John!</h2>
                    <p style={{ fontSize: '11px', color: '#4b5563', marginBottom: '14px', textAlign: 'center', lineHeight: '1.2' }}>Review your assigned bus and partner driver before starting your shift.</p>

                    <form onSubmit={handleStartShiftConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ backgroundColor: '#f9fafb', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontSize: '10px', fontWeight: 'bold', marginBottom: '2px' }}>
                          <Bus size={13} /> ASSIGNED BUS
                        </div>
                        <div style={{ color: '#1f2937', fontSize: '12px', fontWeight: 'bold' }}>Bus #1 (Aircon / 48-Seater 2x2)</div>
                      </div>

                      <div style={{ backgroundColor: '#f9fafb', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontSize: '10px', fontWeight: 'bold', marginBottom: '2px' }}>
                          <Users size={13} /> PARTNER DRIVER
                        </div>
                        <div style={{ color: '#1f2937', fontSize: '12px', fontWeight: 'bold' }}>Roberto 'Berto' Garcia</div>
                      </div>

                      <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: isShiftStarted ? '#64748b' : '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}>
                        {isShiftStarted ? 'SHIFT IS ACTIVE' : 'CONFIRM & START SHIFT'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: TICKETING WITH MAXIMIZED LAYOUT & NO SCROLLBAR */}
              {activeTab === 'ticketing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  {/* Ticket Form Controls */}
                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <h4 style={{ fontSize: '11px', margin: '0 0 4px 0', color: '#1f2937' }}>Manual Cash Ticket</h4>
                    <form onSubmit={handleGenerateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '8px', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '1px' }}>DESTINATION</label>
                          <select value={destination} onChange={(e) => setDestination(e.target.value)} style={{ width: '100%', padding: '4px', fontSize: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                            <option value="Tagum City">Tagum (₱80)</option>
                            <option value="Carmen">Carmen (₱65)</option>
                            <option value="Panabo City">Panabo (₱50)</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '8px', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '1px' }}>PASSENGER TYPE</label>
                          <select value={passengerType} onChange={(e) => setPassengerType(e.target.value)} style={{ width: '100%', padding: '4px', fontSize: '10px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                            <option value="Regular">Regular</option>
                            <option value="Student">Student (20% Off)</option>
                            <option value="Senior Citizen">Senior (20% Off)</option>
                            <option value="PWD">PWD (20% Off)</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1px' }}>
                        <span style={{ fontSize: '9px', color: '#2563eb', fontWeight: 'bold' }}>
                          Fare: ₱{getComputedFare().toFixed(2)} {selectedSeat ? `(Seat #${selectedSeat})` : '(Select seat)'}
                        </span>
                        <button type="submit" style={{ padding: '4px 10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '10px', cursor: 'pointer' }}>
                          Issue Ticket
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* MAXIMIZED 2X2 BUS LAYOUT CONTAINER (NO SCROLL) */}
                  <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '8px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    
                    {/* BUS FRONT HEADER: Driver Seat & Entrance/Exit Door */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px', marginBottom: '6px', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8px', fontWeight: 'bold', color: '#1e293b' }}>
                        <User size={10} color="#2563eb" /> DRIVER SEAT
                      </div>
                      <div style={{ fontSize: '7px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        FRONT WINDSHIELD
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '8px', fontWeight: 'bold', color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 5px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                        <LogIn size={9} /> ENTRANCE/EXIT DOOR
                      </div>
                    </div>

                    {/* Legend */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '5px', fontSize: '8px', color: '#4b5563' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '2px' }}></span> Available</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><span style={{ width: '6px', height: '6px', backgroundColor: '#1d4ed8', borderRadius: '2px' }}></span> Selected</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><span style={{ width: '6px', height: '6px', backgroundColor: '#9ca3af', borderRadius: '2px' }}></span> Occupied</span>
                    </div>

                    {/* Maximized 2x2 Bus Layout Grid */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {
                        Array.from({ length: 12 }, (_, rowIndex) => {
                          const leftSeat1 = String(rowIndex * 4 + 1);
                          const leftSeat2 = String(rowIndex * 4 + 2);
                          const rightSeat1 = String(rowIndex * 4 + 3);
                          const rightSeat2 = String(rowIndex * 4 + 4);

                          const renderSeatBtn = (seatNum) => {
                            const isOccupied = occupiedSeats.includes(seatNum);
                            const isSelected = selectedSeat === seatNum;
                            return (
                              <button
                                key={seatNum}
                                type="button"
                                disabled={isOccupied}
                                onClick={() => handleSeatClick(seatNum)}
                                style={{
                                  width: '32px',
                                  height: '21px',
                                  backgroundColor: isOccupied ? '#9ca3af' : isSelected ? '#1d4ed8' : '#10b981',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '3px',
                                  fontSize: '8px',
                                  fontWeight: 'bold',
                                  cursor: isOccupied ? 'not-allowed' : 'pointer',
                                  padding: 0
                                }}
                              >
                                {seatNum}
                              </button>
                            );
                          };

                          return (
                            <div key={rowIndex} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                              <div style={{ display: 'flex', gap: '3px' }}>
                                {renderSeatBtn(leftSeat1)}
                                {renderSeatBtn(leftSeat2)}
                              </div>
                              <div style={{ width: '12px', textAlign: 'center', fontSize: '8px', color: '#cbd5e1', lineHeight: '1' }}>
                                |
                              </div>
                              <div style={{ display: 'flex', gap: '3px' }}>
                                {renderSeatBtn(rightSeat1)}
                                {renderSeatBtn(rightSeat2)}
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 3: SCAN TICKET (WITH DATE/TIME & AUTO OCCUPY SEAT) */}
              {activeTab === 'scan-ticket' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#1f2937' }}>QR Code Scanner</h4>
                    <div onClick={handleSimulateScan} style={{ border: '2px dashed #10b981', padding: '16px', borderRadius: '8px', cursor: 'pointer', background: '#f0fdf4' }}>
                      <QrCode size={32} style={{ color: '#059669', margin: '0 auto 6px auto' }} />
                      <p style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', margin: 0 }}>Tap to simulate scan</p>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', borderRadius: '12px', padding: '14px', border: '1px solid #e5e7eb', maxHeight: '250px', overflowY: 'auto' }}>
                    <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#1f2937' }}>Scanned Tickets ({scannedTickets.length})</h4>
                    {scannedTickets.length === 0 ? (
                      <p style={{ color: '#6b7280', fontSize: '11px', textAlign: 'center', padding: '15px' }}>No scanned tickets yet.</p>
                    ) : (
                      scannedTickets.map((t, idx) => (
                        <div key={idx} style={{ background: '#f9fafb', padding: '8px 10px', borderRadius: '8px', marginBottom: '6px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #e5e7eb' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {t.id} <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '9px', padding: '1px 5px', borderRadius: '4px' }}>Seat #{t.seatNumber}</span>
                            </div>
                            <div style={{ fontSize: '9px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Clock size={10} /> {t.date} • {t.time}
                            </div>
                          </div>
                          <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '12px' }}>₱{t.fare.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: END SHIFT */}
              {activeTab === 'end-shift' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#1f2937' }}>Shift Revenue Summary</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span>Total Revenue:</span>
                      <strong style={{ color: '#2563eb', fontSize: '14px' }}>₱{totalRevenue.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#4b5563', marginBottom: '4px' }}>
                      <span>Cash Collected:</span>
                      <span>₱{cashCollected.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#4b5563', marginBottom: '4px' }}>
                      <span>Digital Payments:</span>
                      <span>₱{digitalPayments.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#4b5563' }}>
                      <span>Total Passengers:</span>
                      <span>{totalPassengers}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button onClick={handleDownloadPDF} style={{ width: '100%', padding: '10px', backgroundColor: '#f3f4f6', color: '#1f2937', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                      Download Report (PDF)
                    </button>
                    <button onClick={handleVerifyEndShift} style={{ width: '100%', padding: '10px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                      VERIFY & END SHIFT
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
}