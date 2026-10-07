import ResourcePage from '../../components/admin/ResourcePage.jsx';
import { certificatesConfig } from '../../features/adminConfigs.jsx';

export default function CertificatesPage() {
  return <ResourcePage config={certificatesConfig} />;
}
