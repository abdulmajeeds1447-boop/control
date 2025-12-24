import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface BarcodeCardProps {
  title: string;
  subtitle?: string;
  code: string;
  type: 'TEACHER' | 'ENVELOPE';
}

const BarcodeCard: React.FC<BarcodeCardProps> = ({ title, subtitle, code, type }) => {
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    // Generate QR Code Data URL
    QRCode.toDataURL(code, {
      width: 150,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
    .then((url) => {
      setQrSrc(url);
    })
    .catch((err) => {
      console.error('Error generating QR code', err);
    });
  }, [code]);

  return (
    <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm flex flex-col items-center justify-center space-y-3 print:border-black print:shadow-none hover:shadow-md transition-shadow">
      <div className="text-center w-full">
        <h3 className="font-bold text-gray-800 text-sm md:text-base truncate">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      </div>
      
      {/* QR Code Visualization */}
      <div className="bg-white p-2 border border-slate-100 rounded-lg">
        {qrSrc ? (
          <img src={qrSrc} alt={`QR Code for ${code}`} className="w-32 h-32 object-contain" />
        ) : (
          <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-xs text-gray-400 animate-pulse">
            جاري التوليد...
          </div>
        )}
        <p className="text-center font-mono text-xs tracking-wider mt-1 text-gray-400 font-bold">{code}</p>
      </div>

      <div className={`px-3 py-1 rounded-full text-xs font-bold ${type === 'TEACHER' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
        {type === 'TEACHER' ? 'بطاقة معلم' : 'مظروف اختبار'}
      </div>
    </div>
  );
};

export default BarcodeCard;