import { useSite } from '../../context/SiteContext.jsx';
import { safeUrl } from '../../utils/safeUrl.js';
import SocialIcon from '../ui/SocialIcon.jsx';
import { Container } from '../ui/Primitives.jsx';

export default function Footer() {
  const { profile } = useSite();
  const links = [...(profile?.socialLinks || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return (
    <footer className="border-t border-line py-10">
      <Container className="flex flex-col items-center justify-between gap-5 sm:flex-row">
        <p className="text-sm text-muted">
          &copy; {new Date().getFullYear()} {profile?.name || 'Portfolio'}. Built with the MERN stack.
        </p>
        {links.length > 0 && (
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l._id || l.url}>
                <a
                  href={safeUrl(l.url)}
                  target={l.url.startsWith('mailto:') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  aria-label={l.label || l.platform}
                  className="grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-raised hover:text-fg"
                >
                  <SocialIcon platform={l.platform} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </footer>
  );
}
