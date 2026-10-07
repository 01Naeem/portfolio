import SingletonForm from '../../components/admin/SingletonForm.jsx';
import { socialConfig } from '../../features/adminConfigs.jsx';

export default function SocialLinksPage() {
  return <SingletonForm config={socialConfig} />;
}
