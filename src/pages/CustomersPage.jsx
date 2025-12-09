// CustomersPage.jsx - Customers listing and Add Customer flow (company / freelancer)
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiMoreVertical } from 'react-icons/fi'
import './CustomersPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const CLOUDINARY_UPLOAD_URL = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const initialPerson = { name: '', email: '', contact: '' }
const initialDocument = { title: '', file: null, fileUrl: '', expiryDate: '' }
const PAGE_SIZE = 10

async function uploadToCloudinary(file) {
  if (!file) return ''

  // If Cloudinary config is missing, fall back to base64 string (local only)
  if (!CLOUDINARY_UPLOAD_URL) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result || '')
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })
  }

  const formData = new FormData()
  formData.append('file', file)
  if (CLOUDINARY_UPLOAD_PRESET) {
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  }

  const res = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error?.message || 'Cloudinary upload failed')
  }

  return data.secure_url || data.url || ''
}

function CustomersPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [viewMode, setViewMode] = useState('list') // 'list' | 'form'
  const [documentFilter, setDocumentFilter] = useState('all') // all | expiring_30 | expired
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [summary, setSummary] = useState({ totalCustomers: 0, activeCustomers: 0, totalTickets: 0, totalRevenue: 0 })
  const [customers, setCustomers] = useState([])
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [customerDetails, setCustomerDetails] = useState(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [menuCustomerId, setMenuCustomerId] = useState(null)
  const [customerType, setCustomerType] = useState('company') // company | freelancer
  const [status, setStatus] = useState('active')
  const [name, setName] = useState('')
  const [accountEmail, setAccountEmail] = useState('')
  const [companyRegistrationNo, setCompanyRegistrationNo] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [address, setAddress] = useState('')
  const [profileFile, setProfileFile] = useState(null)
  const [profilePreview, setProfilePreview] = useState('')

  const [persons, setPersons] = useState([])
  const [personDraft, setPersonDraft] = useState(initialPerson)

  const [documents, setDocuments] = useState([])
  const [documentDraft, setDocumentDraft] = useState(initialDocument)

  // Derived flags for enabling Add buttons
  const canAddPerson = useMemo(
    () => Boolean(personDraft.name && personDraft.email && personDraft.contact),
    [personDraft],
  )

  const canAddDocument = useMemo(
    () => Boolean(documentDraft.title && documentDraft.file && documentDraft.expiryDate),
    [documentDraft],
  )

  const resetForm = () => {
    setCustomerType('company')
    setStatus('active')
    setName('')
    setAccountEmail('')
    setCompanyRegistrationNo('')
    setVatNumber('')
    setAddress('')
    setProfileFile(null)
    setProfilePreview('')
    setPersons([])
    setPersonDraft(initialPerson)
    setDocuments([])
    setDocumentDraft(initialDocument)
    setError('')
    setEditingCustomerId(null)
  }

  const loadCustomers = async (filter = documentFilter) => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams()
      if (filter && filter !== 'all') params.set('documentFilter', filter)

      const res = await fetch(`${API_BASE_URL}/customers?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to load customers')
      }
      setSummary({
        totalCustomers: data.summary?.totalCustomers || 0,
        activeCustomers: data.summary?.activeCustomers || 0,
        totalTickets: data.summary?.totalTickets || 0,
        totalRevenue: data.summary?.totalRevenue || 0,
      })
      setCustomers(data.customers || [])
      setCurrentPage(1)
    } catch (err) {
      console.error('Load customers error', err)
      setError(err.message || 'Unable to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return customers

    return customers.filter((customer) => {
      const name = customer.name?.toLowerCase() || ''
      const email = customer.accountEmail?.toLowerCase() || ''
      const code = `aim-c-${String(customer.id || '')}`.toLowerCase()
      return name.includes(term) || email.includes(term) || code.includes(term)
    })
  }, [customers, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE))
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleDocumentFilterChange = (value) => {
    setDocumentFilter(value)
    setCurrentPage(1)
    loadCustomers(value)
  }

  const handleProfileFileChange = (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    setProfileFile(file)
    setProfilePreview(URL.createObjectURL(file))
  }

  const handlePersonDraftChange = (field, value) => {
    setPersonDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddPerson = () => {
    if (!canAddPerson) return
    setPersons((prev) => [...prev, personDraft])
    setPersonDraft(initialPerson)
  }

  const handleDocumentDraftChange = (field, value) => {
    setDocumentDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleDocumentFileChange = (event) => {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    setDocumentDraft((prev) => ({ ...prev, file, fileUrl: file.name }))
  }

  const handleAddDocument = () => {
    if (!canAddDocument) return
    setDocuments((prev) => [...prev, documentDraft])
    setDocumentDraft(initialDocument)
  }

  const handleSubmitCustomer = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (!name || !accountEmail) {
        throw new Error('Please fill in required fields.')
      }
      if (persons.length === 0 && !canAddPerson) {
        throw new Error('Please add at least one authorised person.')
      }
      if (persons.length === 0 && canAddPerson) {
        // Auto-add the first person if user filled but forgot to click Add Person
        setPersons((prev) => [...prev, personDraft])
      }
      if (documents.length === 0 && canAddDocument) {
        setDocuments((prev) => [...prev, documentDraft])
      }

      let profileImageUrl = ''
      if (profileFile) {
        profileImageUrl = await uploadToCloudinary(profileFile)
      }

      const documentsWithUrls = []
      for (const doc of documents.length ? documents : canAddDocument ? [documentDraft] : []) {
        let url = doc.fileUrl
        if (doc.file) {
          url = await uploadToCloudinary(doc.file)
        }
        documentsWithUrls.push({
          title: doc.title,
          fileUrl: url,
          expiryDate: doc.expiryDate,
        })
      }

      const payload = {
        customerType,
        name,
        accountEmail,
        companyRegistrationNo,
        vatNumber,
        address,
        profileImageUrl,
        status,
        persons: persons.length ? persons : [personDraft],
        documents: documentsWithUrls,
      }

      const isEditing = Boolean(editingCustomerId)
      const url = isEditing
        ? `${API_BASE_URL}/customers/${editingCustomerId}`
        : `${API_BASE_URL}/customers`
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || (isEditing ? 'Unable to update customer' : 'Unable to add customer'))
      }

      resetForm()
      setViewMode('list')
      await loadCustomers(documentFilter)
    } catch (err) {
      console.error('Save customer error', err)
      setError(err.message || 'Unable to save customer')
    } finally {
      setSaving(false)
    }
  }

  const handleViewCustomer = async (customerId) => {
    try {
      setError('')
      const res = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to load customer details')
      }
      setCustomerDetails(data)
      setIsDetailsOpen(true)
    } catch (err) {
      console.error('View customer error', err)
      setError(err.message || 'Unable to load customer details')
    }
  }

  const startEditCustomer = async (customerId) => {
    try {
      setError('')
      const res = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to load customer')
      }

      const { customer, persons: personRows = [], documents: documentRows = [] } = data
      setCustomerType(customer.customerType || 'company')
      setStatus(customer.status || 'active')
      setName(customer.name || '')
      setAccountEmail(customer.accountEmail || '')
      setCompanyRegistrationNo(customer.companyRegistrationNo || '')
      setVatNumber(customer.vatNumber || '')
      setAddress(customer.address || '')
      setProfileFile(null)
      setProfilePreview(customer.profileImageUrl || '')
      setPersons(personRows.map((p) => ({ name: p.name, email: p.email, contact: p.contact })))
      setPersonDraft(initialPerson)
      setDocuments(
        documentRows.map((d) => ({
          title: d.title,
          file: null,
          fileUrl: d.fileUrl,
          expiryDate: d.expiryDate || '',
        })),
      )
      setDocumentDraft(initialDocument)
      setEditingCustomerId(customerId)
      setViewMode('form')
    } catch (err) {
      console.error('Edit customer load error', err)
      setError(err.message || 'Unable to load customer for edit')
    }
  }

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return
    try {
      setError('')
      const res = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Unable to delete customer')
      }
      if (currentPage > 1 && (customers.length - 1) % PAGE_SIZE === 0) {
        setCurrentPage((prev) => Math.max(1, prev - 1))
      }
      await loadCustomers(documentFilter)
    } catch (err) {
      console.error('Delete customer error', err)
      setError(err.message || 'Unable to delete customer')
    }
  }

  const handleCreateLeadFromCustomer = (customer) => {
    if (!customer) return
    localStorage.setItem(
      'selectedCustomerForLead',
      JSON.stringify({ id: customer.id, name: customer.name, accountEmail: customer.accountEmail }),
    )
    navigate('/dashboard', { state: { openLeads: true } })
  }

  const handleCloseDetails = () => {
    setIsDetailsOpen(false)
    setCustomerDetails(null)
  }

  if (viewMode === 'form') {
    const isCompany = customerType === 'company'

    return (
      <section className="customers-page">
        <header className="customers-header">
          <button type="button" className="customers-back" onClick={() => setViewMode('list')}>
            ← Back
          </button>
          <div>
            <h1 className="customers-title">Add Customer</h1>
            <p className="customers-subtitle">Capture customer details and documents.</p>
          </div>
        </header>

        <form className="customers-form" onSubmit={handleSubmitCustomer}>
          <section className="customers-card">
            <div className="customers-card-header">
              <h2>Customer Type</h2>
            </div>
            <div className="customer-type-toggle">
              <button
                type="button"
                className={`type-pill ${customerType === 'company' ? 'type-pill--active' : ''}`}
                onClick={() => setCustomerType('company')}
              >
                Company
              </button>
              <button
                type="button"
                className={`type-pill ${customerType === 'freelancer' ? 'type-pill--active' : ''}`}
                onClick={() => setCustomerType('freelancer')}
              >
                Freelancer
              </button>
            </div>

            <div className="customers-grid">
              <label className="customers-field">
                <span>
                  Name <span className="field-required">*</span>
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder={isCompany ? 'Enter company/freelancer name' : 'Enter freelancer name'}
                />
              </label>

              <label className="customers-field">
                <span>
                  Account Email <span className="field-required">*</span>
                </span>
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  required
                  placeholder="Enter email address"
                />
              </label>

              {isCompany && (
                <>
                  <label className="customers-field">
                    <span>Company Registration No</span>
                    <input
                      type="text"
                      value={companyRegistrationNo}
                      onChange={(e) => setCompanyRegistrationNo(e.target.value)}
                      placeholder="Enter registration number"
                    />
                  </label>

                  <label className="customers-field">
                    <span>VAT Number</span>
                    <input
                      type="text"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                      placeholder="Enter VAT number"
                    />
                  </label>
                </>
              )}

              <label className="customers-field customers-field--full">
                <span>Address</span>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter full address"
                />
              </label>

              <div className="customers-field">
                <span>Upload Profile Picture</span>
                <div className="profile-upload-row">
                  <input type="file" accept="image/*" onChange={handleProfileFileChange} />
                  {profilePreview && <img src={profilePreview} alt="Preview" className="profile-upload-preview" />}
                </div>
              </div>

              <div className="customers-field">
                <span>Status</span>
                <div className="status-toggle">
                  <button
                    type="button"
                    className={`status-pill ${status === 'active' ? 'status-pill--active' : ''}`}
                    onClick={() => setStatus('active')}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    className={`status-pill ${status === 'inactive' ? 'status-pill--inactive' : ''}`}
                    onClick={() => setStatus('inactive')}
                  >
                    Inactive
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="customers-card">
            <div className="customers-card-header">
              <h2>Authorised Person Details</h2>
            </div>

            {persons.length > 0 && (
              <div className="pill-list">
                {persons.map((p, index) => (
                  <div key={`${p.email}-${index}`} className="pill-list-item">
                    <strong>{p.name}</strong>
                    <span>{p.email}</span>
                    <span>{p.contact}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="customers-grid">
              <label className="customers-field">
                <span>
                  Person Name <span className="field-required">*</span>
                </span>
                <input
                  type="text"
                  value={personDraft.name}
                  onChange={(e) => handlePersonDraftChange('name', e.target.value)}
                  placeholder="Enter person name"
                />
              </label>
              <label className="customers-field">
                <span>
                  Person Email <span className="field-required">*</span>
                </span>
                <input
                  type="email"
                  value={personDraft.email}
                  onChange={(e) => handlePersonDraftChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </label>
              <label className="customers-field">
                <span>
                  Person Contact <span className="field-required">*</span>
                </span>
                <input
                  type="tel"
                  value={personDraft.contact}
                  onChange={(e) => handlePersonDraftChange('contact', e.target.value)}
                  placeholder="Enter phone number"
                />
              </label>
            </div>

            <div className="customers-actions-row">
              <button
                type="button"
                className="customers-secondary-btn"
                onClick={handleAddPerson}
                disabled={!canAddPerson}
              >
                Add Person
              </button>
            </div>
          </section>

          <section className="customers-card">
            <div className="customers-card-header">
              <h2>Upload Documents</h2>
            </div>

            {documents.length > 0 && (
              <div className="pill-list">
                {documents.map((d, index) => (
                  <div key={`${d.title}-${index}`} className="pill-list-item">
                    <strong>{d.title}</strong>
                    {d.expiryDate && <span>Expires: {d.expiryDate}</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="customers-grid">
              <label className="customers-field">
                <span>Title</span>
                <input
                  type="text"
                  value={documentDraft.title}
                  onChange={(e) => handleDocumentDraftChange('title', e.target.value)}
                  placeholder="Enter document title"
                />
              </label>
              <label className="customers-field">
                <span>Select Document</span>
                <input type="file" onChange={handleDocumentFileChange} />
              </label>
              <label className="customers-field">
                <span>Document Expiry Date</span>
                <input
                  type="date"
                  value={documentDraft.expiryDate}
                  onChange={(e) => handleDocumentDraftChange('expiryDate', e.target.value)}
                />
              </label>
            </div>

            <div className="customers-actions-row">
              <button
                type="button"
                className="customers-secondary-btn"
                onClick={handleAddDocument}
                disabled={!canAddDocument}
              >
                Add New Document
              </button>
            </div>
          </section>

          {error && <div className="customers-error">{error}</div>}

          <div className="customers-actions-footer">
            <button
              type="button"
              className="customers-secondary-btn customers-secondary-btn--muted"
              onClick={() => {
                resetForm()
                setViewMode('list')
              }}
            >
              Cancel
            </button>
            <button type="submit" className="customers-primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </section>
    )
  }

  // LIST VIEW
  return (
    <section className="customers-page">
      <header className="customers-header">
        <div>
          <h1 className="customers-title">Customers</h1>
          <p className="customers-subtitle">Manage your customer relationships.</p>
        </div>
        <button type="button" className="customers-primary-btn" onClick={() => setViewMode('form')}>
          + Add Customer
        </button>
      </header>

      <section className="customers-summary-row">
        <div className="customers-summary-card">
          <p className="summary-label">Total Customers</p>
          <p className="summary-value">{summary.totalCustomers}</p>
        </div>
        <div className="customers-summary-card">
          <p className="summary-label">Active</p>
          <p className="summary-value">{summary.activeCustomers}</p>
        </div>
        <div className="customers-summary-card">
          <p className="summary-label">Total Tickets</p>
          <p className="summary-value">{summary.totalTickets}</p>
        </div>
        <div className="customers-summary-card">
          <p className="summary-label">Total Revenue</p>
          <p className="summary-value">${summary.totalRevenue}</p>
        </div>
      </section>

      <section className="customers-card">
        <div className="customers-list-toolbar">
          <div className="customers-search">
            <input
              type="text"
              placeholder="Search by name, code, or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
          <div className="customers-filter">
            <span>Document Filters</span>
            <select
              value={documentFilter}
              onChange={(e) => handleDocumentFilterChange(e.target.value)}
            >
              <option value="all">All Documents</option>
              <option value="expiring_30">Expiring in 30 days</option>
              <option value="expired">Already Expired</option>
            </select>
          </div>
        </div>

        {error && <div className="customers-error customers-error--inline">{error}</div>}

        <div className="customers-table-wrapper">
          <table className="customers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Customer Type</th>
                <th>Authorised Person</th>
                <th>Documents</th>
                <th>Create Lead</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="customers-empty">
                    Loading customers...
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="customers-empty">
                    No customers found.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="customers-name-cell">
                        {customer.profileImageUrl && (
                          <img
                            src={customer.profileImageUrl}
                            alt={customer.name}
                            className="customers-avatar"
                          />
                        )}
                        <div>
                          <div className="customers-name-main">{customer.name}</div>
                          <div className="customers-name-sub">{customer.accountEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td>{customer.customerType === 'company' ? 'Company' : 'Freelancer'}</td>
                    <td>{customer.authorizedPersonName || '-'}</td>
                    <td>
                      {customer.documentTitle ? (
                        <div className="customers-doc-pill">
                          <span>{customer.documentTitle}</span>
                          {customer.documentExpiryDate && (
                            <span className="customers-doc-expiry">Expires: {customer.documentExpiryDate}</span>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="customers-link-btn"
                        onClick={() => handleCreateLeadFromCustomer(customer)}
                      >
                        Create Lead
                      </button>
                    </td>
                    <td className="customers-actions-cell">
                      <div className="customers-actions-wrapper">
                        <button
                          type="button"
                          className="customers-actions-trigger"
                          onClick={() =>
                            setMenuCustomerId((prev) => (prev === customer.id ? null : customer.id))
                          }
                        >
                          <FiMoreVertical />
                        </button>
                        {menuCustomerId === customer.id && (
                          <div className="customers-actions-menu">
                            <button
                              type="button"
                              onClick={() => {
                                setMenuCustomerId(null)
                                handleViewCustomer(customer.id)
                              }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuCustomerId(null)
                                startEditCustomer(customer.id)
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuCustomerId(null)
                                handleCreateLeadFromCustomer(customer)
                              }}
                            >
                              Create Lead
                            </button>
                            <button
                              type="button"
                              className="customers-actions-item--danger"
                              onClick={() => {
                                setMenuCustomerId(null)
                                handleDeleteCustomer(customer.id)
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length > PAGE_SIZE && (
          <div className="customers-pagination">
            <button
              type="button"
              className="customers-secondary-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </button>
            <span className="customers-page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="customers-secondary-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {isDetailsOpen && customerDetails && (
        <div className="customer-modal-backdrop" role="dialog" aria-modal="true">
          <div className="customer-modal">
            <header className="customer-modal-header">
              <div className="customer-modal-main">
                <div className="customer-modal-avatar">{customerDetails.customer.name[0]}</div>
                <div>
                  <h2 className="customer-modal-title">{customerDetails.customer.name}</h2>
                  <p className="customer-modal-sub">
                    Code: #AIM-C-{String(customerDetails.customer.id).padStart(3, '0')}
                  </p>
                  <p className="customer-modal-sub">
                    Type: {customerDetails.customer.customerType === 'company' ? 'Company' : 'Freelancer'}
                  </p>
                  <p className="customer-modal-sub">Email: {customerDetails.customer.accountEmail}</p>
                </div>
              </div>
              <button type="button" className="customer-modal-close" onClick={handleCloseDetails}>
                ×
              </button>
            </header>

            <section className="customer-modal-section">
              <h3>Authorised Person Details</h3>
              {customerDetails.persons.length === 0 ? (
                <p className="customer-modal-empty">No authorised persons found.</p>
              ) : (
                <ul className="customer-modal-list">
                  {customerDetails.persons.map((p) => (
                    <li key={p.id}>
                      <strong>{p.name}</strong>
                      <span>{p.email}</span>
                      <span>{p.contact}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="customer-modal-section">
              <h3>Document Details</h3>
              {customerDetails.documents.length === 0 ? (
                <p className="customer-modal-empty">No documents uploaded.</p>
              ) : (
                <ul className="customer-modal-list">
                  {customerDetails.documents.map((d) => (
                    <li key={d.id}>
                      <strong>{d.title}</strong>
                      {d.expiryDate && <span className="customer-modal-expiry">Expires: {d.expiryDate}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  )
}

export default CustomersPage
