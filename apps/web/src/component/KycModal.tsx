import { useEffect, useMemo, useState } from 'react'
import { Loader2, ShieldCheck, X } from 'lucide-react'
import Button from './Button'
import { createKycVerification, getKycVerifications } from '../api'
import type { KycStatusApi } from '../types/api'

interface KycModalProps {
  isOpen: boolean
  walletAddress?: string
  onClose: () => void
  onApproved: () => void
}

interface KycFormValues {
  firstName: string
  lastName: string
  email: string
  dateOfBirth: string
  country: string
  address: string
  idDocument: File | null
  consentIdentityVerification: boolean
  consentPrivacyTerms: boolean
}

interface KycFieldErrors {
  firstName?: string
  lastName?: string
  email?: string
  dateOfBirth?: string
  country?: string
  address?: string
  idDocument?: string
  consentIdentityVerification?: string
  consentPrivacyTerms?: string
}

const statusText: Record<KycStatusApi, string> = {
  pending: 'Verification submitted and pending review.',
  in_review: 'Verification is currently in review.',
  approved: 'Verification approved. You can continue.',
  rejected: 'Verification was rejected. Please resubmit.',
  expired: 'Verification expired. Please start again.',
}

const KycModal = ({ isOpen, walletAddress, onClose, onApproved }: KycModalProps) => {
  const [status, setStatus] = useState<KycStatusApi | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittedModalOpen, setIsSubmittedModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<KycFieldErrors>({})
  const [formValues, setFormValues] = useState<KycFormValues>({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    country: '',
    address: '',
    idDocument: null,
    consentIdentityVerification: false,
    consentPrivacyTerms: false,
  })

  const canStartVerification = useMemo(
    () => status === null || status === 'rejected' || status === 'expired',
    [status]
  )

  const loadStatus = async () => {
    if (!walletAddress) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getKycVerifications({ walletAddress, page: 1, limit: 1 })
      const latest = data.items?.[0]
      setStatus(latest?.status ?? null)
    } catch {
      setError('Unable to fetch verification status.')
    } finally {
      setIsLoading(false)
    }
  }

  const startVerification = async () => {
    if (!walletAddress) return
    const firstName = formValues.firstName.trim()
    const lastName = formValues.lastName.trim()
    const email = formValues.email.trim()
    const dateOfBirth = formValues.dateOfBirth.trim()
    const country = formValues.country.trim()
    const address = formValues.address.trim()
    const nextFieldErrors: KycFieldErrors = {}
    if (!firstName) nextFieldErrors.firstName = 'First name is required.'
    if (!lastName) nextFieldErrors.lastName = 'Last name is required.'
    if (!email) nextFieldErrors.email = 'Email address is required.'
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextFieldErrors.email = 'Please enter a valid email address.'
    }
    if (!dateOfBirth) nextFieldErrors.dateOfBirth = 'Date of birth is required.'
    if (!country) nextFieldErrors.country = 'Country is required.'
    if (!address) nextFieldErrors.address = 'Address is required.'
    if (!formValues.idDocument) nextFieldErrors.idDocument = 'Valid ID document is required.'
    if (!formValues.consentIdentityVerification) {
      nextFieldErrors.consentIdentityVerification = 'You must consent to identity verification.'
    }
    if (!formValues.consentPrivacyTerms) {
      nextFieldErrors.consentPrivacyTerms = 'You must agree to the Privacy Policy and Terms.'
    }
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }
    const idDocument = formValues.idDocument
    if (!idDocument) {
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const created = await createKycVerification({
        walletAddress,
        metadata: {
          flow: 'donation',
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim(),
          email,
          dateOfBirth,
          country,
          address,
          idDocument: {
            name: idDocument.name,
            type: idDocument.type,
            size: idDocument.size,
          },
          consents: {
            identityVerification: formValues.consentIdentityVerification,
            privacyPolicyAndTerms: formValues.consentPrivacyTerms,
          },
        },
      })
      setStatus(created.status)
      setFieldErrors({})
      setIsSubmittedModalOpen(true)
    } catch {
      setError('Unable to start verification right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setIsSubmittedModalOpen(false)
    loadStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, walletAddress])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div
          className="mx-auto flex w-full max-w-xl max-h-[92vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
            <button
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
              aria-label="Close KYC modal"
            >
              <X size={20} className="text-gray-600" />
            </button>
            <h2 className="text-xl font-semibold text-black">Identity verification required</h2>
            <div className="w-9" />
          </div>

          <div className="space-y-5 overflow-y-auto px-6 py-5">
            <div className="rounded-xl bg-black p-4 text-white">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                <p className="text-sm font-semibold">KYC verification</p>
              </div>
              <p className="text-sm text-gray-200">
                Complete KYC once to continue with donations from this wallet.
              </p>
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking verification status...
              </div>
            )}

            {!isLoading && status && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                {statusText[status]}
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {canStartVerification && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">First name</label>
                    <input
                      type="text"
                      required
                      value={formValues.firstName}
                      onChange={(event) => {
                        setFormValues((prev) => ({ ...prev, firstName: event.target.value }))
                        setFieldErrors((prev) => ({ ...prev, firstName: undefined }))
                      }}
                      placeholder="Enter first name"
                      className={`w-full rounded-lg px-4 py-3 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-black ${
                        fieldErrors.firstName ? 'border border-red-500' : 'border border-gray-300'
                      }`}
                    />
                    {fieldErrors.firstName && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Last name</label>
                    <input
                      type="text"
                      required
                      value={formValues.lastName}
                      onChange={(event) => {
                        setFormValues((prev) => ({ ...prev, lastName: event.target.value }))
                        setFieldErrors((prev) => ({ ...prev, lastName: undefined }))
                      }}
                      placeholder="Enter last name"
                      className={`w-full rounded-lg px-4 py-3 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-black ${
                        fieldErrors.lastName ? 'border border-red-500' : 'border border-gray-300'
                      }`}
                    />
                    {fieldErrors.lastName && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Email address</label>
                  <input
                    type="email"
                    required
                    value={formValues.email}
                    onChange={(event) => {
                      setFormValues((prev) => ({ ...prev, email: event.target.value }))
                      setFieldErrors((prev) => ({ ...prev, email: undefined }))
                    }}
                    placeholder="you@example.com"
                    className={`w-full rounded-lg px-4 py-3 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-black ${
                      fieldErrors.email ? 'border border-red-500' : 'border border-gray-300'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Date of birth</label>
                    <input
                      type="date"
                      required
                      value={formValues.dateOfBirth}
                      onChange={(event) => {
                        setFormValues((prev) => ({ ...prev, dateOfBirth: event.target.value }))
                        setFieldErrors((prev) => ({ ...prev, dateOfBirth: undefined }))
                      }}
                      className={`w-full rounded-lg px-4 py-3 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-black ${
                        fieldErrors.dateOfBirth ? 'border border-red-500' : 'border border-gray-300'
                      }`}
                    />
                    {fieldErrors.dateOfBirth && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.dateOfBirth}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Country</label>
                    <input
                      type="text"
                      required
                      value={formValues.country}
                      onChange={(event) => {
                        setFormValues((prev) => ({ ...prev, country: event.target.value }))
                        setFieldErrors((prev) => ({ ...prev, country: undefined }))
                      }}
                      placeholder="Country of residence"
                      className={`w-full rounded-lg px-4 py-3 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-black ${
                        fieldErrors.country ? 'border border-red-500' : 'border border-gray-300'
                      }`}
                    />
                    {fieldErrors.country && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.country}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    required
                    value={formValues.address}
                    onChange={(event) => {
                      setFormValues((prev) => ({ ...prev, address: event.target.value }))
                      setFieldErrors((prev) => ({ ...prev, address: undefined }))
                    }}
                    placeholder="Street, city, postal code"
                    rows={3}
                    className={`w-full resize-none rounded-lg px-4 py-3 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-black ${
                      fieldErrors.address ? 'border border-red-500' : 'border border-gray-300'
                    }`}
                  />
                  {fieldErrors.address && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.address}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Valid ID document
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,image/*"
                    onChange={(event) => {
                      setFormValues((prev) => ({
                        ...prev,
                        idDocument: event.target.files?.[0] ?? null,
                      }))
                      setFieldErrors((prev) => ({ ...prev, idDocument: undefined }))
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:text-gray-800 ${
                      fieldErrors.idDocument ? 'border border-red-500' : 'border border-gray-300'
                    }`}
                  />
                  {fieldErrors.idDocument && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.idDocument}</p>
                  )}
                  {formValues.idDocument && (
                    <p className="mt-2 text-xs text-gray-500">{formValues.idDocument.name}</p>
                  )}
                </div>

                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      required
                      checked={formValues.consentIdentityVerification}
                      onChange={(event) => {
                        setFormValues((prev) => ({
                          ...prev,
                          consentIdentityVerification: event.target.checked,
                        }))
                        setFieldErrors((prev) => ({ ...prev, consentIdentityVerification: undefined }))
                      }}
                      className="mt-0.5"
                    />
                    <span>I consent to identity verification.</span>
                  </label>
                  {fieldErrors.consentIdentityVerification && (
                    <p className="text-xs text-red-600">{fieldErrors.consentIdentityVerification}</p>
                  )}
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      required
                      checked={formValues.consentPrivacyTerms}
                      onChange={(event) => {
                        setFormValues((prev) => ({
                          ...prev,
                          consentPrivacyTerms: event.target.checked,
                        }))
                        setFieldErrors((prev) => ({ ...prev, consentPrivacyTerms: undefined }))
                      }}
                      className="mt-0.5"
                    />
                    <span>I agree to the Privacy Policy and Terms.</span>
                  </label>
                  {fieldErrors.consentPrivacyTerms && (
                    <p className="text-xs text-red-600">{fieldErrors.consentPrivacyTerms}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 border-t border-gray-200 px-6 py-5">
            <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
              Close
            </Button>
            {canStartVerification && (
              <Button
                variant="primary-bw"
                size="md"
                onClick={startVerification}
                disabled={isSubmitting || isLoading || !walletAddress}
                className="flex-1"
              >
                {isSubmitting ? 'Starting verification...' : 'Start verification'}
              </Button>
            )}
            {(status === 'pending' || status === 'in_review') && (
              <Button
                variant="secondary"
                size="md"
                onClick={loadStatus}
                disabled={isLoading}
                className="flex-1"
              >
                Check status
              </Button>
            )}
            {status === 'approved' && (
              <Button variant="primary-bw" size="md" onClick={onApproved} className="flex-1">
                Continue donation
              </Button>
            )}
          </div>
        </div>
      </div>
      {isSubmitting && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-black" />
            <h3 className="mt-3 text-lg font-semibold text-black">Submitting your KYC</h3>
            <p className="mt-1 text-sm text-gray-600">
              Please wait while we securely submit your verification details.
            </p>
          </div>
        </div>
      )}
      {isSubmittedModalOpen && (
        <div className="fixed inset-0 z-[81] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <h3 className="text-lg font-semibold text-black">KYC submitted successfully</h3>
            <p className="mt-2 text-sm text-gray-600">
              Your verification is now under review. We will notify you as soon as it is approved.
            </p>
            <Button
              variant="primary-bw"
              size="md"
              className="mt-5 w-full"
              onClick={() => setIsSubmittedModalOpen(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

export default KycModal
