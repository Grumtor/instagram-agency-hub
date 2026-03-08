import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  ClipboardList,
  Settings,
  Instagram,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWorkspace } from '../../hooks/useWorkspace';
import { ROUTES } from '../../lib/constants';

const navItems = [
  { to: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
  { to: ROUTES.ACCOUNTS, icon: Users, label: 'Accounts' },
  { to: ROUTES.POSTS, icon: FileText, label: 'Posts' },
  { to: ROUTES.MESSAGES, icon: MessageSquare, label: 'Messages' },
  { to: ROUTES.AUDIT_LOG, icon: ClipboardList, label: 'Audit Log' },
  { to: ROUTES.SETTINGS, icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { currentWorkspace } = useWorkspace();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Instagram className="h-6 w-6 text-indigo-400" />
            <span className="text-lg font-bold text-white">Agency Hub</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {currentWorkspace && (
          <div className="px-5 py-3 border-b border-slate-700">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Workspace
            </p>
            <p className="text-sm font-semibold text-white truncate mt-0.5">
              {currentWorkspace.name}
            </p>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">Instagram Agency Hub v1.0</p>
        </div>
      </aside>
    </>
  );
}
