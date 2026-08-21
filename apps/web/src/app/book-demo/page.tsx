'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react';
import { trackGenerateLead } from '@/lib/ga';
import PalmOrb from '@/components/glass/PalmOrb';
import WaveField from '@/components/glass/WaveField';

const API = '/api';

interface ScheduleSlot {
  time: string;
  available: boolean;
}

interface SlotData {
  timezone: string;
  timezone_label?: string;
  duration_minutes: number;
  slots: Record<string, string[]>;
  schedule?: Record<string, ScheduleSlot[]>;
}

interface BookingResult {
  success: boolean;
  meeting_link?: string;
  date?: string;
  time?: string;
  message: string;
}

const inputClass =
  'h-11 w-full px-3.5 rounded-xl bg-[#FFFFFFA6] border border-[#10211F1F] text-sm text-[#10211F] placeholder:text-[#8AA09B] focus:outline-none focus:ring-2 focus:ring-primary-500/30';
const labelClass = 'text-xs font-semibold leading-4 text-[#5B736F]';

export default function BookDemoPage() {
  const [slotData, setSlotData] = useState<SlotData | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/demos/slots`)
      .then((r) => r.json())
      .then((d) => {
        setSlotData(d);
        setLoadingSlots(false);
        const first = Object.keys(d.slots || {}).sort()[0];
        if (first) {
          setSelectedDate(first);
          const [y, m] = first.split('-').map(Number);
          setViewMonth(new Date(y, m - 1, 1));
        }
      })
      .catch(() => setLoadingSlots(false));
  }, []);

  const availableDates = useMemo(() => {
    if (!slotData) return new Set<string>();
    return new Set(Object.keys(slotData.slots));
  }, [slotData]);

  const timesForDate = useMemo((): ScheduleSlot[] => {
    if (!slotData || !selectedDate) return [];
    if (slotData.schedule?.[selectedDate]) {
      return slotData.schedule[selectedDate];
    }
    return (slotData.slots[selectedDate] || []).map((time) => ({
      time,
      available: true,
    }));
  }, [slotData, selectedDate]);

  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth]);

  function isoForDay(day: number) {
    const y = viewMonth.getFullYear();
    const m = String(viewMonth.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatTime12(t: string) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  function formatSelectedDayLabel(iso: string) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  const canConfirm =
    name.trim() &&
    email.trim() &&
    email.includes('@') &&
    company.trim() &&
    selectedDate &&
    selectedTime;

  async function handleBook() {
    if (!canConfirm || submitting) return;
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
      setDone(true);
      try {
        trackGenerateLead({ lead_type: 'demo_booking', company: company.trim() || undefined });
      } catch {
        /* analytics must never break booking */
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(320px,560px)_1fr] relative overflow-hidden bg-[#E7F1EF] antialiased">
      {/* Left brand panel — Paper Book Demo */}
      <div className="hidden lg:flex flex-col justify-between p-10 xl:p-14 relative overflow-hidden bg-[#071412] min-h-screen">
        <WaveField dark className="opacity-90" />
        <div className="relative z-10 flex items-center gap-3">
          <PalmOrb size={36} />
          <span className="text-[18px] tracking-[0.02em] font-bold text-white">PALM</span>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3 max-w-[380px] mx-auto text-center">
          <PalmOrb size={220} className="shrink-0 mb-3" />
          <p className="text-[36px] tracking-tight leading-[42px] font-bold text-white">
            Book a live demo
          </p>
          <p className="text-[15px] leading-[22px] text-[#94A3B8]">
            See how one recording becomes a care plan, billables, notes, and a service agreement.
          </p>
        </div>

        <p className="relative z-10 text-[13px] font-medium text-white/40">
          30 minutes. No pitch deck. Just the product.
        </p>
      </div>

      {/* Booking column */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8 relative min-h-screen">
        <WaveField className="opacity-40 lg:hidden" />
        <div className="relative z-10 w-full max-w-[720px]">
          <div className="mb-5 lg:hidden text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <PalmOrb size={32} />
              <span className="text-lg font-bold tracking-[0.02em] text-[#10211F]">PALM</span>
            </Link>
            <p className="text-[28px] font-bold tracking-tight text-[#10211F]">Book a live demo</p>
          </div>

          <div className="flex flex-col gap-5 p-7 sm:p-9 rounded-[24px] bg-[#FFFFFFB8] border border-[#FFFFFFD9] shadow-[0_30px_70px_#115E5924] backdrop-blur-xl">
            {done ? (
              <div className="flex flex-col items-center text-center gap-4 py-8">
                <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center">
                  <Check className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-[#10211F]">You are booked</h2>
                <p className="text-[15px] text-[#5B736F] max-w-md">
                  {result?.message ||
                    `We will see you ${selectedDate ? formatSelectedDayLabel(selectedDate) : ''} at ${
                      selectedTime ? formatTime12(selectedTime) : ''
                    }.`}
                </p>
                {result?.meeting_link && (
                  <a
                    href={result.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-primary-600 hover:underline"
                  >
                    Open meeting link
                  </a>
                )}
                <Link href="/" className="text-sm font-medium text-[#8AA09B] hover:text-primary-600">
                  Back to home
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <p className="text-[13px] tracking-[0.08em] uppercase font-semibold text-primary-500">
                    Schedule
                  </p>
                  <h1 className="text-[28px] tracking-tight leading-[34px] font-bold text-[#10211F]">
                    Pick a date and time
                  </h1>
                  <p className="text-[15px] leading-[22px] text-[#5B736F]">
                    We will walk through a real assessment on PalmCare AI. You leave with a clear
                    picture of fit for your agency.
                  </p>
                </div>

                {loadingSlots ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row items-start gap-6">
                    {/* Month grid */}
                    <div className="w-full lg:w-[340px] flex flex-col gap-4 shrink-0">
                      <div className="h-9 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() =>
                            setViewMonth(
                              (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0D948814] text-primary-600"
                          aria-label="Previous month"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-base font-semibold text-[#10211F]">
                          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setViewMonth(
                              (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)
                            )
                          }
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0D948814] text-primary-600"
                          aria-label="Next month"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-[5px]">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                          <div
                            key={d}
                            className="h-6 text-center text-xs font-semibold tracking-[0.04em] text-[#8AA09B]"
                          >
                            {d}
                          </div>
                        ))}
                        {calendarCells.map((day, i) => {
                          if (day === null) return <div key={`e-${i}`} className="h-11" />;
                          const iso = isoForDay(day);
                          const available = availableDates.has(iso);
                          const active = iso === selectedDate;
                          return (
                            <button
                              key={iso}
                              type="button"
                              disabled={!available}
                              onClick={() => {
                                setSelectedDate(iso);
                                setSelectedTime('');
                              }}
                              className={`h-11 rounded-xl text-sm transition-colors ${
                                active
                                  ? 'bg-primary-500 text-white font-semibold'
                                  : available
                                    ? 'text-[#10211F] font-medium hover:bg-[#0D94881A]'
                                    : 'text-[#A8BDB8] font-medium cursor-default'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time slots */}
                    <div className="w-full lg:w-[272px] flex flex-col gap-3 shrink-0">
                      <p className="text-[13px] tracking-[0.04em] font-semibold text-[#5B736F]">
                        {selectedDate ? formatSelectedDayLabel(selectedDate) : 'Select a date'}
                      </p>
                      <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
                        {selectedDate && timesForDate.length === 0 && (
                          <p className="text-sm text-[#8AA09B]">No times left this day.</p>
                        )}
                        {timesForDate.map((slot) => {
                          const active = slot.time === selectedTime;
                          const bookable = slot.available;
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={!bookable}
                              onClick={() => bookable && setSelectedTime(slot.time)}
                              className={`h-11 w-full rounded-xl text-sm transition-colors flex items-center justify-between px-3.5 ${
                                !bookable
                                  ? 'bg-[#10211F0A] border border-transparent text-[#A8BDB8] cursor-default line-through decoration-[#A8BDB8]'
                                  : active
                                    ? 'bg-primary-500 text-white font-semibold'
                                    : 'bg-[#FFFFFF8C] border border-[#10211F1A] text-[#10211F] font-medium hover:border-primary-500/40'
                              }`}
                            >
                              <span>{formatTime12(slot.time)}</span>
                              {!bookable && (
                                <span className="text-[11px] font-semibold tracking-wide uppercase">
                                  Booked
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs leading-[18px] text-[#8AA09B]">
                        {slotData?.timezone_label || 'Central Time'}. 30 min with the PalmCare team.
                      </p>
                    </div>
                  </div>
                )}

                {/* Contact fields */}
                <div className="flex flex-col gap-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass} htmlFor="demo-name">
                        Full name
                      </label>
                      <input
                        id="demo-name"
                        className={inputClass}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Maria Santos"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass} htmlFor="demo-email">
                        Work email
                      </label>
                      <input
                        id="demo-email"
                        type="email"
                        className={inputClass}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="maria@sunrisehomecare.com"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} htmlFor="demo-agency">
                      Agency name
                    </label>
                    <input
                      id="demo-agency"
                      className={inputClass}
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Sunrise Home Care"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass} htmlFor="demo-phone">
                      Phone (optional)
                    </label>
                    <input
                      id="demo-phone"
                      type="tel"
                      className={inputClass}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      {error}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={!canConfirm || submitting}
                    onClick={handleBook}
                    className="h-[52px] w-full rounded-[14px] bg-primary-500 hover:bg-primary-600 text-white text-[15px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Booking…' : 'Confirm demo'}
                  </button>
                  <p className="text-xs text-center text-[#8AA09B]">
                    Questions first? Email{' '}
                    <a href="mailto:demo@palmtai.com" className="text-primary-600 font-medium">
                      demo@palmtai.com
                    </a>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
