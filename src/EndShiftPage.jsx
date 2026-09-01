import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';

export default function EndShiftPage({ onNavigate }) {
  const [isReportDownloaded, setIsReportDownloaded] = useState(false);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    cashCollected: 0,
    digitalPayments: 0,
    totalPassengers: 0
  });

  const chauffeurID = "CFR-2026-001";
  const currentDateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  // Calculate Shift Financials
  useEffect(() => {
    const transactions = JSON.parse(localStorage.getItem('shift_transactions')) || [];
    const scannedTickets = JSON.parse(localStorage.getItem('scanned_tickets')) || [];

    let totalPassengers = 0;
    let cashCollected = 0;
    let digitalPayments = 0;

    // 1. Process Shift Transactions (Cash / Manual Ticketing)
    transactions.forEach((item) => {
      const passengers = parseInt(item.passengerCount || item.passengers || 1);
      totalPassengers += passengers;

      const fare = parseFloat(item.fare || item.amount || item.price || 0);
      const payment = (item.paymentType || item.paymentMethod || item.type || "").toLowerCase();

      if (payment.includes("digital") || payment.includes("gcash") || payment.includes("card")) {
        digitalPayments += fare;
      } else {
        cashCollected += fare;
      }
    });

    // 2. Process Valid QR Scans
    scannedTickets.forEach((scan) => {
      const passengers = parseInt(scan.passengerCount || 1);
      totalPassengers += passengers;

      const fare = parseFloat(scan.fare || 0);
      digitalPayments += fare;
    });

    const totalRevenue = cashCollected + digitalPayments;

    setMetrics({
      totalRevenue,
      cashCollected,
      digitalPayments,
      totalPassengers
    });
  }, []);

  // Download PDF Revenue Report
  const handleDownloadReport = () => {
    const busNumber = localStorage.getItem('assigned_bus') || "Bus 001";
    const driverName = localStorage.getItem('assigned_driver_name') || "Roberto Garcia";
    const driverId = localStorage.getItem('assigned_driver_id') || "DRV-2026-101";

    const realTimeNow = new Date().toLocaleString('en-US', { 
      dateStyle: 'full', 
      timeStyle: 'short' 
    });

    const tripStartTime = localStorage.getItem('trip_start_time') || '--:--';
    const currentRoute = localStorage.getItem('assigned_route') || 'Davao City - Tagum City';

    const reportContainer = document.createElement('div');
    reportContainer.style.padding = '30px';
    reportContainer.style.fontFamily = 'Arial, sans-serif';
    reportContainer.style.color = '#333';

    reportContainer.innerHTML = `
      <div style="text-align: center; border-bottom: 2px solid #178a9c; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 20px; color: #2b434f;">CHAUFFEUR SHIFT REVENUE REPORT</h1>
        <p style="margin: 5px 0 0; font-size: 11px; color: #666;">Generated on: <strong>${realTimeNow}</strong></p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; background: #f8f9fa; padding: 12px; border-radius: 6px;">
        <div>
          <p style="margin: 0 0 4px;"><strong>Chauffeur ID:</strong> ${chauffeurID}</p>
          <p style="margin: 0 0 4px;"><strong>Assigned Vehicle:</strong> ${busNumber}</p>
          <p style="margin: 0;"><strong>Partner Driver:</strong> ${driverName} (${driverId})</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 4px;"><strong>Status:</strong> Shift Closed / Audited</p>
          <p style="margin: 0;"><strong>Shift Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <h3 style="font-size: 14px; border-left: 4px solid #178a9c; padding-left: 8px; margin-bottom: 10px;">FINANCIAL SUMMARY</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
        <tr style="background: #2b434f; color: #fff;">
          <th style="padding: 8px; text-align: left;">Total Revenue</th>
          <th style="padding: 8px; text-align: left;">Cash Collected</th>
          <th style="padding: 8px; text-align: left;">Digital Payments</th>
          <th style="padding: 8px; text-align: left;">Total Passengers</th>
        </tr>
        <tr style="background: #f2f2f2;">
          <td style="padding: 10px; font-weight: bold; color: #178a9c;">₱${metrics.totalRevenue.toFixed(2)}</td>
          <td style="padding: 10px;">₱${metrics.cashCollected.toFixed(2)}</td>
          <td style="padding: 10px;">₱${metrics.digitalPayments.toFixed(2)}</td>
          <td style="padding: 10px;">${metrics.totalPassengers}</td>
        </tr>
      </table>

      <h3 style="font-size: 14px; border-left: 4px solid #178a9c; padding-left: 8px; margin-bottom: 10px;">TRIP BREAKDOWN LOGS</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 40px;">
        <thead>
          <tr style="background: #e9ecef;">
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Trip ID</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Route</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Start Time</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">End Time</th>
            <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">Earnings</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #dee2e6;">TRP-001</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${currentRoute}</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${tripStartTime}</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td style="padding: 8px; border: 1px solid #dee2e6;">₱${metrics.totalRevenue.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; margin-top: 50px; font-size: 11px;">
        <div style="text-align: center; width: 200px; border-top: 1px solid #000; padding-top: 5px;">
          Chauffeur Signature
        </div>
        <div style="text-align: center; width: 200px; border-top: 1px solid #000; padding-top: 5px;">
          Inspector / Admin Signature
        </div>
      </div>
    `;

    const pdfOptions = {
      margin:       10,
      filename:     `Shift_Report_${chauffeurID}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(pdfOptions).from(reportContainer).save();
    setIsReportDownloaded(true);
  };

  // Verify and End Shift
  const handleVerifyEndShift = () => {
    if (!isReportDownloaded) {
      alert("Action Required: Please download the Revenue Report first before ending your shift.");
      return;
    }

    const confirmEnd = window.confirm("Are you sure you want to end your shift and log out?");
    if (confirmEnd) {
      localStorage.clear();
      sessionStorage.clear();

      alert("Shift ended successfully. Redirecting to login page...");
      if (onNavigate) {
        onNavigate('login');
      }
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <i className="fa-solid fa-bus"></i>
        </div>

        <nav className="sidebar-menu">
          <a href="#" className="menu-item active-nav" onClick={() => onNavigate && onNavigate('end-shift')}>
            <i className="fa-solid fa-clock-rotate-left"></i>
            <span>Shift</span>
          </a>

          <a href="#" className="menu-item" onClick={() => onNavigate && onNavigate('ticketing')}>
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
        <header className="top-header end-shift-top-header">
          <h3>Shift Summary <span className="header-date">| Date: {currentDateStr}</span></h3>
          <span className="chauffeur-id-badge">Chauffeur ID: {chauffeurID}</span>
        </header>

        <div className="end-shift-content">
          <div className="metrics-row">
            <div className="metric-card-item">
              <span className="m-label">Total Revenue:</span>
              <span className="m-val highlight-revenue">₱{metrics.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="metric-card-item">
              <span className="m-label">Cash collected:</span>
              <span className="m-val">₱{metrics.cashCollected.toFixed(2)}</span>
            </div>
            <div className="metric-card-item">
              <span className="m-label">Digital Payments:</span>
              <span className="m-val">₱{metrics.digitalPayments.toFixed(2)}</span>
            </div>
            <div className="metric-card-item">
              <span>Total Passengers:</span>
              <p className="metric-value">{metrics.totalPassengers}</p>
            </div>
          </div>

          <div className="trip-breakdown-card">
            <h3>Trip Breakdown</h3>
            <table className="breakdown-table">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Route</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Earnings</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>TRP-001</td>
                  <td>{localStorage.getItem('assigned_route') || 'Davao City - Tagum City'}</td>
                  <td>{localStorage.getItem('trip_start_time') || '--:--'}</td>
                  <td>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>₱{metrics.totalRevenue.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="end-shift-actions" style={{ position: 'relative', zIndex: 9999 }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={handleDownloadReport}
            >
              Download Revenue Report
            </button>

            <button 
              type="button" 
              className="btn-verify-end-shift" 
              onClick={handleVerifyEndShift}
            >
              VERIFY & END SHIFT
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}