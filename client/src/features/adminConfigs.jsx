import { Star } from 'lucide-react';
import { adminCrud, settingsApi } from '../services/endpoints.js';
import { formatDate } from '../utils/format.js';
import { Badge } from '../components/ui/Primitives.jsx';

// One config per content type. ResourcePage turns each into a searchable table + add/edit modal,
// so adding a new managed section later is a config, not another page.

const muted = (t) => <span className="text-muted">{t || '—'}</span>;
const nameCell = (title, sub) => (
  <div className="min-w-0">
    <p className="truncate font-medium">{title}</p>
    {sub && <p className="truncate text-xs text-muted">{sub}</p>}
  </div>
);

export const projectsConfig = {
  key: 'projects', endpoint: '/projects', title: 'Projects', singular: 'Project', titleKey: 'title',
  description: 'Showcase work with images, links, features and the story behind each build.',
  emptyHint: 'Projects appear on your public site as soon as you publish them.',
  listParams: { all: 'true', limit: 50 },
  searchKeys: ['title', 'shortDescription'],
  filter: { field: 'categories', label: 'categories', options: ['Frontend', 'Backend', 'Full Stack'] },
  reorder: true,
  footnote: 'Featured projects always appear first on the public site; reordering applies within each group.',
  deleteNote: 'along with its uploaded images',
  columns: [
    {
      header: 'Project',
      render: (r) => (
        <div className="flex min-w-0 items-center gap-3">
          {r.coverImage?.url ? <img src={r.coverImage.url} alt="" className="size-10 shrink-0 rounded-lg object-cover" loading="lazy" /> : <div className="size-10 shrink-0 rounded-lg bg-raised" aria-hidden="true" />}
          {nameCell(r.title, r.shortDescription)}
        </div>
      ),
    },
    { header: 'Type', render: (r) => <div className="flex flex-wrap gap-1">{r.categories?.length ? r.categories.map((c) => <Badge key={c}>{c}</Badge>) : muted()}</div> },
    { header: 'Status', render: (r) => <div className="flex flex-wrap gap-1">{r.published ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>}{r.featured && <Badge tone="accent">Featured</Badge>}</div> },
    { header: 'Clicks', className: 'tabular-nums', render: (r) => r.clicks ?? 0 },
  ],
  rowActions: (r, { refresh, toast }) => (
    <button
      aria-label={r.featured ? `Unfeature ${r.title}` : `Feature ${r.title}`}
      aria-pressed={r.featured}
      onClick={async () => {
        try { await adminCrud('/projects').patch(r._id, '/featured'); toast.success(r.featured ? 'Removed from featured' : 'Marked as featured'); await refresh(); }
        catch (e) { toast.error(e.message); }
      }}
      className={`grid size-9 place-items-center rounded-lg transition-colors hover:bg-raised ${r.featured ? 'text-warning' : 'text-muted hover:text-fg'}`}
    >
      <Star className="size-4" fill={r.featured ? 'currentColor' : 'none'} />
    </button>
  ),
  fields: [
    { name: 'title', label: 'Project name', required: true, full: true },
    { name: 'shortDescription', label: 'Short description', type: 'textarea', rows: 2, required: true, hint: 'One or two sentences shown on the project card (max 300 characters).' },
    { name: 'description', label: 'Detailed description', type: 'textarea', rows: 6 },
    { name: 'technologies', label: 'Technologies', type: 'tags', placeholder: 'React, Node.js, MongoDB…' },
    { name: 'categories', label: 'Categories', type: 'multiselect', options: ['Frontend', 'Backend', 'Full Stack'] },
    { name: 'githubUrl', label: 'GitHub URL', placeholder: 'https://github.com/you/project' },
    { name: 'liveUrl', label: 'Live demo URL', placeholder: 'https://…' },
    { name: 'completedAt', label: 'Completed on', type: 'date' },
    { name: 'coverImage', label: 'Cover image', type: 'image', folder: 'projects' },
    { name: 'screenshots', label: 'Screenshots', type: 'images', folder: 'projects' },
    { name: 'features', label: 'Features', type: 'lines', rows: 4, hint: 'One per line.' },
    { name: 'challenges', label: 'Challenges', type: 'lines', rows: 3, hint: 'One per line.' },
    { name: 'solutions', label: 'Solutions', type: 'lines', rows: 3, hint: 'One per line.' },
    { name: 'published', label: 'Published', type: 'checkbox', hint: 'Visible on the public site.', default: true },
    { name: 'featured', label: 'Featured', type: 'checkbox', hint: 'Highlighted at the top.' },
  ],
  defaults: { published: true },
};

export const skillsConfig = {
  key: 'skills', endpoint: '/skills', title: 'Skills', singular: 'Skill', titleKey: 'name',
  description: 'Group your tools by category. Levels are descriptive labels, never fake percentages.',
  emptyHint: 'Add the technologies you actually use, grouped by Frontend, Backend, Database and Tools.',
  searchKeys: ['name', 'category'],
  filter: { field: 'category', label: 'categories', options: ['Frontend', 'Backend', 'Database', 'Tools', 'Other'] },
  reorder: true,
  columns: [
    { header: 'Skill', render: (r) => nameCell(r.name, r.description) },
    { header: 'Category', render: (r) => <Badge>{r.category}</Badge> },
    { header: 'Level', render: (r) => muted(r.level) },
    { header: 'Years', className: 'tabular-nums', render: (r) => muted(r.years) },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true },
    { name: 'category', label: 'Category', type: 'select', required: true, options: ['Frontend', 'Backend', 'Database', 'Tools', 'Other'], default: 'Frontend' },
    { name: 'icon', label: 'Icon', type: 'select', options: [{ value: '', label: 'Default for category' }, 'code', 'server', 'database', 'wrench', 'globe', 'layout', 'terminal', 'git', 'cloud', 'shield', 'palette', 'package', 'cpu'] },
    { name: 'level', label: 'Level', type: 'select', options: [{ value: '', label: 'Not specified' }, 'Learning', 'Comfortable', 'Proficient', 'Advanced'] },
    { name: 'years', label: 'Years of experience', type: 'number', step: '0.5', min: 0, max: 50 },
    { name: 'description', label: 'Description', type: 'textarea', rows: 2 },
  ],
  defaults: { category: 'Frontend' },
};

export const experienceConfig = {
  key: 'experience', endpoint: '/experience', title: 'Experience', singular: 'Experience entry', titleKey: 'organization',
  description: 'Jobs, internships and training. Only what you enter here is shown, nothing is invented.',
  emptyHint: 'Add real roles, internships or training programs. Leave this empty if you have none yet.',
  searchKeys: ['organization', 'position'],
  footnote: 'Entries are shown newest first by start date.',
  columns: [
    { header: 'Role', render: (r) => nameCell(r.position, r.organization) },
    { header: 'Type', render: (r) => <Badge>{r.type}</Badge> },
    { header: 'Period', render: (r) => <span className="whitespace-nowrap text-muted">{formatDate(r.startDate)} – {r.current ? 'Present' : formatDate(r.endDate) || '—'}</span> },
  ],
  fields: [
    { name: 'organization', label: 'Organization', required: true },
    { name: 'position', label: 'Position', required: true },
    { name: 'type', label: 'Type', type: 'select', options: ['Job', 'Internship', 'Training', 'Freelance', 'Open Source'], default: 'Training' },
    { name: 'startDate', label: 'Start date', type: 'date', required: true },
    { name: 'endDate', label: 'End date', type: 'date' },
    { name: 'current', label: 'I currently work here', type: 'checkbox' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { name: 'responsibilities', label: 'Responsibilities', type: 'lines', rows: 4, hint: 'One per line.' },
    { name: 'technologies', label: 'Technologies', type: 'tags' },
    { name: 'certificateUrl', label: 'Certificate URL', placeholder: 'https://…' },
    { name: 'logo', label: 'Logo', type: 'image', folder: 'experience' },
  ],
  defaults: { type: 'Training' },
};

export const educationConfig = {
  key: 'education', endpoint: '/education', title: 'Education', singular: 'Education entry', titleKey: 'degree',
  description: 'Degrees and formal education, shown as a timeline.',
  emptyHint: 'Add your degree, institution and years.',
  searchKeys: ['degree', 'institution', 'university'],
  footnote: 'Entries are shown newest first by start year.',
  columns: [
    { header: 'Degree', render: (r) => nameCell(r.degree, r.fieldOfStudy) },
    { header: 'Institution', render: (r) => nameCell(r.institution, r.university) },
    { header: 'Years', render: (r) => <span className="whitespace-nowrap text-muted">{r.startYear} – {r.ongoing ? 'Present' : r.graduationYear || '—'}</span> },
  ],
  fields: [
    { name: 'degree', label: 'Degree', required: true, placeholder: 'B.Tech' },
    { name: 'fieldOfStudy', label: 'Field of study' },
    { name: 'institution', label: 'Institution', required: true },
    { name: 'university', label: 'University' },
    { name: 'startYear', label: 'Start year', type: 'number', step: '1', min: 1980, max: 2100, required: true },
    { name: 'graduationYear', label: 'Graduation year', type: 'number', step: '1', min: 1980, max: 2100, nullable: true },
    { name: 'ongoing', label: 'Currently studying', type: 'checkbox' },
    { name: 'coursework', label: 'Relevant coursework', type: 'tags' },
    { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
  ],
};

export const certificatesConfig = {
  key: 'certificates', endpoint: '/certificates', title: 'Certificates', singular: 'Certificate', titleKey: 'name',
  description: 'Courses and certifications with verification links.',
  emptyHint: 'Add certificates you have actually earned.',
  searchKeys: ['name', 'issuer'],
  deleteNote: 'along with its uploaded image',
  columns: [
    {
      header: 'Certificate',
      render: (r) => (
        <div className="flex min-w-0 items-center gap-3">
          {r.image?.url ? <img src={r.image.url} alt="" className="size-10 shrink-0 rounded-lg object-cover" loading="lazy" /> : <div className="size-10 shrink-0 rounded-lg bg-raised" aria-hidden="true" />}
          {nameCell(r.name, r.issuer)}
        </div>
      ),
    },
    { header: 'Issued', render: (r) => muted(formatDate(r.issueDate)) },
    { header: 'Credential ID', render: (r) => <span className="font-mono text-xs text-muted">{r.credentialId || '—'}</span> },
  ],
  fields: [
    { name: 'name', label: 'Certificate name', required: true, full: true },
    { name: 'issuer', label: 'Issuing organization', required: true },
    { name: 'issueDate', label: 'Issue date', type: 'date' },
    { name: 'credentialId', label: 'Credential ID' },
    { name: 'credentialUrl', label: 'Credential URL', placeholder: 'https://…' },
    { name: 'image', label: 'Certificate image', type: 'image', folder: 'certificates' },
  ],
};

// ---- single-document editors (all save to the same Profile document)
export const profileConfig = {
  title: 'Profile',
  description: 'Your identity and availability. This feeds the hero, navbar and resume section.',
  fields: [
    { name: 'name', label: 'Full name', required: true },
    { name: 'title', label: 'Job title' },
    { name: 'tagline', label: 'Tagline', type: 'textarea', rows: 2, hint: 'Shown under your name in the hero.' },
    { name: 'avatar', label: 'Profile image', type: 'image', folder: 'profile' },
    { name: 'location', label: 'Location' },
    { name: 'currentRole', label: 'Current role' },
    { name: 'email', label: 'Public email', type: 'email' },
    { name: 'phone', label: 'Phone', hint: 'Only shown publicly if enabled in Site Settings.' },
    { name: 'availability.isOpenToWork', label: 'Open to work', type: 'checkbox', hint: 'Shows the availability badge.' },
    { name: 'availability.label', label: 'Availability text', placeholder: 'Open to Software Engineering Opportunities' },
    { name: 'primaryTechnologies', label: 'Primary technologies', type: 'tags' },
    { name: 'currentlyLearning', label: 'Currently learning', type: 'tags' },
    { name: 'github.enabled', label: 'Show GitHub activity', type: 'checkbox', hint: 'Falls back to your manual projects if GitHub is unreachable.' },
    { name: 'github.username', label: 'GitHub username' },
  ],
};

export const aboutConfig = {
  title: 'About',
  description: 'The story behind the work. Each field appears in the About section.',
  fields: [
    { name: 'bio', label: 'Bio', type: 'textarea', rows: 4 },
    { name: 'summary', label: 'Professional summary', type: 'textarea', rows: 4 },
    { name: 'careerObjective', label: 'Career objective', type: 'textarea', rows: 3 },
    { name: 'currentFocus', label: 'Current focus', type: 'textarea', rows: 3 },
    { name: 'philosophy', label: 'Development philosophy', type: 'textarea', rows: 3 },
  ],
};

export const socialConfig = {
  title: 'Social Links',
  description: 'GitHub, LinkedIn, email and anywhere else people can find you. Shown in the hero, footer and contact section.',
  fields: [{ name: 'socialLinks', label: 'Links', type: 'links' }],
};

// ---- blog
export const blogConfig = {
  key: 'blog', endpoint: '/blog', title: 'Blog', singular: 'Post', titleKey: 'title',
  description: 'Write articles that show how you think. Published posts also help your SEO.',
  emptyHint: 'Share what you are learning or building. Drafts stay private until published.',
  listParams: { all: 'true', limit: 30 },
  getPath: (id) => `/blog/by-id/${id}`, // the public /blog/:slug route would treat an id as a slug
  searchKeys: ['title', 'excerpt', 'category'],
  filter: { field: 'status', label: 'statuses', options: ['draft', 'published'] },
  deleteNote: 'along with its cover image',
  footnote: 'A published post with a future publish date stays hidden until that day.',
  columns: [
    { header: 'Post', render: (r) => nameCell(r.title, r.excerpt) },
    { header: 'Status', render: (r) => (r.status === 'published' ? <Badge tone="success">Published</Badge> : <Badge>Draft</Badge>) },
    { header: 'Category', render: (r) => muted(r.category) },
    { header: 'Published', render: (r) => <span className="whitespace-nowrap text-muted">{r.publishedAt ? formatDate(r.publishedAt, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span> },
    { header: 'Read', className: 'tabular-nums', render: (r) => (r.readingTimeMinutes ? `${r.readingTimeMinutes} min` : '—') },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'slug', label: 'Slug', omitEmpty: true, placeholder: 'auto-generated from the title', hint: 'Lowercase letters, numbers and hyphens. Part of the post URL.' },
    { name: 'category', label: 'Category' },
    { name: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 2, hint: 'Shown in post lists and search results (max 300 characters).' },
    { name: 'content', label: 'Content (Markdown)', type: 'textarea', rows: 14, required: true },
    { name: 'coverImage', label: 'Cover image', type: 'image', folder: 'blog' },
    { name: 'tags', label: 'Tags', type: 'tags', placeholder: 'react, node…' },
    { name: 'status', label: 'Status', type: 'select', options: ['draft', 'published'], default: 'draft' },
    { name: 'publishedAt', label: 'Publish date', type: 'date', hint: 'Leave empty to publish immediately when you set the status to published.' },
    { name: 'seo.title', label: 'SEO title', hint: 'Optional, max 70 characters.' },
    { name: 'seo.description', label: 'SEO description', hint: 'Optional, max 170 characters.' },
  ],
  defaults: { status: 'draft' },
};

// ---- site settings (single document)
export const settingsConfig = {
  title: 'Site Settings',
  description: 'Titles, SEO, theme and which sections appear. Changes apply to the public site immediately.',
  cacheKey: 'admin:settings',
  api: settingsApi,
  fields: [
    { type: 'heading', label: 'General & SEO' },
    { name: 'siteTitle', label: 'Website title', hint: 'Shown in the browser tab and search results (max 70).' },
    { name: 'canonicalUrl', label: 'Site URL', placeholder: 'https://yourname.dev', hint: 'Used for canonical links and social previews.' },
    { name: 'metaDescription', label: 'Meta description', type: 'textarea', rows: 2, hint: 'Max 170 characters.' },
    { name: 'favicon', label: 'Favicon', type: 'image', folder: 'site' },
    { name: 'ogImage', label: 'Social share image', type: 'image', folder: 'site' },
    { name: 'seo.twitterHandle', label: 'X / Twitter handle', placeholder: '@yourname' },
    { name: 'seo.robotsIndex', label: 'Allow search engines to index this site', type: 'checkbox', default: true },

    { type: 'heading', label: 'Hero', hint: 'Optional. Leave empty to use the title and tagline from your Profile.' },
    { name: 'hero.title', label: 'Hero headline override', full: true },
    { name: 'hero.subtitle', label: 'Hero subtitle override', type: 'textarea', rows: 2 },

    { type: 'heading', label: 'Contact' },
    { name: 'contact.email', label: 'Contact email', type: 'email' },
    { name: 'contact.notificationEmail', label: 'Send new-message alerts to', type: 'email', hint: 'Falls back to your Profile email.' },
    { name: 'contact.showPhone', label: 'Show phone number publicly', type: 'checkbox' },

    { type: 'heading', label: 'Appearance' },
    { name: 'theme.defaultMode', label: 'Default theme', type: 'select', options: ['dark', 'light', 'system'], default: 'dark', hint: 'Visitors who pick a theme keep their choice.' },
    { name: 'theme.accentColor', label: 'Accent color', type: 'color', default: '#6366f1' },
    { name: 'animations.enabled', label: 'Enable animations', type: 'checkbox', default: true, hint: 'Turn off for a static site. Visitors who prefer reduced motion never see movement.' },
    { name: 'animations.intensity', label: 'Animation intensity', type: 'select', options: ['subtle', 'normal'], default: 'subtle' },

    { type: 'heading', label: 'Sections' },
    { name: 'sections.showBlog', label: 'Blog', type: 'checkbox', default: true },
    { name: 'sections.showCertificates', label: 'Certificates', type: 'checkbox', default: true },
    { name: 'sections.showGithub', label: 'GitHub activity', type: 'checkbox', hint: 'Also needs a username in Profile.' },
    { name: 'sections.showTestimonials', label: 'Testimonials', type: 'checkbox' },

    { type: 'heading', label: 'Privacy' },
    { name: 'analytics.enabled', label: 'Count page views', type: 'checkbox', default: true, hint: 'Anonymous daily counters only: no cookies, no IP addresses, no visitor tracking.' },
  ],
};
