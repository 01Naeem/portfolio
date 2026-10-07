import ResourcePage from '../../components/admin/ResourcePage.jsx';
import { projectsConfig } from '../../features/adminConfigs.jsx';

export default function ProjectsPage() {
  return <ResourcePage config={projectsConfig} />;
}
