import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle2, MapPin, Send } from 'lucide-react';
import { useSite } from '../../context/SiteContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { publicApi } from '../../services/endpoints.js';
import { safeUrl } from '../../utils/safeUrl.js';
import { applyServerErrors } from '../admin/formErrors.js';
import Button from '../ui/Button.jsx';
import SocialIcon from '../ui/SocialIcon.jsx';
import { Card } from '../ui/Primitives.jsx';
import { Reveal } from '../ui/Reveal.jsx';
import Section from './Section.jsx';

const input =
  'w-full rounded-xl border border-line bg-bg px-3.5 text-sm outline-none transition-colors placeholder:text-subtle focus:border-accent aria-[invalid=true]:border-danger';
const FIELDS = [{ name: 'name' }, { name: 'email' }, { name: 'subject' }, { name: 'message' }];
const oneLine = (v) => !/[\r\n]/.test(v) || 'Please remove line breaks';

function Field({ id, label, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

export default function Contact() {
  const { profile } = useSite();
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, reset, setError, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: { name: '', email: '', subject: '', message: '', website: '' } });
  const len = watch('message')?.length || 0;

  const a11y = (n) => ({ id: `c-${n}`, 'aria-invalid': errors[n] ? 'true' : 'false', 'aria-describedby': errors[n] ? `c-${n}-err` : undefined });

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await publicApi.sendMessage(values); // `website` is the honeypot; real visitors leave it empty
      reset();
      setSent(true);
      toast.success('Message sent. Thank you!');
    } catch (err) {
      const unplaced = applyServerErrors(err, setError, FIELDS);
      setFormError(unplaced.length || !err.details?.length ? err.message : 'Please fix the highlighted fields.');
    }
  };

  const links = [...(profile?.socialLinks || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <Section id="contact" eyebrow="Contact" title="Let's talk" description="Hiring, collaborating or just saying hello? Send a message and I'll reply by email." alt>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <Reveal className="space-y-5">
          {profile?.availability?.isOpenToWork && <p className="text-lg font-medium">{profile.availability.label || 'Open to opportunities'}</p>}
          <ul className="space-y-3 text-muted">
            {profile?.location && <li className="flex items-center gap-3"><MapPin className="size-4.5 text-accent" aria-hidden="true" />{profile.location}</li>}
            {links.map((l) => (
              <li key={l._id || l.url}>
                <a href={safeUrl(l.url)} {...(l.url.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noopener noreferrer' })} className="flex items-center gap-3 transition-colors hover:text-fg">
                  <SocialIcon platform={l.platform} className="size-4.5 text-accent" />
                  {l.label || (l.url.startsWith('mailto:') ? l.url.slice(7) : l.platform)}
                </a>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal>
          <Card className="p-6 sm:p-8">
            {sent ? (
              <div role="status" className="py-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 size-10 text-success" aria-hidden="true" />
                <h3 className="text-xl font-bold">Message sent</h3>
                <p className="mx-auto mt-2 max-w-sm text-muted">Thanks for reaching out. I'll get back to you by email soon.</p>
                <Button variant="secondary" className="mt-6" onClick={() => setSent(false)}>Send another message</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                {formError && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{formError}</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="c-name" label="Name" error={errors.name?.message}>
                    <input autoComplete="name" className={`${input} h-11`} {...a11y('name')} {...register('name', { required: 'Please enter your name', minLength: { value: 2, message: 'Name is too short' }, maxLength: { value: 80, message: 'Name is too long' }, validate: oneLine })} />
                  </Field>
                  <Field id="c-email" label="Email" error={errors.email?.message}>
                    <input type="email" autoComplete="email" className={`${input} h-11`} {...a11y('email')} {...register('email', { required: 'Please enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
                  </Field>
                </div>
                <Field id="c-subject" label="Subject" error={errors.subject?.message}>
                  <input className={`${input} h-11`} {...a11y('subject')} {...register('subject', { required: 'Please add a subject', minLength: { value: 3, message: 'Subject is too short' }, maxLength: { value: 150, message: 'Subject is too long' }, validate: oneLine })} />
                </Field>
                <Field id="c-message" label="Message" error={errors.message?.message}>
                  <textarea rows={6} className={`${input} py-2.5 leading-relaxed`} {...a11y('message')} {...register('message', { required: 'Please write a message', minLength: { value: 10, message: 'Message is too short (at least 10 characters)' }, maxLength: { value: 3000, message: 'Message is too long (max 3000 characters)' } })} />
                  <p className={`mt-1 text-right text-xs ${len > 3000 ? 'text-danger' : 'text-subtle'}`}>{len}/3000</p>
                </Field>

                {/* Honeypot: invisible and unreachable for people and screen readers; bots tend to fill every field */}
                <div aria-hidden="true" className="absolute -left-[9999px] size-0 overflow-hidden">
                  <label>Website<input tabIndex={-1} autoComplete="off" {...register('website')} /></label>
                </div>

                <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto"><Send className="size-4" aria-hidden="true" /> Send message</Button>
              </form>
            )}
          </Card>
        </Reveal>
      </div>
    </Section>
  );
}
