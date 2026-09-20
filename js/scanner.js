/**
 * GRT IET • Security Gate Clearance Terminal
 * Professional Barcode / QR Scanner & Student Movement Engine
 * Handles Hostel Exit/Return and Day Scholar Exit (No Return Required)
 */

let isProcessing = false;
let currentScanType = 'auto'; // 'auto' | 'exit' | 'return'
let codeReader = null;
let currentDeviceId = null;
let videoDevices = [];
let selectedDeviceIndex = 0;

const video = document.getElementById('video');
const beep = document.getElementById('beepSound');

// Digital IST Clock
function startGateClock() {
  function update() {
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
      const now = new Date();
      const istString = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      clockEl.innerText = `${istString} IST`;
    }
  }
  update();
  setInterval(update, 1000);
}

// Mode Selection Handling
function setScanMode(mode) {
  currentScanType = mode;
  const btnAuto = document.getElementById('modeBtnAuto');
  const btnExit = document.getElementById('modeBtnExit');
  const btnReturn = document.getElementById('modeBtnReturn');
  const instr = document.getElementById('modeInstruction');

  const activeClass = 'py-2 px-2 rounded-md bg-emerald-600 text-white font-bold transition flex items-center justify-center gap-1.5';
  const inactiveClass = 'py-2 px-2 rounded-md bg-slate-800 text-slate-300 hover:text-white transition flex items-center justify-center gap-1.5';

  if (btnAuto) btnAuto.className = mode === 'auto' ? activeClass : inactiveClass;
  if (btnExit) btnExit.className = mode === 'exit' ? activeClass : inactiveClass;
  if (btnReturn) btnReturn.className = mode === 'return' ? activeClass.replace('bg-emerald-600', 'bg-blue-600') : inactiveClass;

  if (instr) {
    if (mode === 'auto') {
      instr.innerText = 'Auto: Automatically identifies student category and executes valid clearance movement.';
    } else if (mode === 'exit') {
      instr.innerText = 'Exit Mode: Records campus departure for approved Hostellers & Day Scholars.';
    } else if (mode === 'return') {
      instr.innerText = 'Return Mode: Strictly records safe campus return for exited Hostellers.';
    }
  }
}

// Verification Core
async function verifyPass(rollNumber) {
  if (isProcessing || !rollNumber) return;
  isProcessing = true;

  try {
    if (beep) {
      beep.currentTime = 0;
      beep.play().catch(() => {});
    }
  } catch (e) {}

  const cleanRoll = String(rollNumber).trim().toUpperCase();
  const resultBox = document.getElementById('scanResult');
  const scanStatus = document.getElementById('scanStatus');

  if (scanStatus) {
    scanStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span><span>Verifying...</span>';
  }

  if (resultBox) {
    resultBox.classList.remove('hidden');
    resultBox.className = 'p-3.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-2';
    resultBox.innerHTML = `
      <svg class="w-4 h-4 text-emerald-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
      <span>Querying movement clearance for Roll No: <strong class="font-mono text-white">${cleanRoll}</strong> (${currentScanType.toUpperCase()})...</span>
    `;
  }

  const endpoint = '/api/scan-pass';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNo: cleanRoll, scanType: currentScanType })
    });

    const data = await res.json();

    if (scanStatus) {
      scanStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Ready</span>';
    }

    if (data.success && resultBox) {
      const pass = data.pass;
      const isHosteller = data.accommodation === 'Hosteller';
      const isReturn = data.action === 'return';

      if (isReturn) {
        // HOSTELLER RETURN
        resultBox.className = 'p-4 rounded-xl text-xs bg-slate-950 border border-blue-500/80 text-white shadow-xl space-y-2.5 text-left';
        resultBox.innerHTML = `
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-400"></span>
              <span class="font-bold text-blue-300 uppercase tracking-wide">Campus Return Recorded</span>
            </div>
            <span class="text-[10px] font-mono font-bold bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-700">HOSTELLER RETURN</span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-slate-300">
            <div><span class="text-slate-400">Student:</span> <strong class="text-white">${pass.name || 'Student'}</strong></div>
            <div><span class="text-slate-400">Roll No:</span> <strong class="font-mono text-white">${pass.rollNo}</strong></div>
            <div><span class="text-slate-400">Dept/Year:</span> <span class="text-slate-200">${pass.dept || 'ENGG'} - ${pass.yearSec || '-'}</span></div>
            <div><span class="text-slate-400">Category:</span> <span class="text-blue-300 font-semibold">Hostel Resident</span></div>
          </div>

          <div class="p-2.5 bg-slate-900 rounded-lg border border-blue-500/30">
            <div class="text-[10px] uppercase font-bold text-blue-300 tracking-wider">Recorded Return Date & Time (IST)</div>
            <div class="text-sm font-mono font-bold text-white mt-0.5">${pass.returnTime}</div>
            <div class="text-[10px] text-slate-400 mt-1">Campus Exit Was: <span class="font-mono text-slate-300">${pass.exitTime || '-'}</span></div>
          </div>

          <div class="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-0.5">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span>Hostel re-entry confirmed. Movement lifecycle completed.</span>
          </div>
        `;
      } else {
        // EXIT SCAN (Day Scholar OR Hosteller)
        const badgeColor = isHosteller ? 'border-amber-500/80' : 'border-emerald-500/80';
        const tagText = isHosteller ? 'HOSTELLER EXIT' : 'DAY SCHOLAR EXIT';
        const tagClass = isHosteller ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-emerald-950 text-emerald-300 border-emerald-700';

        resultBox.className = `p-4 rounded-xl text-xs bg-slate-950 border ${badgeColor} text-white shadow-xl space-y-2.5 text-left`;
        resultBox.innerHTML = `
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full ${isHosteller ? 'bg-amber-400' : 'bg-emerald-400'}"></span>
              <span class="font-bold uppercase tracking-wide ${isHosteller ? 'text-amber-300' : 'text-emerald-300'}">Campus Exit Recorded</span>
            </div>
            <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${tagClass}">${tagText}</span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-slate-300">
            <div><span class="text-slate-400">Student:</span> <strong class="text-white">${pass.name || 'Student'}</strong></div>
            <div><span class="text-slate-400">Roll No:</span> <strong class="font-mono text-white">${pass.rollNo}</strong></div>
            <div><span class="text-slate-400">Dept/Year:</span> <span class="text-slate-200">${pass.dept || 'ENGG'} - ${pass.yearSec || '-'}</span></div>
            <div><span class="text-slate-400">Category:</span> <span class="${isHosteller ? 'text-blue-300' : 'text-emerald-300'} font-semibold">${pass.accommodation || data.accommodation}</span></div>
          </div>

          <div class="p-2.5 bg-slate-900 rounded-lg border ${isHosteller ? 'border-amber-500/30' : 'border-emerald-500/30'}">
            <div class="text-[10px] uppercase font-bold tracking-wider ${isHosteller ? 'text-amber-300' : 'text-emerald-300'}">Recorded Exit Date & Time (IST)</div>
            <div class="text-sm font-mono font-bold text-white mt-0.5">${pass.exitTime}</div>
          </div>

          <div class="text-[11px] ${isHosteller ? 'text-amber-300' : 'text-emerald-300'} flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>${isHosteller ? 'Hosteller campus departure logged. Return scan required upon arrival.' : 'Day Scholar exit logged. No return scan required.'}</span>
          </div>

          <!-- PARENT WHATSAPP NOTIFICATION ACTION -->
          <button type="button" onclick="sendParentWhatsApp('${pass.name || 'Student'}', '${pass.rollNo}', '${pass.dept || 'ENGG'}', '${pass.parentContact || pass.mobile || ''}', '${pass.exitTime}')" class="w-full mt-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 font-semibold rounded-lg border border-slate-700 transition flex items-center justify-center gap-2">
            <svg class="w-4 h-4 text-emerald-400 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.203c.043.072.043.419-.101.824z"/></svg>
            <span>Notify Parent via WhatsApp</span>
          </button>
        `;
      }
    } else if (resultBox) {
      // REJECTION OR ERROR
      resultBox.className = 'p-4 rounded-xl text-xs bg-slate-950 border border-rose-500/80 text-white shadow-xl space-y-2 text-left';
      resultBox.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            <span class="font-bold text-rose-300 uppercase tracking-wide">Clearance Denied</span>
          </div>
          <span class="text-[10px] font-mono font-bold bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-700">VERIFICATION FAILED</span>
        </div>
        <div class="text-sm font-bold text-white">${data.message || 'No valid approved gate pass found for this student.'}</div>
        <div class="text-[11px] text-slate-400">Please contact the counselor, department HOD, or hostel warden for clearance.</div>
      `;
    }
  } catch (err) {
    // OFFLINE FALLBACK
    const queue = getOfflineQueue();
    queue.push({ rollNo: cleanRoll, scanType: currentScanType, time: new Date().toISOString() });
    saveOfflineQueue(queue);

    if (scanStatus) {
      scanStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span><span>Offline</span>';
    }

    if (resultBox) {
      resultBox.className = 'p-4 rounded-xl text-xs bg-slate-950 border border-amber-500/80 text-white shadow-xl space-y-1.5 text-left';
      resultBox.innerHTML = `
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span class="font-bold text-amber-300 uppercase tracking-wide">Offline Movement Queued</span>
          </div>
          <span class="text-[10px] font-mono font-bold bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-700">LOCAL QUEUE</span>
        </div>
        <div class="text-xs text-slate-200">Roll No <strong class="font-mono text-white">${cleanRoll}</strong> queued locally (${queue.length} pending).</div>
        <div class="text-[10px] text-slate-400">Will automatically sync to central database when connection restores.</div>
      `;
    }
  }

  // Release lock after 3 seconds for next scan
  setTimeout(() => {
    isProcessing = false;
    const input = document.getElementById('manualRoll');
    if (input) {
      input.value = '';
      input.focus();
    }
  }, 3200);
}

// WhatsApp Parent Alert Helper
function sendParentWhatsApp(studentName, rollNo, dept, parentPhone, movementTime) {
  let cleanPhone = String(parentPhone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  if (!cleanPhone || cleanPhone.length < 10) {
    alert(`Invalid parent contact number for ${studentName} (${rollNo}).`);
    return;
  }

  const message = `GRT IET GATE CLEARANCE NOTICE%0A%0AStudent: ${studentName}%0ARoll No: ${rollNo}%0ADepartment: ${dept}%0AMovement: Campus Departure%0ATime: ${movementTime} IST%0AStatus: Verified through Security Gate Terminal%0A%0AGRT Institute of Engineering and Technology, Tiruttani.`;
  window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
}

// Manual Input Handler
function handleManualSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('manualRoll');
  const val = (input?.value || '').trim();
  if (!val) return;
  verifyPass(val);
}

// Offline Queue Helpers
function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem('offlineScanQueue') || '[]');
  } catch (e) {
    return [];
  }
}

function saveOfflineQueue(queue) {
  localStorage.setItem('offlineScanQueue', JSON.stringify(queue));
  updateOfflineBadge();
}

function updateOfflineBadge() {
  const badge = document.getElementById('offlineBadge');
  const queue = getOfflineQueue();
  if (badge) {
    if (queue.length > 0) {
      badge.innerText = `Offline Queue (${queue.length})`;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

async function syncOfflineScans() {
  const queue = getOfflineQueue();
  if (!queue || queue.length === 0) return;

  const endpoint = '/api/scan-pass';
  const remaining = [];

  for (const item of queue) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollNo: item.rollNo, scanType: item.scanType || 'auto' })
      });
      if (!res.ok) {
        remaining.push(item);
      }
    } catch (e) {
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
}

// Camera Scanner Setup (ZXing)
async function initCameraScanner() {
  if (typeof ZXing === 'undefined') {
    setTimeout(initCameraScanner, 300);
    return;
  }

  try {
    codeReader = new ZXing.BrowserMultiFormatReader();
    const devices = await codeReader.listVideoInputDevices();
    videoDevices = devices;

    if (devices.length > 0) {
      // Prioritize environment/back camera for tablets and phones
      const backCamIndex = devices.findIndex(d => /back|rear|environment/i.test(d.label));
      selectedDeviceIndex = backCamIndex >= 0 ? backCamIndex : 0;
      startScannerWithDevice(devices[selectedDeviceIndex].deviceId);
    } else {
      console.warn('No video input camera devices detected.');
    }
  } catch (err) {
    console.error('Camera initialization error:', err);
  }
}

function startScannerWithDevice(deviceId) {
  currentDeviceId = deviceId;
  codeReader.decodeFromVideoDevice(deviceId, 'video', (result, err) => {
    if (result && !isProcessing) {
      const rawText = result.getText();
      let rollMatch = rawText.match(/\b\d{12}\b/);
      const roll = rollMatch ? rollMatch[0] : rawText.trim();
      verifyPass(roll);
    }
  });
}

function switchCamera() {
  if (!videoDevices || videoDevices.length < 2 || !codeReader) return;
  codeReader.reset();
  selectedDeviceIndex = (selectedDeviceIndex + 1) % videoDevices.length;
  startScannerWithDevice(videoDevices[selectedDeviceIndex].deviceId);
}

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  startGateClock();
  updateOfflineBadge();
  initCameraScanner();

  window.addEventListener('online', () => {
    const scanStatus = document.getElementById('scanStatus');
    if (scanStatus) {
      scanStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Ready</span>';
    }
    syncOfflineScans();
  });
});
