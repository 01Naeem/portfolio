import SingletonForm from '../../components/admin/SingletonForm.jsx';
import { profileConfig } from '../../features/adminConfigs.jsx';

export default function ProfilePage() {
  return <SingletonForm config={profileConfig} />;
}
