'use client';

import { useEffect, useState, useRef } from 'react';
import { FileSignature, Printer, FileText, RefreshCw, AlertCircle, Edit3, Save, X, Check, Download } from 'lucide-react';
import { useAuth } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  category: string;
  content: string;
  uploaded_at: string;
}

interface AgencySettings {
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  logo: string | null;
  primary_color: string;
  secondary_color: string;
  documents: UploadedDocument[];
  contract_template: string | null;
  contract_template_name: string | null;
  contract_template_type: string | null;
}

const defaultAgency: AgencySettings = {
  name: 'Home Care Services Agency',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  email: '',
  logo: null,
  primary_color: '#1e3a8a',
  secondary_color: '#3b82f6',
  documents: [],
  contract_template: null,
  contract_template_name: null,
  contract_template_type: null,
};

interface ContractPreviewProps {
  contract: any;
  client: any;
  visitId?: string;
  onContractUpdate?: (contract: any) => void;
}

export default function ContractPreview({ contract, client, visitId, onContractUpdate }: ContractPreviewProps) {
  const { token } = useAuth();
  const [agency, setAgency] = useState<AgencySettings>(defaultAgency);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Editable contract data
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    const loadAgencySettings = async () => {
      try {
        const response = await fetch(`${API_BASE}/agency`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const data = await response.json();
          
          let contractTemplate: string | null = null;
          let contractTemplateName: string | null = null;
          let contractTemplateType: string | null = null;
          
          const documents = data.documents || [];
          const templateDoc = documents.find((doc: UploadedDocument) => doc.category === 'contract_template');
          
          if (templateDoc) {
            contractTemplate = templateDoc.content;
            contractTemplateName = templateDoc.name;
            contractTemplateType = templateDoc.type;
          }
          
          setAgency({ 
            ...defaultAgency, 
            ...data,
            documents,
            contract_template: contractTemplate,
            contract_template_name: contractTemplateName,
            contract_template_type: contractTemplateType,
          });
        } else {
          const savedSettings = localStorage.getItem('agencySettings');
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setAgency({ ...defaultAgency, ...parsed });
          }
        }
      } catch (err) {
        const savedSettings = localStorage.getItem('agencySettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setAgency({ ...defaultAgency, ...parsed });
        }
      }
    };
    loadAgencySettings();
  }, [token]);

  // Initialize edit data when contract changes
  useEffect(() => {
    if (contract) {
      const schedule = contract.schedule || {};
      const services = contract.services || [];
      const clientProfile = schedule.client_profile || {};
      
      setEditData({
        care_level: schedule.care_need_level || 'MODERATE',
        primary_diagnosis: clientProfile.primary_diagnosis || '',
        mobility_status: clientProfile.mobility_status || '',
        cognitive_status: clientProfile.cognitive_status || '',
        living_situation: clientProfile.living_situation || '',
        services: services.map((s: any) => typeof s === 'string' ? { name: s, description: '', frequency: '' } : s),
        schedule_frequency: schedule.frequency || 'As scheduled',
        schedule_days: Array.isArray(schedule.preferred_days) 
          ? schedule.preferred_days.map((d: any) => typeof d === 'string' ? d : d.day).filter(Boolean).join(', ')
          : '',
        schedule_time: schedule.preferred_times || 'Flexible',
        weekly_hours: parseFloat(contract.weekly_hours || 0),
        hourly_rate: parseFloat(contract.hourly_rate || 0),
        special_requirements: (schedule.special_requirements || [])
          .map((r: any) => typeof r === 'string' ? r : r.name || r.requirement)
          .filter(Boolean).join('\n'),
        safety_concerns: (schedule.safety_concerns || [])
          .map((c: any) => typeof c === 'string' ? c : c.concern)
          .filter(Boolean).join('\n'),
      });
    }
  }, [contract]);

  const handleSave = async () => {
    if (!contract?.id || !token || !visitId) {
      setError('Unable to save: missing contract or visit information');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Build updated contract data
      const updatedContract = {
        hourly_rate: editData.hourly_rate,
        weekly_hours: editData.weekly_hours,
        services: editData.services,
        schedule: {
          ...contract.schedule,
          care_need_level: editData.care_level,
          frequency: editData.schedule_frequency,
          preferred_days: editData.schedule_days.split(',').map((d: string) => d.trim()).filter(Boolean),
          preferred_times: editData.schedule_time,
          special_requirements: editData.special_requirements.split('\n').filter(Boolean),
          safety_concerns: editData.safety_concerns.split('\n').filter(Boolean),
          client_profile: {
            ...contract.schedule?.client_profile,
            primary_diagnosis: editData.primary_diagnosis,
            mobility_status: editData.mobility_status,
            cognitive_status: editData.cognitive_status,
            living_situation: editData.living_situation,
          }
        }
      };

      const response = await fetch(`${API_BASE}/visits/${visitId}/contract`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedContract),
      });

      if (!response.ok) {
        throw new Error('Failed to save contract');
      }

      const savedContract = await response.json();
      
      if (onContractUpdate) {
        onContractUpdate(savedContract);
      }
      
      setEditMode(false);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3000);
      
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = printRef.current?.innerHTML || '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Service Agreement - ${client?.full_name || 'Client'}</title>
          <style>
            @page {
              size: letter;
              margin: 0.75in;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              font-size: 11pt;
              line-height: 1.5;
              color: #1f2937;
              margin: 0;
              padding: 0;
            }
            .contract-document {
              max-width: 100%;
            }
            .contract-header {
              text-align: center;
              padding: 20px;
              border-bottom: 3px solid #1e3a8a;
              margin-bottom: 20px;
              background: linear-gradient(to right, #f0f4ff, #e0e7ff) !important;
            }
            .contract-header h1 {
              font-size: 18pt;
              margin: 0 0 5px 0;
              color: #1e3a8a;
            }
            .contract-header p {
              margin: 3px 0;
              color: #4b5563;
              font-size: 10pt;
            }
            .contract-header img {
              max-width: 80px;
              max-height: 80px;
              margin-bottom: 10px;
            }
            .contract-title {
              text-align: center;
              font-size: 16pt;
              font-weight: bold;
              color: #1e3a8a;
              border-bottom: 2px solid #1e3a8a;
              padding-bottom: 10px;
              margin: 20px 0;
            }
            .effective-date {
              text-align: center;
              color: #6b7280;
              font-style: italic;
              margin-bottom: 25px;
            }
            h3.section-title {
              font-size: 12pt;
              color: #1e3a8a;
              margin: 25px 0 10px 0;
              padding-bottom: 5px;
              border-bottom: 1px solid #d1d5db;
              page-break-after: avoid;
            }
            .parties-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            .parties-table td {
              width: 50%;
              padding: 15px;
              background: #f9fafb !important;
              vertical-align: top;
              border: 1px solid #e5e7eb;
            }
            .parties-table strong {
              display: block;
              margin-bottom: 8px;
              color: #111827;
            }
            .assessment-box {
              background: #f9fafb !important;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
              border: 1px solid #e5e7eb;
            }
            .assessment-box p {
              margin: 8px 0;
            }
            .care-level-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 10pt;
            }
            .care-level-HIGH { background: #fee2e2 !important; color: #991b1b; }
            .care-level-MODERATE { background: #fef3c7 !important; color: #92400e; }
            .care-level-LOW { background: #d1fae5 !important; color: #065f46; }
            .services-box {
              background: #eff6ff !important;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
              border-left: 4px solid #3b82f6;
            }
            .services-box .service-item {
              margin: 10px 0;
              padding-left: 15px;
            }
            .schedule-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            .schedule-table td {
              padding: 10px 15px;
              border: 1px solid #e5e7eb;
            }
            .schedule-table td:first-child {
              font-weight: bold;
              width: 40%;
              background: #f9fafb !important;
            }
            .rates-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            .rates-table td {
              padding: 12px 15px;
              border: 1px solid #e5e7eb;
            }
            .rates-table td:first-child {
              font-weight: bold;
              width: 50%;
              background: #f9fafb !important;
            }
            .rate-amount {
              color: #059669;
              font-weight: bold;
              font-size: 12pt;
            }
            .requirements-box {
              background: #fffbeb !important;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
              border-left: 4px solid #f59e0b;
            }
            .safety-box {
              background: #fef2f2 !important;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
              border-left: 4px solid #ef4444;
            }
            .signature-section {
              margin-top: 40px;
              page-break-inside: avoid;
            }
            .signature-table {
              width: 100%;
              margin-top: 20px;
            }
            .signature-table td {
              width: 45%;
              padding: 20px;
              vertical-align: top;
            }
            .signature-line {
              border-bottom: 2px solid #333;
              height: 40px;
              margin-bottom: 5px;
            }
            .signature-label {
              color: #6b7280;
              font-size: 10pt;
            }
            .contract-footer {
              margin-top: 30px;
              padding: 15px;
              text-align: center;
              font-size: 9pt;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
            }
            ul, ol {
              margin: 10px 0;
              padding-left: 25px;
            }
            li {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleRegenerate = async () => {
    if (!visitId || !token) return;
    
    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/pipeline/visits/${visitId}/contract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate contract');
      }

      // Reload contract data
      setTimeout(async () => {
        try {
          const contractData = await fetch(`${API_BASE}/visits/${visitId}/contract`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }).then(r => r.json());
          
          if (onContractUpdate) {
            onContractUpdate(contractData);
          }
        } catch (e) {}
        setGenerating(false);
      }, 3000);
      
    } catch (err) {
      setError('Failed to regenerate. Please try again.');
      setGenerating(false);
    }
  };

  const getContractData = () => {
    const schedule = contract?.schedule || {};
    const services = contract?.services || [];
    const clientProfile = schedule.client_profile || {};
    const hourlyRate = editMode ? editData.hourly_rate : parseFloat(contract?.hourly_rate || 0);
    const weeklyHours = editMode ? editData.weekly_hours : parseFloat(contract?.weekly_hours || 0);

    return {
      agency_name: agency.name,
      agency_full_address: [agency.address, [agency.city, agency.state, agency.zip_code].filter(Boolean).join(', ')].filter(Boolean).join(', '),
      agency_phone: agency.phone || 'N/A',
      agency_email: agency.email || 'N/A',
      agency_logo: agency.logo,
      client_name: client?.full_name || '[Client Name]',
      client_address: [client?.address, [client?.city, client?.state, client?.zip_code].filter(Boolean).join(', ')].filter(Boolean).join(', ') || '[Client Address]',
      client_phone: client?.phone || '[Client Phone]',
      effective_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      care_level: editMode ? editData.care_level : (schedule.care_need_level || 'MODERATE'),
      primary_diagnosis: editMode ? editData.primary_diagnosis : (clientProfile.primary_diagnosis || 'See medical records'),
      mobility_status: editMode ? editData.mobility_status : (clientProfile.mobility_status || 'N/A'),
      cognitive_status: editMode ? editData.cognitive_status : (clientProfile.cognitive_status || 'N/A'),
      living_situation: editMode ? editData.living_situation : (clientProfile.living_situation || 'N/A'),
      services: editMode ? editData.services : services,
      schedule_frequency: editMode ? editData.schedule_frequency : (schedule.frequency || 'As scheduled'),
      schedule_days: editMode ? editData.schedule_days : (Array.isArray(schedule.preferred_days) 
        ? schedule.preferred_days.map((d: any) => typeof d === 'string' ? d : d.day).filter(Boolean).join(', ')
        : 'To be determined'),
      schedule_time: editMode ? editData.schedule_time : (schedule.preferred_times || 'Flexible'),
      weekly_hours: weeklyHours,
      hourly_rate: hourlyRate,
      weekly_estimate: hourlyRate * weeklyHours,
      monthly_estimate: hourlyRate * weeklyHours * 4.33,
      special_requirements: editMode ? editData.special_requirements : ((schedule.special_requirements || [])
        .map((r: any) => typeof r === 'string' ? r : r.name || r.requirement)
        .filter(Boolean).join('\n') || 'None specified'),
      safety_concerns: editMode ? editData.safety_concerns : ((schedule.safety_concerns || [])
        .map((c: any) => typeof c === 'string' ? c : c.concern)
        .filter(Boolean).join('\n') || 'None noted'),
    };
  };

  if (!contract) {
    return (
      <div className="p-8 text-center text-dark-400">
        <FileSignature className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No contract generated yet.</p>
        <p className="text-sm mt-2">Run the pipeline to generate a service contract.</p>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="p-8 text-center text-dark-400">
        <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin text-primary-400" />
        <p className="text-white">Regenerating contract...</p>
        <p className="text-sm mt-2">This may take a moment</p>
      </div>
    );
  }

  const data = getContractData();

  return (
    <div className="flex flex-col h-full">
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-800 print:hidden">
        <div className="flex items-center gap-3">
          {agency.contract_template_name && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
              <FileText className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-xs">{agency.contract_template_name}</span>
            </div>
          )}
          {savedMessage && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg animate-pulse">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm">Saved!</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button 
                onClick={() => setEditMode(false)} 
                className="flex items-center gap-2 px-3 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 transition text-sm"
                disabled={saving}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setEditMode(true)} 
                className="flex items-center gap-2 px-3 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 transition text-sm"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button 
                onClick={handleRegenerate} 
                className="flex items-center gap-2 px-3 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 transition text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
              <button 
                onClick={handlePrint} 
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition text-sm"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Contract Content */}
      <div className="flex-1 overflow-auto p-4">
        <div 
          ref={printRef}
          className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          <div className="contract-document">
            {/* Header */}
            <div 
              className="contract-header text-center p-6 border-b-4"
              style={{ 
                borderColor: agency.primary_color, 
                background: 'linear-gradient(to right, #f0f4ff, #e0e7ff)' 
              }}
            >
              {data.agency_logo && (
                <img 
                  src={data.agency_logo} 
                  alt="Logo" 
                  className="mx-auto mb-3 rounded-lg bg-white p-2"
                  style={{ maxWidth: '80px', maxHeight: '80px' }} 
                />
              )}
              <h1 className="text-2xl font-bold mb-1" style={{ color: agency.primary_color }}>
                {data.agency_name}
              </h1>
              <p className="text-gray-600 text-sm">{data.agency_full_address}</p>
              <p className="text-gray-600 text-sm">
                Phone: {data.agency_phone} | Email: {data.agency_email}
              </p>
            </div>

            {/* Body */}
            <div className="p-8 text-gray-800">
              <h2 
                className="contract-title text-center text-xl font-bold pb-3 mb-6 border-b-2"
                style={{ color: agency.primary_color, borderColor: agency.primary_color }}
              >
                HOME CARE SERVICE AGREEMENT
              </h2>
              <p className="effective-date text-center text-gray-500 italic mb-8">
                Effective Date: {data.effective_date}
              </p>

              {/* 1. Parties */}
              <h3 className="section-title text-base font-bold mb-3 pb-2 border-b" style={{ color: agency.primary_color }}>
                1. PARTIES
              </h3>
              <table className="parties-table w-full mb-6">
                <tbody>
                  <tr>
                    <td className="p-4 bg-gray-50 align-top border border-gray-200">
                      <strong className="block mb-2 text-gray-900">SERVICE PROVIDER:</strong>
                      {data.agency_name}<br />
                      {data.agency_full_address}<br />
                      Phone: {data.agency_phone}<br />
                      Email: {data.agency_email}
                    </td>
                    <td className="p-4 bg-gray-50 align-top border border-gray-200">
                      <strong className="block mb-2 text-gray-900">CLIENT:</strong>
                      {data.client_name}<br />
                      {data.client_address}<br />
                      Phone: {data.client_phone}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 2. Care Assessment */}
              <h3 className="section-title text-base font-bold mb-3 pb-2 border-b" style={{ color: agency.primary_color }}>
                2. CARE ASSESSMENT
              </h3>
              <div className="assessment-box bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                <p className="mb-2">
                  <strong className="text-gray-900">Care Need Level: </strong>
                  {editMode ? (
                    <select 
                      value={editData.care_level}
                      onChange={(e) => setEditData({ ...editData, care_level: e.target.value })}
                      className="ml-2 px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MODERATE">MODERATE</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  ) : (
                    <span className={`care-level-badge care-level-${data.care_level} px-3 py-1 rounded-full text-sm font-bold`}>
                      {data.care_level}
                    </span>
                  )}
                </p>
                <p className="mb-2">
                  <strong className="text-gray-900">Primary Diagnosis: </strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.primary_diagnosis}
                      onChange={(e) => setEditData({ ...editData, primary_diagnosis: e.target.value })}
                      className="ml-2 px-3 py-1 border border-gray-300 rounded-lg text-sm w-64 bg-white"
                    />
                  ) : data.primary_diagnosis}
                </p>
                <p className="mb-2">
                  <strong className="text-gray-900">Mobility Status: </strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.mobility_status}
                      onChange={(e) => setEditData({ ...editData, mobility_status: e.target.value })}
                      className="ml-2 px-3 py-1 border border-gray-300 rounded-lg text-sm w-64 bg-white"
                    />
                  ) : data.mobility_status}
                </p>
                <p className="mb-2">
                  <strong className="text-gray-900">Cognitive Status: </strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.cognitive_status}
                      onChange={(e) => setEditData({ ...editData, cognitive_status: e.target.value })}
                      className="ml-2 px-3 py-1 border border-gray-300 rounded-lg text-sm w-64 bg-white"
                    />
                  ) : data.cognitive_status}
                </p>
                <p className="mb-0">
                  <strong className="text-gray-900">Living Situation: </strong>
                  {editMode ? (
                    <input 
                      type="text" 
                      value={editData.living_situation}
                      onChange={(e) => setEditData({ ...editData, living_situation: e.target.value })}
                      className="ml-2 px-3 py-1 border border-gray-300 rounded-lg text-sm w-64 bg-white"
                    />
                  ) : data.living_situation}
                </p>
              </div>

              {/* 3. Services */}
              <h3 className="section-title text-base font-bold mb-3 pb-2 border-b" style={{ color: agency.primary_color }}>
                3. SERVICES TO BE PROVIDED
              </h3>
              <div className="services-box bg-blue-50 p-4 rounded-lg mb-6 border-l-4 border-blue-500">
                {editMode ? (
                  <div className="space-y-2">
                    {editData.services.map((service: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-gray-500">{idx + 1}.</span>
                        <input 
                          type="text"
                          value={service.name || service}
                          onChange={(e) => {
                            const newServices = [...editData.services];
                            newServices[idx] = { ...newServices[idx], name: e.target.value };
                            setEditData({ ...editData, services: newServices });
                          }}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white"
                          placeholder="Service name"
                        />
                      </div>
                    ))}
                    <button 
                      onClick={() => setEditData({ ...editData, services: [...editData.services, { name: '', description: '', frequency: '' }] })}
                      className="text-blue-500 text-sm hover:underline"
                    >
                      + Add Service
                    </button>
                  </div>
                ) : (
                  <div className="whitespace-pre-line">
                    {data.services.length > 0 
                      ? data.services.map((s: any, i: number) => {
                          const name = typeof s === 'string' ? s : s.name;
                          const desc = typeof s === 'string' ? '' : s.description;
                          const freq = typeof s === 'string' ? '' : s.frequency;
                          return (
                            <div key={i} className="service-item mb-2 pl-4">
                              <strong>{i + 1}. {name}</strong>
                              {desc && <span className="text-gray-600">: {desc}</span>}
                              {freq && <span className="text-gray-500 italic"> ({freq})</span>}
                            </div>
                          );
                        })
                      : 'Services to be determined based on care plan.'}
                  </div>
                )}
              </div>

              {/* 4. Schedule */}
              <h3 className="section-title text-base font-bold mb-3 pb-2 border-b" style={{ color: agency.primary_color }}>
                4. SCHEDULE OF SERVICES
              </h3>
              <table className="schedule-table w-full mb-6">
                <tbody>
                  <tr>
                    <td className="p-3 bg-gray-50 font-bold border border-gray-200 w-2/5">Frequency:</td>
                    <td className="p-3 border border-gray-200">
                      {editMode ? (
                        <input 
                          type="text" 
                          value={editData.schedule_frequency}
                          onChange={(e) => setEditData({ ...editData, schedule_frequency: e.target.value })}
                          className="w-full px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white"
                        />
                      ) : data.schedule_frequency}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 bg-gray-50 font-bold border border-gray-200">Days:</td>
                    <td className="p-3 border border-gray-200">
                      {editMode ? (
                        <input 
                          type="text" 
                          value={editData.schedule_days}
                          onChange={(e) => setEditData({ ...editData, schedule_days: e.target.value })}
                          className="w-full px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white"
                          placeholder="Monday, Wednesday, Friday"
                        />
                      ) : data.schedule_days}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 bg-gray-50 font-bold border border-gray-200">Preferred Time:</td>
                    <td className="p-3 border border-gray-200">
                      {editMode ? (
                        <input 
                          type="text" 
                          value={editData.schedule_time}
                          onChange={(e) => setEditData({ ...editData, schedule_time: e.target.value })}
                          className="w-full px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white"
                        />
                      ) : data.schedule_time}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 bg-gray-50 font-bold border border-gray-200">Hours per Week:</td>
                    <td className="p-3 border border-gray-200">
                      {editMode ? (
                        <input 
                          type="number" 
                          value={editData.weekly_hours}
                          onChange={(e) => setEditData({ ...editData, weekly_hours: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white"
                        />
                      ) : data.weekly_hours}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 5. Rates */}
              <h3 className="section-title text-base font-bold mb-3 pb-2 border-b" style={{ color: agency.primary_color }}>
                5. RATES AND PAYMENT
              </h3>
              <table className="rates-table w-full mb-6">
                <tbody>
                  <tr>
                    <td className="p-3 bg-gray-50 font-bold border border-gray-200 w-1/2">Hourly Rate:</td>
                    <td className="p-3 border border-gray-200">
                      {editMode ? (
                        <div className="flex items-center gap-1">
                          <span>$</span>
                          <input 
                            type="number" 
                            step="0.01"
                            value={editData.hourly_rate}
                            onChange={(e) => setEditData({ ...editData, hourly_rate: parseFloat(e.target.value) || 0 })}
                            className="w-24 px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white"
                          />
                        </div>
                      ) : (
                        <span className="rate-amount text-green-600 font-bold text-lg">${data.hourly_rate.toFixed(2)}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 bg-gray-50 font-bold border border-gray-200">Estimated Weekly Cost:</td>
                    <td className="p-3 border border-gray-200">${data.weekly_estimate.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 bg-gray-50 font-bold border border-gray-200">Estimated Monthly Cost:</td>
                    <td className="p-3 border border-gray-200 font-bold">${data.monthly_estimate.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* 6. Special Requirements */}
              <h3 className="section-title text-base font-bold mb-3 pb-2 border-b" style={{ color: agency.primary_color }}>
                6. SPECIAL REQUIREMENTS
              </h3>
              <div className="requirements-box bg-amber-50 p-4 rounded-lg mb-6 border-l-4 border-amber-500">
                {editMode ? (
                  <textarea 
                    value={editData.special_requirements}
                    onChange={(e) => setEditData({ ...editData, special_requirements: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-h-[80px]"
                    placeholder="Enter special requirements (one per line)"
                  />
                ) : (
                  <div className="text-amber-900">
                    {data.special_requirements.split('\n').filter(Boolean).map((req: string, i: number) => (
                      <div key={i} className="mb-1">• {req}</div>
                    ))}
                    {!data.special_requirements || data.special_requirements === 'None specified' ? (
                      <div>• None specified</div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* 7. Safety */}
              <h3 className="section-title text-base font-bold mb-3 pb-2 border-b" style={{ color: agency.primary_color }}>
                7. SAFETY CONSIDERATIONS
              </h3>
              <div className="safety-box bg-red-50 p-4 rounded-lg mb-6 border-l-4 border-red-500">
                {editMode ? (
                  <textarea 
                    value={editData.safety_concerns}
                    onChange={(e) => setEditData({ ...editData, safety_concerns: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-h-[80px]"
                    placeholder="Enter safety concerns (one per line)"
                  />
                ) : (
                  <div className="text-red-900">
                    {data.safety_concerns.split('\n').filter(Boolean).map((concern: string, i: number) => (
                      <div key={i} className="mb-1">• {concern}</div>
                    ))}
                    {!data.safety_concerns || data.safety_concerns === 'None noted' ? (
                      <div>• None noted</div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* 8. Signatures */}
              <h3 className="section-title text-base font-bold mb-3 pb-2 border-b" style={{ color: agency.primary_color }}>
                8. SIGNATURES
              </h3>
              <p className="text-gray-600 mb-6">
                By signing below, both parties agree to the terms of this Service Agreement.
              </p>
              <table className="signature-table w-full mt-8">
                <tbody>
                  <tr>
                    <td className="p-5 align-top w-2/5">
                      <p className="text-gray-500 mb-10">Client / Authorized Representative:</p>
                      <div className="signature-line border-b-2 border-gray-800 h-10 mb-1"></div>
                      <p className="signature-label text-gray-500 text-sm">Signature</p>
                      <p className="mt-4">Printed Name: <u className="ml-2">{data.client_name}</u></p>
                      <p className="mt-2">Date: _______________________</p>
                    </td>
                    <td className="w-1/5"></td>
                    <td className="p-5 align-top w-2/5">
                      <p className="text-gray-500 mb-10">Agency Representative:</p>
                      <div className="signature-line border-b-2 border-gray-800 h-10 mb-1"></div>
                      <p className="signature-label text-gray-500 text-sm">Signature</p>
                      <p className="mt-4">Printed Name: _______________________</p>
                      <p className="mt-2">Date: _______________________</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div 
              className="contract-footer text-center py-4 px-6 text-sm text-gray-500 border-t border-gray-200"
            >
              {data.agency_name} | {data.agency_phone} | {data.agency_email}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
