export type UserRole = "OFFICER" | "MANAGER" | "ADMIN"

export interface LenderUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  user: LenderUser
}

export interface ApplicationSummary {
  application_id: string
  applicant_name: string
  email: string
  loan_type: string
  requested_amount: number
  application_status: string
  ai_decision: string | null
  risk_tier: string | null
  risk_score: number | null
  human_review_status: string | null
  created_at: string
}

export interface ReviewQueueItem {
  id: string
  application_id: string
  status: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "OVERRIDDEN"
  assigned_to: string | null
  ai_decision: "APPROVE" | "COUNTER_OFFER" | "DECLINE"
  ai_risk_tier: string | null
  ai_risk_score: number | null
  ai_suggested_amount: number | null
  ai_suggested_rate: number | null
  ai_suggested_tenure: number | null
  ai_counter_options: CounterOfferOption[] | null
  ai_reasoning: string[] | null
  ai_decline_reason: string | null
  applicant_name: string
  email: string
  loan_type: string
  requested_amount: number
  created_at: string
  assigned_at: string | null
  decided_at: string | null
}

export interface CounterOfferOption {
  offer_id: string
  principal_amount: number
  tenure_months: number
  interest_rate: number
  monthly_emi: number
  label: string
}

export interface RiskTierConfig {
  id: string
  tier: "A" | "B" | "C" | "F"
  min_interest_rate: number
  max_interest_rate: number
  default_interest_rate: number
  max_loan_amount: number
  min_loan_amount: number
  min_credit_score: number
  max_dti_ratio: number
  effective_from: string
  created_by: string | null
  created_by_name: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface LoanPolicy {
  id: string
  policy_key: string
  policy_value: { value: number; unit?: string }
  description: string
  category: "LIMITS" | "UNDERWRITING" | "DISBURSEMENT" | "KYC"
  is_active: boolean
  effective_from: string
  created_by: string | null
  created_by_name: string | null
  notes: string | null
  created_at: string
}

export interface DashboardKPIs {
  total_applications: number
  pending_review: number
  in_review: number
  approved_today: number
  rejected_today: number
  total_disbursed_amount: number
  avg_risk_score: number
  approval_rate_percent: number
  avg_loan_amount: number
  avg_processing_time_hours: number
}

export interface PaginatedResponse<T> {
  total: number
  page: number
  page_size: number
  items: T[]
}

export interface ApplicationChartPoint {
  date: string
  total: number
  approved: number
  declined: number
  counter_offer: number
  pending: number
}

export interface ApplicationsReport {
  chart_data: ApplicationChartPoint[]
  summary: {
    total: number
    approved: number
    declined: number
    counter_offer: number
    pending_human_review: number
    human_rejected: number
  }
}

export interface RiskByTier {
  tier: string
  count: number
  total_amount: number
  avg_rate: number
  approval_rate: number
}

export interface RiskDistributionReport {
  by_tier: RiskByTier[]
  score_histogram: { bucket: string; count: number }[]
}

export interface DisbursementChartPoint {
  date: string
  count: number
  total_amount: number
  avg_amount: number
}

export interface DisbursementsReport {
  chart_data: DisbursementChartPoint[]
  summary: {
    total_count: number
    total_amount: number
    avg_loan_amount: number
    avg_interest_rate: number
    avg_tenure_months: number
    total_interest_income: number
  }
}

export interface OfficerPerformance {
  officer_id: string
  officer_name: string
  reviewed_count: number
  avg_review_time_hours: number
  approved: number
  rejected: number
  overridden: number
}

export interface ReviewPerformanceReport {
  by_officer: OfficerPerformance[]
  override_rate_percent: number
  ai_agreement_rate: number
}

export interface TimelineEvent {
  timestamp: string
  event: string
  stage: string
  status: string
  message: string
}

// ---------------------------------------------------------------------------
// Application Detail (full, from /applications/{id})
// ---------------------------------------------------------------------------

export interface AddressDetail {
  address_id: string
  address_type: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  country: string | null
  housing_status: string | null
  monthly_housing_payment: number | null
  years_at_address: number | null
  months_at_address: number | null
}

export interface EmploymentDetail {
  employment_id: string
  employment_type: string | null
  employment_status: string | null
  employer_name: string | null
  job_title: string | null
  start_date: string | null
  experience: string | null
  self_employed_flag: boolean | null
  gross_monthly_income: number | null
}

export interface IncomeDetail {
  income_id: string
  income_type: string
  description: string | null
  monthly_amount: number | null
  income_frequency: string | null
}

export interface AssetDetail {
  asset_id: string
  asset_type: string
  institution_name: string | null
  value: number | null
  ownership_type: string | null
}

export interface LiabilityDetail {
  liability_id: string
  liability_type: string
  creditor_name: string | null
  outstanding_balance: number | null
  monthly_payment: number | null
  months_remaining: number | null
  delinquent_flag: boolean | null
}

export interface DocumentDetail {
  document_id: string
  document_type: string
  file_name: string | null
  mime_type: string | null
  file_size: number | null
  uploaded_at: string | null
  is_low_quality: boolean | null
}

export interface ApplicantDetail {
  applicant_id: string
  application_id: string
  first_name: string | null
  middle_name: string | null
  last_name: string | null
  suffix: string | null
  date_of_birth: string | null
  applicant_role: string
  email: string | null
  ssn_last4: string | null
  phone_number: string | null
  gender: string | null
  citizenship_status: string | null
  addresses: AddressDetail[]
  employment: EmploymentDetail | null
  incomes: IncomeDetail[]
  assets: AssetDetail[]
  liabilities: LiabilityDetail[]
}

export interface IdentityCheckDetail {
  id: string
  final_status: string
  aggregated_score: number | null
  hard_fail_triggered: boolean | null
  ssn_valid: boolean | null
  name_ssn_match: boolean | null
  dob_ssn_match: boolean | null
  deceased_flag: boolean | null
}

export interface AmlCheckDetail {
  id: string
  ofac_match: boolean | null
  ofac_confidence: number | null
  pep_match: boolean | null
  aml_score: number | null
  flags: string[] | null
}

export interface KycResultDetail {
  kyc_case_id: string
  applicant_id: string
  status: "PASSED" | "FAILED" | "REVIEW"
  confidence_score: number | null
  rules_version: string | null
  created_at: string
  completed_at: string | null
  risk_decision: string | null
  identity_check: IdentityCheckDetail | null
  aml_check: AmlCheckDetail | null
}

export interface UnderwritingResultDetail {
  id: string
  decision: "APPROVE" | "COUNTER_OFFER" | "DECLINE"
  risk_tier: string | null
  risk_score: number | null
  approved_amount: number | null
  disbursement_amount: number | null
  interest_rate: number | null
  tenure_months: number | null
  explanation: string | null
  decline_reason: string | null
  reasoning_steps: string[]
  counter_offer_options: CounterOfferOption[] | null
  created_at: string
}

export interface RepaymentScheduleEntry {
  installment: number
  due_date: string
  principal: number
  interest: number
  balance: number
}

export interface DisbursementDetail {
  id: string
  transaction_id: string | null
  status: string
  disbursement_amount: number | null
  monthly_emi: number | null
  total_interest: number | null
  total_repayment: number | null
  transfer_timestamp: string | null
  repayment_schedule: RepaymentScheduleEntry[] | null
  created_at: string
}

export interface HumanReviewDecisionDetail {
  id: string
  decision: string
  override_amount: number | null
  override_rate: number | null
  override_tenure: number | null
  selected_offer_id: string | null
  notes: string | null
  reviewed_by: string
  created_at: string
}

export interface HumanReviewSummary {
  queue_id: string
  status: string
  assigned_to: string | null
  ai_decision: string
  ai_risk_tier: string | null
  ai_risk_score: number | null
  ai_suggested_amount: number | null
  ai_suggested_rate: number | null
  ai_suggested_tenure: number | null
  ai_counter_options: Record<string, unknown> | null
  ai_reasoning: string[] | null
  ai_decline_reason: string | null
  created_at: string
  assigned_at: string | null
  decided_at: string | null
  latest_decision: HumanReviewDecisionDetail | null
}

export interface LoanApplicationDetail {
  application_id: string
  loan_type: string
  credit_type: string | null
  loan_purpose: string | null
  requested_amount: number | null
  requested_term_months: number | null
  preferred_payment_day: number | null
  origination_channel: string | null
  application_status: string
  created_at: string
  updated_at: string | null
}

export interface ApplicationDetail {
  application: LoanApplicationDetail
  applicant: ApplicantDetail | null
  documents: DocumentDetail[]
  kyc: KycResultDetail | null
  underwriting: UnderwritingResultDetail | null
  disbursement: DisbursementDetail | null
  human_review: HumanReviewSummary | null
}
