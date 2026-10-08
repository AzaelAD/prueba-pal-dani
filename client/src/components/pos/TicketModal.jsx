import React, { useRef } from 'react';
import { Modal } from '../common/Modal';
import { Printer, Download, MessageSquareShare, CheckCircle2, Copy } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../common/Toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const TicketModal = ({ isOpen, onClose, sale }) => {
  const { settings, formatMoney } = useSettings();
  const { success } = useToast();
  const ticketRef = useRef(null);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!ticketRef.current) return;
    try {
      const element = ticketRef.current;
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200]
      });
      const imgWidth = 74;
      const pageHeight = 200;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 3, 5, imgWidth, imgHeight);
      pdf.save(`Ticket-${sale.folio}.pdf`);
      success('Ticket PDF descargado exitosamente');
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  const handleWhatsApp = () => {
    const phone = sale.customer?.phone ? sale.customer.phone.replace(/\D/g, '') : '';
    const text = encodeURIComponent(
      `*${settings.business_name}*\n` +
      `¡Hola ${sale.customer?.name || 'Estimado Cliente'}!\n\n` +
      `Le compartimos su comprobante de compra:\n` +
      `*Folio Fiscal:* ${sale.folio}\n` +
      `*Fecha:* ${new Date(sale.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}\n` +
      `*Hora:* ${new Date(sale.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}\n` +
      `*Atendió:* ${sale.user?.name || 'Cajero en Turno'}\n` +
      `*Total Pagado:* ${formatMoney(sale.total)}\n` +
      `*Método:* ${sale.paymentMethod}\n\n` +
      `${settings.ticket_footer}\n` +
      `¡Agradecemos su preferencia!`
    );

    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;

    window.open(url, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ticket de Venta Generado"
      subtitle={`Folio ${sale.folio}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Printable Ticket Area */}
        <div
          ref={ticketRef}
          id="printable-ticket"
          className="bg-white text-slate-900 p-5 rounded-2xl shadow-inner font-mono text-xs border border-slate-200 select-text"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h2 className="font-bold text-sm text-slate-950 uppercase">{settings.business_name}</h2>
            <p className="text-[11px] text-slate-600 mt-0.5">{settings.business_address}</p>
            <p className="text-[11px] text-slate-600">RFC: {settings.business_rfc}</p>
            <p className="text-[11px] text-slate-600">Tel: {settings.business_phone}</p>
          </div>

          {/* Folio & Precise Date / Time Control */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">FOLIO FISCAL:</span>
              <span className="font-bold text-slate-950">{sale.folio}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">FECHA DE VENTA:</span>
              <span className="font-bold">
                {new Date(sale.createdAt || Date.now()).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">HORA DE VENTA:</span>
              <span className="font-bold">
                {new Date(sale.createdAt || Date.now()).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
              <span>CONTROL IMPRESIÓN:</span>
              <span>{new Date().toLocaleDateString('es-MX')} {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ATENDIÓ:</span>
              <span className="font-medium">{sale.user?.name || 'Cajero en Turno'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">CLIENTE:</span>
              <span className="font-semibold text-slate-900">{sale.customer?.name || 'Público General / Mostrador'}</span>
            </div>
          </div>

          {/* Items */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 text-left">
                  <th className="pb-1">CANT</th>
                  <th className="pb-1">DESCRIPCIÓN</th>
                  <th className="pb-1 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items?.map((it, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="align-top font-bold">{it.quantity}</td>
                    <td className="align-top pr-1 text-slate-800">
                      {it.product?.name || 'Material de Curación'}
                      {it.discount > 0 && (
                        <span className="block text-[10px] text-rose-500">
                          Desc: -{formatMoney(it.discount)}
                        </span>
                      )}
                    </td>
                    <td className="align-top text-right font-bold">
                      {formatMoney(it.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="pt-2.5 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>SUBTOTAL:</span>
              <span>{formatMoney(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>DESCUENTO:</span>
                <span>-{formatMoney(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>IVA (16%):</span>
              <span>{formatMoney(sale.tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-950 pt-1 border-t border-slate-300">
              <span>TOTAL A PAGAR:</span>
              <span>{formatMoney(sale.total)}</span>
            </div>
            <div className="flex justify-between text-slate-700 pt-1">
              <span>MÉTODO DE PAGO:</span>
              <span className="font-semibold">{sale.paymentMethod}</span>
            </div>
            {sale.paymentMethod === 'Efectivo' && (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>PAGÓ CON:</span>
                  <span>{formatMoney(sale.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-slate-800 font-bold">
                  <span>CAMBIO:</span>
                  <span>{formatMoney(sale.change)}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer Note */}
          <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-500">
            <p>{settings.ticket_footer}</p>
            <p className="mt-1 font-sans text-[9px] text-slate-400">Sistema CuraMed POS • www.curamed.com</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Descargar PDF</span>
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-emerald-600/30"
          >
            <MessageSquareShare className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
