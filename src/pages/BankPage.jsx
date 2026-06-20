// BankPage.jsx - Manage multiple bank accounts (Settings > Bank)
import { useEffect, useState } from 'react'
import {
  FiPlus, FiEdit2, FiTrash2, FiStar, FiX, FiCheck,
  FiAlertCircle, FiCreditCard, FiHash, FiGlobe,
  FiMapPin, FiDollarSign, FiFileText, FiChevronDown
} from 'react-icons/fi'
import './BankPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

const CURRENCIES = ['GBP', 'USD', 'EUR', 'AED', 'CAD', 'AUD', 'INR', 'SGD']
const ACCOUNT_TYPES = ['Current', 'Savings', 'Business']

const EMPTY_FORM = {
  bankName: '',
  accountHolderName: '',
  accountNumber: '',
  sortCode: '',
  iban: '',
  swiftBic: '',
  bankAddress: '',
  currency: 'GBP',
  accountType: 'Business',
  isPrimary: false,
  notes: '',
}

function BankFormModal({ isOpen, onClose, onSave, initial, saving, error }) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (isOpen) {
      setForm(initial
        ? {
          bankName: initial.bank_name || '',
          accountHolderName: initial.account_holder_name || '',
          accountNumber: initial.account_number || '',
          sortCode: initial.sort_code || '',
          iban: initial.iban || '',
          swiftBic: initial.swift_bic || '',
          bankAddress: initial.bank_address || '',
          currency: initial.currency || 'GBP',
          accountType: initial.account_type || 'Business',
          isPrimary: Boolean(initial.is_primary),
          notes: initial.notes || '',
        }
        : EMPTY_FORM
      )
    }
  }, [isOpen, initial])

  if (!isOpen) return null

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(prev => ({ ...prev, [field]: val }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="bank-modal-backdrop" role="dialog" aria-modal="true">
      <div className="bank-modal">
        <header className="bank-modal-header">
          <div>
            <h2 className="bank-modal-title">
              {initial ? 'Edit Bank Account' : 'Add Bank Account'}
            </h2>
            <p className="bank-modal-subtitle">
              {initial ? 'Update your banking details.' : 'Add a new bank account for payments.'}
            </p>
          </div>
          <button type="button" className="bank-modal-close" onClick={onClose} aria-label="Close">
            <FiX />
          </button>
        </header>

        <form className="bank-form" onSubmit={handleSubmit}>
          {/* Row 1 */}
          <div className="bank-form-grid">
            <label className="bank-field bank-field--required">
              <span className="bank-field-label">
                <FiCreditCard className="bank-field-icon" />
                Bank Name
              </span>
              <input
                id="bank-name"
                type="text"
                value={form.bankName}
                onChange={handleChange('bankName')}
                placeholder="e.g. Barclays, HSBC, Lloyds"
                required
              />
            </label>

            <label className="bank-field bank-field--required">
              <span className="bank-field-label">
                <FiHash className="bank-field-icon" />
                Account Holder Name
              </span>
              <input
                id="bank-holder"
                type="text"
                value={form.accountHolderName}
                onChange={handleChange('accountHolderName')}
                placeholder="Full legal name on account"
                required
              />
            </label>
          </div>

          {/* Row 2 */}
          <div className="bank-form-grid">
            <label className="bank-field bank-field--required">
              <span className="bank-field-label">
                <FiHash className="bank-field-icon" />
                Account Number
              </span>
              <input
                id="bank-account-number"
                type="text"
                value={form.accountNumber}
                onChange={handleChange('accountNumber')}
                placeholder="e.g. 12345678"
                required
              />
            </label>

            <label className="bank-field">
              <span className="bank-field-label">
                <FiHash className="bank-field-icon" />
                Sort Code
              </span>
              <input
                id="bank-sort-code"
                type="text"
                value={form.sortCode}
                onChange={handleChange('sortCode')}
                placeholder="e.g. 20-34-56"
              />
            </label>
          </div>

          {/* Row 3 - IBAN & SWIFT */}
          <div className="bank-form-grid">
            <label className="bank-field">
              <span className="bank-field-label">
                <FiGlobe className="bank-field-icon" />
                IBAN
              </span>
              <input
                id="bank-iban"
                type="text"
                value={form.iban}
                onChange={handleChange('iban')}
                placeholder="e.g. GB29NWBK60161331926819"
              />
            </label>

            <label className="bank-field">
              <span className="bank-field-label">
                <FiGlobe className="bank-field-icon" />
                SWIFT / BIC
              </span>
              <input
                id="bank-swift"
                type="text"
                value={form.swiftBic}
                onChange={handleChange('swiftBic')}
                placeholder="e.g. NWBKGB2L"
              />
            </label>
          </div>

          {/* Row 4 - Currency & Account Type */}
          <div className="bank-form-grid">
            <label className="bank-field">
              <span className="bank-field-label">
                <FiDollarSign className="bank-field-icon" />
                Currency
              </span>
              <div className="bank-select-wrap">
                <select
                  id="bank-currency"
                  value={form.currency}
                  onChange={handleChange('currency')}
                >
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <FiChevronDown className="bank-select-arrow" />
              </div>
            </label>

            <label className="bank-field">
              <span className="bank-field-label">
                <FiCreditCard className="bank-field-icon" />
                Account Type
              </span>
              <div className="bank-select-wrap">
                <select
                  id="bank-account-type"
                  value={form.accountType}
                  onChange={handleChange('accountType')}
                >
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <FiChevronDown className="bank-select-arrow" />
              </div>
            </label>
          </div>

          {/* Bank Address */}
          <label className="bank-field bank-field--full">
            <span className="bank-field-label">
              <FiMapPin className="bank-field-icon" />
              Bank Address
            </span>
            <textarea
              id="bank-address"
              rows={2}
              value={form.bankAddress}
              onChange={handleChange('bankAddress')}
              placeholder="Optional — branch address of the bank"
            />
          </label>

          {/* Notes */}
          <label className="bank-field bank-field--full">
            <span className="bank-field-label">
              <FiFileText className="bank-field-icon" />
              Notes
            </span>
            <textarea
              id="bank-notes"
              rows={2}
              value={form.notes}
              onChange={handleChange('notes')}
              placeholder="Any additional notes about this account"
            />
          </label>

          {/* Primary checkbox */}
          <label className="bank-primary-check">
            <input
              id="bank-is-primary"
              type="checkbox"
              checked={form.isPrimary}
              onChange={handleChange('isPrimary')}
            />
            <span>Set as Primary Bank Account</span>
          </label>

          {error && (
            <div className="bank-form-error">
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}

          <div className="bank-form-actions">
            <button type="button" className="bank-btn bank-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="bank-btn bank-btn--primary" disabled={saving}>
              {saving ? 'Saving...' : (initial ? 'Update Bank' : 'Add Bank')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmDeleteModal({ isOpen, bankName, onConfirm, onCancel, deleting }) {
  if (!isOpen) return null
  return (
    <div className="bank-modal-backdrop" role="dialog" aria-modal="true">
      <div className="bank-modal bank-modal--confirm">
        <div className="bank-confirm-icon">
          <FiAlertCircle />
        </div>
        <h3 className="bank-confirm-title">Delete Bank Account?</h3>
        <p className="bank-confirm-text">
          Are you sure you want to delete <strong>"{bankName}"</strong>? This action cannot be undone.
        </p>
        <div className="bank-form-actions">
          <button type="button" className="bank-btn bank-btn--ghost" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="bank-btn bank-btn--danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BankPage() {
  const [banks, setBanks] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editBank, setEditBank] = useState(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')

  // Delete state
  const [deleteBank, setDeleteBank] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Toast notifications
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchBanks = async () => {
    try {
      setLoading(true)
      setFetchError('')
      const res = await fetch(`${API_BASE_URL}/banks`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setBanks(data.banks || [])
      } else {
        setFetchError(data.message || 'Failed to load banks.')
      }
    } catch (err) {
      console.error('Fetch banks error:', err)
      setFetchError('Unable to connect to server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBanks() }, [])

  const handleOpenAdd = () => {
    setEditBank(null)
    setModalError('')
    setIsModalOpen(true)
  }

  const handleOpenEdit = (bank) => {
    setEditBank(bank)
    setModalError('')
    setIsModalOpen(true)
  }

  const handleSave = async (form) => {
    setSaving(true)
    setModalError('')
    try {
      const url = editBank
        ? `${API_BASE_URL}/banks/${editBank.id}`
        : `${API_BASE_URL}/banks`
      const method = editBank ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setModalError(data.message || 'Failed to save bank.')
      } else {
        setIsModalOpen(false)
        showToast(editBank ? 'Bank updated successfully.' : 'Bank added successfully.')
        fetchBanks()
      }
    } catch (err) {
      console.error('Save bank error:', err)
      setModalError('Unable to connect to server.')
    } finally {
      setSaving(false)
    }
  }

  const handleSetPrimary = async (bank) => {
    try {
      const res = await fetch(`${API_BASE_URL}/banks/${bank.id}/set-primary`, {
        method: 'PATCH',
        credentials: 'include',
      })
      if (res.ok) {
        showToast(`"${bank.bank_name}" set as primary bank.`)
        fetchBanks()
      }
    } catch (err) {
      console.error('Set primary error:', err)
      showToast('Failed to set primary bank.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteBank) return
    setDeleting(true)
    try {
      const res = await fetch(`${API_BASE_URL}/banks/${deleteBank.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setDeleteBank(null)
        showToast('Bank deleted successfully.')
        fetchBanks()
      } else {
        const data = await res.json()
        showToast(data.message || 'Failed to delete bank.', 'error')
      }
    } catch (err) {
      console.error('Delete bank error:', err)
      showToast('Unable to connect to server.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="bank-page">
      {/* Toast */}
      {toast && (
        <div className={`bank-toast bank-toast--${toast.type}`}>
          {toast.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bank-page-header">
        <div>
          <h2 className="bank-page-title">Bank Accounts</h2>
          <p className="bank-page-subtitle">
            Manage your organisation's bank accounts for payments and invoicing.
          </p>
        </div>
        <button
          id="bank-add-btn"
          type="button"
          className="bank-btn bank-btn--primary"
          onClick={handleOpenAdd}
        >
          <FiPlus />
          Add Bank
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bank-loading">
          <div className="bank-loading-spinner" />
          <span>Loading bank accounts...</span>
        </div>
      )}

      {/* Error */}
      {fetchError && !loading && (
        <div className="bank-fetch-error">
          <FiAlertCircle />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !fetchError && banks.length === 0 && (
        <div className="bank-empty">
          <div className="bank-empty-icon">
            <FiCreditCard />
          </div>
          <h3 className="bank-empty-title">No Bank Accounts Added</h3>
          <p className="bank-empty-text">
            Add your first bank account to start managing payment details.
          </p>
          <button type="button" className="bank-btn bank-btn--primary" onClick={handleOpenAdd}>
            <FiPlus />
            Add Your First Bank
          </button>
        </div>
      )}

      {/* Bank Cards Grid */}
      {!loading && banks.length > 0 && (
        <div className="bank-cards-grid">
          {banks.map((bank) => (
            <div
              key={bank.id}
              className={`bank-card ${bank.is_primary ? 'bank-card--primary' : ''}`}
            >
              {bank.is_primary && (
                <div className="bank-card-primary-badge">
                  <FiStar />
                  Primary
                </div>
              )}

              {/* Card Header */}
              <div className="bank-card-header">
                <div className="bank-card-icon">
                  <FiCreditCard />
                </div>
                <div className="bank-card-title-group">
                  <h3 className="bank-card-name">{bank.bank_name}</h3>
                  <span className="bank-card-type">{bank.account_type} Account · {bank.currency}</span>
                </div>
              </div>

              {/* Card Details */}
              <div className="bank-card-details">
                <div className="bank-card-row">
                  <span className="bank-card-label">Account Holder</span>
                  <span className="bank-card-value">{bank.account_holder_name}</span>
                </div>
                <div className="bank-card-row">
                  <span className="bank-card-label">Account No.</span>
                  <span className="bank-card-value bank-card-value--mono">
                    {'•'.repeat(Math.max(0, (bank.account_number || '').length - 4))}
                    {(bank.account_number || '').slice(-4)}
                  </span>
                </div>
                {bank.sort_code && (
                  <div className="bank-card-row">
                    <span className="bank-card-label">Sort Code</span>
                    <span className="bank-card-value bank-card-value--mono">{bank.sort_code}</span>
                  </div>
                )}
                {bank.iban && (
                  <div className="bank-card-row">
                    <span className="bank-card-label">IBAN</span>
                    <span className="bank-card-value bank-card-value--mono">{bank.iban}</span>
                  </div>
                )}
                {bank.swift_bic && (
                  <div className="bank-card-row">
                    <span className="bank-card-label">SWIFT / BIC</span>
                    <span className="bank-card-value bank-card-value--mono">{bank.swift_bic}</span>
                  </div>
                )}
                {bank.notes && (
                  <div className="bank-card-row bank-card-row--notes">
                    <span className="bank-card-label">Notes</span>
                    <span className="bank-card-value bank-card-value--muted">{bank.notes}</span>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="bank-card-actions">
                {!bank.is_primary && (
                  <button
                    type="button"
                    className="bank-card-action-btn bank-card-action-btn--star"
                    onClick={() => handleSetPrimary(bank)}
                    title="Set as primary"
                  >
                    <FiStar />
                    Set Primary
                  </button>
                )}
                <button
                  type="button"
                  className="bank-card-action-btn bank-card-action-btn--edit"
                  onClick={() => handleOpenEdit(bank)}
                  title="Edit bank"
                >
                  <FiEdit2 />
                  Edit
                </button>
                <button
                  type="button"
                  className="bank-card-action-btn bank-card-action-btn--delete"
                  onClick={() => setDeleteBank(bank)}
                  title="Delete bank"
                >
                  <FiTrash2 />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <BankFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initial={editBank}
        saving={saving}
        error={modalError}
      />

      {/* Delete Confirm Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteBank)}
        bankName={deleteBank?.bank_name || ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteBank(null)}
        deleting={deleting}
      />
    </section>
  )
}
