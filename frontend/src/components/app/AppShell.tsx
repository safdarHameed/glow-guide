"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Bookmark,
  ClipboardList,
  CloudSun,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPin,
  MoreHorizontal,
  Plane,
  ScanFace,
  Settings,
  ShoppingBag,
  User as UserIcon,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { AiAttentionDialog } from "@/components/ai/AiAttentionDialog";
import { AiModelBadge } from "@/components/ai/AiModelBadge";
import { AiStatusProvider } from "@/components/ai/AiStatusProvider";
import { useAppState } from "@/components/providers/AppStateProvider";
import { useAuth } from "@/components/providers/AuthProvider";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { MenuItem, Popover } from "@/components/ui/Kit";
import { Modal } from "@/components/ui/Overlay";
import { initials } from "@/lib/auth";
import { api } from "@/lib/api";
import { message } from "@/lib/glow-api";
import { CityPicker } from "./CityPicker";
import { ProductDrawer } from "./ProductDrawer";

const nav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/scan", label: "Skin scan", icon: ScanFace },
  {
    href: "/report/latest",
    label: "Skin report",
    icon: FileText,
    match: "/report",
  },
  { href: "/environment", label: "Environment", icon: CloudSun },
  { href: "/products", label: "Products", icon: ShoppingBag },
  {
    href: "/plan/current",
    label: "My plan",
    icon: ClipboardList,
    match: "/plan",
  },
  { href: "/trip", label: "Trip planner", icon: Plane },
  { href: "/saved", label: "Saved", icon: Bookmark },
];

const mobileTabs = [nav[0]!, nav[1]!, nav[5]!, nav[4]!];
const moreItems = [
  nav[3]!,
  nav[6]!,
  nav[7]!,
  nav[2]!,
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, item: { href: string; match?: string }) {
  const base = item.match ?? item.href;
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <AiStatusProvider>
      <div className="min-h-screen bg-canvas">
        {/* Sidebar: full on desktop, icons on tablet, hidden on phones */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r border-line bg-white md:flex lg:w-64">
          <div className="flex h-16 items-center px-5">
            <span className="hidden lg:block">
              <Logo />
            </span>
            <Link
              href="/dashboard"
              className="lg:hidden"
              aria-label="GlowGuide home"
            >
              <LogoMark className="h-9 w-9" />
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {nav.map((item) => (
              <SideLink
                key={item.href}
                item={item}
                active={isActive(pathname, item)}
              />
            ))}
          </nav>
          <div className="space-y-1 border-t border-line px-3 py-4">
            <SideLink
              item={{ href: "/settings", label: "Settings", icon: Settings }}
              active={pathname.startsWith("/settings")}
            />
            {user && (
              <Link
                href="/settings?section=profile"
                className="mt-2 flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-canvas"
              >
                <Avatar name={user.name} url={user.avatarUrl} />
                <span className="hidden min-w-0 lg:block">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {user.name}
                  </span>
                  <span className="block text-xs text-muted">Free plan</span>
                </span>
              </Link>
            )}
          </div>
        </aside>

        <div className="md:pl-20 lg:pl-64">
          <TopBar onOpenPicker={() => setPickerOpen(true)} />
          <main className="mx-auto max-w-[1240px] px-4 pt-6 pb-28 sm:px-6 md:pb-12 lg:px-10">
            {children}
          </main>
        </div>

        {/* Phone bottom tabs */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white/95 backdrop-blur md:hidden">
          {mobileTabs.map((item) => (
            <MobileTab
              key={item.href}
              href={item.href}
              label={item.label
                .replace("Skin scan", "Scan")
                .replace("My plan", "Plan")}
              icon={item.icon}
              active={isActive(pathname, item)}
            />
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted"
          >
            <MoreHorizontal size={20} /> More
          </button>
        </nav>

        <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
          <div className="grid grid-cols-2 gap-2">
            {moreItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-sm font-medium text-ink hover:border-brand-300"
              >
                <item.icon size={18} className="text-brand-500" /> {item.label}
              </Link>
            ))}
          </div>
        </Modal>

        <CityPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
        <Suspense>
          <ProductDrawer />
        </Suspense>
        <AiAttentionDialog />
      </div>
    </AiStatusProvider>
  );
}

function SideLink({
  item,
  active,
}: {
  item: {
    href: string;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
  };
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={active ? "page" : undefined}
      className={`flex items-center justify-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors lg:justify-start ${
        active
          ? "bg-brand-500 text-white shadow-[0_8px_20px_-10px_rgba(36,105,92,0.7)]"
          : "text-ink-soft hover:bg-brand-50 hover:text-brand-600"
      }`}
    >
      <item.icon size={19} />
      <span className="hidden lg:inline">{item.label}</span>
    </Link>
  );
}

function MobileTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-brand-600" : "text-muted"}`}
    >
      <Icon size={20} /> {label}
    </Link>
  );
}

export function Avatar({
  name,
  url,
  size = 36,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}

function TopBar({ onOpenPicker }: { onOpenPicker: () => void }) {
  const { city } = useAppState();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/85 px-4 backdrop-blur sm:px-6 lg:px-10">
      <Link href="/dashboard" className="md:hidden" aria-label="GlowGuide home">
        <LogoMark className="h-8 w-8" />
      </Link>
      <div className="hidden md:block" />
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onOpenPicker}
          className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-brand-300 hover:text-brand-600"
          aria-label={`Location: ${city.name}, ${city.country}. Change city`}
        >
          <MapPin size={15} className="text-brand-500" />
          <span>
            {city.name}
            <span className="hidden text-muted sm:inline">
              , {city.country === "United Arab Emirates" ? "UAE" : city.country}
            </span>
          </span>
        </button>
        <AiModelBadge />
        <NotificationsMenu />
        <UserMenu />
      </div>
    </header>
  );
}

function NotificationsMenu() {
  const [items, setItems] = useState<
    { id: string; title: string; body: string; time: string; unread: boolean }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    api<{ notifications: typeof items }>("/notifications")
      .then((data) => {
        if (active) setItems(data.notifications);
      })
      .catch((err) => {
        if (active) setError(message(err));
      });
    return () => {
      active = false;
    };
  }, []);
  const unread = items.filter((n) => n.unread).length;
  return (
    <Popover
      className="w-80"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          aria-label={`Notifications, ${unread} unread`}
          className="relative grid h-10 w-10 place-items-center rounded-full text-ink-soft hover:bg-canvas"
        >
          <Bell size={19} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </button>
      )}
    >
      {() => (
        <div>
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <button
              onClick={async () => {
                try {
                  await api("/notifications/read", { method: "POST" });
                  setItems((n) => n.map((x) => ({ ...x, unread: false })));
                } catch (err) {
                  setError(message(err));
                }
              }}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              Mark all read
            </button>
          </div>
          {error && (
            <p role="alert" className="p-3 text-xs text-rose-600">
              {error}
            </p>
          )}
          {!items.length && (
            <p className="p-3 text-sm text-muted">No notifications yet.</p>
          )}
          <ul className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <li
                key={n.id}
                className={`rounded-xl px-3 py-2.5 ${n.unread ? "bg-brand-50/60" : ""}`}
              >
                <p className="text-sm font-medium text-ink">{n.title}</p>
                <p className="text-xs text-ink-soft">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {new Date(n.time).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Popover>
  );
}

function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <Popover
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          aria-label="Account menu"
          className="rounded-full ring-offset-2 hover:ring-2 hover:ring-brand-200"
        >
          <Avatar name={user.name} url={user.avatarUrl} />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <MenuItem
            onClick={() => (close(), router.push("/settings?section=profile"))}
          >
            <UserIcon size={16} /> Profile
          </MenuItem>
          <MenuItem onClick={() => (close(), router.push("/settings"))}>
            <Settings size={16} /> Settings
          </MenuItem>
          <MenuItem danger onClick={() => (close(), void logout())}>
            <LogOut size={16} /> Log out
          </MenuItem>
        </>
      )}
    </Popover>
  );
}
