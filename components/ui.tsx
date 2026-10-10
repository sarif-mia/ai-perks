"use client";
import { useEffect, useRef } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronsUpDown,
  Circle,
  Clock3,
  Copy,
  Download,
  Ellipsis,
  FileText,
  Globe,
  Images,
  Inbox,
  Info,
  LayoutDashboard,
  Leaf,
  Lightbulb,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  MessageSquareText,
  Package,
  Pencil,
  Plug,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  UserRound,
  UserRoundPlus,
  UsersRound,
  Wallet,
  Waypoints,
  X,
  Zap,
  Plus,
  Sun,
  Building2,
} from "lucide-react";
const iconMap = {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronsUpDown,
  Circle,
  Clock3,
  Copy,
  Download,
  Ellipsis,
  FileText,
  Globe,
  Images,
  Inbox,
  Info,
  LayoutDashboard,
  Leaf,
  Lightbulb,
  ListChecks,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  MessageSquareText,
  Package,
  Pencil,
  Plug,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  UserRound,
  UserRoundPlus,
  UsersRound,
  Wallet,
  Waypoints,
  X,
  Zap,
  Plus,
  Sun,
  Building2,
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const C =
    (
      iconMap as unknown as Record<
        string,
        React.ComponentType<{
          size: number;
          strokeWidth: number;
          className: string;
        }>
      >
    )[name] || Circle;
  return <C size={size} strokeWidth={1.7} className="icon" />;
}
export function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  const t = String(children);
  const c =
    color ||
    (/Confirmed|Delivered|Won|Active|Resolved|Completed|Done|AI|Configured/.test(
      t,
    )
      ? "green"
      : /Waiting|Pending|Requested|Hot|Scheduled/.test(t)
        ? "orange"
        : /Shipped|Human|Qualified/.test(t)
          ? "blue"
          : "gray");
  return <span className={`badge ${c}`}>{children}</span>;
}
export function Button({
  children,
  icon,
  onClick,
  primary = false,
  disabled = false,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  icon?: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      className={`btn ${primary ? "primary" : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <Icon name={icon} size={15} />} {children}
    </button>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol">
        <Icon name="Leaf" size={27} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="X" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
