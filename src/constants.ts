import {
  GraduationCap,
  Users,
  ShoppingBasket,
  CalendarDays,
} from "lucide-react";

export const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Events", href: "#events" },
  { label: "Marketplace", href: "#marketplace" },
  { label: "Donation", href: "#donation" },
];

export const STATS_DATA = [
  {
    id: 1,
    icon: GraduationCap,
    target: 30000,
    label: "Students",
  },
  {
    id: 2,
    icon: Users,
    target: 1494,
    label: "Active Users",
    fluctuation: {
      increaseRange: [1, 20],
      decreaseRange: [1, 15],
      interval: 4500,
      minValue: 1000,
      maxValue: 5000,
    },
  },
  {
    id: 3,
    icon: ShoppingBasket,
    target: 250,
    label: "Available Items",
    fluctuation: {
      increaseRange: [1, 5],
      decreaseRange: [1, 4],
      interval: 5200,
      minValue: 38,
      maxValue: 150,
    },
  },
  {
    id: 4,
    icon: CalendarDays,
    target: 10,
    label: "Ongoing Events",
  },
];