import { X } from 'lucide-react';

export default function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div><span className="modal-eyebrow">Hospital workspace</span><h3 id="modal-title">{title}</h3></div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
