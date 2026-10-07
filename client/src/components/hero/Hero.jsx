import { useMemo, useRef } from 'react';
import { m } from 'motion/react';
import { ArrowRight, Download, Mail, MapPin } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { useSite } from '../../context/SiteContext.jsx';
import { publicApi, resumeUrl } from '../../services/endpoints.js';
import { safeUrl } from '../../utils/safeUrl.js';
import { cn } from '../../utils/cn.js';
import Button from '../ui/Button.jsx';
import SocialIcon from '../ui/SocialIcon.jsx';
import { Container, Skeleton } from '../ui/Primitives.jsx';
import { ErrorState } from '../ui/States.jsx';
import HeroBackground from './HeroBackground.jsx';
import ProfileVisual from './ProfileVisual.jsx';
import StatsStrip from './StatsStrip.jsx';
import ScrollCue from './ScrollCue.jsx';
import TechIcon from './TechIcon.jsx';
import { useCursorGlow } from './useCursorGlow.js';
import { focusCard, heroStats, pickSocial, shortIntro, techList } from './heroData.js';

const EASE = [0.22, 1, 0.36, 1];

// One shared timeline: element N starts ~90ms after element N-1 and each move takes ~600ms (within 300-800ms).
// With prefers-reduced-motion, MotionConfig strips the movement and leaves a quick fade.
const enter = (step, from = {}) => ({
  initial: { opacity: 0, y: 16, ...from },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.6, delay: 0.1 + step * 0.09, ease: EASE },
});

function HeroSkeleton() {
  return (
    <div className="grid items-center gap-12 py-10 lg:grid-cols-[1.1fr_0.9fr]" aria-busy="true" aria-label="Loading profile">
      <div className="space-y-5">
        <Skeleton className="h-8 w-56 rounded-full" />
        <Skeleton className="h-16 w-full max-w-md" />
        <Skeleton className="h-6 w-full max-w-sm" />
        <div className="flex gap-3 pt-2"><Skeleton className="h-12 w-44" /><Skeleton className="h-12 w-44" /></div>
      </div>
      <Skeleton className="mx-auto aspect-square w-[min(76vw,21rem)] rounded-full lg:w-[min(34vw,27rem)]" />
    </div>
  );
}

export default function Hero({ title, tagline }) {
  const { profile, settings, resume, loading, error, refetch } = useSite();
  // Same cache keys as the sections below, so these are shared requests, not extra ones
  const projects = useApi('projects', () => publicApi.projects({ limit: 50 }), { ttl: 120_000 });
  const skills = useApi('skills', publicApi.skills, { ttl: 120_000 });
  const experience = useApi('experience', publicApi.experience, { ttl: 120_000 });

  const rootRef = useRef(null);
  const glowRef = useRef(null);
  const motionOff = settings?.animations?.enabled === false;
  useCursorGlow(rootRef, glowRef, !motionOff);

  const techs = useMemo(() => techList(profile, skills.data || []), [profile, skills.data]);
  const stats = useMemo(
    () => heroStats({ projectCount: projects.meta?.total ?? projects.data?.length ?? 0, skillCount: skills.data?.length ?? 0, experience: experience.data || [] }),
    [projects.meta, projects.data, skills.data, experience.data]
  );

  const github = pickSocial(profile?.socialLinks, 'github');
  const linkedin = pickSocial(profile?.socialLinks, 'linkedin');
  const intro = shortIntro(profile, tagline);
  const focus = focusCard(profile);
  const openToWork = profile?.availability?.isOpenToWork;

  return (
    <section
      ref={rootRef}
      id="top"
      aria-label="Introduction"
      className={cn('hero relative isolate flex min-h-[100svh] flex-col overflow-x-clip pb-6 pt-24 sm:pt-28', motionOff && 'motion-off', settings?.animations?.intensity === 'normal' && 'motion-normal')}
    >
      <HeroBackground />
      <div ref={glowRef} aria-hidden="true" className="hero-cursor-glow" />

      <Container className="flex flex-1 flex-col">
        {loading && !profile ? (
          <HeroSkeleton />
        ) : error && !profile ? (
          <ErrorState className="my-auto" error={error} onRetry={refetch} title="Couldn't load the profile" />
        ) : (
          <>
            <div className="my-auto grid items-center gap-x-14 gap-y-12 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-y-8">
              {/* ---- intro: availability, name, title, description, actions, socials ---- */}
              <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                {openToWork && (
                  <m.div {...enter(0)} className="mb-6">
                    <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3.5 py-1.5 text-sm font-medium text-success">
                      <span className="relative flex size-2" aria-hidden="true">
                        <span className="hero-ping absolute inline-flex size-full rounded-full bg-success opacity-60" />
                        <span className="relative inline-flex size-2 rounded-full bg-success" />
                      </span>
                      {profile.availability.label || 'Open to Work'}
                    </span>
                  </m.div>
                )}

                <m.h1 {...enter(1)} className="font-extrabold leading-[1.04] tracking-tight">
                  <span className="mb-2 block text-xl font-medium text-muted sm:text-2xl">Hi, I'm</span>{' '}
                  <span className="block break-words bg-linear-to-br from-fg from-40% to-accent bg-clip-text text-5xl text-transparent sm:text-6xl xl:text-7xl">{profile.name}</span>
                </m.h1>

                {title && <m.p {...enter(2)} className="mt-4 font-mono text-base text-accent sm:text-lg">{title}</m.p>}
                {tagline && <m.p {...enter(3)} className="mt-5 max-w-xl text-lg font-medium leading-relaxed sm:text-xl">{tagline}</m.p>}
                {intro && <m.p {...enter(3.5)} className="mt-3 line-clamp-4 max-w-xl text-base leading-relaxed text-muted">{intro}</m.p>}

                <m.div {...enter(4.5)} className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button to="/#projects" size="lg" className="hero-cta group w-full sm:w-auto">
                    View My Projects <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </Button>
                  {resume?.available && (
                    <Button href={resumeUrl(true)} variant="secondary" size="lg" className="group w-full sm:w-auto">
                      <Download className="size-4 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden="true" /> Download Resume
                    </Button>
                  )}
                  <Button to="/#contact" variant="ghost" size="lg" className="group w-full sm:w-auto">
                    <Mail className="size-4" aria-hidden="true" /> Let's Connect
                  </Button>
                </m.div>

                {(github || linkedin) && (
                  <m.ul {...enter(5.5)} aria-label="Social profiles" className="mt-5 flex items-center gap-2">
                    {[[github, 'GitHub'], [linkedin, 'LinkedIn']].filter(([l]) => l).map(([l, label]) => (
                      <li key={label}>
                        <a
                          href={safeUrl(l.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${label} profile`}
                          className="grid size-11 place-items-center rounded-xl border border-line bg-surface/60 text-muted transition-[transform,color,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:text-fg hover:shadow-[0_6px_20px_-8px_var(--accent)]"
                        >
                          <SocialIcon platform={label.toLowerCase()} className="size-5" />
                        </a>
                      </li>
                    ))}
                  </m.ul>
                )}

                {(profile.location || profile.email) && (
                  <m.ul {...enter(6)} className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
                    {profile.location && <li className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{profile.location}</li>}
                    {profile.email && (
                      <li>
                        <a href={safeUrl(`mailto:${profile.email}`)} className="flex items-center gap-1.5 transition-colors hover:text-fg"><Mail className="size-4" aria-hidden="true" />{profile.email}</a>
                      </li>
                    )}
                  </m.ul>
                )}
              </div>

              {/* ---- portrait composition ---- */}
              <ProfileVisual profile={profile} techs={techs} focus={focus} enter={enter} className="lg:col-start-2 lg:row-span-2 lg:row-start-1" />

              {/* ---- compact tech row (under the intro on desktop, under the portrait on mobile) ---- */}
              {techs.length > 0 && (
                <m.ul {...enter(6.5)} aria-label="Primary technologies" className="flex flex-wrap gap-2 lg:col-start-1 lg:row-start-2">
                  {techs.map((t) => (
                    <li key={t} className="hero-chip glass transition-[transform,border-color,color] duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:text-fg">
                      <TechIcon name={t} className="size-4 text-accent" />
                      <span>{t}</span>
                    </li>
                  ))}
                </m.ul>
              )}
            </div>

            <StatsStrip stats={stats} enter={enter} />
            <ScrollCue enter={enter} />
          </>
        )}
      </Container>
    </section>
  );
}
