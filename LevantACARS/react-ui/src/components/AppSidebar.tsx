import { LayoutDashboard, FileText, Cloud, Map, LogOut } from 'lucide-react';
import { SimBridge } from '../bridge';
import type { AuthState, ConnectionState } from '../types';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';

interface Props {
  auth: AuthState;
  connection: ConnectionState;
  activeView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'flight', label: 'Flight Plan', icon: Map },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'weather', label: 'Weather', icon: Cloud },
];

export default function AppSidebar({ auth, connection, activeView, onViewChange }: Props) {
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="pilot-badge-container !w-5 !h-5 !border"><img src="img/icon.jpg" alt="Levant VA" className="pilot-badge-img" /></div>
          <span className="text-[11px] font-bold text-neutral-300 truncate">Levant ACARS</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeView === item.id}
                    onClick={() => onViewChange(item.id)}
                    tooltip={item.label}
                    className={activeView === item.id ? '!bg-neutral-800 !text-cyan-400' : ''}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    <span className="text-[11px]">{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Status */}
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="px-2 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className={`w-1.5 h-1.5 rounded-full ${connection.simConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={connection.simConnected ? 'text-green-500' : 'text-neutral-600'}>SIM</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className={`w-1.5 h-1.5 rounded-full ${connection.apiConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={connection.apiConnected ? 'text-green-500' : 'text-neutral-600'}>API</span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 py-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-[9px] font-bold text-neutral-400 shrink-0">
            {auth.pilotName ? auth.pilotName[0].toUpperCase() : '?'}
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-[10px] font-semibold text-neutral-300 truncate">{auth.pilotName}</div>
          </div>
          <button
            onClick={() => SimBridge.logout()}
            className="p-1 text-neutral-600 hover:text-red-400 rounded transition-colors border-none bg-transparent cursor-pointer shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-3 h-3" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
