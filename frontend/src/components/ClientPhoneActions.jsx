import React from 'react';
import { telHref, whatsappHref, canUsePhone } from '../utils/phone';

export default function ClientPhoneActions({ phone, clientName, compact = false, className = '' }) {
  if (!canUsePhone(phone)) return null;

  const tel = telHref(phone);
  const wa = whatsappHref(phone, clientName ? `Hi ${clientName}, ` : '');

  const base = compact
    ? 'inline-flex items-center justify-center min-h-[36px] min-w-[36px] rounded-lg text-sm font-medium transition-colors'
    : 'inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a href={tel} className={`${base} bg-green-50 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300`} title="Call">
        {compact ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
        ) : (
          <>📞 Call</>
        )}
      </a>
      <a href={wa} target="_blank" rel="noopener noreferrer" className={`${base} bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300`} title="WhatsApp">
        {compact ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.582-1.454A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.378l-.359-.214-2.72.863.863-2.652-.233-.375A9.818 9.818 0 1112 21.818z"/></svg>
        ) : (
          <>WhatsApp</>
        )}
      </a>
    </div>
  );
}
