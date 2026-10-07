import { useState } from 'react';
import { Award, ExternalLink } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { useSite } from '../../context/SiteContext.jsx';
import { publicApi } from '../../services/endpoints.js';
import { formatDate } from '../../utils/format.js';
import { optimizeImage } from '../../utils/image.js';
import { safeUrl } from '../../utils/safeUrl.js';
import { Modal } from '../ui/Modal.jsx';
import { Card } from '../ui/Primitives.jsx';
import { ErrorState } from '../ui/States.jsx';
import { Stagger, StaggerItem } from '../ui/Reveal.jsx';
import Section, { GridSkeleton } from './Section.jsx';

export default function Certificates() {
  const { settings } = useSite();
  const hidden = settings?.sections?.showCertificates === false;
  const { data, loading, error, refetch } = useApi('certificates', publicApi.certificates, { ttl: 120_000, enabled: !hidden });
  const [zoom, setZoom] = useState(null);

  if (hidden) return null;
  // Optional section: with nothing to show, hide it rather than display an empty shell
  if (!loading && !error && !data?.length) return null;

  return (
    <Section id="certificates" eyebrow="Certifications" title="Certificates">
      {error && !data ? <ErrorState error={error} onRetry={refetch} title="Couldn't load certificates" />
        : loading && !data ? <GridSkeleton count={3} className="h-44" />
        : (
          <Stagger as="ul" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((c) => (
              <StaggerItem as="li" key={c._id}>
                <Card className="flex h-full flex-col p-5">
                  {c.image?.url ? (
                    <button onClick={() => setZoom(c)} aria-label={`Enlarge certificate: ${c.name}`} className="mb-4 overflow-hidden rounded-lg border border-line bg-raised">
                      <img src={optimizeImage(c.image.url, 600)} alt={c.image.alt || `${c.name} certificate`} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
                    </button>
                  ) : (
                    <span className="mb-4 grid size-11 place-items-center rounded-xl bg-accent/10 text-accent"><Award className="size-5" aria-hidden="true" /></span>
                  )}
                  <h3 className="font-display text-base font-bold">{c.name}</h3>
                  <p className="text-sm text-muted">{c.issuer}{c.issueDate ? ` · ${formatDate(c.issueDate)}` : ''}</p>
                  {c.credentialId && <p className="mt-2 font-mono text-xs text-subtle">ID: {c.credentialId}</p>}
                  {c.credentialUrl && (
                    <a href={safeUrl(c.credentialUrl)} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-accent hover:underline">
                      Verify credential <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      <Modal open={Boolean(zoom)} onClose={() => setZoom(null)} title={zoom?.name || 'Certificate'} size="lg">
        {zoom?.image?.url && <img src={optimizeImage(zoom.image.url, 1400)} alt={zoom.image.alt || `${zoom.name} certificate`} className="w-full rounded-lg" />}
      </Modal>
    </Section>
  );
}
