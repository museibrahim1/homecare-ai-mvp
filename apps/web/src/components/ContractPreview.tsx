'use client';

import { useEffect, useState } from 'react';
import { FileSignature, Printer, FileText, RefreshCw, AlertCircle } from 'lucide-react';
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
  // Derived from documents list
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
}

export default function ContractPreview({ contract, client }: ContractPreviewProps) {
  const { token } = useAuth();
  const [agency, setAgency] = useState<AgencySettings>(defaultAgency);
  const [filledContent, setFilledContent] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load agency settings from API
    const loadAgencySettings = async () => {
      try {
        const response = await fetch(`${API_BASE}/agency`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const data = await response.json();
          
          // Extract contract template from documents array
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
          // Fallback to localStorage
          const savedSettings = localStorage.getItem('agencySettings');
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setAgency({ ...defaultAgency, ...parsed });
          }
        }
      } catch (err) {
        // Fallback to localStorage on error
        const savedSettings = localStorage.getItem('agencySettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setAgency({ ...defaultAgency, ...parsed });
        }
      }
    };
    loadAgencySettings();
  }, [token]);

  // Generate filled contract when we have template and contract data
  useEffect(() => {
    if (agency.contract_template && contract && client && !filledContent) {
      fillTemplate();
    }
  }, [agency.contract_template, contract, client]);

  const fillTemplate = async () => {
    if (!agency.contract_template || !contract) return;
    
    setGenerating(true);
    setError(null);

    try {
      // Prepare all the data to fill in
      const schedule = contract.schedule || {};
      const services = contract.services || [];
      const clientProfile = schedule.client_profile || {};
      const hourlyRate = parseFloat(contract.hourly_rate || 0);
      const weeklyHours = parseFloat(contract.weekly_hours || 0);

      const fillData = {
        // Agency Info
        agency_name: agency.name,
        agency_address: agency.address,
        agency_city: agency.city,
        agency_state: agency.state,
        agency_zip: agency.zip_code,
        agency_full_address: [agency.address, [agency.city, agency.state, agency.zip_code].filter(Boolean).join(', ')].filter(Boolean).join(', '),
        agency_phone: agency.phone || 'N/A',
        agency_email: agency.email || 'N/A',
        
        // Client Info
        client_name: client?.full_name || '[Client Name]',
        client_address: client?.address || '[Client Address]',
        client_phone: client?.phone || '[Client Phone]',
        client_email: client?.email || '',
        
        // Dates
        effective_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        current_date: new Date().toLocaleDateString(),
        
        // Care Assessment
        care_level: schedule.care_need_level || 'MODERATE',
        primary_diagnosis: clientProfile.primary_diagnosis || 'See medical records',
        secondary_conditions: Array.isArray(clientProfile.secondary_conditions) 
          ? clientProfile.secondary_conditions.join(', ') 
          : 'None noted',
        mobility_status: clientProfile.mobility_status || 'N/A',
        cognitive_status: clientProfile.cognitive_status || 'N/A',
        living_situation: clientProfile.living_situation || 'N/A',
        
        // Services
        services_list: services.length > 0 
          ? services.map((s: any, i: number) => {
              if (typeof s === 'string') return `${i + 1}. ${s}`;
              return `${i + 1}. ${s.name}${s.description ? ': ' + s.description : ''}${s.frequency ? ' (' + s.frequency + ')' : ''}`;
            }).join('\n')
          : 'Services to be determined based on care plan.',
        
        // Schedule
        schedule_frequency: schedule.frequency || 'As scheduled',
        schedule_days: Array.isArray(schedule.preferred_days) 
          ? schedule.preferred_days.map((d: any) => typeof d === 'string' ? d : d.day).filter(Boolean).join(', ')
          : 'To be determined',
        schedule_time: schedule.preferred_times || 'Flexible',
        weekly_hours: weeklyHours.toString(),
        
        // Rates
        hourly_rate: `$${hourlyRate.toFixed(2)}`,
        weekly_estimate: `$${(hourlyRate * weeklyHours).toFixed(2)}`,
        monthly_estimate: `$${(hourlyRate * weeklyHours * 4.33).toFixed(2)}`,
        
        // Special Requirements & Safety
        special_requirements: (schedule.special_requirements || [])
          .map((r: any) => typeof r === 'string' ? r : r.name || r.requirement)
          .filter(Boolean).join('\n• ') || 'None specified',
        safety_concerns: (schedule.safety_concerns || [])
          .map((c: any) => typeof c === 'string' ? c : c.concern)
          .filter(Boolean).join('\n• ') || 'None noted',
      };

      // Create filled HTML content
      const filledHtml = generateFilledContract(fillData);
      setFilledContent(filledHtml);
      
    } catch (err) {
      console.error('Error filling template:', err);
      setError('Failed to fill template with data');
    } finally {
      setGenerating(false);
    }
  };

  const generateFilledContract = (data: any) => {
    return `
      <div class="contract-document" style="color: #1f2937; background: white;">
        <div class="header" style="background-color: ${agency.primary_color}; color: white; padding: 30px; text-align: center;">
          ${agency.logo ? `<img src="${agency.logo}" alt="Logo" style="max-width: 100px; max-height: 100px; margin-bottom: 15px; background: white; padding: 8px; border-radius: 8px;" />` : ''}
          <h1 style="margin: 0; font-size: 24px; color: white;">${data.agency_name}</h1>
          <p style="margin: 5px 0; opacity: 0.9; color: white;">${data.agency_full_address}</p>
          <p style="margin: 5px 0; opacity: 0.9; color: white;">Phone: ${data.agency_phone} | Email: ${data.agency_email}</p>
        </div>
        
        <div style="padding: 30px; color: #1f2937; background: white;">
          <h2 style="text-align: center; color: ${agency.primary_color}; border-bottom: 2px solid ${agency.primary_color}; padding-bottom: 10px; margin-bottom: 20px;">
            HOME CARE SERVICE AGREEMENT
          </h2>
          <p style="text-align: center; color: #4b5563; margin-bottom: 30px;">Effective Date: ${data.effective_date}</p>
          
          <h3 style="color: ${agency.primary_color}; margin-top: 25px;">1. PARTIES</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; color: #1f2937;">
            <tr>
              <td style="width: 50%; padding: 15px; background: #f5f5f5; vertical-align: top; color: #1f2937;">
                <strong style="color: #111827;">SERVICE PROVIDER:</strong><br/>
                ${data.agency_name}<br/>
                ${data.agency_full_address}<br/>
                Phone: ${data.agency_phone}<br/>
                Email: ${data.agency_email}
              </td>
              <td style="width: 50%; padding: 15px; background: #f5f5f5; vertical-align: top; color: #1f2937;">
                <strong style="color: #111827;">CLIENT:</strong><br/>
                ${data.client_name}<br/>
                ${data.client_address}<br/>
                Phone: ${data.client_phone}
              </td>
            </tr>
          </table>
          
          <h3 style="color: ${agency.primary_color}; margin-top: 25px;">2. CARE ASSESSMENT</h3>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0; color: #1f2937;">
            <p style="color: #1f2937;"><strong style="color: #111827;">Care Need Level:</strong> <span style="background: ${data.care_level === 'HIGH' ? '#fee2e2' : data.care_level === 'MODERATE' ? '#fef3c7' : '#d1fae5'}; color: ${data.care_level === 'HIGH' ? '#991b1b' : data.care_level === 'MODERATE' ? '#92400e' : '#065f46'}; padding: 3px 10px; border-radius: 20px; font-weight: bold;">${data.care_level}</span></p>
            <p style="color: #1f2937;"><strong style="color: #111827;">Primary Diagnosis:</strong> ${data.primary_diagnosis}</p>
            <p style="color: #1f2937;"><strong style="color: #111827;">Mobility Status:</strong> ${data.mobility_status}</p>
            <p style="color: #1f2937;"><strong style="color: #111827;">Cognitive Status:</strong> ${data.cognitive_status}</p>
            <p style="color: #1f2937;"><strong style="color: #111827;">Living Situation:</strong> ${data.living_situation}</p>
          </div>
          
          <h3 style="color: ${agency.primary_color}; margin-top: 25px;">3. SERVICES TO BE PROVIDED</h3>
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; white-space: pre-line; color: #1f2937;">
            ${data.services_list}
          </div>
          
          <h3 style="color: ${agency.primary_color}; margin-top: 25px;">4. SCHEDULE OF SERVICES</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; color: #1f2937;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; color: #1f2937;"><strong style="color: #111827;">Frequency:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #1f2937;">${data.schedule_frequency}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; color: #1f2937;"><strong style="color: #111827;">Days:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #1f2937;">${data.schedule_days}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; color: #1f2937;"><strong style="color: #111827;">Preferred Time:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #1f2937;">${data.schedule_time}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; color: #1f2937;"><strong style="color: #111827;">Hours per Week:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #1f2937;">${data.weekly_hours}</td>
            </tr>
          </table>
          
          <h3 style="color: ${agency.primary_color}; margin-top: 25px;">5. RATES AND PAYMENT</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0; color: #1f2937;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; color: #1f2937;"><strong style="color: #111827;">Hourly Rate:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #059669; font-weight: bold;">${data.hourly_rate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; color: #1f2937;"><strong style="color: #111827;">Estimated Weekly Cost:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #1f2937;">${data.weekly_estimate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; color: #1f2937;"><strong style="color: #111827;">Estimated Monthly Cost:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #1f2937;">${data.monthly_estimate}</td>
            </tr>
          </table>
          
          <h3 style="color: ${agency.primary_color}; margin-top: 25px;">6. SPECIAL REQUIREMENTS</h3>
          <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; color: #92400e;">
            • ${data.special_requirements}
          </div>
          
          <h3 style="color: ${agency.primary_color}; margin-top: 25px;">7. SAFETY CONSIDERATIONS</h3>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444; color: #991b1b;">
            • ${data.safety_concerns}
          </div>
          
          <h3 style="color: ${agency.primary_color}; margin-top: 25px;">8. SIGNATURES</h3>
          <p style="margin: 15px 0; color: #4b5563;">By signing below, both parties agree to the terms of this Service Agreement.</p>
          
          <table style="width: 100%; margin-top: 30px; color: #1f2937;">
            <tr>
              <td style="width: 45%; padding: 20px; vertical-align: top; color: #1f2937;">
                <p style="color: #4b5563; margin-bottom: 40px;">Client / Authorized Representative:</p>
                <div style="border-bottom: 2px solid #333; margin-bottom: 5px; height: 40px;"></div>
                <p style="margin: 5px 0; color: #1f2937;">Signature</p>
                <p style="margin: 15px 0; color: #1f2937;">Printed Name: <u>${data.client_name}</u></p>
                <p style="margin: 5px 0; color: #1f2937;">Date: _______________________</p>
              </td>
              <td style="width: 10%;"></td>
              <td style="width: 45%; padding: 20px; vertical-align: top; color: #1f2937;">
                <p style="color: #4b5563; margin-bottom: 40px;">Agency Representative:</p>
                <div style="border-bottom: 2px solid #333; margin-bottom: 5px; height: 40px;"></div>
                <p style="margin: 5px 0; color: #1f2937;">Signature</p>
                <p style="margin: 15px 0; color: #1f2937;">Printed Name: _______________________</p>
                <p style="margin: 5px 0; color: #1f2937;">Date: _______________________</p>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background: ${agency.primary_color}; color: white; padding: 15px; text-align: center; font-size: 12px;">
          ${data.agency_name} | ${data.agency_phone} | ${data.agency_email}
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRegenerate = () => {
    setFilledContent(null);
    fillTemplate();
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
        <p className="text-white">Filling in your template...</p>
        <p className="text-sm mt-2">Adding agency and client details</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
        <p className="text-red-400">{error}</p>
        <button onClick={handleRegenerate} className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div className="flex items-center gap-3">
          {agency.contract_template && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
              <FileText className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm">Using: {agency.contract_template_name}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleRegenerate} className="flex items-center gap-2 px-3 py-2 bg-dark-700 text-dark-200 rounded-lg hover:bg-dark-600 transition text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition">
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Contract Document */}
      <div 
        className="bg-white rounded-lg shadow-lg overflow-hidden print:shadow-none text-gray-900" 
        id="contract-document"
        style={{ color: '#1f2937' }}
        dangerouslySetInnerHTML={{ __html: filledContent || generateFilledContract(getDefaultData()) }}
      />

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #contract-document, #contract-document * { visibility: visible; }
          #contract-document { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
        #contract-document { 
          font-family: Arial, sans-serif; 
          color: #1f2937 !important;
        }
        #contract-document h2,
        #contract-document h3,
        #contract-document p,
        #contract-document td,
        #contract-document span,
        #contract-document div {
          color: inherit;
        }
        #contract-document .contract-document h3 { margin-bottom: 10px; }
        #contract-document .contract-document p { margin: 8px 0; line-height: 1.5; }
      `}</style>
    </div>
  );

  function getDefaultData() {
    const schedule = contract.schedule || {};
    const services = contract.services || [];
    const clientProfile = schedule.client_profile || {};
    const hourlyRate = parseFloat(contract.hourly_rate || 0);
    const weeklyHours = parseFloat(contract.weekly_hours || 0);

    return {
      agency_name: agency.name,
      agency_address: agency.address,
      agency_city: agency.city,
      agency_state: agency.state,
      agency_zip: agency.zip,
      agency_full_address: [agency.address, [agency.city, agency.state, agency.zip_code].filter(Boolean).join(', ')].filter(Boolean).join(', '),
      agency_phone: agency.phone || 'N/A',
      agency_email: agency.email || 'N/A',
      client_name: client?.full_name || '[Client Name]',
      client_address: client?.address || '[Client Address]',
      client_phone: client?.phone || '[Client Phone]',
      effective_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      care_level: schedule.care_need_level || 'MODERATE',
      primary_diagnosis: clientProfile.primary_diagnosis || 'See medical records',
      mobility_status: clientProfile.mobility_status || 'N/A',
      cognitive_status: clientProfile.cognitive_status || 'N/A',
      living_situation: clientProfile.living_situation || 'N/A',
      services_list: services.length > 0 
        ? services.map((s: any, i: number) => {
            if (typeof s === 'string') return `${i + 1}. ${s}`;
            return `${i + 1}. ${s.name}${s.description ? ': ' + s.description : ''}${s.frequency ? ' (' + s.frequency + ')' : ''}`;
          }).join('\n')
        : 'Services to be determined based on care plan.',
      schedule_frequency: schedule.frequency || 'As scheduled',
      schedule_days: Array.isArray(schedule.preferred_days) 
        ? schedule.preferred_days.map((d: any) => typeof d === 'string' ? d : d.day).filter(Boolean).join(', ')
        : 'To be determined',
      schedule_time: schedule.preferred_times || 'Flexible',
      weekly_hours: weeklyHours.toString(),
      hourly_rate: `$${hourlyRate.toFixed(2)}`,
      weekly_estimate: `$${(hourlyRate * weeklyHours).toFixed(2)}`,
      monthly_estimate: `$${(hourlyRate * weeklyHours * 4.33).toFixed(2)}`,
      special_requirements: (schedule.special_requirements || [])
        .map((r: any) => typeof r === 'string' ? r : r.name || r.requirement)
        .filter(Boolean).join('\n• ') || 'None specified',
      safety_concerns: (schedule.safety_concerns || [])
        .map((c: any) => typeof c === 'string' ? c : c.concern)
        .filter(Boolean).join('\n• ') || 'None noted',
    };
  }
}
