import React, { useState, useEffect } from "react";
import styles from "../styles/Dashboard.module.css";

interface DashboardData {
  totalSales: number;
  totalQuantity: number;
  totalDiscounts: number;
  averageDiscount: number;
  asp: number;
  dailyTrend: Array<{ date: string; sales: number; qty: number; discount: number }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeCode, setStoreCode] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          storeCode,
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        });

        const response = await fetch(`/api/dashboard?${params.toString()}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [storeCode, startDate, endDate]);

  return (
    <div className={styles.container}>
      <h1>📊 Summary (MTD - Month to Date)</h1>

      <div className={styles.filters}>
