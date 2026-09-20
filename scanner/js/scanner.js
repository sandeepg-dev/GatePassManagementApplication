/**
 * Standalone Hosteller Gate Physical Security Scanner & WhatsApp Parent Alerts
 * Configurable Backend Endpoint Support for Multi-Domain Vercel Deployment
 */

let isProcessing = false;
let currentScanType = 'auto'; // 'auto' | 'exit' | 'return'
const video = document.getElementById('video');
const beep = document.getElementById('beepSound');

function getBackendApiBase() {
  const custom = localStorage.getItem('SCANNER_BACKEND_URL');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  return '';
}

function updateBackendDisplay() {
  const display = document.getElementById('serverUrlDisplay');
  const base = getBackendApiBase();
  if (display) {
    display.innerText = base ? base.replace(/^https?:\/\//, '') : 'Default (Relative / Proxied)';
  }
}

function openServerConfigModal() {
  const modal = document.getElementById('serverConfigModal');
  const input = document.getElementById('backendUrlInput');
  if (input) input.value = getBackendApiBase();
  if (modal) modal.classList.remove('hidden');
}

function closeServerConfigModal() {
  const modal = document.getElementById('serverConfigModal');
  if (modal) modal.classList.add('hidden');
}

function saveServerConfig() {
  const input = document.getElementById('backendUrlInput');
  let val = (input?.value || '').trim();
  if (val) {
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      val = 'https://' + val;
    }
    val = val.replace(/\/+$/, '');
    localStorage.setItem('SCANNER_BACKEND_URL', val);
  } else {
    localStorage.removeItem('SCANNER_BACKEND_URL');
  }
  updateBackendDisplay();
  closeServerConfigModal();
}

function resetServerConfig() {
  localStorage.removeItem('SCANNER_BACKEND_URL');
  updateBackendDisplay();
  closeServerConfigModal();
}

function setScanMode(mode) {
  currentScanType = mode;
  const btnAuto = document.getElementById('modeBtnAuto');
  const btnExit = document.getElementById('modeBtnExit');
  const btnReturn = document.getElementById('modeBtnReturn');
  const instr = document.getElementById('modeInstruction');

  if (btnAuto) btnAuto.className = mode === 'auto' ? 'py-1.5 px-2 rounded-lg bg-emerald-600 text-white transition shadow-sm flex items-center justify-center gap-1' : 'py-1.5 px-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition flex items-center justify-center gap-1';
  if (btnExit) btnExit.className = mode === 'exit' ? 'py-1.5 px-2 rounded-lg bg-emerald-600 text-white transition shadow-sm flex items-center justify-center gap-1' : 'py-1.5 px-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition flex items-center justify-center gap-1';
  if (btnReturn) btnReturn.className = mode === 'return' ? 'py-1.5 px-2 rounded-lg bg-sky-600 text-white transition shadow-sm flex items-center justify-center gap-1' : 'py-1.5 px-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition flex items-center justify-center gap-1';

  if (instr) {
    if (mode === 'auto') instr.innerText = 'Smart Auto: Automatically detects Exit or Return';
    else if (mode === 'exit') instr.innerText = 'Exit Mode: Strictly records campus departure for approved hostellers';
    else if (mode === 'return') instr.innerText = 'Return Mode: Strictly records safe campus return for exited hostellers';
  }
}

async function verifyPass(rollNumber) {
  if (isProcessing || !rollNumber) return;
  isProcessing = true; // Lock scanner to prevent duplicate calls

  try {
    if (beep) {
      beep.currentTime = 0;
      beep.play().catch(() => {});
    }
  } catch (e) {}

  const cleanRoll = String(rollNumber).trim().toUpperCase();
  const resultBox = document.getElementById('scanResult');

  if (resultBox) {
    resultBox.classList.remove('hidden');
    resultBox.className = 'p-4 rounded-xl font-bold text-xs mb-4 bg-amber-600/90 text-white shadow-lg border border-amber-500/40 text-left';
    resultBox.innerHTML = `Verifying Hosteller Roll No: <span class="font-mono">${cleanRoll}</span> (${currentScanType.toUpperCase()} Mode)...`;
  }

  const endpoint = `${getBackendApiBase()}/api/scan-pass`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNo: cleanRoll, scanType: currentScanType })
    });

    const data = await res.json();

    if (data.success && resultBox) {
      const pass = data.pass;

      if (data.action === 'return' || pass.status === 'Returned') {
        // Return Scan Success
        resultBox.className = 'p-4 rounded-xl text-xs mb-4 bg-sky-950 text-white shadow-xl space-y-2 border-2 border-sky-400 text-left';
        resultBox.innerHTML = `
          <div class="text-xs font-bold border-b border-sky-400/30 pb-2 mb-2 flex items-center justify-between">
            <span class="tracking-wide text-sky-200 uppercase font-black">🏫 Hosteller Return to Campus Recorded</span>
            <span class="text-[10px] bg-sky-500/20 px-2.5 py-0.5 rounded-full font-mono text-sky-200 border border-sky-400/40 font-bold">RETURN LOGGED</span>
          </div>
          <div><b>Roll No:</b> <span class="font-mono text-sky-300 font-bold">${pass.rollNo}</span></div>
          <div><b>Student Name:</b> ${pass.name || 'Student'} | <b>Dept:</b> ${pass.dept || 'Engineering'}</div>
          <div><b>Accommodation:</b> <span class="font-semibold text-sky-300">Hosteller (Resident Student)</span></div>
          
          <div class="p-2.5 bg-sky-900/60 rounded-lg border border-sky-400/30 my-1.5">
            <div class="text-[10px] uppercase font-bold text-sky-200">Actual Scanned Return Date & Time (IST)</div>
            <div class="text-sm font-mono font-black text-amber-300">${pass.returnTime}</div>
          </div>
          <div class="text-[11px] text-sky-200"><b>Departure Was:</b> ${pass.exitTime || '-'}</div>
          <div class="text-[10px] text-sky-300/90 italic pt-1 text-right">Student record updated with return timestamp</div>
        `;
      } else {
        // Exit Scan Success
        resultBox.className = 'p-4 rounded-xl text-xs mb-4 bg-emerald-950 text-white shadow-xl space-y-2 border-2 border-emerald-500 text-left';
        resultBox.innerHTML = `
          <div class="text-xs font-bold border-b border-emerald-500/30 pb-2 mb-2 flex items-center justify-between">
            <span class="tracking-wide text-emerald-200 uppercase font-black">🚪 Hosteller Campus Exit Recorded</span>
            <span class="text-[10px] bg-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono text-emerald-200 border border-emerald-400/40 font-bold">EXIT LOGGED</span>
          </div>
          <div><b>Roll No:</b> <span class="font-mono text-emerald-300 font-bold">${pass.rollNo}</span></div>
          <div><b>Student Name:</b> ${pass.name || 'Student'} | <b>Dept:</b> ${pass.dept || 'Engineering'}</div>
          <div><b>Accommodation:</b> <span class="font-semibold text-emerald-300">Hosteller (Resident Student)</span></div>
          <div class="text-xs"><b>Parent Contact:</b> <span class="font-mono text-emerald-200">${pass.parentContact || '-'}</span></div>

          <div class="p-2.5 bg-emerald-900/60 rounded-lg border border-emerald-500/30 my-1.5">
            <div class="text-[10px] uppercase font-bold text-emerald-200">Actual Scanned Exit Date & Time (IST)</div>
            <div class="text-sm font-mono font-black text-amber-300">${pass.exitTime}</div>
          </div>

          <div class="p-2 bg-amber-950/70 rounded-lg border border-amber-500/20 text-[11px] space-y-0.5 text-amber-200">
            <div><b>Departure:</b> ${pass.departureDate || '-'} ${pass.departureTime ? 'at ' + pass.departureTime : ''}</div>
            <div><b>Expected Return:</b> ${pass.expectedReturnDate ? pass.expectedReturnDate + (pass.expectedReturnTime ? ' at ' + pass.expectedReturnTime : '') : (pass.expectedReturnDateTime || '-')}</div>
          </div>

          <div class="text-xs"><b>Destination:</b> ${pass.address || '-'}</div>

          <button onclick="sendParentWhatsApp('${pass.name}', '${pass.rollNo}', '${pass.dept || 'Engineering'}', '${
          pass.parentContact || pass.mobile || ''
        }', '${pass.exitTime}')" class="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition flex items-center justify-center gap-1.5">
            Send WhatsApp Notice to Parent
          </button>
          <div class="text-[10px] text-emerald-300/70 text-right italic pt-1">Student record updated with exit timestamp</div>
        `;
      }
    } else if (resultBox) {
      if (data.action === 'denied' || data.isHosteller === false) {
        // Day Scholar Restricted
        resultBox.className = 'p-4 rounded-xl font-bold text-xs mb-4 bg-rose-950 text-white shadow-xl border-2 border-rose-500 text-left';
        resultBox.innerHTML = `
          <div class="text-rose-300 uppercase tracking-wide text-xs mb-1 font-black flex items-center gap-1.5">
            <svg class="w-4 h-4 text-rose-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            <span>Access Denied • Hosteller Scan Only</span>
          </div>
          <p class="text-[11px] font-medium text-rose-100 mt-1">${data.message || 'Exit & Return scanner is restricted to Hosteller students only.'}</p>
          <div class="text-[10px] text-rose-300/80 mt-2 italic">Day Scholars are not permitted through the hostel gate movement scanner.</div>
        `;
      } else {
        resultBox.className = 'p-4 rounded-xl font-bold text-xs mb-4 bg-rose-900/95 text-white shadow-xl border border-rose-500/40 text-left';
        resultBox.innerHTML = `<div class="text-rose-200 uppercase tracking-wide text-xs mb-1 font-extrabold">Verification Failed</div><span class="text-[11px] font-normal text-rose-100">${
          data.message || 'Pass Not Approved or Expired'
        }</span>`;
      }
    }
  } catch (err) {
    const queue = getOfflineQueue();
    queue.push({ rollNo: cleanRoll, scanType: currentScanType, time: new Date().toISOString() });
    saveOfflineQueue(queue);

    if (resultBox) {
      resultBox.className = 'p-4 rounded-xl font-bold text-xs mb-4 bg-amber-900/95 text-white shadow-xl border border-amber-500/40 text-left';
      resultBox.innerHTML = `
        <div class="text-amber-200 uppercase tracking-wide text-xs mb-1 font-black flex items-center gap-1.5">
          <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <span>Offline Queue Active</span>
        </div>
        <p class="text-[11px] font-medium text-amber-100 mt-1">Network offline. Roll <span class="font-mono font-bold">${cleanRoll}</span> queued locally (${queue.length} pending). Will sync automatically when connection restores.</p>
      `;
    }
  }

  const manualInput = document.getElementById('manualRoll');
  if (manualInput) manualInput.value = '';

  // Display result for 6 seconds, then reset
  setTimeout(() => {
    if (resultBox) {
      resultBox.classList.add('hidden');
      resultBox.innerHTML = '';
    }
    isProcessing = false;
    if (manualInput) manualInput.focus();
  }, 6000);
}

function handleManualSubmit(e) {
  e.preventDefault();
  const val = document.getElementById('manualRoll')?.value;
  verifyPass(val);
}

// Hardware-Accelerated Fast Engine
async function startInstantScanner() {
  const vid = document.getElementById('video');
  if (!vid) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    vid.srcObject = stream;

    // Check for Native Browser Barcode Detector
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new BarcodeDetector({
        formats: ['code_128', 'code_39', 'ean_13', 'qr_code', 'upc_a']
      });

      async function detectFrame() {
        if (!isProcessing && vid.readyState === vid.HAVE_ENOUGH_DATA) {
          try {
            const barcodes = await barcodeDetector.detect(vid);
            if (barcodes.length > 0) {
              verifyPass(barcodes[0].rawValue);
            }
          } catch (e) {}
        }
        requestAnimationFrame(detectFrame);
      }
      detectFrame();
    } else if (typeof ZXing !== 'undefined') {
      // Fallback to ZXing Reader
      const codeReader = new ZXing.BrowserMultiFormatReader();
      codeReader.decodeFromVideoDevice(null, 'video', result => {
        if (result && !isProcessing) {
          verifyPass(result.text);
        }
      });
    }
  } catch (err) {
    console.error('Camera Error:', err);
    const statusEl = document.getElementById('scanStatus');
    if (statusEl) statusEl.innerText = 'Manual Only';
  }
}

function sendParentWhatsApp(name, rollNo, dept, parentMobile, exitTime) {
  const cleanPhone = (parentMobile || '').replace(/[^0-9]/g, '');

  if (!cleanPhone || cleanPhone.length < 10) {
    if (typeof showToast === 'function') {
      showToast('No valid parent mobile number found for this student.', 'error');
    } else {
      alert('No valid parent mobile number found for this student.');
    }
    return;
  }

  const message = encodeURIComponent(
    `*CAMPUS GATE EXIT NOTIFICATION*\n\nDear Parent / Guardian,\nYour ward *${name}* (Roll No: *${rollNo}*, ${dept}) has officially cleared and exited the college main gate.\n\n*Exit Timestamp:* ${exitTime} (IST)\n*Gate Status:* Verified & Exited\n\n_College Security & Administration Office_`
  );

  const targetNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  window.open(`https://wa.me/${targetNumber}?text=${message}`, '_blank');
}

// Offline Queue & Resilience
function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem('offlineScanQueue') || '[]');
  } catch (e) {
    return [];
  }
}

function saveOfflineQueue(queue) {
  try {
    localStorage.setItem('offlineScanQueue', JSON.stringify(queue));
  } catch (e) {}
  updateOfflineUI();
}

function updateOfflineUI() {
  const badge = document.getElementById('offlineBadge');
  const queue = getOfflineQueue();
  if (!badge) return;
  if (!navigator.onLine || queue.length > 0) {
    badge.classList.remove('hidden');
    badge.innerText = !navigator.onLine ? `Offline (${queue.length})` : `Syncing (${queue.length})`;
  } else {
    badge.classList.add('hidden');
  }
}

async function syncOfflineQueue() {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    updateOfflineUI();
    return;
  }

  const remaining = [];
  let syncedCount = 0;
  const endpoint = `${getBackendApiBase()}/api/scan-pass`;

  for (const item of queue) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNo: item.rollNo, scanType: item.scanType })
      });
      if (res.ok) {
        syncedCount++;
      } else {
        remaining.push(item);
      }
    } catch (e) {
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
  if (syncedCount > 0) {
    const resultBox = document.getElementById('scanResult');
    if (resultBox) {
      resultBox.classList.remove('hidden');
      resultBox.className = 'p-3 rounded-xl font-bold text-xs mb-4 bg-emerald-900/90 text-white shadow-lg border border-emerald-500/40 text-left';
      resultBox.innerHTML = `<div>Auto-Synced ${syncedCount} offline scan(s) to server successfully!</div>`;
      setTimeout(() => {
        resultBox.classList.add('hidden');
      }, 4000);
    }
  }
}

window.addEventListener('online', () => {
  updateOfflineUI();
  syncOfflineQueue();
});
window.addEventListener('offline', updateOfflineUI);

function initScannerPage() {
  updateBackendDisplay();
  startInstantScanner();
  updateOfflineUI();
  if (navigator.onLine && getOfflineQueue().length > 0) {
    syncOfflineQueue();
  }
}

window.onload = initScannerPage;
window.verifyPass = verifyPass;
window.handleManualSubmit = handleManualSubmit;
window.sendParentWhatsApp = sendParentWhatsApp;
window.openServerConfigModal = openServerConfigModal;
window.closeServerConfigModal = closeServerConfigModal;
window.saveServerConfig = saveServerConfig;
window.resetServerConfig = resetServerConfig;
