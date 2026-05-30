'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Mic, Pause, Play, SkipForward, Volume2, Zap, X } from 'lucide-react';
import { DEMO_STEPS } from './data';

export function DemoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen) { setCurrentStep(0); setProgress(0); setIsPlaying(true); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isPlaying || currentStep >= DEMO_STEPS.length) return;
    const stepDuration = DEMO_STEPS[currentStep].duration;
    const interval = 50;
    const increment = (interval / stepDuration) * 100;
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentStep < DEMO_STEPS.length - 1) { setCurrentStep(s => s + 1); return 0; }
          else { setIsPlaying(false); return 100; }
        }
        return prev + increment;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [isOpen, isPlaying, currentStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-dark-800 rounded-2xl w-full max-w-4xl overflow-hidden border border-dark-600 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-cyan rounded-xl flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Product Demo</h3>
              <p className="text-sm text-dark-400">See how Palm It works</p>
            </div>
          </div>
          <button aria-label="Close demo" onClick={onClose} className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700"><X className="w-6 h-6" /></button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            {DEMO_STEPS.map((_, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1 rounded-full transition-all ${i < currentStep ? 'bg-green-500' : i === currentStep ? 'bg-primary-500' : 'bg-dark-600'}`}>
                  {i === currentStep && <div className="h-full bg-primary-400 rounded-full transition-all" style={{ width: `${progress}%` }} />}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mb-6">
            <h4 className="text-xl font-bold text-white mb-2">{DEMO_STEPS[currentStep]?.title}</h4>
            <p className="text-dark-400">{DEMO_STEPS[currentStep]?.description}</p>
          </div>
          <div className="bg-dark-900 rounded-xl p-6 min-h-[300px] relative overflow-hidden">
            {currentStep === 0 && (
              <div className="flex flex-col items-center justify-center h-full animate-fadeIn">
                <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-red-500/30"><Mic className="w-12 h-12 text-white" /></div>
                <div className="flex items-center gap-1 h-16 mb-4">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div key={i} className="w-1.5 bg-red-500 rounded-full animate-waveform" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 30}ms` }} />
                  ))}
                </div>
                <div className="bg-dark-800 rounded-xl p-4 max-w-md">
                  <p className="text-dark-300 text-sm italic">&quot;Mrs. Johnson needs assistance with bathing, dressing, and meal preparation. She has diabetes and requires medication reminders twice daily...&quot;</p>
                </div>
              </div>
            )}
            {currentStep === 1 && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center"><Volume2 className="w-5 h-5 text-blue-400" /></div>
                  <span className="text-white font-medium">AI Transcribing...</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { initial: 'C', color: 'teal', speaker: 'Caregiver (00:00)', text: 'Good morning Mrs. Johnson, I\'m here to do your care assessment today.' },
                    { initial: 'M', color: 'green', speaker: 'Mrs. Johnson (00:05)', text: 'Hello dear, thank you for coming. I\'ve been having trouble with my daily activities.' },
                    { initial: 'C', color: 'teal', speaker: 'Caregiver (00:12)', text: 'I understand. Let\'s go through what kind of help you need...' },
                  ].map((msg, i) => (
                    <div key={i} className="flex gap-3 animate-slideIn" style={{ animationDelay: `${i * 200}ms` }}>
                      <div className={`w-8 h-8 bg-${msg.color}-500 rounded-full flex items-center justify-center text-white text-sm font-bold`}>{msg.initial}</div>
                      <div className="flex-1 bg-dark-800 rounded-xl p-3">
                        <p className={`text-xs text-${msg.color}-400 mb-1`}>{msg.speaker}</p>
                        <p className="text-dark-200 text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {currentStep === 2 && (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center"><Zap className="w-5 h-5 text-yellow-400" /></div>
                  <span className="text-white font-medium">Extracting Care Needs...</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-dark-800 rounded-xl p-4 animate-slideIn">
                    <h5 className="text-sm font-semibold text-primary-400 mb-3">Services Identified</h5>
                    <ul className="space-y-2">
                      {['Bathing Assistance', 'Dressing Assistance', 'Meal Preparation', 'Medication Reminders'].map((s, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-dark-200"><CheckCircle className="w-4 h-4 text-green-400" />{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-dark-800 rounded-xl p-4 animate-slideIn" style={{ animationDelay: '200ms' }}>
                    <h5 className="text-sm font-semibold text-primary-400 mb-3">Schedule</h5>
                    <ul className="space-y-2 text-sm text-dark-200">
                      <li className="flex justify-between"><span>Days:</span><span className="text-white">Mon, Wed, Fri</span></li>
                      <li className="flex justify-between"><span>Time:</span><span className="text-white">9:00 AM - 1:00 PM</span></li>
                      <li className="flex justify-between"><span>Hours/Week:</span><span className="text-white">12 hours</span></li>
                    </ul>
                  </div>
                  <div className="bg-dark-800 rounded-xl p-4 animate-slideIn" style={{ animationDelay: '400ms' }}>
                    <h5 className="text-sm font-semibold text-primary-400 mb-3">Medical Notes</h5>
                    <p className="text-sm text-dark-200">Type 2 Diabetes, requires medication reminders at 9am and 6pm</p>
                  </div>
                  <div className="bg-dark-800 rounded-xl p-4 animate-slideIn" style={{ animationDelay: '600ms' }}>
                    <h5 className="text-sm font-semibold text-primary-400 mb-3">Billing Estimate</h5>
                    <p className="text-2xl font-bold text-green-400">$35/hr</p>
                    <p className="text-sm text-dark-400">$420/week &bull; $1,820/month</p>
                  </div>
                </div>
              </div>
            )}
            {currentStep === 3 && (
              <div className="animate-fadeIn">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center"><CheckCircle className="w-6 h-6 text-green-400" /></div>
                  <span className="text-xl font-bold text-white">Contract Ready!</span>
                </div>
                <div className="bg-white rounded-xl p-6 max-w-md mx-auto shadow-2xl">
                  <div className="border-b border-gray-200 pb-4 mb-4">
                    <h5 className="text-lg font-bold text-gray-900">Home Care Service Agreement</h5>
                    <p className="text-sm text-gray-500">Contract #HC-2024-0847</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    {[['Client:', 'Margaret Johnson'], ['Services:', 'Personal Care'], ['Schedule:', 'Mon, Wed, Fri'], ['Hours/Week:', '12 hours']].map(([l, v], i) => (
                      <div key={i} className="flex justify-between"><span className="text-gray-500">{l}</span><span className="text-gray-900 font-medium">{v}</span></div>
                    ))}
                    <div className="flex justify-between border-t border-gray-200 pt-3">
                      <span className="text-gray-900 font-bold">Monthly Total:</span>
                      <span className="text-green-600 font-bold">$1,820.00</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => alert('PDF download available in the full product — book a demo to see it live!')} className="flex-1 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition">Download PDF</button>
                    <button onClick={() => alert('Client delivery available in the full product — book a demo to see it live!')} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">Send to Client</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-dark-400">Step {currentStep + 1} of {DEMO_STEPS.length}</div>
            <div className="flex items-center gap-3">
              {!isPlaying && currentStep === DEMO_STEPS.length - 1 ? (
                <button onClick={() => { setCurrentStep(0); setProgress(0); setIsPlaying(true); }} className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition">Watch Again</button>
              ) : (
                <>
                  <button aria-label={isPlaying ? 'Pause demo' : 'Play demo'} onClick={() => setIsPlaying(!isPlaying)} className="p-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition">{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</button>
                  <button aria-label="Skip" onClick={() => { if (currentStep < DEMO_STEPS.length - 1) { setCurrentStep(s => s + 1); setProgress(0); } }} className="p-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition"><SkipForward className="w-5 h-5" /></button>
                </>
              )}
              <a href="/register" onClick={onClose} className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition">Sign Up Free</a>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes waveform { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-slideIn { animation: slideIn 0.4s ease-out forwards; }
        .animate-waveform { animation: waveform 0.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* BookDemoSection removed — signup flow now at /register */
