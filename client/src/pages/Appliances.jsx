import React, { useState } from 'react';
import { FiPlus, FiMinus, FiEdit2, FiTrash2, FiX, FiZap } from 'react-icons/fi';
import './Appliances.css';

/**
 * Appliances Page
 * ─────────────────────────────────────────────────────────────
 * Displays a table of home appliances with:
 *  - Appliance name + icon
 *  - Power consumption in Watts
 *  - Total quantity available
 *  - Active count (+/- buttons, 0 to max quantity)
 *  - Status toggle (ON/OFF) — turning ON auto-sets active to 1 if 0
 *  - Actions: Edit, Delete
 *  - Add Appliance modal to create new rows
 *
 * Data is stored in React state (can be wired to MongoDB later)
 */

// ── Appliance emoji map ───────────────────────────────────────
const ICONS = {
  'AC': '❄️',
  'Fridge': '🧊',
  'Geyser': '🚿',
  'Water Purifier': '💧',
  'WiFi Router': '📶',
  'Washing Machine': '🫧',
  'Lights': '💡',
  'TV': '📺',
  'Mixer': '🥤',
  'Cooler': '🌬️',
  'Iron Box': '🔲',
};
const getIcon = (name) => ICONS[name] || '⚡';

// ── Default appliance list with specs ─────────────────────────
const DEFAULT_APPLIANCES = [
  { id: 1, name: 'AC',              power: 1500, quantity: 2,  active: 0, status: false },
  { id: 2, name: 'Fridge',          power: 180,  quantity: 1,  active: 0, status: false },
  { id: 3, name: 'Geyser',          power: 2000, quantity: 2,  active: 0, status: false },
  { id: 4, name: 'Water Purifier',  power: 50,   quantity: 1,  active: 0, status: false },
  { id: 5, name: 'WiFi Router',     power: 15,   quantity: 1,  active: 0, status: false },
  { id: 6, name: 'Washing Machine', power: 500,  quantity: 1,  active: 0, status: false },
  { id: 7, name: 'Lights',          power: 9,    quantity: 12, active: 0, status: false },
  { id: 8, name: 'TV',              power: 120,  quantity: 1,  active: 0, status: false },
  { id: 9, name: 'Mixer',           power: 750,  quantity: 1,  active: 0, status: false },
  { id: 10, name: 'Cooler',         power: 200,  quantity: 1,  active: 0, status: false },
  { id: 11, name: 'Iron Box',       power: 1000, quantity: 1,  active: 0, status: false },
];

const Appliances = () => {
  const [appliances, setAppliances] = useState(DEFAULT_APPLIANCES);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState(null); // null = add, object = edit
  const [form, setForm] = useState({ name: '', power: '', quantity: '' });
  const [formError, setFormError] = useState('');

  // ── Active count: increment ───────────────────────────────────
  const incrementActive = (id) => {
    setAppliances((prev) =>
      prev.map((a) =>
        a.id === id && a.active < a.quantity
          ? { ...a, active: a.active + 1, status: true }
          : a
      )
    );
  };

  // ── Active count: decrement ───────────────────────────────────
  const decrementActive = (id) => {
    setAppliances((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const newActive = Math.max(0, a.active - 1);
        return { ...a, active: newActive, status: newActive > 0 };
      })
    );
  };

  // ── Toggle ON/OFF ─────────────────────────────────────────────
  const toggleStatus = (id) => {
    setAppliances((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const newStatus = !a.status;
        // Turning ON: if active is 0, set to 1 automatically
        const newActive = newStatus && a.active === 0 ? 1 : newStatus ? a.active : 0;
        return { ...a, status: newStatus, active: newActive };
      })
    );
  };

  // ── Delete appliance ──────────────────────────────────────────
  const deleteAppliance = (id) => {
    if (window.confirm('Delete this appliance?')) {
      setAppliances((prev) => prev.filter((a) => a.id !== id));
    }
  };

  // ── Open add modal ────────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', power: '', quantity: '' });
    setFormError('');
    setShowModal(true);
  };

  // ── Open edit modal ───────────────────────────────────────────
  const openEdit = (appliance) => {
    setEditItem(appliance);
    setForm({ name: appliance.name, power: appliance.power, quantity: appliance.quantity });
    setFormError('');
    setShowModal(true);
  };

  // ── Save add / edit ───────────────────────────────────────────
  const handleSave = () => {
    const { name, power, quantity } = form;
    if (!name.trim())        { setFormError('Appliance name is required'); return; }
    if (!power || power <= 0){ setFormError('Power (watts) must be > 0');  return; }
    if (!quantity || quantity < 1){ setFormError('Quantity must be at least 1'); return; }

    if (editItem) {
      // Edit existing
      setAppliances((prev) =>
        prev.map((a) =>
          a.id === editItem.id
            ? { ...a, name: name.trim(), power: Number(power), quantity: Number(quantity) }
            : a
        )
      );
    } else {
      // Add new
      const newId = Math.max(...appliances.map((a) => a.id), 0) + 1;
      setAppliances((prev) => [
        ...prev,
        { id: newId, name: name.trim(), power: Number(power), quantity: Number(quantity), active: 0, status: false },
      ]);
    }
    setShowModal(false);
  };

  // ── Computed stats ────────────────────────────────────────────
  const totalActive  = appliances.filter((a) => a.status).length;
  const totalWatts   = appliances
    .filter((a) => a.status)
    .reduce((sum, a) => sum + a.power * a.active, 0);

  return (
    <div className="appliances-page">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="appliances-header">
        <div>
          <h1>Appliances</h1>
          <p>Add and manage your home appliances</p>
        </div>
        <button className="btn-add-appliance" onClick={openAdd}>
          <FiPlus size={16} /> Add Appliance
        </button>
      </div>

      {/* ── Summary bar ─────────────────────────────────────── */}
      <div className="appliances-summary">
        <div className="summary-chip">
          <span className="chip-label">Total Appliances</span>
          <span className="chip-value">{appliances.length}</span>
        </div>
        <div className="summary-chip active">
          <span className="chip-label">Currently ON</span>
          <span className="chip-value">{totalActive}</span>
        </div>
        <div className="summary-chip power">
          <span className="chip-label">Active Load</span>
          <span className="chip-value">{totalWatts} W</span>
        </div>
        <div className="summary-chip bill">
          <span className="chip-label">Est. Cost/hr</span>
          <span className="chip-value">₹{((totalWatts / 1000) * 8).toFixed(2)}</span>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="table-card">
        <table className="appliances-table">
          <thead>
            <tr>
              <th>Appliance</th>
              <th>Power (W)</th>
              <th>Quantity</th>
              <th>Active</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appliances.map((a, idx) => (
              <tr key={a.id} className={`table-row ${a.status ? 'row-on' : ''}`}
                  style={{ animationDelay: `${idx * 0.04}s` }}>

                {/* Appliance Name */}
                <td>
                  <div className="appliance-name-cell">
                    <span className="appliance-emoji">{getIcon(a.name)}</span>
                    <span className="appliance-name">{a.name}</span>
                  </div>
                </td>

                {/* Power */}
                <td>
                  <span className="power-badge">
                    <FiZap size={11} />
                    {a.power} W
                  </span>
                </td>

                {/* Quantity */}
                <td>
                  <span className="qty-value">{a.quantity}</span>
                </td>

                {/* Active count with +/- */}
                <td>
                  <div className="active-counter">
                    <button
                      className="counter-btn minus"
                      onClick={() => decrementActive(a.id)}
                      disabled={a.active === 0}
                    >
                      <FiMinus size={12} />
                    </button>
                    <span className={`counter-value ${a.active > 0 ? 'nonzero' : ''}`}>
                      {a.active}
                    </span>
                    <button
                      className="counter-btn plus"
                      onClick={() => incrementActive(a.id)}
                      disabled={a.active >= a.quantity}
                    >
                      <FiPlus size={12} />
                    </button>
                  </div>
                </td>

                {/* Status toggle */}
                <td>
                  <div
                    className={`toggle-switch ${a.status ? 'on' : 'off'}`}
                    onClick={() => toggleStatus(a.id)}
                    role="switch"
                    aria-checked={a.status}
                  >
                    <div className="toggle-thumb" />
                    <span className={`toggle-label ${a.status ? 'on' : 'off'}`}>
                      {a.status ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td>
                  <div className="action-btns">
                    <button className="action-btn edit" onClick={() => openEdit(a)} title="Edit">
                      <FiEdit2 size={14} />
                    </button>
                    <button className="action-btn delete" onClick={() => deleteAppliance(a.id)} title="Delete">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>{editItem ? 'Edit Appliance' : '+ Add New Appliance'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <FiX size={18} />
              </button>
            </div>

            {formError && <div className="modal-error">{formError}</div>}

            <div className="modal-form">
              <div className="form-field">
                <label>Appliance Name</label>
                <input
                  type="text"
                  placeholder="e.g. Air Conditioner"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormError(''); }}
                />
              </div>
              <div className="form-field">
                <label>Power (Watts)</label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  min="1"
                  value={form.power}
                  onChange={(e) => { setForm({ ...form, power: e.target.value }); setFormError(''); }}
                />
              </div>
              <div className="form-field">
                <label>Quantity</label>
                <input
                  type="number"
                  placeholder="e.g. 2"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => { setForm({ ...form, quantity: e.target.value }); setFormError(''); }}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSave}>
                {editItem ? 'Save Changes' : 'Add Appliance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appliances;
