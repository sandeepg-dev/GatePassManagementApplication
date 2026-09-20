/**
 * Gate Physical Security Scanner & WhatsApp Parent Alerts
 */

let isProcessing = false;
const video = document.getElementById('video');
const beep = document.getElementById('beepSound');

async function verifyPass(rollNumber) {
  if (isProcessing || !rollNumber) return;
  isProcessing = true; // Lock scanner to prevent duplicate calls

  try {
    beep.currentTime = 0;
    beep.play();
  } catch (e) {}

  const cleanRoll = String(rollNumber).trim();
  const resultBox = document.getElementById('scanResult');

  if (resultBox) {
    resultBox.classList.remove('hidden');
    resultBox.className = 'p-4 rounded-xl font-bold text-xs mb-4 bg-amber-600/90 text-white shadow-lg border border-amber-500/40';
    resultBox.innerHTML = `Verifying Roll No: <span class="font-mono">${cleanRoll}</span>...`;
  }

  try {
    const res = await fetch('/api/scan-pass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNo: cleanRoll })
    });

    const data = await res.json();

    if (data.success && resultBox) {
      const pass = data.pass;
      if (data.action === 'return' || pass.status === 'Returned') {
        resultBox.className = 'p-4 rounded-xl text-xs mb-4 bg-sky-900/95 text-white shadow-xl space-y-2 border border-sky-400/40 text-left';
        resultBox.innerHTML = `
          <div class="text-xs font-bold border-b border-sky-400/30 pb-2 mb-2 flex items-center justify-between">
            <span class="tracking-wide text-sky-200 uppercase font-semibold">Returned to Campus</span>
            <span class="text-[10px] bg-sky-500/20 px-2.5 py-0.5 rounded-full font-mono text-sky-200 border border-sky-400/30">ENTRY LOGGED</span>
          </div>
          <div><b>Roll No:</b> <span class="font-mono text-sky-200">${pass.rollNo}</span></div>
          <div><b>Name:</b> ${pass.name || 'Student'} | <b>Dept:</b> ${pass.dept || 'Engineering'}</div>
          <div><b>Accommodation:</b> <span class="font-semibold">${(/hoste?l|^h$/i.test(pass.accommodation || '') && !/day/i.test(pass.accommodation || '')) ? 'Hosteller' : 'Day Scholar'}</span></div>
          <div class="p-2.5 bg-sky-950/70 rounded-lg border border-sky-400/20 my-1.5">
            <div class="text-[10px] uppercase font-bold text-sky-300">Recorded Return Date & Time (IST)</div>
            <div class="text-sm font-mono font-bold text-amber-300">${pass.returnTime}</div>
          </div>
          <div class="text-[11px] text-sky-200"><b>Departure Was:</b> ${pass.exitTime || '-'}</div>
          <div class="text-[10px] text-sky-300/80 italic pt-1 text-right">Warden records updated with return timestamp</div>
        `;
      } else {
        resultBox.className = 'p-4 rounded-xl text-xs mb-4 bg-emerald-900/95 text-white shadow-xl space-y-2 border border-emerald-500/40 text-left';
        resultBox.innerHTML = `
          <div class="text-xs font-bold border-b border-emerald-500/30 pb-2 mb-2 flex items-center justify-between">
            <span class="tracking-wide text-emerald-200 uppercase font-semibold">Campus Exit Authorized</span>
            <span class="text-[10px] bg-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono text-emerald-200 border border-emerald-400/30">VERIFIED</span>
          </div>
          <div><b>Roll No:</b> <span class="font-mono text-emerald-200">${pass.rollNo}</span></div>
          <div><b>Name:</b> ${pass.name || 'Student'} | <b>Dept:</b> ${pass.dept || 'Engineering'}</div>
          <div><b>Accommodation:</b> <span class="font-semibold">${(/hoste?l|^h$/i.test(pass.accommodation || '') && !/day/i.test(pass.accommodation || '')) ? 'Hosteller' : 'Day Scholar'}</span></div>
          <div class="text-xs"><b>Father:</b> ${pass.fatherName || pass.parentName || '-'} | <b>Parent Phone:</b> <span class="font-mono text-emerald-200">${pass.parentContact || '-'}</span></div>
          ${(/hoste?l|^h$/i.test(pass.accommodation || '') && !/day/i.test(pass.accommodation || '')) ? `
            <div class="p-2 bg-amber-950/70 rounded-lg border border-amber-500/20 text-[11px] space-y-0.5 text-amber-200">
              <div><b>Departure:</b> ${pass.departureDate || '-'} ${pass.departureTime ? 'at ' + pass.departureTime : ''}</div>
              <div><b>Expected Return:</b> ${pass.expectedReturnDate ? pass.expectedReturnDate + (pass.expectedReturnTime ? ' at ' + pass.expectedReturnTime : '') : (pass.expectedReturnDateTime || '-')}</div>
            </div>
          ` : `
            <div class="p-2 bg-indigo-950/70 rounded-lg border border-indigo-500/20 text-[11px] space-y-0.5 text-indigo-200">
              <div><b>Date:</b> ${pass.leaveDate || pass.departureDate || (pass.appliedTime ? String(pass.appliedTime).split(' ')[0] : '-')}</div>
              <div><b>Time:</b> ${pass.leaveTime || pass.departureTime || '-'}</div>
            </div>
          `}
          <div class="text-xs"><b>Validity Window:</b> <span class="font-semibold text-emerald-200">Valid until ${pass.validUntil || '-'}</span></div>
          <div><b>Destination:</b> ${pass.address || '-'}</div>
          <div class="text-[11px] text-emerald-200 pt-0.5 font-mono"><b>Exit Recorded:</b> ${pass.exitTime}</div>
          <button onclick="sendParentWhatsApp('${pass.name}', '${pass.rollNo}', '${pass.dept || 'Engineering'}', '${
          pass.parentContact || pass.mobile || ''
        }', '${pass.exitTime}')" class="w-full mt-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition flex items-center justify-center gap-1.5">
            Send WhatsApp Notice to Parent
          </button>
          <div class="text-[10px] text-emerald-300/70 text-right italic pt-1">Holding display...</div>
        `;
      }
    } else if (resultBox) {
      resultBox.className = 'p-4 rounded-xl font-bold text-xs mb-4 bg-rose-900/95 text-white shadow-xl border border-rose-500/40 text-left';
      resultBox.innerHTML = `<div class="text-rose-200 uppercase tracking-wide text-xs mb-1 font-extrabold">Access Denied</div><span class="text-[11px] font-normal text-rose-100">${
        data.message || 'Pass Not Approved or Expired'
      }</span>`;
    }
  } catch (err) {
    if (resultBox) {
      resultBox.className = 'p-4 rounded-xl font-bold text-xs mb-4 bg-rose-900/95 text-white shadow-xl border border-rose-500/40 text-left';
      resultBox.innerHTML = `<div class="text-rose-200 uppercase tracking-wide text-xs mb-1 font-extrabold">Connection Error</div><span class="text-[11px] font-normal text-rose-100">Unable to reach pass verification service.</span>`;
    }
  }

  const manualInput = document.getElementById('manualRoll');
  if (manualInput) manualInput.value = '';

  // Display card for 6 seconds, then reset scanner
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
    if (statusEl) statusEl.innerText = 'Manual Mode Ready';
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

window.onload = startInstantScanner;
window.verifyPass = verifyPass;
window.handleManualSubmit = handleManualSubmit;
window.sendParentWhatsApp = sendParentWhatsApp;
