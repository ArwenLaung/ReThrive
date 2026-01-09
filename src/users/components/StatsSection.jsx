import React, { useEffect, useState, useRef } from "react";
import { Users, UserCheck, Package, CalendarDays } from "lucide-react";
import { db } from "../../firebase";
import { collection, getCountFromServer, getDocs } from "firebase/firestore";

// Custom hook to animate numbers
const useCounter = (end, duration = 2000) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime = null;
    const animate = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const value = Math.floor(progress * end);
      setCount(value);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [end, isVisible, duration]);

  return { count, ref };
};

// Single stat card component
const StatCard = ({ icon: Icon, label, target }) => {
  const { count, ref } = useCounter(target);

  return (
    <div
      ref={ref}
      className="bg-brand-cream rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm hover:shadow-md transition-shadow min-h-[180px] w-full"
    >
      <Icon className="w-12 h-12 text-brand-darkText mb-4" strokeWidth={2.5} />
      <div className="text-3xl font-extrabold text-brand-darkText mb-1">
        {count.toLocaleString()}
      </div>
      <div className="text-sm font-medium text-brand-darkText opacity-80">
        {label}
      </div>
    </div>
  );
};

// Main stats section
const StatsSection = () => {
  const [stats, setStats] = useState({
    totalStudents: 30000, // fixed
    activeUsers: 0,
    totalItems: 0,
    ongoingEvents: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Active users count
        const usersSnap = await getCountFromServer(collection(db, "users"));
        // Total items count
        const itemsSnap = await getCountFromServer(collection(db, "items"));
        // Total events count
        const eventsSnap = await getDocs(collection(db, "events"));

        setStats({
          totalStudents: 30000,
          activeUsers: usersSnap.data().count,
          totalItems: itemsSnap.data().count,
          ongoingEvents: eventsSnap.size,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <section className="py-8 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Users} label="Total Students" target={stats.totalStudents} />
          <StatCard icon={UserCheck} label="Active Users" target={stats.activeUsers} />
          <StatCard icon={Package} label="Total Items" target={stats.totalItems} />
          <StatCard icon={CalendarDays} label="Ongoing Events" target={stats.ongoingEvents} />
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
