import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { definitions } from "../api/types";
import {
  X,
  LayoutDashboard,
  Home,
  Inbox,
  ShieldBan,
  Wifi,
  Network,
  ShieldCheck,
  Users,
  User,
  Settings,
} from "lucide-react";

type ListResponseDevice =
  definitions["ListResponse-security-hub_internal_dto_Device"];

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
};

const mainNav: NavItem[] = [
  { to: "/", label: "Przegląd", icon: Home },
  { to: "/onboarding", label: "Nowe urządzenia", icon: Inbox },
  { to: "/quarantine", label: "Kwarantanna", icon: ShieldBan },
  { to: "/devices", label: "Urządzenia", icon: Wifi },
  { to: "/vlans", label: "Segmenty sieci", icon: Network },
  { to: "/policies", label: "Profile polityk", icon: ShieldCheck },
  { to: "/users", label: "Użytkownicy", icon: Users },
];

const bottomNav: NavItem[] = [
  { to: "/account", label: "Moje konto", icon: User },
  { to: "/settings", label: "Ustawienia systemu", icon: Settings },
];

function isActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/" || pathname === "/dashboard";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function Sidebar({ isOpen, onClose }: Props) {
  const { pathname } = useLocation();

  const { data: pending } = useQuery({
    queryKey: ["onboarding-pending"],
    queryFn: async () => {
      const res = await api.get<ListResponseDevice>(
        "/onboarding/pending?limit=1",
      );
      return res.data;
    },
    refetchInterval: 30000,
    retry: false,
  });

  const waiting = pending?.total ?? 0;

  const renderItem = ({ to, label, icon: Icon }: NavItem) => {
    const active = isActive(pathname, to);
    return (
      <Link
        key={to}
        to={to}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 px-4 py-2.5 rounded transition-colors ${
          active
            ? "bg-blue-600 text-white font-medium"
            : "hover:bg-gray-800 text-gray-300"
        }`}
      >
        <Icon className="w-4 h-4" />
        <span className="flex-1">{label}</span>
        {to === "/onboarding" && waiting > 0 && (
          <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {waiting}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#2a2f35] text-gray-300 shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-6 bg-[#202428] border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2 font-bold text-xl text-white">
            <LayoutDashboard className="w-5 h-5 text-blue-500" />
            <span>SecurityHub</span>
          </div>
          <button
            className="lg:hidden"
            onClick={onClose}
            aria-label="Zamknij menu"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <nav className="p-2 space-y-0.5 flex-1 text-sm overflow-y-auto">
          {mainNav.map(renderItem)}

          <div className="my-2 border-t border-gray-700/60" />

          {bottomNav.map(renderItem)}
        </nav>
      </aside>
    </>
  );
}
