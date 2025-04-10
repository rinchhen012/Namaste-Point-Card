import React from 'react';
import { format } from 'date-fns';
import { QRCodeCanvas } from 'qrcode.react';
import { formatDate } from '../../utils/dateUtils'; // Use our centralized date formatter

interface PrintableCodesProps {
  codes: Array<{
    code: string;
    expiresAt: Date;
  }>;
  title?: string;
  buttonText?: string;
}

const PrintableCodes: React.FC<PrintableCodesProps> = ({ codes, title = "Delivery Codes", buttonText }) => {
  const printCodes = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600'); // Give the window some dimensions
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title} - Printable</title>
          <script src="https://cdn.tailwindcss.com"></script> <!-- Include Tailwind via CDN for simplicity -->
          <style>
            @media print {
              /* A4 paper size roughly 210mm x 297mm */
              /* Tailwind CSS uses px, so approximate: 1mm ~ 3.78px */
              /* Width: 210mm ~ 794px */
              /* Height: 297mm ~ 1123px */
              @page {
                size: A4;
                margin: 10mm; /* Reduce margin */
              }

              body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact; /* Important for backgrounds/colors */
                print-color-adjust: exact;
              }

              .no-print {
                display: none !important;
              }
              .page-break {
                 page-break-before: always;
              }
              /* Ensure grid items don't break across pages */
              .print-slip {
                page-break-inside: avoid;
              }
            }
            /* Styles for the grid and slips */
            .print-grid {
                display: grid;
                grid-template-columns: repeat(5, 1fr); /* Increase to 5 columns */
                gap: 3mm; /* Keep reduced gap */
            }
            .print-slip {
                border: 1px dashed #999;
                padding: 2mm; /* Reduce padding further */
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .print-slip .code {
                font-family: monospace;
                font-size: 12pt; /* Reduce font size */
                font-weight: bold;
                margin-top: 2mm; /* Reduce margin */
            }
            .print-slip .expiry {
                font-size: 8pt; /* Reduce font size */
                color: #555;
                margin-top: 1mm; /* Reduce margin */
            }
            .print-slip .qr-code-container {
                margin-bottom: 1mm; /* Reduce margin slightly */
            }
            .print-slip .brand {
                font-size: 9pt; /* Reduce font size */
                font-weight: bold;
            }
          </style>
        </head>
        <body class="p-4">
          <div class="no-print mb-4 flex justify-between items-center">
            <h1 class="text-xl font-bold">${title} - Print Preview</h1>
            <button onclick="window.print()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Print Now</button>
          </div>
          <div class="print-grid">
            ${codes.map(coupon => `
              <div class="print-slip">
                <div class="brand">ポイント利用</div>
                <div class="qr-code-container">
                  <!-- QR Code will be rendered here by script -->
                  <canvas id="qr-${coupon.code}" class="mx-auto"></canvas>
                </div>
                <div class="code">${coupon.code}</div>
                <div class="expiry">有効期限: ${formatDate(coupon.expiresAt)}</div>
              </div>
            `).join('')}
          </div>

          <script>
            // Render QR codes after the HTML is loaded
            document.addEventListener('DOMContentLoaded', function() {
              const codesData = ${JSON.stringify(codes)};
              codesData.forEach(coupon => {
                const canvas = document.getElementById('qr-' + coupon.code);
                if (canvas) {
                   QRCode.toCanvas(canvas, coupon.code, { width: 60, margin: 1 }, function (error) {
                    if (error) console.error(error)
                    console.log('QR code for ' + coupon.code + ' success!');
                  })
                }
              });
            });
          </script>
          <!-- Need to load the QR code library script in the new window -->
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1/build/qrcode.min.js"></script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Give time for QR codes to render before printing
    // printWindow.onload = function() { // onload might fire too early before scripts run
      printWindow.setTimeout(() => {
        printWindow.focus();
        // Optional: trigger print automatically, or let user click the button
        // printWindow.print();
      }, 1000); // Wait 1 second for QR rendering
    // };

  };

  // Render the button in the main AdminCoupons page
  return (
    <div>
      <button
        onClick={printCodes}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        {buttonText || `Print Selected (${codes.length})`}
      </button>
    </div>
  );
};

export default PrintableCodes;
