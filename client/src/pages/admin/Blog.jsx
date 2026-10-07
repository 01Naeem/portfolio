import ResourcePage from '../../components/admin/ResourcePage.jsx';
import { blogConfig } from '../../features/adminConfigs.jsx';

export default function BlogPage() {
  return <ResourcePage config={blogConfig} />;
}
