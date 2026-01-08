// CustomersPage.jsx - Customers listing and Add Customer flow
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FiMoreVertical, FiArrowLeft, FiFileText, FiX, FiEye } from 'react-icons/fi'
import './CustomersPage.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const CLOUDINARY_UPLOAD_URL = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const initialPerson = { name: '', email: '', contact: '' }
const initialDocument = { title: '', file: null, fileUrl: '', expiryDate: '' }
const PAGE_SIZE = 10

async function uploadProfileImage(file) {
  if (!file) return ''

  // 1. Try Cloudinary if configured
  if (CLOUDINARY_UPLOAD_URL && CLOUDINARY_UPLOAD_PRESET) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      const res = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        return data.secure_url || data.url || ''
      }
      console.warn('Cloudinary upload failed, failing over to local server:', data)
    } catch (err) {
      console.error('Cloudinary upload error:', err)
    }
  }

  // 2. Try Local Server Upload
  try {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (res.ok) {
      // Backend returns "uploads/filename.jpg"
      return data.url
    }
    console.warn('Local upload failed:', data)
  } catch (err) {
    console.error('Local upload error:', err)
  }

  // 3. Fallback to Base64 (Last Resort)
  return await readFileAsDataURL(file)
}

/**
 * Calculates days remaining for a document expiry and returns 
 * status-specific styling and labels.
 */
function getDocumentStatus(expiryStr) {
  if (!expiryStr) return null;
  const expiryDate = new Date(expiryStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let color = 'inherit';
  let label = '';

  if (diffDays < 0) {
    color = '#ef4444'; // Red
    label = 'Expired';
  } else if (diffDays <= 15) {
    color = '#ef4444'; // Red
    label = `${diffDays} days left`;
  } else if (diffDays <= 30) {
    color = '#f59e0b'; // Yellow/Orange
    label = `${diffDays} days left`;
  } else {
    color = '#10b981'; // Green
    label = `${diffDays} days left`;
  }

  return { color, label, diffDays, expiryDate: expiryDate.toISOString().split('T')[0] };
}

/**
 * Helper to read a file as a data URL (base64)
 */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Robustly constructs the avatar URL based on various formats.
 */
function getAvatarUrl(url, apiBaseUrl) {
  if (!url || url === 'null' || url === 'undefined' || typeof url !== 'string') return null;

  // Normalize backslashes to forward slashes for cross-platform compatibility
  let urlStr = url.trim().replace(/\\/g, '/');
  if (!urlStr) return null;

  // 0. Ignore and return null for local disk paths
  if (urlStr.match(/^[a-zA-Z]:\//) || urlStr.startsWith('Users/') || urlStr.startsWith('/Users/')) {
    console.warn('Detected local disk path in avatar URL:', urlStr);
    return null;
  }

  // 1. Absolute URLs
  if (urlStr.startsWith('http') || urlStr.startsWith('data:') || urlStr.startsWith('blob:')) {
    return urlStr;
  }

  // 2. Relative paths -> Point to Backend /uploads
  // API_BASE_URL usually ends with /api (e.g. https://awokta.com/api)
  // But static files are often served from root (https://awokta.com/uploads/...) OR /api/uploads
  // Logic: 
  // If the server serves via /api/uploads, then keep /api. 
  // If the server serves via /uploads (root), strip /api.
  // PREVIOUSLY: We added app.use('/api/uploads') in server.js.
  // So: https://awokta.com/api/uploads/filename.jpg SHOULD work.

  // LET'S TRY BOTH: Return the path that includes /api/ first as that is what we configured.
  const base = (apiBaseUrl || '').replace(/\/$/, '');

  // Remove leading slash
  const pathPart = urlStr.startsWith('/') ? urlStr.substring(1) : urlStr;

  // If it already starts with 'uploads/'
  if (pathPart.startsWith('uploads/')) {
    // If base already has /api, then result is .../api/uploads/...
    // This matches our new server.js route.
    return `${base}/${pathPart}`;
  }

  // Otherwise, prepend 'uploads/'
  return `${base}/uploads/${pathPart}`;
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
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [brokenImages, setBrokenImages] = useState({})
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
    () => Boolean(documentDraft.title && (documentDraft.file || documentDraft.fileUrl)),
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
      const fetchedCustomers = data.customers || []
      // Sort customers by ID (ascending) as per user request
      const sortedCustomers = fetchedCustomers.sort((a, b) => a.id - b.id)
      setCustomers(sortedCustomers)

      // Fetch Tickets for Real-time count
      try {
        const ticketsRes = await fetch(`${API_BASE_URL}/tickets`, { credentials: 'include' })
        const ticketsData = await ticketsRes.json()
        if (ticketsRes.ok) {
          const realTicketCount = ticketsData.tickets ? ticketsData.tickets.length : 0
          setSummary(prev => ({
            ...prev,
            totalTickets: realTicketCount
          }))
        }
      } catch (err) {
        console.error('Failed to fetch tickets for summary', err)
      }

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

  const location = useLocation()
  useEffect(() => {
    if (location.state?.openForm) {
      setViewMode('form')
      resetForm()
      window.history.replaceState({}, document.title)
    }
  }, [location])

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
    console.log('File selected:', file.name, file.size)
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

    // Auto-fill title with filename if empty
    setDocumentDraft(prev => ({
      ...prev,
      file,
      fileUrl: file.name,
      title: prev.title || file.name
    }))

    // Reset file input so user can pick again even the same file
    event.target.value = ''
  }

  const handleAddDocument = () => {
    if (!documentDraft.file && !documentDraft.fileUrl) return
    if (!documentDraft.title) return

    setDocuments(prev => [...prev, { ...documentDraft }])
    setDocumentDraft(initialDocument)
  }

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index))
  }


  const handleSubmitCustomer = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      if (!name || !accountEmail) {
        throw new Error('Please fill in required fields.')
      }

      console.log('Starting customer submission...', { name, profileFile: profileFile?.name })

      const finalPersons = [...persons]
      if (canAddPerson) finalPersons.push(personDraft)

      if (finalPersons.length === 0) {
        throw new Error('Please add at least one authorised person.')
      }

      const finalDocuments = [...documents]
      if (canAddDocument) finalDocuments.push(documentDraft)

      let finalProfileImageUrl = editingCustomerId ? profilePreview : ''

      console.log('Current profileFile state:', profileFile)
      if (profileFile) {
        console.log('Uploading profile image...')
        const uploadedUrl = await uploadProfileImage(profileFile)
        console.log('Upload result:', uploadedUrl)
        if (uploadedUrl) {
          finalProfileImageUrl = uploadedUrl
        }
      } else {
        console.log('No profileFile selected, keeping:', finalProfileImageUrl)
      }

      // Final check: if it's still a blob URL (happens if we don't process it correctly), clear it
      if (finalProfileImageUrl && finalProfileImageUrl.startsWith('blob:')) {
        console.warn('Final image URL is still a blob, reverting to empty.')
        finalProfileImageUrl = ''
      }

      // Clean up local paths just in case (e.g. remove leading slashes if they are not absolute)
      if (finalProfileImageUrl && !finalProfileImageUrl.startsWith('http') && !finalProfileImageUrl.startsWith('data:')) {
        // If it looks like "/uploads/..." make it "uploads/..."
        if (finalProfileImageUrl.startsWith('/')) {
          finalProfileImageUrl = finalProfileImageUrl.substring(1)
        }
      }

      const documentsWithUrls = []
      for (const doc of finalDocuments) {
        let url = doc.fileUrl
        if (doc.file) {
          // Use the same unified upload for documents too
          const uploadedUrl = await uploadProfileImage(doc.file)
          if (uploadedUrl) {
            url = uploadedUrl
          }
        }
        documentsWithUrls.push({
          title: doc.title,
          fileUrl: url,
          expiryDate: doc.expiryDate ? String(doc.expiryDate).split('T')[0] : null,
        })
      }

      const payload = {
        customerType,
        name,
        accountEmail,
        companyRegistrationNo,
        vatNumber,
        address,
        profileImageUrl: finalProfileImageUrl,
        status,
        persons: finalPersons,
        documents: documentsWithUrls,
      }

      console.log('Submitting Customer Payload:', payload)

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
          expiryDate: d.expiryDate ? String(d.expiryDate).split('T')[0] : '',
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

  const handleViewDocument = (fileUrl) => {
    if (!fileUrl) return;

    if (fileUrl.startsWith('data:')) {
      try {
        const [parts, base64Data] = fileUrl.split(',');
        const mime = parts.split(':')[1].split(';')[0];
        const binary = atob(base64Data);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        const blob = new Blob([array], { type: mime });
        const blobUrl = URL.createObjectURL(blob);

        // Use a temporary link to open the blob URL
        const blobWin = window.open(blobUrl, '_blank');
        if (!blobWin || blobWin.closed || typeof blobWin.closed === 'undefined') {
          // If blocked, try direct download/open
          const a = document.createElement('a');
          a.href = blobUrl;
          a.target = '_blank';
          const filename = `document_${Date.now()}.${mime.split('/')[1] || 'bin'}`;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error('Base64 decode error', err);
        window.open(fileUrl, '_blank');
      }
    } else if (fileUrl.startsWith('http')) {
      window.open(fileUrl, '_blank');
    } else {
      const base = API_BASE_URL.replace(/\/api\/?$/, '');
      const filename = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
      const fullUrl = filename.includes('uploads/')
        ? `${base}/${filename}`
        : `${base}/uploads/${filename}`;

      // For PDF/Images, we want to open them. 
      // If the file is missing, the server might redirect. 
      // We can't easily check for file existence without a proxy, so we just open.
      window.open(fullUrl, '_blank');
    }
  };

  const handleCreateLeadFromCustomer = (customer) => {
    if (!customer) return
    localStorage.setItem(
      'selectedCustomerForLead',
      JSON.stringify({ id: customer.id, name: customer.name, accountEmail: customer.accountEmail }),
    )
    navigate('/dashboard', { state: { openLeads: true, openForm: true } })
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
          <button type="button" className="customers-back" onClick={() => setViewMode('list')} aria-label="Go back">
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="customers-title">{editingCustomerId ? 'Update Customer' : 'Add Customer'}</h1>
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

              <div className="customers-field customers-field--full">
                <span>Profile Picture</span>
                <div className="profile-upload-zone">
                  <div
                    className="avatar-edit-circle"
                    onClick={() => document.getElementById('profile-file-input').click()}
                  >
                    {profilePreview ? (
                      <img src={profilePreview} alt="Preview" className="avatar-preview-img" />
                    ) : (
                      <div className="avatar-placeholder">
                        <FiMoreVertical style={{ transform: 'rotate(90deg)' }} />
                      </div>
                    )}
                    <div className="avatar-edit-overlay">
                      <span>Change</span>
                    </div>
                  </div>
                  <input
                    id="profile-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileFileChange}
                    style={{ display: 'none' }}
                  />
                  <div className="profile-upload-info">
                    <p className="upload-main-text">Click circle to upload photo</p>
                    <p className="upload-sub-text">JPG, PNG or GIF. Max 5MB.</p>
                  </div>
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

            <div className="document-manager">
              <div className="document-controls">
                <div
                  className={`document-dropzone ${documentDraft.file ? 'has-file' : ''}`}
                  onClick={() => document.getElementById('customer-file-upload').click()}
                >
                  <input
                    id="customer-file-upload"
                    type="file"
                    onChange={handleDocumentFileChange}
                    style={{ display: 'none' }}
                  />
                  <FiFileText className="dropzone-icon" />
                  <div className="dropzone-text">
                    {documentDraft.file ? (
                      <span className="selected-filename">{documentDraft.file.name}</span>
                    ) : (
                      'Click to select a file'
                    )}
                  </div>
                </div>

                <div className="document-draft-fields">
                  <div className="draft-field">
                    <label>Title</label>
                    <input
                      type="text"
                      value={documentDraft.title}
                      onChange={(e) => handleDocumentDraftChange('title', e.target.value)}
                      placeholder="e.g. Passport, Trading License"
                    />
                  </div>
                  <div className="draft-field">
                    <label>Expiry Date</label>
                    <input
                      type="date"
                      value={documentDraft.expiryDate}
                      onChange={(e) => handleDocumentDraftChange('expiryDate', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="add-doc-btn"
                    onClick={handleAddDocument}
                    disabled={!documentDraft.file && !documentDraft.fileUrl || !documentDraft.title}
                  >
                    Add Document
                  </button>
                </div>
              </div>

              {documents.length > 0 && (
                <div className="document-preview-table-wrapper">
                  <table className="document-preview-table">
                    <thead>
                      <tr>
                        <th>Document Title</th>
                        <th>Expiry Date</th>
                        <th>File Name</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((d, index) => (
                        <tr key={index}>
                          <td className="doc-title-cell">{d.title}</td>
                          <td className="doc-expiry-cell">
                            {d.expiryDate ? (
                              <span className="expiry-date-tag">{d.expiryDate ? String(d.expiryDate).split('T')[0] : '-'}</span>
                            ) : (
                              <span className="no-expiry">No Expiry</span>
                            )}
                          </td>
                          <td className="doc-filename-cell">
                            <span className="filename-chip">{d.file ? d.file.name : d.fileUrl}</span>
                          </td>
                          <td className="doc-action-cell">
                            <button
                              type="button"
                              className="remove-doc-btn"
                              onClick={() => removeDocument(index)}
                              title="Remove"
                            >
                              <FiX />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
              {saving ? 'Saving...' : (editingCustomerId ? 'Update' : 'Add Customer')}
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
        <button
          type="button"
          className="customers-primary-btn"
          onClick={() => {
            resetForm()
            setViewMode('form')
          }}
        >
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
                <th>ID</th>
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
                  <td colSpan={7} className="customers-empty">
                    Loading customers...
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="customers-empty">
                    No customers found.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>#AIM-C-{customer.id}</td>
                    <td>
                      <div className="customers-name-cell">
                        {(() => {
                          const avatarUrl = getAvatarUrl(customer.profileImageUrl, API_BASE_URL);
                          if (avatarUrl && !brokenImages[customer.id]) {
                            // Debug log for the first few rows to verify paths in console
                            if (customer.id % 5 === 0) {
                              console.log(`[Avatar Debug] CID:${customer.id} URL:${avatarUrl}`);
                            }
                            return (
                              <img
                                key={`img-${customer.id}-${avatarUrl}`}
                                src={avatarUrl}
                                alt={customer.name}
                                className="customers-avatar"
                                onError={(e) => {
                                  console.warn(`Failed to load avatar for ${customer.name}:`, avatarUrl);
                                  setBrokenImages((prev) => ({ ...prev, [customer.id]: true }));
                                }}
                              />
                            );
                          }
                          return (
                            <div className="customers-avatar-fallback" key={`fallback-${customer.id}`}>
                              {customer.name ? customer.name[0].toUpperCase() : '?'}
                            </div>
                          );
                        })()}
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
                        <div className="customers-doc-container">
                          <div
                            className="customers-doc-pill"
                            style={{ cursor: 'pointer' }}
                            title="Click to view all documents"
                            onClick={() => handleViewCustomer(customer.id)}
                          >
                            <span className="doc-title-main">{customer.documentTitle}</span>
                            {customer.documentCount > 1 && (
                              <span className="doc-count-badge">+{customer.documentCount - 1} more</span>
                            )}
                            {customer.documentExpiryDate && (() => {
                              const status = getDocumentStatus(customer.documentExpiryDate);
                              return (
                                <div
                                  className="expiry-warning-badge"
                                  style={{
                                    color: status.color,
                                    fontWeight: '600',
                                    fontSize: '11px',
                                    marginTop: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <span className="expiry-dot" style={{ background: status.color }} />
                                  {status.label}
                                  <span className="expiry-full-date">({status.expiryDate})</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <span className="no-docs-hint">No documents</span>
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
                {(() => {
                  const avatarUrl = getAvatarUrl(customerDetails.customer.profileImageUrl, API_BASE_URL);
                  if (avatarUrl) {
                    return (
                      <img
                        src={avatarUrl}
                        alt={customerDetails.customer.name}
                        className="customer-modal-avatar"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          // Show fallback if modal image fails
                          const parent = e.target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'customer-modal-avatar';
                            fallback.innerText = customerDetails.customer.name[0]?.toUpperCase() || '?';
                            parent.insertBefore(fallback, e.target);
                          }
                        }}
                      />
                    );
                  }
                  return (
                    <div className="customer-modal-avatar">
                      {customerDetails.customer.name[0]?.toUpperCase() || '?'}
                    </div>
                  );
                })()}
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
                <div className="customer-modal-doc-grid">
                  {customerDetails.documents.map((d) => {
                    const status = d.expiryDate ? getDocumentStatus(d.expiryDate) : null;
                    return (
                      <div key={d.id} className="customer-modal-doc-card">
                        <div className="doc-card-info">
                          <FiFileText className="doc-card-icon" />
                          <div>
                            <strong>{d.title}</strong>
                            {status && (
                              <div className="doc-card-expiry" style={{ color: status.color }}>
                                {status.label} ({String(status.expiryDate).split('T')[0]})
                              </div>
                            )}
                          </div>
                        </div>
                        {d.fileUrl && (
                          <button
                            type="button"
                            className="doc-view-link"
                            onClick={() => handleViewDocument(d.fileUrl)}
                            title="View / Download"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                          >
                            <FiEye />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  )
}

export default CustomersPage
