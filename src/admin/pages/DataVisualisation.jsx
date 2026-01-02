import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Label
} from "recharts";
import "./DataVisualisation.css";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28FFF", "#FF6699"];

const DataVisualisation = () => {
  const [categoryData, setCategoryData] = useState([]);
  const [eventData, setEventData] = useState([]);

  // 🔹 Fetch marketplace items for category stats
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "items"), (snap) => {
      const counts = {
        "Hostel Essentials": 0,
        "Books": 0,
        "Electronics": 0,
        "Stationery": 0,
        "Fashion & Accessories": 0,
        "Others": 0,
      };

      snap.docs.forEach(doc => {
        const category = doc.data().category;
        if (counts[category] !== undefined) counts[category]++;
        else counts["Others"]++;
      });

      const chartData = Object.keys(counts).map(key => ({
        name: key,
        value: counts[key],
      }));

      setCategoryData(chartData);
    });

    return () => unsub();
  }, []);

  // 🔹 Fetch events and their registration counts
  useEffect(() => {
    let eventsList = [];
    let registrationsList = [];

    const unsubEvents = onSnapshot(collection(db, "events"), (snap) => {
      eventsList = snap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().title
      }));
      updateEventChart();
    });

    const unsubRegs = onSnapshot(collection(db, "eventRegistrations"), (snap) => {
      registrationsList = snap.docs.map(doc => doc.data());
      updateEventChart();
    });

    const updateEventChart = () => {
      if (!eventsList.length || !registrationsList.length) return;

      const chartData = eventsList.map(event => ({
        name: event.name,
        Registrations: registrationsList.filter(r => r.eventId === event.id).length
      }));

      setEventData(chartData);
    };

    return () => {
      unsubEvents();
      unsubRegs();
    };
  }, []);

  const renderCustomizedTick = (props) => {
    const { x, y, payload, width } = props;
    const words = payload.value.split(" ");
    return (
      <g transform={`translate(${x},${y + 10})`}>
        {words.map((word, index) => (
          <text
            key={index}
            x={0}
            y={index * 14} // line height
            textAnchor="middle"
            fill="#666"
            fontSize={12}
          >
            {word}
          </text>
        ))}
      </g>
    );
  };

  return (
    <div className="admin-page-content">
      {/* 🔹 Top Traded Categories Pie Chart */}
      <div className="top-traded-category-section">
        <h2>Top Traded Categories</h2>
        <PieChart width={700} height={400}>
          <Pie
            data={categoryData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={150}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          >
            {categoryData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}`, "Items"]} />
          <Legend />
        </PieChart>
      </div>

      {/* 🔹 Event Registrations Bar Chart */}
      <div className="event-registration-number-section">
        <h2>EcoHub Event Registration Numbers</h2>
        <BarChart
          width={700}
          height={400}
          data={eventData}
          margin={{ top: 20, right: 30, left: 60, bottom: 100 }} // enough bottom margin
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="name"
            angle={0}
            textAnchor="middle"
            interval={0}
            tick={renderCustomizedTick}
          >
            <Label
              value="Title"
              position="bottom"   // place outside
              offset={80}         // adjust distance from tick labels
              style={{ fontWeight: "bold", fontSize: 14 }}
            />
          </XAxis>

          <YAxis>
            <Label
              value="Number of Registrations"
              angle={-90}
              position="insideLeft"
              dx={-20}
              dy={0}
              style={{ fontWeight: "bold", fontSize: 14, textAnchor: "middle" }}
            />
          </YAxis>

          <Tooltip />
          <Bar dataKey="Registrations" fill="#8884d8" />
        </BarChart>
      </div>
    </div>
  );
};

export default DataVisualisation;
