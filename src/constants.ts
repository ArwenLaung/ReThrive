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
    target: 13759,
    label: "Active Users",
    fluctuation: {
      increaseRange: [1, 20],
      decreaseRange: [1, 15],
      interval: 4500,
      minValue: 14000,
      maxValue: 17500,
    },
  },
  {
    id: 3,
    icon: ShoppingBasket,
    target: 5000,
    label: "Available Items",
    fluctuation: {
      increaseRange: [1, 5],
      decreaseRange: [1, 4],
      interval: 5200,
      minValue: 4700,
      maxValue: 5600,
    },
  },
  {
    id: 4,
    icon: CalendarDays,
    target: 10,
    label: "Ongoing Events",
  },
];

export const EVENTS_DATA = [
  {
    id: 1,
    title: "Jom Planting 2025",
    image: "https://picsum.photos/id/112/400/300", // Using generic nature placeholder
    date: "12 Jan 2025",
    time: "8:30 AM – 12:00 PM",
    location: "USM Botanical Garden",
    description:
      "Join the annual reforestation drive, earn EcoPoints for each sapling planted, and bank them toward future green-voucher redemptions.",
    ecoPoints: 120,
    ecoHighlights: [
      "Native sapling selection basics",
      "Soil enrichment techniques",
      "Community after-care planning",
    ],
  },
  {
    id: 2,
    title: "Recycle Drive",
    image: "https://picsum.photos/id/160/400/300",
    date: "25 Jan 2025",
    time: "10:00 AM – 4:00 PM",
    location: "School of Housing, Building & Planning",
    description:
      "Sort, weigh, and catalog recyclables to keep them out of landfills while stacking EcoPoints you can redeem for marketplace vouchers.",
    ecoPoints: 80,
    ecoHighlights: [
      "Waste stream identification",
      "Composting vs recycling",
      "Reporting circularity impact",
    ],
  },
  {
    id: 3,
    title: "Textbook Exchange",
    image: "https://picsum.photos/id/1010/400/300",
    date: "8 Feb 2025",
    time: "9:00 AM – 5:00 PM",
    location: "Main Library Forum",
    description:
      "Trade past semester textbooks, reduce printing emissions, and collect EcoPoints that translate directly into study supply vouchers.",
    ecoPoints: 60,
    ecoHighlights: [
      "Circular economy swap stations",
      "Best practices for upcycling paper",
      "Campus sharing logistics",
    ],
  },
  {
    id: 4,
    title: "Hostel Cleanup",
    image: "./src/users/assets/restu.JPG",
    date: "15 Feb 2025",
    time: "7:30 AM – 11:30 AM",
    location: "Desasiswa Restu",
    description:
      "Deep-clean hostel blocks, launch compost corners, and rack up EcoPoints that can be exchanged for dorm-friendly rewards.",
    ecoPoints: 90,
    ecoHighlights: [
      "Low-cost green cleaning kits",
      "Composting starter setup",
      "Dorm energy-saving checklist",
    ],
  },
  {
    id: 5,
    title: "Charity Run",
    image: "https://picsum.photos/id/75/400/300",
    date: "2 Mar 2025",
    time: "6:30 AM – 10:00 AM",
    location: "USM Sports Complex",
    description:
      "Race across campus, raise funds for sustainable projects, and earn premium EcoPoints to redeem for wellness or café vouchers.",
    ecoPoints: 150,
    ecoHighlights: [
      "Low-impact event planning",
      "Carbon tracking for activities",
      "Fundraising for green tech",
    ],
  },
];
