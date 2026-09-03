'use client'

import { FormEvent, useState } from 'react'
import { Check, CircleHelp, Mail, MessageSquare, X } from 'lucide-react'

const SUPPORT_EMAIL = 'contact@minimical.online'

export default function ClientExperience({ children }: { children: React.ReactNode }) {
  const [support, setSupport] = useState(false)
  const [sent, setSent] = useState(false)

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
