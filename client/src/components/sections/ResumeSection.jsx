import { Download, ExternalLink } from 'lucide-react';
import { useSite } from '../../context/SiteContext.jsx';
import { resumeUrl } from '../../services/endpoints.js';
import { safeUrl } from '../../utils/safeUrl.js';
import Button from '../ui/Button.jsx';
import { Badge, Card } from '../ui/Primitives.jsx';
import { Reveal } from '../ui/Reveal.jsx';
import Section from './Section.jsx';

// Recruiter/ATS block: everything important as plain, readable HTML text (no graphics needed to understand it).
export default function ResumeSection() {
  const { profile, resume } = useSite();
  if (!profile) return null;

  const links = profile.socialLinks || [];
  const byPlatform = (p) => links.find((l) => l.platform?.toLowerCase() === p);
  const github = byPlatform('github');
  const linkedin = byPlatform('linkedin');
  const rows = [
    ['Status', profile.availability?.isOpenToWork ? <Badge tone="success">{profile.availability.label || 'Open to work'}</Badge> : null],
    ['Current role', profile.currentRole || profile.title],
    ['Location', profile.location],
    ['Email', profile.email && <a className="text-accent hover:underline" href={safeUrl(`mailto:${profile.email}`)}>{profile.email}</a>],
    ['GitHub', github && <a className="inline-flex items-center gap-1 text-accent hover:underline" href={safeUrl(github.url)} target="_blank" rel="noopener noreferrer">{github.url.replace(/^https?:\/\//, '')} <ExternalLink className="size-3" aria-hidden="true" /></a>],
    ['LinkedIn', linkedin && <a className="inline-flex items-center gap-1 text-accent hover:underline" href={safeUrl(linkedin.url)} target="_blank" rel="noopener noreferrer">{linkedin.url.replace(/^https?:\/\//, '')} <ExternalLink className="size-3" aria-hidden="true" /></a>],
    ['Primary technologies', profile.primaryTechnologies?.length ? profile.primaryTechnologies.join(', ') : null],
  ].filter(([, v]) => v);

  if (rows.length === 0 && !resume?.available) return null;

  return (
    <Section id="resume" eyebrow="Resume" title="For recruiters" description="The essentials at a glance, with my resume as a PDF.">
      <Reveal>
        <Card className="p-6 sm:p-8">
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-[10rem_1fr]">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {resume?.available && (
            <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
              <Button href={resumeUrl(false)}><ExternalLink className="size-4" aria-hidden="true" /> View resume</Button>
              <Button href={resumeUrl(true)} variant="secondary"><Download className="size-4" aria-hidden="true" /> Download PDF</Button>
            </div>
          )}
        </Card>
      </Reveal>
    </Section>
  );
}
