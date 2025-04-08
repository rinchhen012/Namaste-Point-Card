import React from 'react';
import { format } from 'date-fns';

interface PrintableCodesProps {
  codes: Array<{
    code: string;
    expiresAt: Date;
  }>;
  title?: string;
}

const PrintableCodes: React.FC<PrintableCodesProps> = ({ codes, title = "Delivery Codes" }) => {
  const printCodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .codes-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            }
            .code-card {
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: 10px;
              margin-bottom: 10px;
              page-break-inside: avoid;
            }
            .code {
              font-family: monospace;
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0;
            }
            .expiry {
              font-size: 12px;
              color: #666;
              margin-top: 5px;
            }
            .instructions {
              font-size: 10px;
              margin-top: 10px;
              color: #777;
            }
            .logo {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            @media print {
              body {
                padding: 0;
              }
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Print Codes</button>
          <h1>${title}</h1>
          <div class="codes-container">
            ${codes.map(code => `
              <div class="code-card">
                <div class="logo">Namaste Restaurant</div>
                <div class="code">${code.code}</div>
                <div class="expiry">Expires: ${format(code.expiresAt, 'MMM dd, yyyy')}</div>
                <div class="instructions">
                  1. Use the Namaste Point Card app to scan this code<br>
                  2. Enter the code manually in the app<br>
                  3. Each code can only be used once<br>
                  4. Codes expire 2 months after creation
                </div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Automatically print when loaded
    printWindow.onload = function() {
      printWindow.setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  };
  
  return (
    <div>
      <button
        onClick={printCodes}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Print {codes.length} Codes
      </button>
    </div>
  );
};

export default PrintableCodes; 