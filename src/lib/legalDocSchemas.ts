/**
 * Field types, defaults, and option lists for the Legal Doc Generator.
 *
 * These mirror legal_doc_engine.py's context builders field-for-field. If a
 * key here doesn't match what the backend expects, the backend returns a
 * clear 400 ("X is required") rather than silently producing a broken
 * document — see LegalDocGeneratorPage.tsx's error handling.
 */

export type LegalDocType =
  | 'rti_application'
  | 'representation_letter'
  | 'ia_petition'
  | 'quash_petition';

export const LEGAL_DOC_TYPE_LABELS: Record<LegalDocType, string> = {
  rti_application: 'RTI Application',
  representation_letter: 'Representation / Complaint Letter',
  ia_petition: 'High Court IA Petition',
  quash_petition: 'Criminal Quash Petition (Sec 528 BNSS)',
};

export const LEGAL_DOC_TYPE_HINTS: Record<LegalDocType, string> = {
  rti_application: 'RTI Act, 2005 request for information from a public authority.',
  representation_letter: 'Letter to a Municipal Commissioner or other authority raising a grievance.',
  ia_petition: 'IA under Sec 151 CPC in a pending High Court writ/case — e.g. For Being Mentioned, Implead, Stay.',
  quash_petition: 'Criminal petition under Sec 528 BNSS to quash an FIR.',
};

export interface PartyInput {
  name: string;
  relation_type: string; // 'S/o' | 'D/o' | 'W/o' | 'H/o' | ''
  related_to: string;
  relation_text: string; // free-text override, e.g. "rep. by its Secretary..." for institutional parties
  age: string;
  occupation: string;
  address: string;
  phone: string;
}

export function emptyParty(): PartyInput {
  return {
    name: '',
    relation_type: '',
    related_to: '',
    relation_text: '',
    age: '',
    occupation: '',
    address: '',
    phone: '',
  };
}

export const RELATION_TYPE_OPTIONS = ['S/o', 'D/o', 'W/o', 'H/o'];

export const COURT_NAME_OPTIONS = ['HIGH COURT FOR THE STATE OF TELANGANA AT HYDERABAD'];

export const PARENT_CASE_TYPE_OPTIONS = ['W.P.No.', 'Crl.P.No.', 'O.S.No.', 'C.C.No.', 'I.A.No.'];

export interface AdvocateProfile {
  advocate_name: string;
  enrollment_no: string;
  office_address: string;
  email: string;
  phone: string;
}

// Pre-filled with the chamber's own letterhead details so they don't need to
// be retyped on every filing — editable in the form if a different advocate
// at the chamber is filing.
export const DEFAULT_ADVOCATE_PROFILE: AdvocateProfile = {
  advocate_name: 'Md. Fasiuddin',
  enrollment_no: '19272',
  office_address: '16-2-836/2A/1, Madhava Nagar, Saidabad, Hyderabad-500 059, Telangana, India.',
  email: 'fasiuddinadvocate@gmail.com',
  phone: '6304851791',
};

/** yyyy-mm-dd (from <input type="date">) -> dd-mm-yyyy (matches every sample filing). */
export function formatDateForFiling(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}-${m}-${y}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// RTI Application
// ---------------------------------------------------------------------------
export interface RtiApplicationFields {
  application_date: string; // yyyy-mm-dd in the form, converted on submit
  pio_line: string;
  authority_name: string;
  authority_office: string;
  through_line: string;
  language: string;
  opening_paragraph: string;
  background_paragraph: string;
  info_requests: string[];
  fee_text: string;
  applicant: PartyInput;
}

export function defaultRtiFields(): RtiApplicationFields {
  return {
    application_date: todayIso(),
    pio_line: "The Hon'ble Public Information Officer / Assistant Public Information Officer,",
    authority_name: '',
    authority_office: '',
    through_line: '',
    language: 'Telugu',
    opening_paragraph: '',
    background_paragraph: '',
    info_requests: [''],
    fee_text:
      'I am paying Rs.10/- towards Court Fee as prescribed under the Right to Information Act, 2005. Kindly issue the receipt.',
    applicant: emptyParty(),
  };
}

// ---------------------------------------------------------------------------
// Representation Letter
// ---------------------------------------------------------------------------
export interface RepresentationLetterFields {
  authority_designation: string;
  authority_office: string;
  letter_date: string;
  salutation: string;
  subject_line: string;
  body_paragraphs: string[];
  prayer_text: string;
  sender: PartyInput;
}

export function defaultRepresentationFields(): RepresentationLetterFields {
  return {
    authority_designation: "The Hon'ble Municipal Commissioner,",
    authority_office: '',
    letter_date: todayIso(),
    salutation: 'Respected Sir/Madam,',
    subject_line: '',
    body_paragraphs: [''],
    prayer_text: '',
    sender: emptyParty(),
  };
}

// ---------------------------------------------------------------------------
// High Court IA Petition
// ---------------------------------------------------------------------------
export interface IaPetitionFields {
  court_name: string;
  ia_no: string;
  ia_year: string;
  parent_case_type: string;
  parent_case_no: string;
  parent_case_year: string;
  petitioners: PartyInput[];
  respondents: PartyInput[];
  application_section: string;
  nature_label: string;
  prayer_text: string;
  include_affidavit: boolean;
  affidavit_paragraphs: string[];
  deponent_index: number;
  verification_place: string;
  verification_date: string;
  filing_place: string;
  filing_date: string;
  advocate: AdvocateProfile;
}

export function defaultIaPetitionFields(): IaPetitionFields {
  const now = new Date();
  return {
    court_name: COURT_NAME_OPTIONS[0],
    ia_no: '',
    ia_year: String(now.getFullYear()),
    parent_case_type: 'W.P.No.',
    parent_case_no: '',
    parent_case_year: '',
    petitioners: [emptyParty()],
    respondents: [emptyParty()],
    application_section: 'SECTION 151 OF THE CODE OF CIVIL PROCEDURE, 1908',
    nature_label: '',
    prayer_text: '',
    include_affidavit: true,
    affidavit_paragraphs: [''],
    deponent_index: 0,
    verification_place: 'Hyderabad',
    verification_date: '',
    filing_place: 'Hyderabad',
    filing_date: todayIso(),
    advocate: { ...DEFAULT_ADVOCATE_PROFILE },
  };
}

// ---------------------------------------------------------------------------
// Criminal Quash Petition (Sec 528 BNSS)
// ---------------------------------------------------------------------------
export interface QuashPetitionFields {
  court_name: string;
  crlp_no: string;
  crlp_year: string;
  fir_no: string;
  fir_year: string;
  sections: string;
  police_station: string;
  trial_court: string;
  petitioners: PartyInput[];
  respondents: PartyInput[];
  grounds: string[];
  main_prayer: string;
  stay_prayer: string;
  include_dispense_with: boolean;
  filing_place: string;
  filing_date: string;
  advocate: AdvocateProfile;
}

export function defaultQuashPetitionFields(): QuashPetitionFields {
  const now = new Date();
  return {
    court_name: COURT_NAME_OPTIONS[0],
    crlp_no: '',
    crlp_year: String(now.getFullYear()),
    fir_no: '',
    fir_year: String(now.getFullYear()),
    sections: '',
    police_station: '',
    trial_court: '',
    petitioners: [emptyParty()],
    respondents: [{ ...emptyParty(), name: 'The State of Telangana', relation_text: 'rep by the Public Prosecutor, High Court of Telangana, Hyderabad.' }],
    grounds: [''],
    main_prayer: '',
    stay_prayer: '',
    include_dispense_with: false,
    filing_place: 'Hyderabad',
    filing_date: todayIso(),
    advocate: { ...DEFAULT_ADVOCATE_PROFILE },
  };
}
