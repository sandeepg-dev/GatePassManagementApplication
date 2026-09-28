/**
 * Campus PassPro • Component Assembly Engine
 * Assembles modular HTML partials from /components into index.html
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const componentsDir = path.join(rootDir, 'components');

function readComponent(relPath) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Component file not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function resolveIncludes(content) {
  return content.replace(/<!--\s*@@include\('([^']+)'\)\s*-->/g, (match, includePath) => {
    const included = readComponent(includePath);
    return resolveIncludes(included);
  });
}

function assembleIndexHtml() {
  const headOpen = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Campus PassPro • GRT Institute of Engineering and Technology</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">

  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script src="https://unpkg.com/@zxing/library@latest"></script>

  <!-- External Design System Stylesheet -->
  <link rel="stylesheet" href="/css/styles.css?v=3.4.1">
  <style>
    body { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>

<body class="bg-slate-900 text-slate-800 min-h-screen flex flex-col justify-between p-3 sm:p-6 relative selection:bg-blue-600 selection:text-white">

  <!-- CAMPUS BACKGROUND WITH SOFT PROFESSIONAL OVERLAY -->
  <div id="loginCampusBg" class="fixed inset-0 pointer-events-none -z-10 bg-cover bg-center bg-no-repeat transition-opacity duration-500" style="background-image: linear-gradient(rgba(15, 23, 42, 0.40), rgba(15, 23, 42, 0.60)), url('/public/splash-bg.jpg');"></div>
`;

  const toastContainer = readComponent('components/common/toastContainer.html');
  const notificationDrawer = readComponent('components/common/notificationDrawer.html');
  const pageLoader = readComponent('components/common/pageLoader.html');
  const loginPortal = readComponent('components/auth/loginPortal.html');

  const studentPortalRaw = readComponent('components/student/studentPortal.html');
  const studentPortal = resolveIncludes(studentPortalRaw);

  const authorityDashboard = readComponent('components/authority/authorityDashboard.html');

  const modals = [
    readComponent('components/modals/gatePassModal.html'),
    readComponent('components/modals/leaveModal.html'),
    readComponent('components/modals/leaveLetterModal.html'),
    readComponent('components/modals/odModal.html'),
    readComponent('components/modals/studentProfileModal.html'),
    readComponent('components/modals/requestDetailModal.html'),
    readComponent('components/modals/gatePassCardModal.html'),
    readComponent('components/modals/letterPreviewModal.html'),
    readComponent('components/modals/rejectModal.html')
  ].join('\n\n');

  const scriptsClose = `
  <script>
    function setRejectReason(reason) {
      const input = document.getElementById('rejectReasonInput');
      if (input) input.value = reason;
    }
  </script>

  <!-- Application Modular Components -->
  <script src="/js/utils.js?v=3.4.0"></script>
  <script src="/js/services/notificationService.js?v=3.4.0"></script>
  <script src="/js/api.js?v=3.4.0"></script>
  <script src="/js/services/pdfService.js?v=3.4.0"></script>
  <script src="/js/services/attendanceExcelService.js?v=3.4.0"></script>
  <script src="/js/modules/student/studentNavigation.js?v=3.4.0"></script>
  <script src="/js/modules/student/studentForms.js?v=3.4.0"></script>
  <script src="/js/modules/student/studentRequests.js?v=3.4.0"></script>
  <script src="/js/modules/student/studentModals.js?v=3.4.0"></script>
  <script src="/js/modules/studentPortal.js?v=3.4.0"></script>
  <script src="/js/modules/onDutyPortal.js?v=3.4.0"></script>
  <script src="/js/modules/counselorQueue.js?v=3.4.0"></script>
  <script src="/js/modules/advisorQueue.js?v=3.4.0"></script>
  <script src="/js/modules/hodQueue.js?v=3.4.0"></script>
  <script src="/js/modules/principalQueue.js?v=3.4.0"></script>
  <script src="/js/modules/wardenQueue.js?v=3.4.0"></script>
  <script src="/js/modules/auditLogs.js?v=3.4.0"></script>
  <script src="/js/modules/authorityPortal.js?v=3.4.0"></script>
  <script src="/js/dashboard.js?v=3.4.0"></script>
  <script src="/js/auth.js?v=3.4.0"></script>
  <script src="/js/main.js?v=3.4.0"></script>
</body>

</html>
`;

  const assembledHtml = [
    headOpen.trim(),
    '\n\n  ' + toastContainer.trim(),
    '\n\n  ' + notificationDrawer.trim(),
    '\n\n  ' + pageLoader.trim(),
    '\n\n  ' + loginPortal.trim(),
    '\n\n  <!-- SCREEN 2: WORKING DASHBOARD SCREEN (Multi-Role Dedicated Views) -->\n  <div id="dashScreen" class="hidden w-full mx-auto z-10">\n',
    studentPortal.trim(),
    '\n\n',
    authorityDashboard.trim(),
    '\n  </div>',
    '\n\n  <!-- =========================================================================\n       POPUP REQUEST SYSTEM (Animated Modals)\n       ========================================================================= -->\n',
    modals.trim(),
    scriptsClose
  ].join('\n');

  const targetPath = path.join(rootDir, 'index.html');
  fs.writeFileSync(targetPath, assembledHtml, 'utf8');
  console.log(`[AssembleHtml] Successfully assembled index.html from components (${assembledHtml.split('\n').length} lines).`);
  return true;
}

if (require.main === module) {
  assembleIndexHtml();
}

module.exports = assembleIndexHtml;
