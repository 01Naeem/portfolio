import SingletonForm from '../../components/admin/SingletonForm.jsx';
import { aboutConfig } from '../../features/adminConfigs.jsx';

export default function AboutPage() {
  return <SingletonForm config={aboutConfig} />;
}
