import { JSDOM } from 'jsdom';
import { projectDetailPage, projectsPage } from './projects.page';
import { projectsAdminPage } from '../admin/projects.page';
import { DEFAULT_PROJECT_COVER } from '../shared/project-cover';
import { Project } from '../../projects/project.model';

const project: Project = {
  id: 'j1',
  slug: 'paynexa',
  title: 'PayNexa',
  description: 'Short summary.',
  detailedDescription: 'Long description.',
  showShort: true,
  showDetailed: true,
  coverUrl: 'https://opengraph.githubassets.com/1/a/paynexa',
  repoUrl: 'https://github.com/a/paynexa',
  demoUrl: '',
  technologies: ['c#'],
  tags: [],
  keywords: [],
  topics: [],
  year: '2026',
  startDate: '',
  endDate: '',
  status: 'completed',
  featured: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const bare: Project = {
  ...project,
  id: 'j2',
  slug: 'love',
  title: 'love',
  coverUrl: '',
};

function doc(html: string): Document {
  return new JSDOM(html).window.document;
}

describe('project detail layout', () => {
  const d = doc(projectDetailPage(project, [], '<p>Long description.</p>'));

  it('keeps the summary beside the details panel', () => {
    const grid = d.querySelector('.detail-grid')!;

    expect(grid.querySelector('.detail-head .lead')?.textContent).toBe(
      'Short summary.',
    );
    expect(grid.querySelector('aside .fact-list')).not.toBeNull();
  });

  it('puts the cover and detailed description below, across the full width', () => {
    const full = d.querySelector('.detail-full')!;

    expect(full.closest('.detail-grid')).toBeNull();
    expect(full.querySelector('.proj-detail-cover')).not.toBeNull();
    expect(full.querySelector('.proj-detailed')?.textContent).toContain(
      'Long description.',
    );
    expect(d.querySelector('.detail-grid .proj-detailed')).toBeNull();
  });

  it('falls back to the default cover if the image fails to load', () => {
    expect(
      d.querySelector('.proj-detail-cover')?.getAttribute('onerror'),
    ).toContain(DEFAULT_PROJECT_COVER);
  });
});

describe('default project cover', () => {
  it('shows the default image on the public grid when there is no cover', () => {
    const d = doc(
      projectsPage({
        groups: [{ year: '2026', projects: [project, bare] }],
        total: 2,
        years: ['2026'],
        techs: [],
        query: '',
        activeYear: '',
        activeTech: '',
      }),
    );
    const covers = [...d.querySelectorAll<HTMLImageElement>('img.proj-cover')];

    expect(covers.map((i) => i.getAttribute('src'))).toEqual([
      project.coverUrl,
      DEFAULT_PROJECT_COVER,
    ]);
    expect(covers.every((i) => i.getAttribute('onerror'))).toBe(true);
  });

  it('shows the default thumbnail in the admin list', () => {
    const d = doc(
      projectsAdminPage({ projects: [project, bare], githubUser: 'a' }),
    );
    const thumbs = [...d.querySelectorAll<HTMLImageElement>('img.p-thumb')];

    expect(thumbs.map((i) => i.getAttribute('src'))).toEqual([
      project.coverUrl,
      DEFAULT_PROJECT_COVER,
    ]);
    expect(d.querySelector('div.p-thumb')).toBeNull();
  });
});
