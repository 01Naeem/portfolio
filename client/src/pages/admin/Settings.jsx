import SingletonForm from '../../components/admin/SingletonForm.jsx';
import { settingsConfig } from '../../features/adminConfigs.jsx';

export default function SettingsPage() {
  return <SingletonForm config={settingsConfig} />;
}
