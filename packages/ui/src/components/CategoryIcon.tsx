import { Cable, Cylinder, Layers, Package, Recycle, Settings, Wrench, Zap } from "lucide-react";
import { CATEGORIES } from "../data/mockData";
import type { Category } from "../data/types";

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Wrench,
  Cable,
  Recycle,
  Cylinder,
  Settings,
  Layers,
  Zap,
  Package,
};

export function CategoryIcon({
  category,
  size = 20,
  className = "",
}: {
  category: Category;
  size?: number;
  className?: string;
}) {
  const info = CATEGORIES.find((c) => c.name === category);
  if (!info) return null;
  const Icon = iconMap[info.icon];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
}
