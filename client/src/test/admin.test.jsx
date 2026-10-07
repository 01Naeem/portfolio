import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adminMocks, mockApi, renderApp } from './helpers.jsx';

const project = (o = {}) => ({ _id: 'p1', title: 'ElectroHub', shortDescription: 'MERN store', categories: ['Full Stack'], technologies: ['React'], published: true, featured: false, clicks: 3, ...o });
const modal = () => screen.getByRole('dialog');

describe('admin: projects (table + modal CRUD)', () => {
  it('lists projects using the admin query (drafts included)', async () => {
    const calls = mockApi(adminMocks({ 'GET /projects': { data: [project(), project({ _id: 'p2', title: 'TaskBoard', published: false })], meta: { total: 2 } } }));
    renderApp('/admin/projects');
    expect(await screen.findByText('ElectroHub')).toBeInTheDocument();
    expect(screen.getByText('TaskBoard')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'GET /projects').params).toEqual({ all: 'true', limit: 50 });
  });

  it('shows an empty state with an add button', async () => {
    mockApi(adminMocks({ 'GET /projects': { data: [] } }));
    renderApp('/admin/projects');
    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add your first project/i })).toBeInTheDocument();
  });

  it('creates a project and sends a clean payload', async () => {
    const calls = mockApi(adminMocks({ 'GET /projects': { data: [] }, 'POST /projects': { data: { _id: 'new' } } }));
    renderApp('/admin/projects');
    await userEvent.click(await screen.findByRole('button', { name: /add your first project/i }));
    const dlg = within(modal());
    await userEvent.type(dlg.getByLabelText(/project name/i), '  Portfolio  ');
    await userEvent.type(dlg.getByLabelText(/short description/i), 'My site');
    await userEvent.type(dlg.getByLabelText('Technologies'), 'React{Enter}Node.js,');
    await userEvent.click(dlg.getByRole('button', { name: 'Full Stack' }));
    await userEvent.type(dlg.getByLabelText('Features'), 'Auth{Enter}Admin panel{Enter}');
    await userEvent.click(dlg.getByRole('button', { name: /add project/i }));

    await waitFor(() => expect(calls.some((c) => c.key === 'POST /projects')).toBe(true));
    expect(calls.find((c) => c.key === 'POST /projects').data).toMatchObject({
      title: 'Portfolio', shortDescription: 'My site', technologies: ['React', 'Node.js'], categories: ['Full Stack'],
      features: ['Auth', 'Admin panel'], completedAt: null, coverImage: null, screenshots: [], published: true, featured: false,
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('blocks submit client-side when a required field is empty', async () => {
    const calls = mockApi(adminMocks({ 'GET /projects': { data: [] } }));
    renderApp('/admin/projects');
    await userEvent.click(await screen.findByRole('button', { name: /add your first project/i }));
    await userEvent.click(within(modal()).getByRole('button', { name: /add project/i }));
    expect(await within(modal()).findByText('Project name is required')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /projects')).toBe(false);
  });

  it('puts server validation messages under the matching field', async () => {
    mockApi(adminMocks({
      'GET /projects': { data: [] },
      'POST /projects': { status: 400, body: { success: false, message: 'Validation failed', details: [{ field: 'githubUrl', message: 'Must be an http(s) URL' }] } },
    }));
    renderApp('/admin/projects');
    await userEvent.click(await screen.findByRole('button', { name: /add your first project/i }));
    const dlg = within(modal());
    await userEvent.type(dlg.getByLabelText(/project name/i), 'X');
    await userEvent.type(dlg.getByLabelText(/short description/i), 'Y');
    await userEvent.type(dlg.getByLabelText('GitHub URL'), 'javascript:alert(1)');
    await userEvent.click(dlg.getByRole('button', { name: /add project/i }));
    expect(await dlg.findByText('Must be an http(s) URL')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument(); // stays open so nothing typed is lost
  });

  it('loads the full document before editing and saves with PUT', async () => {
    const calls = mockApi(adminMocks({
      'GET /projects': { data: [project()] },
      'GET /projects/p1': { data: project({ description: 'Long text', completedAt: '2025-03-15T00:00:00.000Z', challenges: ['Scaling'] }) },
      'PUT /projects/p1': { data: project() },
    }));
    renderApp('/admin/projects');
    await userEvent.click(await screen.findByRole('button', { name: 'Edit ElectroHub' }));
    const dlg = within(await screen.findByRole('dialog'));
    expect(dlg.getByLabelText(/project name/i)).toHaveValue('ElectroHub');
    expect(dlg.getByLabelText('Detailed description')).toHaveValue('Long text');
    expect(dlg.getByLabelText('Completed on')).toHaveValue('2025-03-15');
    expect(dlg.getByLabelText('Challenges')).toHaveValue('Scaling');
    await userEvent.clear(dlg.getByLabelText(/project name/i));
    await userEvent.type(dlg.getByLabelText(/project name/i), 'ElectroHub v2');
    await userEvent.click(dlg.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(calls.some((c) => c.key === 'PUT /projects/p1')).toBe(true));
    expect(calls.find((c) => c.key === 'PUT /projects/p1').data.title).toBe('ElectroHub v2');
  });

  it('asks for confirmation before deleting, and only then deletes', async () => {
    let rows = [project(), project({ _id: 'p2', title: 'TaskBoard' })];
    const calls = mockApi(adminMocks({
      'GET /projects': () => ({ data: rows }),
      'DELETE /projects/p1': () => { rows = rows.filter((r) => r._id !== 'p1'); return { data: { message: 'Project deleted' } }; },
    }));
    renderApp('/admin/projects');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete ElectroHub' }));
    const dlg = within(screen.getByRole('dialog'));
    expect(dlg.getByText(/permanently removed/i)).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'DELETE /projects/p1')).toBe(false); // nothing deleted yet
    await userEvent.click(dlg.getByRole('button', { name: 'Cancel' }));
    expect(calls.some((c) => c.key === 'DELETE /projects/p1')).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Delete ElectroHub' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('ElectroHub')).not.toBeInTheDocument());
    expect(screen.getByText('TaskBoard')).toBeInTheDocument();
  });

  it('toggles featured from the row', async () => {
    const calls = mockApi(adminMocks({ 'GET /projects': { data: [project()] }, 'PATCH /projects/p1/featured': { data: project({ featured: true }) } }));
    renderApp('/admin/projects');
    await userEvent.click(await screen.findByRole('button', { name: 'Feature ElectroHub' }));
    await waitFor(() => expect(calls.some((c) => c.key === 'PATCH /projects/p1/featured')).toBe(true));
  });

  it('searches client-side', async () => {
    mockApi(adminMocks({ 'GET /projects': { data: [project(), project({ _id: 'p2', title: 'TaskBoard', shortDescription: 'kanban' })] } }));
    renderApp('/admin/projects');
    await screen.findByText('ElectroHub');
    await userEvent.type(screen.getByLabelText(/search projects/i), 'kanban');
    expect(screen.queryByText('ElectroHub')).not.toBeInTheDocument();
    expect(screen.getByText('TaskBoard')).toBeInTheDocument();
  });

  it('shows an error state with retry when the list fails', async () => {
    let fail = true;
    mockApi(adminMocks({ 'GET /projects': () => (fail ? { status: 500, body: { success: false, message: 'Database is down' } } : { data: [project()] }) }));
    renderApp('/admin/projects');
    expect(await screen.findByText('Database is down')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('ElectroHub')).toBeInTheDocument();
  });
});

describe('admin: image uploads', () => {
  const png = () => new File([new Uint8Array(16)], 'shot.png', { type: 'image/png' });

  it('uploads to the right folder and stores url + publicId + alt in the payload', async () => {
    const calls = mockApi(adminMocks({
      'GET /projects': { data: [] },
      'POST /uploads/image': { data: { url: 'https://res.cloudinary.com/x/shot.png', publicId: 'portfolio/projects/abc', width: 10, height: 10, bytes: 16 } },
      'POST /projects': { data: { _id: 'n' } },
    }));
    renderApp('/admin/projects');
    await userEvent.click(await screen.findByRole('button', { name: /add your first project/i }));
    const dlg = within(modal());
    await userEvent.type(dlg.getByLabelText(/project name/i), 'P');
    await userEvent.type(dlg.getByLabelText(/short description/i), 'D');
    await userEvent.upload(dlg.getByLabelText('Cover image'), png());
    expect(await dlg.findByRole('img')).toHaveAttribute('src', 'https://res.cloudinary.com/x/shot.png');
    const up = calls.find((c) => c.key === 'POST /uploads/image');
    expect(up.data.folder).toBe('projects');
    expect(up.data.file.file).toBe('shot.png');
    await userEvent.type(dlg.getByLabelText('Alt text'), 'Homepage');
    await userEvent.click(dlg.getByRole('button', { name: /add project/i }));
    await waitFor(() => expect(calls.some((c) => c.key === 'POST /projects')).toBe(true));
    expect(calls.find((c) => c.key === 'POST /projects').data.coverImage).toEqual({ url: 'https://res.cloudinary.com/x/shot.png', publicId: 'portfolio/projects/abc', alt: 'Homepage' });
    expect(calls.some((c) => c.key === 'DELETE /uploads')).toBe(false); // saved => must NOT be cleaned up
  });

  it('deletes an uploaded-but-unsaved image when the editor is cancelled', async () => {
    const calls = mockApi(adminMocks({
      'GET /projects': { data: [] },
      'POST /uploads/image': { data: { url: 'https://res.cloudinary.com/x/a.png', publicId: 'portfolio/projects/orphan' } },
      'DELETE /uploads': { data: { message: 'Image removed' } },
    }));
    renderApp('/admin/projects');
    await userEvent.click(await screen.findByRole('button', { name: /add your first project/i }));
    await userEvent.upload(within(modal()).getByLabelText('Cover image'), png());
    await within(modal()).findByRole('img');
    await userEvent.click(within(modal()).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(calls.some((c) => c.key === 'DELETE /uploads')).toBe(true));
    expect(calls.find((c) => c.key === 'DELETE /uploads').data).toEqual({ publicId: 'portfolio/projects/orphan' });
  });

  it('rejects an oversized image before uploading', async () => {
    const calls = mockApi(adminMocks({ 'GET /projects': { data: [] } }));
    renderApp('/admin/projects');
    await userEvent.click(await screen.findByRole('button', { name: /add your first project/i }));
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'huge.png', { type: 'image/png' });
    await userEvent.upload(within(modal()).getByLabelText('Cover image'), big);
    expect(await screen.findByText(/larger than 5 MB/i)).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /uploads/image')).toBe(false);
  });
});

describe('admin: skills, experience, education', () => {
  it('reorders skills by sending the full new id order', async () => {
    let skills = [{ _id: 's1', name: 'React', category: 'Frontend' }, { _id: 's2', name: 'Node.js', category: 'Backend' }, { _id: 's3', name: 'MongoDB', category: 'Database' }];
    const calls = mockApi(adminMocks({
      'GET /skills': () => ({ data: skills }),
      'PATCH /skills/reorder': (c) => { const ids = JSON.parse(c.data).ids; skills = ids.map((id) => skills.find((s) => s._id === id)); return { data: { message: 'ok' } }; },
    }));
    renderApp('/admin/skills');
    await userEvent.click(await screen.findByRole('button', { name: 'Move React down' }));
    await waitFor(() => expect(calls.some((c) => c.key === 'PATCH /skills/reorder')).toBe(true));
    expect(calls.find((c) => c.key === 'PATCH /skills/reorder').data).toEqual({ ids: ['s2', 's1', 's3'] });
    expect(screen.getByRole('button', { name: 'Move React up' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move MongoDB down' })).toBeDisabled();
  });

  it('omits an empty years value instead of sending NaN, and has no percentage field', async () => {
    const calls = mockApi(adminMocks({ 'GET /skills': { data: [] }, 'POST /skills': { data: { _id: 'n' } } }));
    renderApp('/admin/skills');
    await userEvent.click(await screen.findByRole('button', { name: /add your first skill/i }));
    const dlg = within(modal());
    expect(dlg.queryByLabelText(/percent/i)).not.toBeInTheDocument();
    await userEvent.type(dlg.getByLabelText(/^name/i), 'React');
    await userEvent.click(dlg.getByRole('button', { name: /add skill/i }));
    await waitFor(() => expect(calls.some((c) => c.key === 'POST /skills')).toBe(true));
    const body = calls.find((c) => c.key === 'POST /skills').data;
    expect(body).toMatchObject({ name: 'React', category: 'Frontend' });
    expect('years' in body).toBe(false);
  });

  it('requires a start date for experience and converts dates for the API', async () => {
    const calls = mockApi(adminMocks({ 'GET /experience': { data: [] }, 'POST /experience': { data: { _id: 'n' } } }));
    renderApp('/admin/experience');
    await userEvent.click(await screen.findByRole('button', { name: /add your first experience entry/i }));
    const dlg = within(modal());
    await userEvent.type(dlg.getByLabelText(/organization/i), 'Acme Training');
    await userEvent.type(dlg.getByLabelText(/position/i), 'MERN Trainee');
    await userEvent.click(dlg.getByRole('button', { name: /add experience entry/i }));
    expect(await dlg.findByText('Start date is required')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /experience')).toBe(false);
    fireEvent.change(dlg.getByLabelText(/start date/i), { target: { value: '2025-06-01' } });
    await userEvent.click(dlg.getByRole('button', { name: /add experience entry/i }));
    await waitFor(() => expect(calls.some((c) => c.key === 'POST /experience')).toBe(true));
    expect(calls.find((c) => c.key === 'POST /experience').data).toMatchObject({ startDate: '2025-06-01', endDate: null, current: false, type: 'Training' });
  });

  it('sends graduationYear as null when left empty', async () => {
    const calls = mockApi(adminMocks({ 'GET /education': { data: [] }, 'POST /education': { data: { _id: 'n' } } }));
    renderApp('/admin/education');
    await userEvent.click(await screen.findByRole('button', { name: /add your first education entry/i }));
    const dlg = within(modal());
    await userEvent.type(dlg.getByLabelText(/^degree/i), 'B.Tech');
    await userEvent.type(dlg.getByLabelText(/^institution/i), 'Some Institute');
    await userEvent.type(dlg.getByLabelText(/start year/i), '2021');
    await userEvent.click(dlg.getByRole('button', { name: /add education entry/i }));
    await waitFor(() => expect(calls.some((c) => c.key === 'POST /education')).toBe(true));
    expect(calls.find((c) => c.key === 'POST /education').data).toMatchObject({ degree: 'B.Tech', startYear: 2021, graduationYear: null });
  });
});

describe('admin: profile, social links, resume', () => {
  const profileDoc = { name: 'Asha', title: 'Dev', availability: { isOpenToWork: true, label: 'Open' }, github: { enabled: false, username: '' }, primaryTechnologies: ['React'], currentlyLearning: [], socialLinks: [] };

  it('saves nested profile fields and keeps Save disabled until something changes', async () => {
    const calls = mockApi(adminMocks({ 'GET /profile': profileDoc, 'PUT /profile': () => ({ data: { ...profileDoc, title: 'Full-Stack Dev' } }) }));
    renderApp('/admin/profile');
    const save = await screen.findByRole('button', { name: /save changes/i });
    expect(save).toBeDisabled();
    const title = screen.getByLabelText('Job title');
    await userEvent.clear(title);
    await userEvent.type(title, 'Full-Stack Dev');
    expect(save).toBeEnabled();
    await userEvent.click(save);
    await waitFor(() => expect(calls.some((c) => c.key === 'PUT /profile')).toBe(true));
    const body = calls.find((c) => c.key === 'PUT /profile').data;
    expect(body).toMatchObject({ title: 'Full-Stack Dev', availability: { isOpenToWork: true, label: 'Open' }, github: { enabled: false }, primaryTechnologies: ['React'] });
    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled());
  });

  it('normalises social links: https:// for sites, mailto: for email, blanks dropped', async () => {
    const calls = mockApi(adminMocks({ 'GET /profile': profileDoc, 'PUT /profile': { data: profileDoc } }));
    renderApp('/admin/social');
    await userEvent.click(await screen.findByRole('button', { name: /add link/i }));
    await userEvent.type(screen.getByLabelText('URL'), 'github.com/asha');
    await userEvent.click(screen.getByRole('button', { name: /add link/i }));
    await userEvent.selectOptions(screen.getAllByLabelText('Platform')[1], 'email');
    await userEvent.type(screen.getAllByLabelText('URL')[1], 'asha@example.com');
    await userEvent.click(screen.getByRole('button', { name: /add link/i })); // blank row, must be dropped
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(calls.some((c) => c.key === 'PUT /profile')).toBe(true));
    expect(calls.find((c) => c.key === 'PUT /profile').data.socialLinks).toEqual([
      { platform: 'github', url: 'https://github.com/asha', order: 0 },
      { platform: 'email', url: 'mailto:asha@example.com', order: 1 },
    ]);
  });

  it('uploads a resume PDF and refuses other file types without calling the API', async () => {
    let has = false;
    const calls = mockApi(adminMocks({
      'GET /resume': () => ({ data: has ? { available: true, fileName: 'Asha_CV.pdf', uploadedAt: '2026-10-01T00:00:00Z', downloadCount: 4 } : { available: false } }),
      'POST /resume': () => { has = true; return { status: 201, data: { fileName: 'Asha_CV.pdf' } }; },
    }));
    renderApp('/admin/resume');
    const input = await screen.findByLabelText('Choose resume PDF');
    // applyAccept:false simulates a user who bypasses the file picker's filter
    await userEvent.setup({ applyAccept: false }).upload(input, new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByText(/choose a PDF/i)).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /resume')).toBe(false);

    await userEvent.upload(input, new File(['%PDF-1.7'], 'Asha_CV.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText('Asha_CV.pdf')).toBeInTheDocument();
    expect(screen.getByText(/4 downloads/)).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'POST /resume').data.file.file).toBe('Asha_CV.pdf');
    expect(screen.getByRole('link', { name: /download/i })).toHaveAttribute('href', '/api/resume/file?download=1');
  });

  it('confirms before deleting the resume', async () => {
    let has = true;
    const calls = mockApi(adminMocks({
      'GET /resume': () => ({ data: has ? { available: true, fileName: 'cv.pdf', downloadCount: 0 } : { available: false } }),
      'DELETE /resume': () => { has = false; return { data: { message: 'Resume deleted' } }; },
    }));
    renderApp('/admin/resume');
    await userEvent.click(await screen.findByRole('button', { name: /delete/i }));
    expect(calls.some((c) => c.key === 'DELETE /resume')).toBe(false);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText(/no resume uploaded yet/i)).toBeInTheDocument();
  });
});

describe('admin: navigation', () => {
  it('lists every implemented section in the sidebar and highlights the current one', async () => {
    mockApi(adminMocks({ 'GET /skills': { data: [] } }));
    renderApp('/admin/skills');
    await screen.findByText(/no skills yet/i);
    const nav = within(screen.getAllByRole('navigation', { name: 'Admin' })[0]);
    for (const l of ['Dashboard', 'Profile', 'About', 'Skills', 'Projects', 'Experience', 'Education', 'Certificates', 'Resume', 'Social Links', 'Blog', 'Messages', 'Site Settings', 'Analytics']) {
      expect(nav.getByRole('link', { name: l })).toBeInTheDocument();
    }
    expect(nav.getByRole('link', { name: 'Skills' })).toHaveAttribute('aria-current', 'page');
  });
});
