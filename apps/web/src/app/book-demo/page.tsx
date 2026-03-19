'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar, Clock, ChevronLeft, ChevronRight, Check,
  Loader2, User, Building2, Mail, Phone, ArrowRight,
  Video, Shield, Sparkles, ArrowLeft,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface SlotData {
  timezone: string;
  duration_minutes: number;
  slots: Record<string, string[]>;
}

interface BookingResult {
  success: boolean;
  meeting_link?: string;
  date?: string;
  time?: string;
  message: string;
}

type Step = 'info' | 'calendar' | 'confirm' | 'done';

export default function BookDemoPage() {
  const [step, setStep] = useState<Step>('info');
  const [slotData, setSlotData] = useState<SlotData | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/demos/slots`)
      .then(r => r.json())
      .then(d => { setSlotData(d); setLoadingSlots(false); })
      .catch(() => setLoadingSlots(false));
  }, []);

  const sortedDates = useMemo(() => {
    if (!slotData) return [];
    return Object.keys(slotData.slots).sort();
  }, [slotData]);

  const [calPage, setCalPage] = useState(0);
  const DATES_PER_PAGE = 7;
  const pagedDates = sortedDates.slice(calPage * DATES_PER_PAGE, (calPage + 1) * DATES_PER_PAGE);
  const totalPages = Math.ceil(sortedDates.length / DATES_PER_PAGE);

  const timesForDate = useMemo(() => {
    if (!slotData || !selectedDate) return [];
    return slotData.slots[selectedDate] || [];
  }, [slotData, selectedDate]);

  function formatDateLabel(iso: string) {
    const d = new Date(iso + 'T12:00:00');
    const day = d.toLocaleDateString('en-US', { weekday: 'short' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const num = d.getDate();
    return { day, month, num };
  }

  function formatTime12(t: string) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  function formatFullDate(iso: string) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  const infoValid = name.trim() && email.trim() && company.trim() && email.includes('@');
  const calendarValid = selectedDate && selectedTime;

  async function handleBook() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/demos/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company_name: company.trim(),
          phone: phone.trim() || undefined,
          date: selectedDate,
          time_slot: selectedTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Booking failed');
      setResult(data);
      setStep('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f0fdfa 0%, #ffffff 40%)', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Nav */}
      <nav style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/app-logo.png" alt="PalmCare AI" width={36} height={36} style={{ borderRadius: 8 }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>PalmCare AI</span>
        </Link>
        <Link href="/register" style={{ fontSize: 14, fontWeight: 600, color: '#0d9488', textDecoration: 'none' }}>
          Sign Up Free <ArrowRight size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
        </Link>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '40px 24px 32px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ccfbf1', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#0d9488', marginBottom: 16 }}>
          <Video size={14} /> 30-Minute Live Demo
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: -0.5, lineHeight: 1.15 }}>
          See PalmCare AI in Action
        </h1>
        <p style={{ fontSize: 17, color: '#475569', lineHeight: 1.6, margin: 0 }}>
          Book a free, personalized walkthrough with our team. We&apos;ll show you how to
          record assessments, generate contracts, and manage your agency — all in real-time.
        </p>
      </div>

      {/* Main Card */}
      <div style={{ maxWidth: 720, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{ background: '#ffffff', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>

          {/* Progress bar */}
          <div style={{ height: 4, background: '#e2e8f0' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #0d9488, #0891b2)',
              borderRadius: 4,
              transition: 'width 0.3s ease',
              width: step === 'info' ? '33%' : step === 'calendar' ? '66%' : '100%',
            }} />
          </div>

          {/* ─── STEP 1: Contact Info ─── */}
          {step === 'info' && (
            <div style={{ padding: '36px 36px 40px' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Your Information</h2>
              <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px' }}>Tell us about yourself so we can tailor the demo.</p>

              <div style={{ display: 'grid', gap: 18 }}>
                <label style={{ display: 'block' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <User size={14} /> Full Name *
                  </span>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith"
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#0d9488'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Mail size={14} /> Work Email *
                  </span>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="jane@agency.com"
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#0d9488'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Building2 size={14} /> Agency Name *
                  </span>
                  <input value={company} onChange={e => setCompany(e.target.value)} placeholder="ABC Home Care"
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#0d9488'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </label>

                <label style={{ display: 'block' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Phone size={14} /> Phone (optional)
                  </span>
                  <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="(555) 123-4567"
                    style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s' }}
                    onFocus={e => e.target.style.borderColor = '#0d9488'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </label>
              </div>

              <button onClick={() => { if (infoValid) setStep('calendar'); }}
                disabled={!infoValid}
                style={{
                  width: '100%', marginTop: 28, padding: '14px 24px', borderRadius: 12, border: 'none', cursor: infoValid ? 'pointer' : 'not-allowed',
                  background: infoValid ? 'linear-gradient(135deg, #0d9488, #0891b2)' : '#cbd5e1',
                  color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.2s',
                }}>
                Pick a Date & Time <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* ─── STEP 2: Calendar ─── */}
          {step === 'calendar' && (
            <div style={{ padding: '36px 36px 40px' }}>
              <button onClick={() => setStep('info')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: 0, marginBottom: 16 }}>
                <ArrowLeft size={16} /> Back
              </button>

              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Choose a Date</h2>
              <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px' }}>
                All times are in Eastern Time (ET). Demos are 30 minutes.
              </p>

              {loadingSlots ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#0d9488' }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              ) : (
                <>
                  {/* Date picker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                    <button onClick={() => setCalPage(Math.max(0, calPage - 1))} disabled={calPage === 0}
                      style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', cursor: calPage === 0 ? 'not-allowed' : 'pointer', opacity: calPage === 0 ? 0.3 : 1 }}>
                      <ChevronLeft size={18} color="#334155" />
                    </button>
                    <div style={{ display: 'flex', gap: 8, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {pagedDates.map(d => {
                        const { day, month, num } = formatDateLabel(d);
                        const active = d === selectedDate;
                        return (
                          <button key={d} onClick={() => { setSelectedDate(d); setSelectedTime(''); }}
                            style={{
                              padding: '10px 12px', borderRadius: 12, border: active ? '2px solid #0d9488' : '1.5px solid #e2e8f0',
                              background: active ? '#f0fdfa' : '#fff', cursor: 'pointer', textAlign: 'center', minWidth: 68,
                              transition: 'all 0.15s',
                            }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: active ? '#0d9488' : '#94a3b8', textTransform: 'uppercase' }}>{day}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: active ? '#0d9488' : '#0f172a', lineHeight: 1.3 }}>{num}</div>
                            <div style={{ fontSize: 11, color: active ? '#0d9488' : '#94a3b8' }}>{month}</div>
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setCalPage(Math.min(totalPages - 1, calPage + 1))} disabled={calPage >= totalPages - 1}
                      style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', cursor: calPage >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: calPage >= totalPages - 1 ? 0.3 : 1 }}>
                      <ChevronRight size={18} color="#334155" />
                    </button>
                  </div>

                  {/* Time slots */}
                  {selectedDate && (
                    <>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 12px' }}>
                        <Clock size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                        Available Times — {formatFullDate(selectedDate)}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                        {timesForDate.map(t => {
                          const active = t === selectedTime;
                          return (
                            <button key={t} onClick={() => setSelectedTime(t)}
                              style={{
                                padding: '10px 0', borderRadius: 10, border: active ? '2px solid #0d9488' : '1.5px solid #e2e8f0',
                                background: active ? '#0d9488' : '#fff', color: active ? '#fff' : '#334155',
                                fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                              }}>
                              {formatTime12(t)}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <button onClick={() => { if (calendarValid) setStep('confirm'); }}
                    disabled={!calendarValid}
                    style={{
                      width: '100%', marginTop: 28, padding: '14px 24px', borderRadius: 12, border: 'none',
                      cursor: calendarValid ? 'pointer' : 'not-allowed',
                      background: calendarValid ? 'linear-gradient(135deg, #0d9488, #0891b2)' : '#cbd5e1',
                      color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      transition: 'opacity 0.2s',
                    }}>
                    Review & Confirm <ArrowRight size={18} />
                  </button>
                </>
              )}
            </div>
          )}

          {/* ─── STEP 3: Confirm ─── */}
          {step === 'confirm' && (
            <div style={{ padding: '36px 36px 40px' }}>
              <button onClick={() => setStep('calendar')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: 0, marginBottom: 16 }}>
                <ArrowLeft size={16} /> Back
              </button>

              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Confirm Your Demo</h2>
              <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px' }}>Review the details below and confirm your booking.</p>

              <div style={{ background: '#f8fafc', borderRadius: 14, padding: 24, marginBottom: 24, border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {[
                      ['Name', name],
                      ['Email', email],
                      ['Agency', company],
                      ['Date', formatFullDate(selectedDate)],
                      ['Time', `${formatTime12(selectedTime)} ET`],
                      ['Duration', '30 minutes'],
                    ].map(([label, val]) => (
                      <tr key={label}>
                        <td style={{ padding: '10px 0', fontSize: 14, color: '#64748b', borderBottom: '1px solid #e2e8f0', width: 100 }}>{label}</td>
                        <td style={{ padding: '10px 0', fontSize: 14, color: '#0f172a', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#f0fdfa', borderRadius: 12, padding: '14px 16px', marginBottom: 24, border: '1px solid #99f6e4' }}>
                <Video size={18} color="#0d9488" style={{ flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                  A Google Meet link will be generated automatically and sent to your email. You can also join from the calendar invite.
                </p>
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#991b1b' }}>
                  {error}
                </div>
              )}

              <button onClick={handleBook} disabled={submitting}
                style={{
                  width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff', fontSize: 16, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: submitting ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                }}>
                {submitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Booking...</> : <><Calendar size={18} /> Confirm Booking</>}
              </button>
            </div>
          )}

          {/* ─── STEP 4: Done ─── */}
          {step === 'done' && result && (
            <div style={{ padding: '48px 36px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Check size={32} color="#fff" strokeWidth={3} />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>You&apos;re All Set!</h2>
              <p style={{ fontSize: 15, color: '#475569', margin: '0 0 28px', lineHeight: 1.6 }}>
                Your demo is confirmed for <strong>{result.date}</strong> at <strong>{result.time} ET</strong>.
                Check your email for the calendar invite and meeting link.
              </p>

              {result.meeting_link && (
                <a href={result.meeting_link} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #0d9488, #0891b2)', color: '#fff',
                    padding: '14px 32px', borderRadius: 12, textDecoration: 'none', fontSize: 16, fontWeight: 700, marginBottom: 20,
                  }}>
                  <Video size={18} /> Join Meeting
                </a>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
                <Link href="/register" style={{ padding: '12px 24px', borderRadius: 10, border: '1.5px solid #0d9488', color: '#0d9488', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                  Start Free Trial
                </Link>
                <Link href="/" style={{ padding: '12px 24px', borderRadius: 10, border: '1.5px solid #e2e8f0', color: '#475569', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                  Back to Home
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, padding: '32px 0', flexWrap: 'wrap' }}>
          {[
            { icon: <Shield size={16} color="#0d9488" />, text: 'HIPAA Compliant' },
            { icon: <Sparkles size={16} color="#0d9488" />, text: 'AI-Powered' },
            { icon: <Clock size={16} color="#0d9488" />, text: '14-Day Free Trial' },
          ].map(b => (
            <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#64748b' }}>
              {b.icon} {b.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
