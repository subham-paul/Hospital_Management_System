import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import useList from '../components/useList';
import { useAuth } from '../context/AuthContext';

const EMPTY_ITEM = { description: '', quantity: 1, unit_price: '' };
const EMPTY = { patient_id: '', tax: '', discount: '', items: [{ ...EMPTY_ITEM }] };
const money = (v) => `₹${Number(v).toLocaleString()}`;

export default function Billing() {
  const { user } = useAuth();
  const canEdit = ['admin', 'receptionist'].includes(user.role);
  const [status, setStatus] = useState('');
  const { rows, page, setPage, lastPage, reload } = useList('/bills', { status });
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [payment, setPayment] = useState({ amount: '', payment_method: 'cash' });
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canEdit) return;
    client.get('/patients', { params: { per_page: 100 } }).then(({ data }) => setPatients(data.data ?? []));
  }, [canEdit]);

  const subtotal = form.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const total = Math.max(0, subtotal + (Number(form.tax) || 0) - (Number(form.discount) || 0));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/bills', form);
      setAdding(false);
      setForm({ ...EMPTY, items: [{ ...EMPTY_ITEM }] });
      reload();
    } catch (err) {
      setError(err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join(' ') || 'Save failed.');
    }
  };

  const pay = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post(`/bills/${paying.id}/pay`, payment);
      setPaying(null);
      setPayment({ amount: '', payment_method: 'cash' });
      reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed.');
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setItem = (i, k) => (e) => {
    const items = form.items.map((it, idx) => (idx === i ? { ...it, [k]: e.target.value } : it));
    setForm({ ...form, items });
  };

  return (
    <>
      <div className="page-head">
        <h2>Billing</h2>
        {canEdit && <button className="btn" onClick={() => { setError(''); setAdding(true); }}>+ New Bill</button>}
      </div>
      <div className="toolbar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['unpaid', 'partially_paid', 'paid', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>
      <div className="table-wrapper">
      <table>
        <thead>
          <tr><th>Bill No.</th><th>Patient</th><th>Total</th><th>Paid</th><th>Status</th>{canEdit && <th></th>}</tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td>{b.bill_no}</td>
              <td>{b.patient?.name}</td>
              <td>{money(b.total)}</td>
              <td>{money(b.paid_amount)}</td>
              <td><span className={`badge ${b.status}`}>{b.status.replace('_', ' ')}</span></td>
              {canEdit && (
                <td>{['unpaid', 'partially_paid'].includes(b.status) && (
                  <button className="btn small" onClick={() => {
                    setError('');
                    setPaying(b);
                    setPayment({ amount: (b.total - b.paid_amount).toFixed(2), payment_method: 'cash' });
                  }}>Record Payment</button>
                )}</td>
              )}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="muted">No bills.</td></tr>}
        </tbody>
      </table>
      </div>
      <Pagination page={page} lastPage={lastPage} setPage={setPage} />

      {adding && (
        <Modal title="New Bill" onClose={() => setAdding(false)}>
          <form onSubmit={save}>
            <div className="form-grid">
              <div className="full"><label>Patient *</label>
                <select value={form.patient_id} required onChange={set('patient_id')}>
                  <option value="">Select patient…</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select></div>
              <div className="full">
                <label>Line items *</label>
                <div className="items-editor">
                  {form.items.map((item, i) => (
                    <div className="item-row" key={i}>
                      <input placeholder="Description" value={item.description} required onChange={setItem(i, 'description')} />
                      <input type="number" min="1" placeholder="Qty" value={item.quantity} required onChange={setItem(i, 'quantity')} />
                      <input type="number" min="0" step="0.01" placeholder="Unit price" value={item.unit_price} required onChange={setItem(i, 'unit_price')} />
                      <span style={{ alignSelf: 'center' }}>{money((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</span>
                      <button type="button" className="btn danger small" disabled={form.items.length === 1}
                        onClick={() => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })}>×</button>
                    </div>
                  ))}
                  <button type="button" className="btn secondary small"
                    onClick={() => setForm({ ...form, items: [...form.items, { ...EMPTY_ITEM }] })}>+ Add item</button>
                </div>
              </div>
              <div><label>Tax</label><input type="number" min="0" step="0.01" value={form.tax} onChange={set('tax')} /></div>
              <div><label>Discount</label><input type="number" min="0" step="0.01" value={form.discount} onChange={set('discount')} /></div>
              <div className="full muted">Subtotal: {money(subtotal)} · Total: <strong>{money(total)}</strong></div>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn secondary" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn">Create Bill</button>
            </div>
          </form>
        </Modal>
      )}

      {paying && (
        <Modal title={`Record Payment — ${paying.bill_no}`} onClose={() => setPaying(null)}>
          <p className="muted" style={{ marginBottom: 12 }}>
            Total {money(paying.total)} · Paid {money(paying.paid_amount)} · Due {money(paying.total - paying.paid_amount)}
          </p>
          <form onSubmit={pay}>
            <div className="form-grid">
              <div><label>Amount *</label>
                <input type="number" min="0.01" step="0.01" value={payment.amount} required
                  onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></div>
              <div><label>Method *</label>
                <select value={payment.payment_method}
                  onChange={(e) => setPayment({ ...payment, payment_method: e.target.value })}>
                  {['cash', 'card', 'upi', 'insurance', 'bank transfer'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select></div>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn secondary" onClick={() => setPaying(null)}>Cancel</button>
              <button className="btn">Record</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
