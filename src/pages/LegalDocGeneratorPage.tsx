import { useState } from 'react';
import toast from 'react-hot-toast';
import { FileDown, Loader2 } from 'lucide-react';
import PartyRowsEditor from '@/components/legal-docs/PartyRowsEditor';
import ParagraphListEditor from '@/components/legal-docs/ParagraphListEditor';
import { generateLegalDocument } from '@/lib/legalDocApi';
import {
  COURT_NAME_OPTIONS,
  LEGAL_DOC_TYPE_HINTS,
  LEGAL_DOC_TYPE_LABELS,
  PARENT_CASE_TYPE_OPTIONS,
  defaultIaPetitionFields,
  defaultQuashPetitionFields,
  defaultRepresentationFields,
  defaultRtiFields,
  formatDateForFiling,
  type IaPetitionFields,
  type LegalDocType,
  type QuashPetitionFields,
  type RepresentationLetterFields,
  type RtiApplicationFields,
} from '@/lib/legalDocSchemas';

const fieldClass =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const DOC_TYPES: LegalDocType[] = ['rti_application', 'representation_letter', 'ia_petition', 'quash_petition'];

export default function LegalDocGeneratorPage() {
  const [docType, setDocType] = useState<LegalDocType>('rti_application');
  const [generating, setGenerating] = useState(false);

  const [rti, setRti] = useState<RtiApplicationFields>(defaultRtiFields());
  const [rep, setRep] = useState<RepresentationLetterFields>(defaultRepresentationFields());
  const [ia, setIa] = useState<IaPetitionFields>(defaultIaPetitionFields());
  const [quash, setQuash] = useState<QuashPetitionFields>(defaultQuashPetitionFields());

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      if (docType === 'rti_application') {
        await generateLegalDocument(
          'rti_application',
          { ...rti, application_date: formatDateForFiling(rti.application_date) },
          `RTI Application - ${rti.applicant.name || 'draft'}`
        );
      } else if (docType === 'representation_letter') {
        await generateLegalDocument(
          'representation_letter',
          { ...rep, letter_date: formatDateForFiling(rep.letter_date) },
          `Representation Letter - ${rep.sender.name || 'draft'}`
        );
      } else if (docType === 'ia_petition') {
        await generateLegalDocument(
          'ia_petition',
          {
            ...ia,
            filing_date: formatDateForFiling(ia.filing_date),
          },
          `IA Petition - ${ia.parent_case_no || 'draft'}`
        );
      } else {
        await generateLegalDocument(
          'quash_petition',
          {
            ...quash,
            filing_date: formatDateForFiling(quash.filing_date),
          },
          `Quash Petition - ${quash.fir_no || 'draft'}`
        );
      }
      toast.success('Document generated');
    } catch (err: any) {
      toast.error(err?.message || 'Could not generate the document');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Legal Doc Generator</h1>
        <p className="text-gray-600 mt-1">
          Fill in the form and download a ready .docx filing in the chamber's standard format —
          no retyping of the court header, cause title, or prayer wording.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-2">
        <label className={labelClass}>Document type</label>
        <select
          className={fieldClass}
          value={docType}
          onChange={(e) => setDocType(e.target.value as LegalDocType)}
        >
          {DOC_TYPES.map((t) => (
            <option key={t} value={t}>
              {LEGAL_DOC_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400">{LEGAL_DOC_TYPE_HINTS[docType]}</p>
      </div>

      {docType === 'rti_application' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Application date">
              <input
                type="date"
                className={fieldClass}
                value={rti.application_date}
                onChange={(e) => setRti({ ...rti, application_date: e.target.value })}
              />
            </Field>
            <Field label="Language of reply">
              <input
                className={fieldClass}
                value={rti.language}
                onChange={(e) => setRti({ ...rti, language: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Addressed to (PIO line, optional)">
            <input
              className={fieldClass}
              value={rti.pio_line}
              onChange={(e) => setRti({ ...rti, pio_line: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Authority name">
              <input
                className={fieldClass}
                value={rti.authority_name}
                onChange={(e) => setRti({ ...rti, authority_name: e.target.value })}
                placeholder="The Hon'ble Municipal Commissioner,"
              />
            </Field>
            <Field label="Authority office">
              <input
                className={fieldClass}
                value={rti.authority_office}
                onChange={(e) => setRti({ ...rti, authority_office: e.target.value })}
                placeholder="Municipal Council, Jagtial."
              />
            </Field>
          </div>
          <Field label='"Through" line (optional)'>
            <input
              className={fieldClass}
              value={rti.through_line}
              onChange={(e) => setRti({ ...rti, through_line: e.target.value })}
            />
          </Field>
          <Field label="Opening paragraph — what the request is about">
            <textarea
              className={fieldClass}
              rows={3}
              value={rti.opening_paragraph}
              onChange={(e) => setRti({ ...rti, opening_paragraph: e.target.value })}
            />
          </Field>
          <Field label="Background paragraph (optional)">
            <textarea
              className={fieldClass}
              rows={3}
              value={rti.background_paragraph}
              onChange={(e) => setRti({ ...rti, background_paragraph: e.target.value })}
            />
          </Field>

          <ParagraphListEditor
            label="Information requested"
            items={rti.info_requests}
            onChange={(info_requests) => setRti({ ...rti, info_requests })}
            addLabel="Add item"
          />

          <Field label="Fee paragraph">
            <textarea
              className={fieldClass}
              rows={2}
              value={rti.fee_text}
              onChange={(e) => setRti({ ...rti, fee_text: e.target.value })}
            />
          </Field>

          <PartyRowsEditor
            label="Applicant"
            parties={[rti.applicant]}
            onChange={([applicant]) => setRti({ ...rti, applicant })}
          />
        </div>
      )}

      {docType === 'representation_letter' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Authority designation">
              <input
                className={fieldClass}
                value={rep.authority_designation}
                onChange={(e) => setRep({ ...rep, authority_designation: e.target.value })}
              />
            </Field>
            <Field label="Authority office">
              <input
                className={fieldClass}
                value={rep.authority_office}
                onChange={(e) => setRep({ ...rep, authority_office: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Letter date">
              <input
                type="date"
                className={fieldClass}
                value={rep.letter_date}
                onChange={(e) => setRep({ ...rep, letter_date: e.target.value })}
              />
            </Field>
            <Field label="Salutation">
              <select
                className={fieldClass}
                value={rep.salutation}
                onChange={(e) => setRep({ ...rep, salutation: e.target.value })}
              >
                <option value="Respected Sir/Madam,">Respected Sir/Madam,</option>
                <option value="Sir,">Sir,</option>
              </select>
            </Field>
          </div>
          <Field label="Subject line">
            <input
              className={fieldClass}
              value={rep.subject_line}
              onChange={(e) => setRep({ ...rep, subject_line: e.target.value })}
              placeholder='e.g. "Regarding mutation of Municipal House No. ..."'
            />
          </Field>

          <ParagraphListEditor
            label="Body paragraphs"
            items={rep.body_paragraphs}
            onChange={(body_paragraphs) => setRep({ ...rep, body_paragraphs })}
          />

          <Field label="Prayer / request paragraph">
            <textarea
              className={fieldClass}
              rows={3}
              value={rep.prayer_text}
              onChange={(e) => setRep({ ...rep, prayer_text: e.target.value })}
            />
          </Field>

          <PartyRowsEditor
            label="Sender"
            parties={[rep.sender]}
            onChange={([sender]) => setRep({ ...rep, sender })}
          />
        </div>
      )}

      {docType === 'ia_petition' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <Field label="Court">
            <select
              className={fieldClass}
              value={ia.court_name}
              onChange={(e) => setIa({ ...ia, court_name: e.target.value })}
            >
              {COURT_NAME_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="IA No.">
              <input className={fieldClass} value={ia.ia_no} onChange={(e) => setIa({ ...ia, ia_no: e.target.value })} placeholder="blank at filing" />
            </Field>
            <Field label="IA Year">
              <input className={fieldClass} value={ia.ia_year} onChange={(e) => setIa({ ...ia, ia_year: e.target.value })} />
            </Field>
            <Field label="Parent case type">
              <select
                className={fieldClass}
                value={ia.parent_case_type}
                onChange={(e) => setIa({ ...ia, parent_case_type: e.target.value })}
              >
                {PARENT_CASE_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Parent case no. / year">
              <div className="flex gap-2">
                <input
                  className={fieldClass}
                  value={ia.parent_case_no}
                  onChange={(e) => setIa({ ...ia, parent_case_no: e.target.value })}
                  placeholder="No."
                />
                <input
                  className={fieldClass}
                  value={ia.parent_case_year}
                  onChange={(e) => setIa({ ...ia, parent_case_year: e.target.value })}
                  placeholder="Year"
                />
              </div>
            </Field>
          </div>

          <PartyRowsEditor
            label="Petitioners"
            parties={ia.petitioners}
            onChange={(petitioners) =>
              setIa({ ...ia, petitioners, deponent_index: Math.min(ia.deponent_index, Math.max(petitioners.length - 1, 0)) })
            }
          />
          <PartyRowsEditor
            label="Respondents"
            parties={ia.respondents}
            onChange={(respondents) => setIa({ ...ia, respondents })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Application filed under">
              <input
                className={fieldClass}
                value={ia.application_section}
                onChange={(e) => setIa({ ...ia, application_section: e.target.value })}
              />
            </Field>
            <Field label="Nature of application (optional)" hint='e.g. "FOR BEING MENTIONED", "IMPLEAD PETITION"'>
              <input
                className={fieldClass}
                value={ia.nature_label}
                onChange={(e) => setIa({ ...ia, nature_label: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Prayer">
            <textarea
              className={fieldClass}
              rows={3}
              value={ia.prayer_text}
              onChange={(e) => setIa({ ...ia, prayer_text: e.target.value })}
            />
          </Field>

          <div className="flex items-center gap-2">
            <input
              id="include_affidavit"
              type="checkbox"
              checked={ia.include_affidavit}
              onChange={(e) => setIa({ ...ia, include_affidavit: e.target.checked })}
            />
            <label htmlFor="include_affidavit" className="text-sm font-medium text-gray-700">
              Include a supporting Affidavit + Verification page
            </label>
          </div>

          {ia.include_affidavit && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <Field label="Deponent">
                <select
                  className={fieldClass}
                  value={ia.deponent_index}
                  onChange={(e) => setIa({ ...ia, deponent_index: Number(e.target.value) })}
                >
                  {ia.petitioners.map((p, i) => (
                    <option key={i} value={i}>
                      {p.name || `Petitioner ${i + 1}`}
                    </option>
                  ))}
                </select>
              </Field>

              <ParagraphListEditor
                label="Affidavit paragraphs"
                items={ia.affidavit_paragraphs}
                onChange={(affidavit_paragraphs) => setIa({ ...ia, affidavit_paragraphs })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Verified at (place)">
                  <input
                    className={fieldClass}
                    value={ia.verification_place}
                    onChange={(e) => setIa({ ...ia, verification_place: e.target.value })}
                  />
                </Field>
                <Field label="Verification date" hint='e.g. "05th of April, 2026"'>
                  <input
                    className={fieldClass}
                    value={ia.verification_date}
                    onChange={(e) => setIa({ ...ia, verification_date: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <Field label="Filing place">
              <input
                className={fieldClass}
                value={ia.filing_place}
                onChange={(e) => setIa({ ...ia, filing_place: e.target.value })}
              />
            </Field>
            <Field label="Filing date">
              <input
                type="date"
                className={fieldClass}
                value={ia.filing_date}
                onChange={(e) => setIa({ ...ia, filing_date: e.target.value })}
              />
            </Field>
          </div>

          <AdvocateFields advocate={ia.advocate} onChange={(advocate) => setIa({ ...ia, advocate })} />
        </div>
      )}

      {docType === 'quash_petition' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <Field label="Court">
            <select
              className={fieldClass}
              value={quash.court_name}
              onChange={(e) => setQuash({ ...quash, court_name: e.target.value })}
            >
              {COURT_NAME_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Crl.P. No.">
              <input className={fieldClass} value={quash.crlp_no} onChange={(e) => setQuash({ ...quash, crlp_no: e.target.value })} placeholder="blank at filing" />
            </Field>
            <Field label="Crl.P. Year">
              <input className={fieldClass} value={quash.crlp_year} onChange={(e) => setQuash({ ...quash, crlp_year: e.target.value })} />
            </Field>
            <Field label="FIR No.">
              <input className={fieldClass} value={quash.fir_no} onChange={(e) => setQuash({ ...quash, fir_no: e.target.value })} />
            </Field>
            <Field label="FIR Year">
              <input className={fieldClass} value={quash.fir_year} onChange={(e) => setQuash({ ...quash, fir_year: e.target.value })} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Sections">
              <input
                className={fieldClass}
                value={quash.sections}
                onChange={(e) => setQuash({ ...quash, sections: e.target.value })}
                placeholder="118(1), r/w 3(5) BNS"
              />
            </Field>
            <Field label="Police station">
              <input
                className={fieldClass}
                value={quash.police_station}
                onChange={(e) => setQuash({ ...quash, police_station: e.target.value })}
              />
            </Field>
            <Field label="Trial court">
              <input
                className={fieldClass}
                value={quash.trial_court}
                onChange={(e) => setQuash({ ...quash, trial_court: e.target.value })}
                placeholder="XVI ADDL CHIEF JUDICIAL MAGISTRATE AT NAMPALLY HYDERABAD"
              />
            </Field>
          </div>

          <PartyRowsEditor
            label="Petitioners / Accused"
            parties={quash.petitioners}
            onChange={(petitioners) => setQuash({ ...quash, petitioners })}
          />
          <PartyRowsEditor
            label="Respondents"
            parties={quash.respondents}
            onChange={(respondents) => setQuash({ ...quash, respondents })}
          />

          <ParagraphListEditor
            label="Grounds for quashing"
            items={quash.grounds}
            onChange={(grounds) => setQuash({ ...quash, grounds })}
            addLabel="Add ground"
          />

          <Field label="Main prayer">
            <textarea
              className={fieldClass}
              rows={3}
              value={quash.main_prayer}
              onChange={(e) => setQuash({ ...quash, main_prayer: e.target.value })}
            />
          </Field>
          <Field label="Stay prayer (optional)">
            <textarea
              className={fieldClass}
              rows={3}
              value={quash.stay_prayer}
              onChange={(e) => setQuash({ ...quash, stay_prayer: e.target.value })}
            />
          </Field>

          <div className="flex items-center gap-2">
            <input
              id="include_dispense_with"
              type="checkbox"
              checked={quash.include_dispense_with}
              onChange={(e) => setQuash({ ...quash, include_dispense_with: e.target.checked })}
            />
            <label htmlFor="include_dispense_with" className="text-sm font-medium text-gray-700">
              Include a "Dispense With Certified Copy" clause
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <Field label="Filing place">
              <input
                className={fieldClass}
                value={quash.filing_place}
                onChange={(e) => setQuash({ ...quash, filing_place: e.target.value })}
              />
            </Field>
            <Field label="Filing date">
              <input
                type="date"
                className={fieldClass}
                value={quash.filing_date}
                onChange={(e) => setQuash({ ...quash, filing_date: e.target.value })}
              />
            </Field>
          </div>

          <AdvocateFields advocate={quash.advocate} onChange={(advocate) => setQuash({ ...quash, advocate })} />
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg hover:from-amber-600 hover:to-amber-700 disabled:opacity-60"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          {generating ? 'Generating…' : 'Generate Word Document'}
        </button>
      </div>
    </div>
  );
}

function AdvocateFields({
  advocate,
  onChange,
}: {
  advocate: IaPetitionFields['advocate'];
  onChange: (advocate: IaPetitionFields['advocate']) => void;
}) {
  return (
    <div className="space-y-4 border-t border-gray-100 pt-4">
      <h3 className="text-sm font-semibold text-gray-900">Counsel for the petitioner (filing footer)</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Advocate name">
          <input
            className={fieldClass}
            value={advocate.advocate_name}
            onChange={(e) => onChange({ ...advocate, advocate_name: e.target.value })}
          />
        </Field>
        <Field label="Enrollment no.">
          <input
            className={fieldClass}
            value={advocate.enrollment_no}
            onChange={(e) => onChange({ ...advocate, enrollment_no: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Office address">
        <textarea
          className={fieldClass}
          rows={2}
          value={advocate.office_address}
          onChange={(e) => onChange({ ...advocate, office_address: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Email">
          <input
            className={fieldClass}
            value={advocate.email}
            onChange={(e) => onChange({ ...advocate, email: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <input
            className={fieldClass}
            value={advocate.phone}
            onChange={(e) => onChange({ ...advocate, phone: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
