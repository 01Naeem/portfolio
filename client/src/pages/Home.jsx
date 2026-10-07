import { Suspense, lazy, useEffect } from 'react';
import { useSite } from '../context/SiteContext.jsx';
import Seo, { useSiteBase } from '../components/Seo.jsx';
import JsonLd from '../components/JsonLd.jsx';
import { personLd, websiteLd } from '../utils/jsonLd.js';
import Hero from '../components/hero/Hero.jsx';
import About from '../components/sections/About.jsx';
import Skills from '../components/sections/Skills.jsx';
import Projects from '../components/sections/Projects.jsx';

// Sections below the fold are split into their own chunks (Contact alone pulls in react-hook-form).
// While one loads, a same-id placeholder keeps #hash links valid; idle prefetch means it's usually
// already cached by the time a visitor scrolls there.
const loaders = {
  experience: () => import('../components/sections/Experience.jsx'),
  education: () => import('../components/sections/Education.jsx'),
  certificates: () => import('../components/sections/Certificates.jsx'),
  github: () => import('../components/sections/GithubActivity.jsx'),
  resume: () => import('../components/sections/ResumeSection.jsx'),
  contact: () => import('../components/sections/Contact.jsx'),
};
const deferred = (id, reserve) => {
  const C = lazy(loaders[id]);
  return function Deferred() {
    return (
      <Suspense fallback={reserve ? <div id={id} className="min-h-[24rem]" aria-hidden="true" /> : null}>
        <C />
      </Suspense>
    );
  };
};
const Experience = deferred('experience', true);
const Education = deferred('education', true);
const Certificates = deferred('certificates', false); // optional sections reserve no space
const GithubActivity = deferred('github', false);
const ResumeSection = deferred('resume', true);
const Contact = deferred('contact', true);

export default function Home() {
  useEffect(() => {
    const run = () => Object.values(loaders).forEach((load) => load().catch(() => {}));
    if ('requestIdleCallback' in window) { const id = requestIdleCallback(run, { timeout: 4000 }); return () => cancelIdleCallback(id); }
    const t = setTimeout(run, 1500);
    return () => clearTimeout(t);
  }, []);

  const { profile, settings } = useSite();
  const base = useSiteBase();
  const heroTitle = settings?.hero?.title?.trim() || profile?.title;
  const heroTagline = settings?.hero?.subtitle?.trim() || profile?.tagline;

  return (
    <>
      <Seo path="/" />
      {profile?.name && <JsonLd data={[personLd(profile, base), websiteLd(settings, profile, base)]} />}
      <Hero title={heroTitle} tagline={heroTagline} />

      <About />
      <Skills />
      <Projects />
      <Experience />
      <Education />
      <Certificates />
      <GithubActivity />
      <ResumeSection />
      <Contact />
    </>
  );
}
