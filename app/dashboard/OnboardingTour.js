'use client'
import { useState, useEffect } from 'react'

const STEPS = [
  {
    title: '👋 أهلاً بك في نظام إدارة الأسطول',
    body: 'هذه جولة سريعة لتعرّفك بأهم ميزات النظام. تستغرق دقيقة واحدة فقط.',
    icon: '🚀',
  },
  {
    title: '🚛 إدارة المركبات',
    body: 'أضف وعدّل وتابع كل مركبات الأسطول. كل مركبة تقدر ترفع لها 6 أنواع مرفقات (الاستمارة، الفحص الدوري، إلخ) وتعرضها بسهولة.',
    icon: '🚛',
  },
  {
    title: '🔍 الفلاتر والبحث المتقدم',
    body: 'في كل عمود راح تشوف أيقونة ▼ — اضغط عليها لتصفية البيانات حسب أي عمود. أو اضغط Ctrl+K للبحث السريع.',
    icon: '🔍',
  },
  {
    title: '👥 السائقون',
    body: 'تابع رخص القيادة، تواريخ الانتهاء، التنبيهات قبل 30 يوم من الانتهاء.',
    icon: '👤',
  },
  {
    title: '🔧 الصيانة والوقود',
    body: 'سجّل كل عمليات الصيانة وتعبئة الوقود. النظام يحسب التكاليف ويعطيك تقارير شهرية.',
    icon: '🔧',
  },
  {
    title: '📊 التقارير و PDF',
    body: 'اصدر تقارير تحضير المعدات بصيغة PDF بنقرة واحدة، مع شعار الشركة. شارك مباشرة عبر واتساب أو إيميل.',
    icon: '📊',
  },
  {
    title: '⌨️ اختصارات لوحة المفاتيح',
    body: 'استخدم Ctrl+K للبحث، Ctrl+N لإضافة، Ctrl+B لتبديل الثيم. اضغط Ctrl+/ في أي وقت لعرض كل الاختصارات.',
    icon: '⌨️',
  },
  {
    title: '🎉 جاهز للبدء',
    body: 'إذا احتجت مساعدة، تستطيع إعادة هذه الجولة من إعدادات حسابك. حظاً موفقاً!',
    icon: '🎉',
  },
]

export default function OnboardingTour({ force = false }) {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (force) { setShow(true); setStep(0); return }
    const seen = localStorage.getItem('onboardingDone')
    if (!seen) {
      // show after a short delay
      const t = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(t)
    }
  }, [force])

  const finish = () => {
    localStorage.setItem('onboardingDone', '1')
    setShow(false)
  }
  const next = () => step < STEPS.length - 1 ? setStep(step + 1) : finish()
  const prev = () => step > 0 && setStep(step - 1)

  if (!show) return null
  const s = STEPS[step]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn 0.3s' }}>
      <div dir="rtl" style={{ background: 'var(--surface)', borderRadius: '20px', maxWidth: '500px', width: '100%', boxShadow: 'var(--shadow-xl)', fontFamily: 'Cairo, sans-serif', overflow: 'hidden', animation: 'scaleIn 0.3s' }}>
        {/* Progress bar */}
        <div style={{ height: '4px', background: 'var(--surface-3)', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.3s ease' }} />
        </div>

        <div style={{ padding: '32px 28px 24px' }}>
          <div style={{ fontSize: '56px', textAlign: 'center', marginBottom: '20px' }}>{s.icon}</div>
          <div style={{ fontWeight: '900', fontSize: '20px', textAlign: 'center', color: 'var(--text)', marginBottom: '12px' }}>{s.title}</div>
          <div style={{ fontSize: '14px', textAlign: 'center', color: 'var(--text-muted)', lineHeight: '1.7', minHeight: '90px' }}>{s.body}</div>
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '0 0 20px' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === step ? 'var(--accent)' : 'var(--border)', transition: 'all 0.25s' }} />
          ))}
        </div>

        {/* Actions */}
        <div style={{ padding: '0 28px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <button onClick={finish} style={{ background: 'transparent', border: 'none', color: 'var(--text-subtle)', fontSize: '13px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', padding: '8px 0' }}>تخطي الجولة</button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step > 0 && (
              <button onClick={prev} style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>السابق</button>
            )}
            <button onClick={next} style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', boxShadow: 'var(--shadow-accent)' }}>
              {step < STEPS.length - 1 ? 'التالي' : 'بدء الاستخدام'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
