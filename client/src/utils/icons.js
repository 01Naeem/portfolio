import { Cloud, Code2, Cpu, Database, GitBranch, Globe, LayoutTemplate, Package, Palette, Server, ShieldCheck, Terminal, Wrench } from 'lucide-react';

// The admin picks one of these names; anything else falls back to the category icon.
export const SKILL_ICONS = {
  code: Code2, server: Server, database: Database, wrench: Wrench, globe: Globe, layout: LayoutTemplate,
  terminal: Terminal, git: GitBranch, cloud: Cloud, shield: ShieldCheck, palette: Palette, package: Package, cpu: Cpu,
};
const BY_CATEGORY = { Frontend: LayoutTemplate, Backend: Server, Database, Tools: Wrench, Other: Code2 };

export const skillIcon = (skill) => SKILL_ICONS[skill.icon] || BY_CATEGORY[skill.category] || Code2;
