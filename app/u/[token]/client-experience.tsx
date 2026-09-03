'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, CircleHelp, Mail, MessageSquare, X } from 'lucide-react'
import DropLogo from '@/components/drop-logo'

const SUPPORT_EMAIL = 'contact@minimical.online'

type TourStep = { title: string; body: string; selector?: string }

const TOUR: TourStep[] = [
  { title: 'Your private project space', body: 'Everything for this project lives here. Use the workspace as the single place to send and receive files.', selector: '.v5-hero' },
  { title: 'Send files to Minimical', body: 'Drop files into the upload area or choose Upload. Large files continue transferring directly to the project storage.', selector: '.v5-dropzone' },
  { title: 'Keep things organised', body: 'Create folders, search your files and sort the workspace whenever a project gets busy.', selector: '.v5-controls' },
  { title: 'Preview and download', body: 'Open supported files for preview, or download them from the file actions. Your project stays in one place.', selector: '.v5-row' },
  { title: 'Need a hand?', body: 'Use Contact support at any time. Choose the type of issue and Drop will prepare a structured email for the Minimical team.', selector: '.drop-support' },
]

export default function ClientExperience({ children, token }: { children: React.ReactNode; token: string }) {
  const [intro, setIntro] = useState(true)
  const [welcome, setWelcome] = useState(false)
  const [tour, setTour] = useState(false)
  const [step, setStep] = useState(0)
  const [support, setSupport] = useState(false)
  const [sent, setSent] = useState(false)

  const key = useMemo(() => `minimical-drop-onboarded:${token}`, [token])

  useEffect(() => {
    const seen = window.localStorage.getItem(key) === '1'
    const timer = window.setTimeout(() => {
      setIntro(false)
      if (!seen) setWelcome(true)
    }, 850)
    return () => window.clearTimeout(timer)
  }, [key])

  useEffect(() => {
    const target = tour ? document.querySelector(TOUR[step]?.selector || '') : null
    target?.classList.add('drop-tour-target')
    return () => target?.classList.remove('drop-tour-target')
  }, [tour, step])

  function finishOnboarding() {
    window.localStorage.setItem(key, '1')
    setWelcome(false)
    setTour(false)
  }

  function startTour() {
    setWelcome(false)
    setStep(0)
    setTour(true)
  }

  function next() {
    if (step >= TOUR.length - 1) finishOnboarding()
    else setStep(value => value + 1)
  }

  function back() {
    setStep(value => Math.max(0, value - 1))
  }

  function submitSupport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const category = String(form.get('category') || 'Other')
    const name = String(form.get('name') || '').trim()
    const email = String(form.get('email') || '').trim()
    const subject = String(form.get('subject') || '').trim()
    const details = String(form.get('details') || '').trim()
    const body = [
      'MINIMICAL DROP SUPPORT',
      '',
      `Category: ${category}`,
      `Name: ${name || 'Not provided'}`,
      `Email: ${email || 'Not provided'}`,
      `Project URL: ${window.location.href}`,
      '',
      `Subject: ${subject || 'Support request'}`,
      '',
      'Details:',
      details || 'No additional details provided.',
      '',
      'Sent from MINIMICAL DROP.',
    ].join('\n')
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[DROP] ${category}: ${subject || 'Support request'}`)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }

  return <>
    {children}

    {intro && <div className="drop-intro" aria-hidden="true">
      <DropLogo className="drop-intro-logo" priority />
      <div className="drop-loader"><i/><i/><i/></div>
      <span>Preparing your private project space</span>
    </div>}

    {welcome && <div className="drop-onboard-backdrop">
      <section className="drop-onboard-card" role="dialog" aria-modal="true" aria-labelledby="drop-welcome-title">
        <button className="drop-onboard-close" onClick={finishOnboarding} aria-label="Skip introduction"><X size={17}/></button>
        <DropLogo className="drop-onboard-logo" />
        <span className="drop-onboard-kicker">WELCOME TO DROP</span>
        <h2 id="drop-welcome-title">Your project, in one private space.</h2>
        <p>Send files to Minimical, find what we have shared with you and keep the whole project organised without another account to manage.</p>
        <div className="drop-onboard-actions"><button onClick={finishOnboarding}>Skip for now</button><button className="primary" onClick={startTour}>Take a quick tour <ChevronRight size={15}/></button></div>
      </section>
    </div>}

    {tour && <div className="drop-tour-backdrop">
      <section className="drop-tour-card" role="dialog" aria-modal="true" aria-labelledby="drop-tour-title">
        <div className="drop-tour-top"><span>QUICK TOUR</span><button onClick={finishOnboarding} aria-label="Skip tour">Skip tour</button></div>
        <div className="drop-tour-count">0{step + 1} / 0{TOUR.length}</div>
        <h2 id="drop-tour-title">{TOUR[step].title}</h2>
        <p>{TOUR[step].body}</p>
        <div className="drop-tour-progress">{TOUR.map((_, index) => <i key={index} className={index <= step ? 'active' : ''}/>)}</div>
        <div className="drop-tour-actions"><button onClick={back} disabled={step === 0}><ChevronLeft size={15}/> Back</button><button className="primary" onClick={next}>{step === TOUR.length - 1 ? 'Finish' : 'Next'} {step < TOUR.length - 1 && <ChevronRight size={15}/>}</button></div>
      </section>
    </div>}

    {support && <div className="drop-support-backdrop" onMouseDown={event => event.target === event.currentTarget && setSupport(false)}>
      <section className="drop-support-card" role="dialog" aria-modal="true" aria-labelledby="drop-support-title">
        <button className="drop-support-close" onClick={() => setSupport(false)} aria-label="Close support"><X size={17}/></button>
        <span className="drop-support-kicker"><MessageSquare size={13}/> CONTACT SUPPORT</span>
        <h2 id="drop-support-title">Tell us what went wrong.</h2>
        <p>Choose a category and give us enough context to help. Your email app will open with the message already formatted.</p>
        {sent ? <div className="drop-support-sent"><Check size={18}/><strong>Your email draft is ready.</strong><span>If your mail app did not open, send the prepared details to {SUPPORT_EMAIL}.</span><button onClick={() => setSupport(false)}>Close</button></div> : <form onSubmit={submitSupport}>
          <label>Issue type<select name="category" defaultValue="Technical issue"><option>Information</option><option>Technical issue</option><option>Feedback</option><option>Complaint</option><option>Other</option></select></label>
          <div className="drop-support-grid"><label>Your name<input name="name" autoComplete="name" placeholder="Your name"/></label><label>Your email<input name="email" type="email" autoComplete="email" placeholder="you@example.com"/></label></div>
          <label>Subject<input name="subject" placeholder="What do you need help with?" required/></label>
          <label>Details<textarea name="details" rows={5} placeholder="Tell us what happened, what you expected, and anything useful we should know." required/></label>
          <button className="primary drop-support-submit" type="submit"><Mail size={14}/> Prepare email</button>
        </form>}
      </section>
    </div>}

    <button className="drop-support" onClick={() => { setSupport(true); setSent(false) }}><CircleHelp size={15}/><span>Contact support</span></button>
  </>
}
